import { PriceHistory, PriceValidationResult, RollingAverageConfig, TokenPrice } from '../types';

export class PriceValidator {
    private priceHistories: Map<string, PriceHistory> = new Map();
    private readonly rollingAverageConfig: RollingAverageConfig;
    
    constructor(config: RollingAverageConfig) {
        this.rollingAverageConfig = config;
    }

    /**
     * Add a new price point to the history
     */
    public addPricePoint(mint: string, price: TokenPrice): void {
        const history = this.priceHistories.get(mint) || {
            mint,
            prices: [],
            lastValidation: 0
        };

        history.prices.push(price);
        
        // Keep only the latest window size of prices
        if (history.prices.length > this.rollingAverageConfig.windowSize) {
            history.prices = history.prices.slice(-this.rollingAverageConfig.windowSize);
        }

        this.priceHistories.set(mint, history);
    }

    /**
     * Validate a new price against historical data
     */
    public validatePrice(mint: string, newPrice: number, source: 'jupiter' | 'dexscreener'): PriceValidationResult {
        const history = this.priceHistories.get(mint);
        
        if (!history || history.prices.length < this.rollingAverageConfig.minDataPoints) {
            return {
                isValid: true,
                confidence: 0.5,
                reason: 'Insufficient historical data'
            };
        }

        const rollingAverage = this.calculateRollingAverage(history.prices);
        
        // Cross-validate between sources first
        const otherSource = source === 'jupiter' ? 'dexscreener' : 'jupiter';
        const latestOtherSourcePrice = this.getLatestPriceFromSource(history.prices, otherSource);
        
        if (latestOtherSourcePrice) {
            const sourceDivergence = Math.abs((newPrice - latestOtherSourcePrice.price) / latestOtherSourcePrice.price);
            
            if (sourceDivergence > this.rollingAverageConfig.maxDeviation) {
                return {
                    isValid: false,
                    confidence: 1 - sourceDivergence,
                    reason: `Price sources diverge by ${(sourceDivergence * 100).toFixed(2)}%`,
                    suggestedPrice: rollingAverage
                };
            }
        }

        // Calculate deviation from rolling average
        const deviation = (newPrice - rollingAverage) / rollingAverage;
        const absDeviation = Math.abs(deviation);

        // Asymmetric validation: allow more downside movement than upside
        const maxAllowedDeviation = deviation > 0 
            ? this.rollingAverageConfig.maxDeviation
            : this.rollingAverageConfig.maxDeviation * 1.5;

        if (absDeviation > maxAllowedDeviation) {
            return {
                isValid: false,
                confidence: 1 - absDeviation,
                reason: `Price deviation (${(absDeviation * 100).toFixed(2)}%) exceeds maximum allowed (${(maxAllowedDeviation * 100).toFixed(2)}%)`,
                suggestedPrice: rollingAverage
            };
        }

        return {
            isValid: true,
            confidence: 1 - absDeviation,
            reason: 'Price within acceptable range'
        };
    }

    /**
     * Calculate rolling average from price history
     */
    private calculateRollingAverage(prices: TokenPrice[]): number {
        const relevantPrices = prices.slice(-this.rollingAverageConfig.windowSize);
        const sum = relevantPrices.reduce((acc, curr) => acc + curr.price, 0);
        return sum / relevantPrices.length;
    }

    /**
     * Get the latest price from a specific source
     */
    private getLatestPriceFromSource(prices: TokenPrice[], source: 'jupiter' | 'dexscreener'): TokenPrice | null {
        for (let i = prices.length - 1; i >= 0; i--) {
            if (prices[i].source === source) {
                return prices[i];
            }
        }
        return null;
    }

    /**
     * Clear price history for a token
     */
    public clearHistory(mint: string): void {
        this.priceHistories.delete(mint);
    }

    /**
     * Get current price history for a token
     */
    public getHistory(mint: string): PriceHistory | undefined {
        return this.priceHistories.get(mint);
    }
}