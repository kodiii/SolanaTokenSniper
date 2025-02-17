# Paper Trading Mode Implementation - Solana Token Sniper

This document outlines the implementation plan and configuration requirements for the paper trading (simulation) mode of the Solana Token Sniper project. In paper trading mode, users simulate trades using real-time market prices, but with a virtual balance and without executing real blockchain transactions. This allows users to test strategies and calculate potential profit and loss (PNL) without actual fund transfers.

## Configuration Requirements

### 1. Virtual Balance
- **Initial Fake SOL Balance:**  
  Configure an initial virtual SOL balance that serves as the starting capital for simulated operations.  
  _Example:_  
  ```json
  {
    "initial_virtual_balance": "10000000000" // e.g., represents 10 SOL in lamports
  }
  ```

### 2. Fee Calculations
For swap (buy) operations, use these settings for PNL calculations (using the real current price from Dexscreener):
```typescript
{
  prio_fee_max_lamports: 1000000,    // 0.001 SOL
  prio_level: "medium",              // Options: medium, veryHigh (veryHigh uses 50000000, i.e., 0.05 SOL)
  amount: "10000000",                // 0.01 SOL – this value from src/config.ts will also be used to determine the purchase amount
  slippageBps: "200"                 // 2% slippage
}
```

For sell operations, apply these settings (using the current real price for simulation):
```typescript
{
  price_source: "dex",               // Options: 'dex' for Dexscreener, 'jup' for Jupiter
  prio_fee_max_lamports: 1000000,    // 0.001 SOL
  prio_level: "medium",              // Options: medium, or veryHigh (if set, uses 50000000 i.e., 0.05 SOL)
  slippageBps: "200"                 // 2% slippage
}
```

### 3. Database for Simulated Holdings
- **Location:** `src/tracker/paper_trading.db`  
  Maintain a clone of the actual holdings database specifically for simulated transactions. This ensures that virtual trades, balances, and portfolio data remain isolated from real transactions.

### 4. Integration with Existing Configurations
- Leverage the configuration settings defined in `src/config.ts`.
- **Toggle Paper Trading Mode:**  
  Use the flag `rug_check.simulation_mode` within the configuration to switch the transaction handling from real to simulated.
- **Verbose Logging:**  
  Enable detailed logging for paper trading activities using `rug_check.verbose_log`.

## Operational Logic

When a token is detected and passes the rug check validations, the paper trading mode will:

1. Use the current fake (virtual) SOL balance.
2. Execute buy orders using a fixed amount (configured as `"10000000"` in `src/config.ts` representing 0.01 SOL) based on the real-time price sourced from Dexscreener's API.
3. Retrieve pricing data via API endpoints such as:  
   `https://api.dexscreener.com/tokens/v1/{chainId}/{tokenAddresses}`  
   For example, a Dexscreener response may look like:
   ```json
   [
     {
       "chainId": "solana",
       "dexId": "raydium",
       "url": "https://dexscreener.com/solana/8slbnzoa1cfnvmjlpfp98zlanfsycfapfjkmbixnlwxj",
       "pairAddress": "8sLbNZoA1cfnvMJLPfp98ZLAnFSYCFApfJKMbiXNLwxj",
       "labels": ["CLMM"],
       "baseToken": {
         "address": "So11111111111111111111111111111111111111112",
         "name": "Wrapped SOL",
         "symbol": "SOL"
       },
       "quoteToken": {
         "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
         "name": "USD Coin",
         "symbol": "USDC"
       },
       "priceNative": "197.1930",
       "priceUsd": "197.19",
       "txns": { ... },
       "volume": { ... },
       "priceChange": { ... },
       "liquidity": { ... },
       "pairCreatedAt": 1723699294000
     }
   ]
   ```
4. Use the real-time price from such responses to calculate the cost, fees, slippage, and hence the simulated PNL.

## Monitoring and Analysis

### 1. CLI Dashboard
The paper trading system includes a command-line dashboard for real-time monitoring:

- **Access:** Run `npm run dashboard` to launch the monitoring interface
- **Features:**
  * Real-time virtual balance display
  * Active positions with current prices and PNL
  * Transaction history with timestamps
  * Auto-refreshes every 30 seconds
- **Visual Indicators:**
  * Color-coded profits (green) and losses (red)
  * Clear display of stop-loss and take-profit levels
  * Transaction type indicators (buy/sell)

### 2. Data Tracking
The dashboard provides real-time insights into:
- Current portfolio value
- Individual token performance
- Transaction history
- Fee calculations and impact
- Stop-loss and take-profit status

## Summary

- **Virtual Balance:** Initial virtual SOL balance for simulation.
- **Swap & Sell Fee Configs:** As specified above for PNL calculations.
- **Database:** Use `src/tracker/paper_trading.db` to store simulated transactions and portfolio data.
- **Integration:** Toggle via `rug_check.simulation_mode` with verbose logging through `rug_check.verbose_log`.
- **Operation:** When a token passes the rug check, execute a simulated buy using the fixed buy amount (`"10000000"`) based on the real price from Dexscreener.
- **Monitoring:** Access real-time performance data through the CLI dashboard using `npm run dashboard`.

This specification provides a clear and detailed plan for implementing paper trading mode in the Solana Token Sniper project.