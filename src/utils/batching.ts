import { Connection } from "@solana/web3.js";
import { config } from "../config.js";

interface CongestionCache {
  value: number;
  timestamp: number;
}

class TransactionBatcher {
  private connection: Connection;
  private currentBatchSize: number;
  private minBatchSize: number;
  private maxBatchSize: number;
  private congestionThreshold: number;
  private backoffFactor: number;
  private growthFactor: number;
  private checkInterval: number;
  private intervalId: NodeJS.Timeout | null = null;
  
  // Cache-related properties
  private congestionCache: CongestionCache | null = null;
  private cacheTTL: number = 5000; // 5 seconds

  constructor(connection: Connection) {
    this.connection = connection;
    const batchingConfig = config.tx.batching;
    this.currentBatchSize = batchingConfig.min_batch_size;
    this.minBatchSize = batchingConfig.min_batch_size;
    this.maxBatchSize = batchingConfig.max_batch_size;
    this.congestionThreshold = batchingConfig.congestion_threshold;
    this.backoffFactor = batchingConfig.backoff_factor;
    this.growthFactor = batchingConfig.growth_factor;
    this.checkInterval = batchingConfig.check_interval;
    this.startMonitoring();
  }

  private async startMonitoring(): Promise<void> {
    if (!config.tx.batching.enabled) return;

    this.intervalId = setInterval(async () => {
      try {
        const congestionLevel = await this.getNetworkCongestion();
        this.adjustBatchSize(congestionLevel);
      } catch (error) {
        console.error("Error monitoring network congestion:", error);
      }
    }, this.checkInterval);
  }

  private async getNetworkCongestion(): Promise<number> {
    // Check if valid cache exists
    if (this.congestionCache && Date.now() - this.congestionCache.timestamp < this.cacheTTL) {
      return this.congestionCache.value;
    }

    // Try performance samples first
    try {
      const recentPerformance = await this.connection.getRecentPerformanceSamples(1);
      if (recentPerformance.length > 0) {
        const sample = recentPerformance[0];
        const congestion = 1 - (sample.numTransactions / sample.numSlots);
        const congestionValue = Math.max(0, Math.min(1, congestion));

        // Update cache
        this.congestionCache = {
          value: congestionValue,
          timestamp: Date.now()
        };

        return congestionValue;
      }
    } catch (error) {
      console.debug("Performance samples not available, using fallback method. Error:", error);
    }

    // Fallback method using recent block times
    try {
      const slot = await this.connection.getSlot();
      const blockTime = await this.connection.getBlockTime(slot);
      const previousBlockTime = await this.connection.getBlockTime(slot - 1);
      
      if (blockTime && previousBlockTime) {
        const blockTimeDiff = blockTime - previousBlockTime;
        // Normalize to 0-1 range where 1 is most congested
        const congestionValue = Math.min(1, Math.max(0, (blockTimeDiff - 0.4) / 0.6));
        
        // Update cache
        this.congestionCache = {
          value: congestionValue,
          timestamp: Date.now()
        };

        return congestionValue;
      }
    } catch (error) {
      console.error("Error getting block times:", error);
    }

    // Default to no congestion if all methods fail
    return 0;
  }

  private adjustBatchSize(congestionLevel: number): void {
    if (congestionLevel > this.congestionThreshold) {
      // Network is congested, reduce batch size
      this.currentBatchSize = Math.max(
        this.minBatchSize,
        Math.floor(this.currentBatchSize / this.backoffFactor)
      );
    } else {
      // Network is not congested, increase batch size
      this.currentBatchSize = Math.min(
        this.maxBatchSize,
        Math.ceil(this.currentBatchSize * this.growthFactor)
      );
    }
    console.log(`Adjusted batch size to ${this.currentBatchSize} (congestion: ${(congestionLevel * 100).toFixed(1)}%)`);
  }

  public getBatchSize(): number {
    return this.currentBatchSize;
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

export const createTransactionBatcher = (connection: Connection): TransactionBatcher => new TransactionBatcher(connection);