import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fetchTransactionDetails } from './transaction-fetcher.js';
import { createSwapTransaction } from './swap-handler.js';
import { config } from '../config.js';

interface WorkerMessage {
  success: boolean;
  data?: {
    signature: string;
    swapTx: Buffer;
  };
  error?: string;
  signature?: string;
}

interface ProcessResult {
  results: Array<{
    signature: string;
    swapTx: Buffer;
  }>;
  errors: Array<{
    signature: string;
    error: string;
  }>;
}

interface WorkerTask {
  promise: Promise<WorkerMessage>;
  worker: Worker;
}

const MAX_WORKERS = config.parallel?.max_workers || 4;

if (!isMainThread) {
  // Worker thread implementation
  (async () => {
    try {
      const { signature } = workerData as { signature: string };
      
      // Fetch transaction details
      const txDetails = await fetchTransactionDetails(signature);
      if (!txDetails) {
        throw new Error('Failed to fetch transaction details');
      }

      // Create swap transaction
      const swapTx = await createSwapTransaction(txDetails.solMint, txDetails.tokenMint);
      if (!swapTx) {
        throw new Error('Failed to create swap transaction');
      }

      parentPort?.postMessage({
        success: true,
        data: {
          signature,
          swapTx: swapTx.serialize(),
        }
      });
    } catch (error) {
      parentPort?.postMessage({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        signature: (workerData as { signature: string }).signature
      });
    }
  })();
}

export class ParallelProcessor {
  private workers: Worker[] = [];
  private queue: string[] = [];
  private activeTasks = new Map<string, WorkerTask>();
  private results: Array<{ signature: string; swapTx: Buffer }> = [];
  private errors: Array<{ signature: string; error: string }> = [];

  constructor() {
    this.initializeWorkers();
  }

  private initializeWorkers() {
    for (let i = 0; i < MAX_WORKERS; i++) {
      const worker = new Worker(__filename);
      
      worker.on('message', (message: WorkerMessage) => {
        if (message.success && message.data) {
          this.results.push(message.data);
        } else if (message.signature) {
          this.errors.push({
            signature: message.signature,
            error: message.error || 'Unknown error'
          });
        }
        
        if (message.signature) {
          this.activeTasks.delete(message.signature);
        }
        this.processQueue();
      });

      worker.on('error', (error) => {
        console.error(`Worker error: ${error.message}`);
        if (workerData) {
          this.errors.push({
            signature: (workerData as { signature: string }).signature,
            error: error.message
          });
        }
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Worker stopped with exit code ${code}`);
        }
      });

      this.workers.push(worker);
    }
  }

  public async processTransactions(signatures: string[]): Promise<ProcessResult> {
    this.queue = [...signatures];
    this.processQueue();

    // Wait for all tasks to complete
    while (this.activeTasks.size > 0 || this.queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      results: this.results,
      errors: this.errors
    };
  }

  private processQueue() {
    while (this.queue.length > 0 && this.activeTasks.size < MAX_WORKERS) {
      const signature = this.queue.shift();
      if (!signature) continue;

      const worker = this.getAvailableWorker();
      if (!worker) continue;

      const task: WorkerTask = {
        promise: new Promise<WorkerMessage>((resolve) => {
          const messageHandler = (message: WorkerMessage) => {
            worker.off('message', messageHandler);
            resolve(message);
          };
          worker.on('message', messageHandler);
        }),
        worker
      };

      this.activeTasks.set(signature, task);
      worker.postMessage({ signature });
    }
  }

  private getAvailableWorker(): Worker | undefined {
    // Find a worker with no active tasks
    const workerTasks = new Map<Worker, number>();
    
    for (const task of this.activeTasks.values()) {
      workerTasks.set(task.worker, (workerTasks.get(task.worker) || 0) + 1);
    }

    return this.workers.find(worker => !workerTasks.has(worker));
  }

  public async shutdown() {
    await Promise.all(this.workers.map(worker => worker.terminate()));
  }
}