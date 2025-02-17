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
  pairs: Array<{
    priceUsd: string;
    liquidity?: {
      usd: number;
    };
  }> | null;
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

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async getTokenPrice(tokenMint: string, retryCount = 0): Promise<number | null> {
    try {
      const attempt = retryCount + 1;
      console.log(`🔍 Fetching price for token: ${tokenMint}${attempt > 1 ? ` (Attempt ${attempt}/${config.paper_trading.price_check.max_retries})` : ''}`);
      
      const response = await axios.get<DexscreenerPriceResponse>(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`,
        { timeout: config.tx.get_timeout }
      );

      console.log(`📊 DexScreener response:`, JSON.stringify(response.data, null, 2));

      if (response.data.pairs && response.data.pairs.length > 0 && response.data.pairs[0].priceUsd) {
        const price = parseFloat(response.data.pairs[0].priceUsd);
        console.log(`💰 Found price: $${price}`);
        return price;
      }

      // If we haven't exceeded max retries and response indicates no pairs yet
      if (retryCount < config.paper_trading.price_check.max_retries - 1) {
        const delayMs = Math.min(
          config.paper_trading.price_check.initial_delay * Math.pow(1.5, retryCount),
          config.paper_trading.price_check.max_delay
        );
        console.log(`⏳ No price data yet, retrying in ${delayMs/1000} seconds...`);
        await this.delay(delayMs);
        return this.getTokenPrice(tokenMint, retryCount + 1);
      }

      console.log('❌ No valid price data found after all retries');
      return null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('🚨 DexScreener API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });

        // If we haven't exceeded max retries and it's a potentially temporary error
        if (retryCount < config.paper_trading.price_check.max_retries - 1 && 
            (error.response?.status === 429 || error.response?.status === 503)) {
          const delayMs = Math.min(
            config.paper_trading.price_check.initial_delay * Math.pow(1.5, retryCount),
            config.paper_trading.price_check.max_delay
          );
          console.log(`⏳ API error, retrying in ${delayMs/1000} seconds...`);
          await this.delay(delayMs);
          return this.getTokenPrice(tokenMint, retryCount + 1);
        }
      } else {
        console.error('❌ Error fetching token price:', error);
      }
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