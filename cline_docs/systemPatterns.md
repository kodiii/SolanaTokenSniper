# System Patterns - Solana Token Sniper

## Architecture Overview
The system is split into two main components:
1. Sniper Module (`src/index.ts`)
2. Tracker Module (`src/tracker/index.ts`)

## Key Technical Decisions

### 1. Module Organization
```
src/
├── config.ts           # Configuration and parameters
├── index.ts           # Main sniper logic
├── transactions.ts    # Transaction handling
├── types.ts          # TypeScript type definitions
├── tracker/          # Token tracking module
│   ├── db.ts        # Database operations
│   └── index.ts     # Tracking logic
└── utils/           # Utility functions
    ├── env-validator.ts  # Environment validation
    └── keys.ts          # Key management
```

### 2. Data Flow Patterns
- Event-driven architecture for token detection
- Asynchronous transaction processing
- Database-backed token tracking
- WebSocket-based real-time updates

### 3. State Management
- SQLite database for persistent storage
- Environment variables for configuration
- In-memory tracking for active operations

### 4. Error Handling
- Retry logic for swap operations
- Transaction simulation before execution
- Comprehensive error logging
- Balance validation before operations

### 5. Integration Patterns
- REST API calls for external services
- WebSocket subscriptions for blockchain events
- Database transactions for state persistence
- RPC node communication for blockchain interaction

## Design Patterns Used
1. Repository Pattern (DB operations)
2. Service Pattern (External API interactions)
3. Observer Pattern (WebSocket events)
4. Strategy Pattern (Trading logic)
5. Factory Pattern (Transaction creation)

## Security Patterns
1. Environment variable validation
2. API key management
3. Wallet key security
4. Rate limiting
5. Input validation