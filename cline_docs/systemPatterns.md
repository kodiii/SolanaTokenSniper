# System Patterns - Solana Token Sniper

## Architecture Overview
The system follows a modular architecture with distinct components handling specific responsibilities.

## Core Components

### Tracker Module
Key component responsible for monitoring and managing token positions.

#### Current Implementation
1. Price Tracking
   - Uses dual price sources (Jupiter/Dexscreener)
   - Polls prices every 5 seconds
   - Triggers SL/TP based on direct price comparisons

2. Database Management
   - SQLite for persistent storage
   - Tracks holdings and transaction history
   - Basic database operations

3. Transaction Handling
   - Direct balance string manipulation
   - Simple sell order execution
   - Basic transaction status checking

#### Planned Improvements
1. Price Source Management
   - Validation for price source failures
   - Price consistency checking between sources
   - Rolling average price calculations
   - Sudden price change detection system

2. Database Operations
   - Transaction wrapping for atomicity
   - Connection pooling implementation
   - Error recovery mechanisms
   - Transaction lock system for sell orders

3. Balance & Transaction Handling
   - BigNumber library integration
   - Proper decimal handling
   - Balance reconciliation system
   - Enhanced transaction verification

4. Monitoring System
   - Price source operation logging
   - Price feed health checks
   - Database connection monitoring
   - Operational metrics collection

## Critical Patterns

### Price Validation Pattern
```typescript
interface PriceValidation {
  primarySource: string;
  secondarySource: string;
  rollingAverageWindow: number;
  maxPriceDeviation: number;
  consistencyThreshold: number;
}
```

### Transaction Lock Pattern
```typescript
interface TransactionLock {
  tokenMint: string;
  operationType: 'buy' | 'sell';
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  retryCount: number;
}
```

### Balance Management Pattern
```typescript
interface BalanceTracking {
  tokenMint: string;
  actualBalance: BigNumber;
  trackedBalance: BigNumber;
  lastReconciliation: number;
  discrepancies: BalanceDiscrepancy[];
}
```

## Integration Points
1. Price Feed Integration
   - Jupiter API endpoints
   - Dexscreener API connection
   - Failover mechanisms

2. Database Integration
   - SQLite connection management
   - Transaction isolation levels
   - Error handling patterns

3. Blockchain Integration
   - Solana RPC connections
   - Transaction confirmation handling
   - Wallet balance monitoring