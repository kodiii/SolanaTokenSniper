import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "../config.js";
import { rpcHealthMonitor } from "../utils/rpc-health.js";

interface WalletActivity {
  timestamp: number;
  transactionType: string;
  amount: number;
  tokenAddress: string;
}

class WalletMonitor {
  private connection: Connection;
  private monitoredWallets: Map<string, WalletActivity[]>;
  private monitoringInterval: NodeJS.Timeout | null;

  constructor() {
    this.connection = new Connection(rpcHealthMonitor.getCurrentEndpoint().url);
    this.monitoredWallets = new Map();
    this.monitoringInterval = null;
  }

  async startMonitoring(walletAddress: string): Promise<void> {
    if (this.monitoredWallets.has(walletAddress)) return;

    this.monitoredWallets.set(walletAddress, []);
    
    if (!this.monitoringInterval) {
      this.monitoringInterval = setInterval(
        () => this.checkWalletActivity(),
        config.monitoring.wallet.check_interval
      );
    }
  }

  stopMonitoring(walletAddress: string): void {
    this.monitoredWallets.delete(walletAddress);
    
    if (this.monitoredWallets.size === 0 && this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private async checkWalletActivity(): Promise<void> {
    for (const [walletAddress] of this.monitoredWallets) {
      try {
        const publicKey = new PublicKey(walletAddress);
        const transactions = await this.connection.getSignaturesForAddress(
          publicKey,
          {
            limit: 5,
            before: undefined,
            until: undefined,
          }
        );

        // Analyze transactions for suspicious activity
        const newActivity = transactions.map(tx => ({
          timestamp: tx.blockTime || Date.now(),
          transactionType: 'unknown', // TODO: Implement transaction type detection
          amount: 0, // TODO: Implement amount extraction
          tokenAddress: '' // TODO: Implement token address extraction
        }));

        // Update wallet activity history
        const currentActivity = this.monitoredWallets.get(walletAddress) || [];
        this.monitoredWallets.set(walletAddress, [
          ...newActivity,
          ...currentActivity,
        ].slice(0, config.monitoring.wallet.max_wallet_history));

        // TODO: Implement suspicious activity detection
      } catch (error) {
        console.error(`Error monitoring wallet ${walletAddress}:`, error);
      }
    }
  }

  getWalletActivity(walletAddress: string): WalletActivity[] {
    return this.monitoredWallets.get(walletAddress) || [];
  }
}

export const walletMonitor = new WalletMonitor();