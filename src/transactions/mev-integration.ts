import axios from "axios";
import { Connection, Transaction, VersionedTransaction, Message } from "@solana/web3.js";
import { config } from "../config.js";
import { rpcHealthMonitor } from "../utils/rpc-health.js";

interface Bundle {
  transactions: (Transaction | VersionedTransaction)[];
  blockhash: string;
  tipAmount: number;
  priorityFee: number;
}

class MEVIntegration {
  private jitoBlockhashEndpoint: string;
  private jitoBundleEndpoint: string;
  private tipPercentage: number;
  private maxTipLamports: number;
  private minTipLamports: number;
  private bundleQueue: Bundle[] = [];
  private currentBlockhash: string | null = null;
  private blockhashExpiration: number = 0;
  private connection: Connection;
  private lastSuccessfulBlockhashTime: number = 0;

  constructor() {
    const mevConfig = config.tx.mev;
    const baseJitoUrl = mevConfig.jito_endpoint;
    this.jitoBlockhashEndpoint = `${baseJitoUrl}/blockhash`;
    this.jitoBundleEndpoint = `${baseJitoUrl}/bundles`;
    this.tipPercentage = mevConfig.tip_percentage;
    this.maxTipLamports = mevConfig.max_tip_lamports;
    this.minTipLamports = mevConfig.min_tip_lamports;

    // Validate and format RPC endpoint URL
    let rpcUrl = rpcHealthMonitor.getCurrentEndpoint().url;
    if (!rpcUrl.startsWith('http://') && !rpcUrl.startsWith('https://')) {
      rpcUrl = `https://${rpcUrl}`;
    }

    // Initialize connection with proper options
    this.connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
      disableRetryOnRateLimit: false,
    });
  }

  public async initialize() {
    await this.updateBlockhash();
    setInterval(() => this.processBundleQueue(), 500);
    setInterval(() => this.updateBlockhash(), 10000);
  }

  private async updateBlockhash() {
    // Try Jito endpoint first with retries
    let attempts = 0;
    const maxAttempts = 3;
    const baseDelay = 1000;
    
    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(this.jitoBlockhashEndpoint, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (response.data?.blockhash) {
          this.currentBlockhash = response.data.blockhash;
          this.blockhashExpiration = Date.now() + 120000;
          this.lastSuccessfulBlockhashTime = Date.now();
          return;
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.warn("Jito blockhash endpoint failed after retries, falling back to RPC. Error:", 
            error instanceof Error ? error.message : 'Unknown error');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempts)));
      }
    }

    // Fallback to RPC with health check
    try {
      if (rpcHealthMonitor.getConnectionQuality() < 0.1) {
        throw new Error('RPC connection quality too low');
      }

      const { blockhash } = await this.connection.getLatestBlockhash({
        commitment: 'confirmed'
      });
      
      if (!blockhash) {
        throw new Error('No blockhash returned from RPC');
      }

      this.currentBlockhash = blockhash;
      this.blockhashExpiration = Date.now() + 120000;
      this.lastSuccessfulBlockhashTime = Date.now();
    } catch (error) {
      console.error("Failed to update blockhash from RPC:", error);
      
      // If we have a recent valid blockhash, keep using it
      if (this.currentBlockhash && Date.now() - this.lastSuccessfulBlockhashTime < 60000) {
        console.warn("Using cached blockhash due to RPC failure");
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error("Failed to get recent blockhash: " + errorMessage);
    }
  }

  public async addTransaction(tx: Transaction | VersionedTransaction, priorityFee: number) {
    if (!this.currentBlockhash || Date.now() > this.blockhashExpiration) {
      await this.updateBlockhash();
      if (!this.currentBlockhash) {
        throw new Error("Unable to get valid blockhash");
      }
    }

    const tipAmount = this.calculateTipAmount(priorityFee);
    const bundle: Bundle = {
      transactions: [tx],
      blockhash: this.currentBlockhash,
      tipAmount,
      priorityFee
    };

    this.bundleQueue.push(bundle);
  }

  private calculateTipAmount(priorityFee: number): number {
    const baseTip = Math.max(
      this.minTipLamports,
      Math.min(
        this.maxTipLamports,
        priorityFee * this.tipPercentage
      )
    );

    const variation = Math.random() * 0.1 - 0.05;
    return Math.round(baseTip * (1 + variation));
  }

  private async processBundleQueue() {
    if (this.bundleQueue.length === 0) return;

    const bundle = this.bundleQueue.shift();
    if (!bundle) return;

    try {
      await this.sendBundle(bundle);
    } catch (error) {
      console.error("Failed to send bundle:", error);
      bundle.tipAmount = Math.min(
        this.maxTipLamports,
        bundle.tipAmount * 1.5
      );
      this.bundleQueue.unshift(bundle);
    }
  }

  private async sendBundle(bundle: Bundle) {
    const serializedTxs = bundle.transactions.map(tx => {
      const serialized = tx instanceof VersionedTransaction ? 
        tx.serialize() : 
        (tx as Transaction).serialize();
      return serialized.toString('base64');
    });

    try {
      const response = await axios.post(this.jitoBundleEndpoint, {
        transactions: serializedTxs,
        blockhash: bundle.blockhash,
        tipAmount: bundle.tipAmount,
        priorityFee: bundle.priorityFee
      }, {
        timeout: 10000
      });

      if (!response.data?.success) {
        throw new Error("Bundle submission failed");
      }
    } catch (error) {
      console.error("Jito bundle submission failed, falling back to RPC. Error:", error);
      // Fallback to regular RPC submission
      await Promise.all(bundle.transactions.map(async tx => {
        try {
          if (tx instanceof VersionedTransaction) {
            return await this.connection.sendTransaction(tx);
          } else {
            // Convert legacy Transaction to VersionedTransaction
            const compiledMessage = tx.compileMessage();
            const versionedMessage = new Message({
              header: compiledMessage.header,
              accountKeys: compiledMessage.accountKeys,
              recentBlockhash: compiledMessage.recentBlockhash,
              instructions: compiledMessage.instructions
            });
            
            const signatures = tx.signatures
              .filter(sig => sig.signature !== null)
              .map(sig => sig.signature as Uint8Array);

            const versionedTx = new VersionedTransaction(versionedMessage);
            versionedTx.signatures = signatures;
            
            return await this.connection.sendTransaction(versionedTx);
          }
        } catch (txError) {
          console.error("Failed to send transaction:", txError);
          throw txError;
        }
      }));
    }
  }

  public getStatus() {
    return {
      queueSize: this.bundleQueue.length,
      currentBlockhash: this.currentBlockhash,
      blockhashExpiration: this.blockhashExpiration,
      lastBundleSuccess: this.bundleQueue.length === 0,
      lastSuccessfulBlockhashTime: this.lastSuccessfulBlockhashTime
    };
  }
}

export const mevIntegration = new MEVIntegration();