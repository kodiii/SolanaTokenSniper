import { PriceValidator } from '../price_validation';
import { RollingAverageConfig } from '../../types';

describe('PriceValidator', () => {
  let validator: PriceValidator;
  const defaultConfig: RollingAverageConfig = {
    windowSize: 12,
    maxDeviation: 0.05,
    minDataPoints: 6
  };

  beforeEach(() => {
    validator = new PriceValidator(defaultConfig);
  });

  describe('addPricePoint', () => {
    it('should add price points and maintain window size', () => {
      const token = 'token1';
      const basePrice = 100;

      // Add more than windowSize points
      for (let i = 0; i < 15; i++) {
        validator.addPricePoint(token, {
          price: basePrice + i,
          timestamp: Date.now() + i * 1000,
          source: 'jupiter'
        });
      }

      const history = validator.getHistory(token);
      expect(history).toBeDefined();
      expect(history?.prices.length).toBe(defaultConfig.windowSize);
      expect(history?.prices[history.prices.length - 1].price).toBe(basePrice + 14);
    });
  });

  describe('validatePrice', () => {
    const token = 'token1';
    const basePrice = 100;

    beforeEach(() => {
      // Add 6 initial price points
      for (let i = 0; i < 6; i++) {
        validator.addPricePoint(token, {
          price: basePrice,
          timestamp: Date.now() + i * 1000,
          source: 'jupiter'
        });
      }
    });

    it('should accept prices within deviation threshold', () => {
      const result = validator.validatePrice(token, basePrice * 1.04, 'jupiter');
      expect(result.isValid).toBe(true);
    });

    it('should reject prices beyond deviation threshold', () => {
      const result = validator.validatePrice(token, basePrice * 1.06, 'jupiter');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Price deviation');
    });

    it('should provide suggested price when validation fails', () => {
      const result = validator.validatePrice(token, basePrice * 1.10, 'jupiter');
      expect(result.isValid).toBe(false);
      expect(result.suggestedPrice).toBeDefined();
      expect(result.suggestedPrice).toBe(basePrice);
    });

    it('should handle cross-source validation', () => {
      // Add Dexscreener price point
      validator.addPricePoint(token, {
        price: basePrice * 1.02,
        timestamp: Date.now(),
        source: 'dexscreener'
      });

      // Test Jupiter price that significantly differs from Dexscreener
      const result = validator.validatePrice(token, basePrice * 1.08, 'jupiter');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Price sources diverge');
    });
  });

  describe('edge cases', () => {
    it('should accept initial prices when insufficient history', () => {
      const token = 'newToken';
      const result = validator.validatePrice(token, 100, 'jupiter');
      expect(result.isValid).toBe(true);
      expect(result.confidence).toBe(0.5);
      expect(result.reason).toBe('Insufficient historical data');
    });

    it('should handle price drops correctly', () => {
      const token = 'token1';
      const basePrice = 100;

      // Add stable price history
      for (let i = 0; i < 6; i++) {
        validator.addPricePoint(token, {
          price: basePrice,
          timestamp: Date.now() + i * 1000,
          source: 'jupiter'
        });
      }

      // Test significant price drop
      const result = validator.validatePrice(token, basePrice * 0.94, 'jupiter');
      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should clear history correctly', () => {
      const token = 'token1';
      validator.addPricePoint(token, {
        price: 100,
        timestamp: Date.now(),
        source: 'jupiter'
      });

      validator.clearHistory(token);
      const history = validator.getHistory(token);
      expect(history).toBeUndefined();
    });
  });

  describe('stress testing', () => {
    it('should handle rapid price updates', () => {
      const token = 'token1';
      const updates = 1000;
      const basePrice = 100;

      for (let i = 0; i < updates; i++) {
        validator.addPricePoint(token, {
          price: basePrice + Math.random() * 2 - 1, // Random price ±1
          timestamp: Date.now() + i,
          source: 'jupiter'
        });
      }

      const history = validator.getHistory(token);
      expect(history).toBeDefined();
      expect(history?.prices.length).toBe(defaultConfig.windowSize);
    });

    it('should handle multiple tokens simultaneously', () => {
      const tokenCount = 100;
      const updatesPerToken = 20;

      for (let i = 0; i < tokenCount; i++) {
        const token = `token${i}`;
        for (let j = 0; j < updatesPerToken; j++) {
          validator.addPricePoint(token, {
            price: 100 + Math.random() * 5,
            timestamp: Date.now() + j,
            source: 'jupiter'
          });
        }
      }

      // Verify random sample of tokens
      for (let i = 0; i < 10; i++) {
        const token = `token${Math.floor(Math.random() * tokenCount)}`;
        const history = validator.getHistory(token);
        expect(history).toBeDefined();
        expect(history?.prices.length).toBeLessThanOrEqual(defaultConfig.windowSize);
      }
    });
  });
});