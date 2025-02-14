# Technical Context - Solana Token Sniper

## Technology Stack
- TypeScript/Node.js
- Solana Web3.js
- Jupiter V6 Swap API
- SQLite for local data storage
- WebSocket for real-time updates

## Core Dependencies
- @solana/web3.js: Solana blockchain interaction
- @project-serum/anchor: Solana program framework
- sqlite3/sqlite: Local database management
- axios: HTTP requests
- dotenv: Environment configuration
- luxon: DateTime handling
- ws: WebSocket client

## Development Setup
1. Node.js environment required
2. TypeScript compilation setup
3. Environment variables configuration needed
4. Local SQLite database initialization

## Scripts
- `npm run dev`: Start sniper in development
- `npm run tracker`: Start token tracker
- `npm run build`: Compile TypeScript
- `npm run start`: Run compiled sniper
- `npm run start:tracker`: Run compiled tracker
- `npm run test`: Run test suite

## Technical Constraints
1. RPC Node Requirements
   - Helius RPC nodes supported
   - Custom RPC configuration possible

2. Performance Considerations
   - Concurrent transaction limits
   - WebSocket connection management
   - Database transaction handling

3. Security Requirements
   - Wallet keypair management
   - API key configurations
   - Environment variable validation

## External Services
1. Helius RPC nodes
2. Jupiter V6 Swap API
3. Rugcheck.xyz API
4. Solscan API
5. Dexscreener Tokens API