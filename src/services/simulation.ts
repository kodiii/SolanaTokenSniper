import axios from 'axios';
import { config } from '../config';
import { 
  initializePaperTradingDB, 
  recordSimulatedTrade, 
  getVirtualBalance,
  updateTokenPrice,
  getTrackedTokens
} from '../tracker/paper_trading';

interface DexscreenerPriceResponse {
  pair: {
    priceUsd: string;
    liquidity?: {
      usd: number;
    };
  };
}

export class SimulationService {
  private static instance: SimulationService;
  private priceCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Initialize the paper trading database
    initializePaperTradingDB().then((success) => {
      if (success) {
        console.log('🎮 Paper Trading DB initialized successfully');
        this.startPriceTracking();
      } else {
        console.error('❌ Failed to initialize Paper Trading DB');
      }
    });
  }

  public static getInstance(): SimulationService {
    if (!SimulationService.instance) {
      SimulationService.instance = new SimulationService();
    }
    return SimulationService.instance;
  }

  private async startPriceTracking(): Promise<void> {
    // Check prices every minute
    this.priceCheckInterval = setInterval(async () => {
      const tokens = await getTrackedTokens();
      for (const token of tokens) {
        const currentPrice = await this.getTokenPrice(token.token_mint);
        if (currentPrice) {
          const updatedToken = await updateTokenPrice(token.token_mint, currentPrice);
          if (updatedToken) {
            await this.checkPriceTargets(updatedToken);
          }
        }
      }
    }, 60000); // Every minute
  }

  public async getTokenPrice(tokenMint: string): Promise<number | null> {
    try {
      const response = await axios.get<DexscreenerPriceResponse>(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`,
        { timeout: config.tx.get_timeout }
      );

      if (response.data.pair && response.data.pair.priceUsd) {
        return parseFloat(response.data.pair.priceUsd);
      }
      return null;
    } catch (error) {
      console.error('Error fetching token price:', error);
      return null;
    }
  }

  private async checkPriceTargets(token: {
    token_mint: string;
    token_name: string;
    amount: number;
    current_price: number;
    stop_loss: number;
    take_profit: number;
  }): Promise<void> {
    if (token.current_price <= token.stop_loss) {
      await this.executeSell(token, 'Stop Loss triggered');
    } else if (token.current_price >= token.take_profit) {
      await this.executeSell(token, 'Take Profit triggered');
    }
  }

  public async executeBuy(
    tokenMint: string,
    tokenName: string,
    currentPrice: number
  ): Promise<boolean> {
    const balance = await getVirtualBalance();
    if (!balance) {
      console.log('❌ Could not get virtual balance');
      return false;
    }

    // Use fixed amount from config
    const amountLamports = BigInt(config.swap.amount);
    const feesLamports = BigInt(config.swap.prio_fee_max_lamports);
    const amountInSol = Number(amountLamports) / 1e9; // Convert from lamports to SOL
    const fees = Number(feesLamports) / 1e9; // Convert from lamports to SOL

    if (balance.balance_sol < (amountInSol + fees)) {
      console.log('❌ Insufficient virtual balance for trade');
      return false;
    }

    const amountTokens = amountInSol / currentPrice;

    const success = await recordSimulatedTrade({
      timestamp: Date.now(),
      token_mint: tokenMint,
      token_name: tokenName,
      amount_sol: amountInSol,
      amount_token: amountTokens,
      price_per_token: currentPrice,
      type: 'buy',
      fees: fees
    });

    if (success) {
      console.log(`🎮 Paper Trade: Bought ${amountTokens.toFixed(2)} ${tokenName} tokens`);
      console.log(`💰 Price per token: $${currentPrice}`);
      console.log(`🏦 Total spent: ${amountInSol.toFixed(4)} SOL (+ ${fees} SOL fees)`);
      return true;
    }

    return false;
  }

  private async executeSell(
    token: {
      token_mint: string;
      token_name: string;
      amount: number;
      current_price: number;
    },
    reason: string
  ): Promise<boolean> {
    const amountInSol = token.amount * token.current_price;
    const feesLamports = BigInt(config.sell.prio_fee_max_lamports);
    const fees = Number(feesLamports) / 1e9;

    const success = await recordSimulatedTrade({
      timestamp: Date.now(),
      token_mint: token.token_mint,
      token_name: token.token_name,
      amount_sol: amountInSol,
      amount_token: token.amount,
      price_per_token: token.current_price,
      type: 'sell',
      fees: fees
    });

    if (success) {
      console.log(`🎮 Paper Trade: ${reason}`);
      console.log(`📈 Sold ${token.amount.toFixed(2)} ${token.token_name} tokens`);
      console.log(`💰 Price per token: $${token.current_price}`);
      console.log(`🏦 Total received: ${amountInSol.toFixed(4)} SOL (- ${fees} SOL fees)`);
      return true;
    }

    return false;
  }

  public cleanup(): void {
    if (this.priceCheckInterval) {
      clearInterval(this.priceCheckInterval);
      this.priceCheckInterval = null;
    }
  }
}