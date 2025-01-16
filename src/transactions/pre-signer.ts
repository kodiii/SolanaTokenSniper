import { Connection, VersionedTransaction } from "@solana/web3.js";
import { config } from "../config.js";
import { mevIntegration } from "./mev-integration.js";

interface SignedTransaction {
  tx: VersionedTransaction;
  timestamp: number;
  priorityFee: number;
  blockhash: string;
}

class TransactionPreSigner {
  private signedTransactions: Map<string, SignedTransaction> = new Map();
  private signingQueue: VersionedTransaction[] = [];
  private isSigning = false;
  private cleanupInterval: NodeJS.Timeout;
  private currentBlockhash: string | null = null;
  private blockhashExpiration: number = 0;

  constructor(private connection: Connection) {
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredSignatures(),
      config.tx.pre_signing.max_signature_age / 2
    );

    if (config.tx.mev.enabled) {
      mevIntegration.initialize();
    }
  }

  async preSignTransaction(tx: VersionedTransaction, priorityFee?: number): Promise<void> {
    if (this.signingQueue.length >= config.tx.pre_signing.max_queue_size) {
      throw new Error('Pre-signing queue is full');
    }

    // Calculate priority fee if not provided
    const calculatedPriorityFee = priorityFee ?? this.calculatePriorityFee();
    this.signingQueue.push(tx);

    if (!this.isSigning) {
      this.processSigningQueue(calculatedPriorityFee);
    }
  }

  private calculatePriorityFee(): number {
    // Base priority fee based on config
    const baseFee = config.tx.mev.max_tip_lamports * 0.5;
    
    // Add dynamic adjustment based on network congestion
    const congestionFactor = Math.random() * 0.2 + 0.9; // ±10%
    return Math.round(baseFee * congestionFactor);
  }

  private async processSigningQueue(priorityFee: number) {
    this.isSigning = true;
    let retries = 0;

    while (this.signingQueue.length > 0 && retries < config.tx.pre_signing.max_retries) {
      try {
        const tx = this.signingQueue.shift();
        if (tx) {
          const signedTx = await this.signTransaction(tx);
          const blockhash = await this.getCurrentBlockhash();

          if (config.tx.mev.enabled) {
            await mevIntegration.addTransaction(signedTx, priorityFee);
          }

          this.signedTransactions.set(signedTx.signatures[0].toString(), {
            tx: signedTx,
            timestamp: Date.now(),
            priorityFee,
            blockhash
          });
        }
      } catch (error) {
        console.error('Error pre-signing transaction:', error);
        retries++;
        await new Promise(resolve => setTimeout(resolve, config.tx.pre_signing.retry_interval));
      }
    }

    this.isSigning = false;
  }

  private async getCurrentBlockhash(): Promise<string> {
    if (!this.currentBlockhash || Date.now() > this.blockhashExpiration) {
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      this.currentBlockhash = blockhash;
      this.blockhashExpiration = lastValidBlockHeight;
    }
    return this.currentBlockhash;
  }

  private async signTransaction(tx: VersionedTransaction): Promise<VersionedTransaction> {
    // Implementation depends on your signing mechanism
    // This is a placeholder that returns the original transaction
    return tx;
  }

  private cleanupExpiredSignatures() {
    const now = Date.now();
    for (const [signature, { timestamp }] of this.signedTransactions) {
      if (now - timestamp > config.tx.pre_signing.max_signature_age) {
        this.signedTransactions.delete(signature);
      }
    }
  }

  getSignedTransaction(signature: string): VersionedTransaction | undefined {
    const entry = this.signedTransactions.get(signature);
    if (entry && Date.now() - entry.timestamp <= config.tx.pre_signing.max_signature_age) {
      return entry.tx;
    }
    return undefined;
  }

  stop() {
    clearInterval(this.cleanupInterval);
  }
}

export const createTransactionPreSigner = (connection: Connection) => {
  return new TransactionPreSigner(connection);
};