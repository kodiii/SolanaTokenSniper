# Technical Context

## Development Environment
- Language: TypeScript
- Runtime: Node.js
- Database: SQLite
- Blockchain: Solana

## Key Dependencies
- `@solana/web3.js`: Solana blockchain interaction
- `sqlite3` & `sqlite`: Database management
- `axios`: HTTP client for API interactions
- `luxon`: DateTime handling
- `dotenv`: Environment configuration
- Future additions:
  - `bignumber.js`: Precision number handling (to be added)
  - `winston`: Enhanced logging (to be added)

## External Services
1. Price Sources
   - Jupiter Aggregator API
     - Endpoint: JUP_HTTPS_PRICE_URI
     - Used for: Primary price data
   - Dexscreener API
     - Endpoint: DEX_HTTPS_LATEST_TOKENS
     - Used for: Secondary price verification

2. Blockchain RPC
   - Helius RPC
     - Endpoints:
       - HELIUS_HTTPS_URI
       - HELIUS_HTTPS_URI_TX
     - Used for: Blockchain interactions

## Database Schema
### Holdings Table
```sql
CREATE TABLE holdings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  Time INTEGER NOT NULL,
  Token TEXT NOT NULL,
  TokenName TEXT NOT NULL,
  Balance REAL NOT NULL,
  SolPaid REAL NOT NULL,
  SolFeePaid REAL NOT NULL,
  SolPaidUSDC REAL NOT NULL,
  SolFeePaidUSDC REAL NOT NULL,
  PerTokenPaidUSDC REAL NOT NULL,
  Slot INTEGER NOT NULL,
  Program TEXT NOT NULL
);
```

### Planned Schema Updates
```sql
-- Transaction Locks Table (To be added)
CREATE TABLE transaction_locks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_mint TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  status TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0
);

-- Price History Table (To be added)
CREATE TABLE price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_mint TEXT NOT NULL,
  price_source TEXT NOT NULL,
  price REAL NOT NULL,
  timestamp INTEGER NOT NULL
);
```

## Configuration
Key configuration parameters in config.ts:
- Price source selection
- Auto-sell settings
- Transaction timeout values
- Slippage settings
- Priority fee configurations

## Technical Constraints
1. Price Update Frequency
   - Minimum interval: 5 seconds
   - API rate limits consideration

2. Transaction Timing
   - Network congestion handling
   - Maximum retry attempts

3. Database Performance
   - Connection pool limits
   - Transaction isolation requirements

4. Memory Management
   - Price history retention
   - Log rotation needs

## Development Guidelines
1. Error Handling
   - Use TypeScript strict mode
   - Implement comprehensive try-catch blocks
   - Add detailed error logging

2. Testing Requirements
   - Unit tests for core functions
   - Integration tests for API interactions
   - Performance testing for database operations

3. Code Organization
   - Modular architecture
   - Clear separation of concerns
   - Consistent error handling patterns