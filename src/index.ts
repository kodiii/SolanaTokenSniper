import WebSocket from "ws";
import { WebSocketRequest } from "./types.js";
import { config } from "./config.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createSwapTransaction, fetchAndSaveSwapDetails } from "./transactions.js";
import { validateEnv } from "./utils/env-validator.js";
import { rpcHealthMonitor } from "./utils/rpc-health.js";
import { createTransactionBatcher } from "./utils/batching.js";
import { createTransactionPreSigner } from "./transactions/pre-signer.js";
import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import { ParallelProcessor } from "./transactions/parallel-processor.js";

// WebSocket Connection Pool
class WebSocketPool {
  private pool: WebSocket[] = [];
  private maxConnections: number;
  private endpoint: string;
  private connectionAttempts: Map<WebSocket, number> = new Map();

  constructor(endpoint: string, maxConnections: number = 5) {
    this.endpoint = endpoint;
    this.maxConnections = maxConnections;
    this.initializePool();
  }

  private initializePool() {
    for (let i = 0; i < this.maxConnections; i++) {
      this.createConnection();
    }
  }

  private createConnection(): WebSocket {
    const ws = new WebSocket(this.endpoint);
    this.connectionAttempts.set(ws, 0);

    ws.on('open', () => {
      console.log('WebSocket connection established');
      console.log(`Connection quality: ${rpcHealthMonitor.getConnectionQuality()}%`);
      this.connectionAttempts.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      this.handleConnectionError(ws);
    });

    ws.on('close', () => {
      this.connectionAttempts.delete(ws);
      this.reconnect(ws);
    });

    this.pool.push(ws);
    return ws;
  }

  private handleConnectionError(ws: WebSocket) {
    const attempts = this.connectionAttempts.get(ws) || 0;
    if (attempts < 3) {
      setTimeout(() => {
        this.reconnect(ws);
      }, Math.pow(2, attempts) * 1000); // Exponential backoff
      this.connectionAttempts.set(ws, attempts + 1);
    } else {
      this.pool = this.pool.filter(connection => connection !== ws);
      this.createConnection();
    }
  }

  private reconnect(ws: WebSocket) {
    this.pool = this.pool.filter(connection => connection !== ws);
    this.createConnection();
  }

  async getConnection(): Promise<WebSocket> {
    while (true) {
      const available = this.pool.find(ws => ws.readyState === WebSocket.OPEN);
      if (available) return available;
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  releaseConnection(ws: WebSocket) {
    ws.removeAllListeners();
  }

  healthCheck() {
    return this.pool.filter(ws => ws.readyState === WebSocket.OPEN).length;
  }
}

// Basic MEV Integration
class MevIntegration {
  private tipAccounts: Keypair[] = [];
  private currentTipAccountIndex = 0;

  constructor() {
    // Initialize tip accounts
    for (let i = 0; i < config.tx.concurrent_transactions; i++) {
      this.tipAccounts.push(Keypair.generate());
    }
  }

  async addTipToTransaction(tx: VersionedTransaction): Promise<VersionedTransaction> {
    // TODO: Implement actual tip functionality
    return tx;
  }
}

// Regional Variables
let wsPool: WebSocketPool;
let transactionBatcher: ReturnType<typeof createTransactionBatcher>;
let mevIntegration: MevIntegration;
let transactionPreSigner: ReturnType<typeof createTransactionPreSigner>;
let parallelProcessor: ParallelProcessor;
const transactionQueue: string[] = [];
let isProcessingQueue = false;

async function processTransactionBatch() {
  if (isProcessingQueue || transactionQueue.length === 0) return;

  isProcessingQueue = true;
  const batch = transactionQueue.splice(0, config.parallel.max_workers);

  try {
    const { results, errors } = await parallelProcessor.processTransactions(batch);
    
    // Handle successful transactions
    results.forEach((result: { signature: string }) => {
      console.log(`✅ Transaction processed: ${result.signature}`);
    });

    // Handle failed transactions
    errors.forEach((error: { signature: string; error: string }) => {
      console.error(`❌ Transaction failed: ${error.signature} - ${error.error}`);
      transactionQueue.push(error.signature);
    });
  } finally {
    isProcessingQueue = false;
    if (transactionQueue.length > 0) {
      setImmediate(processTransactionBatch);
    }
  }
}

function sendSubscribeRequest(ws: WebSocket): void {
  const request: WebSocketRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "logsSubscribe",
    params: [
      {
        mentions: [config.liquidity_pool.radiyum_program_id],
      },
      {
        commitment: "processed",
      },
    ],
  };
  ws.send(JSON.stringify(request));
}

async function websocketHandler(): Promise<void> {
  const env = validateEnv();
  
  // Initialize WebSocket pool
  if (!wsPool) {
    wsPool = new WebSocketPool(rpcHealthMonitor.getCurrentEndpoint().url);
    console.log("Initialized WebSocket pool with", wsPool.healthCheck(), "connections");
  }

  // Initialize transaction batcher
  if (!transactionBatcher) {
    const connection = new Connection(env.HELIUS_HTTPS_URI);
    transactionBatcher = createTransactionBatcher(connection);
    console.log("Initialized transaction batcher");
  }

  // Initialize MEV integration
  if (!mevIntegration) {
    mevIntegration = new MevIntegration();
    console.log("Initialized MEV integration");
  }

  // Initialize transaction pre-signer
  if (!transactionPreSigner) {
    const connection = new Connection(env.HELIUS_HTTPS_URI);
    transactionPreSigner = createTransactionPreSigner(connection);
    console.log("Initialized transaction pre-signer");
  }

  // Initialize parallel processor
  if (!parallelProcessor) {
    parallelProcessor = new ParallelProcessor();
    console.log("Initialized parallel processor");
  }

  const ws = await wsPool.getConnection();
  
  ws.on("open", () => {
    sendSubscribeRequest(ws);
    console.log("\n🔓 WebSocket is open and listening.");
  });

  ws.on("message", async (data: WebSocket.Data) => {
    try {
      const jsonString = data.toString();
      const parsedData = JSON.parse(jsonString);

      if (parsedData.result !== undefined && !parsedData.error) {
        console.log("✅ Subscription confirmed");
        return;
      }

      if (parsedData.error) {
        console.error("🚫 RPC Error:", parsedData.error);
        return;
      }

      const logs = parsedData?.params?.result?.value?.logs;
      const signature = parsedData?.params?.result?.value?.signature;

      if (!Array.isArray(logs) || !signature) return;

      const containsCreate = logs.some((log: string) => 
        typeof log === "string" && log.includes("Program log: initialize2: InitializeInstruction2")
      );
      if (!containsCreate || typeof signature !== "string") return;

      // Queue transaction signature for processing
      transactionQueue.push(signature);
      if (!isProcessingQueue) {
        processTransactionBatch();
      }
    } catch (error) {
      console.error("💥 Error processing message:", {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  ws.on("close", () => {
    console.log("📴 WebSocket connection closed, cleaning up...");
    wsPool.releaseConnection(ws);
    console.log("🔄 Attempting to reconnect in 5 seconds...");
    setTimeout(websocketHandler, 5000);
  });
}

// Start Socket Handler
websocketHandler().catch((err: Error) => {
  console.error(err.message);
});
