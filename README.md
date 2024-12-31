# Solana Token Sniper 

## Project Overview

The Solana Token Sniper is an advanced, open-source trading automation tool designed for the Solana blockchain. Built with TypeScript, this project provides a robust solution for token trading, featuring automated buying, selling, and advanced market tracking capabilities.

### Tutorial Series
- [Part 1: Snipe New Tokens from Raydium LP](https://www.youtube.com/watch?v=vsMbnsdHOIQ)
- [Part 2: Track and Sell Tokens (SL/TP)](https://www.youtube.com/watch?v=4CdXLywg2O8)

## Key Features

### Trading Automation
- Automated token purchase on Raydium liquidity pools
- Customizable buy parameters (amount, slippage, priority)
- Advanced sell strategies with Stop Loss and Take Profit
- Rug check integration with rugcheck.xyz
- Option to skip pump.fun tokens

### Technical Capabilities
- Real-time token tracking
- Local database storage for token information
- Flexible RPC node configuration
- Wallet management utilities

## Technology Stack

### Backend
- **Language**: TypeScript
- **Runtime**: Node.js
- **Blockchain Interaction**: 
  - `@solana/web3.js`
  - `@solana/wallet-adapter`
- **Database**: SQLite3
- **HTTP Requests**: Fetch API

### Frontend
- **Framework**: React with Vite
- **Language**: TypeScript
- **State Management**: React Hooks
- **Wallet Integration**: 
  - `@solana/wallet-adapter-react`
  - `@solana/wallet-adapter-react-ui`
- **Styling**: CSS with modern layout techniques

### External Services
- **RPC Provider**: Helius
- **Swap API**: Jupiter Aggregator V6
- **Rug Check**: rugcheck.xyz

## Project Structure

```
SolanaTokenSniper/
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/         # React UI components
│   │   ├── hooks/              # Custom React hooks
│   │   └── utils/              # Utility functions
│
├── src/                        # Backend TypeScript source
│   ├── tracker/                # Token tracking logic
│   ├── transactions/           # Transaction handling
│   └── config.ts               # Configuration management
│
├── .env                        # Environment configuration
├── package.json                # Project dependencies
└── README.md                   # Project documentation
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Solana Wallet (Phantom or Solflare recommended)

### Installation
1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/SolanaTokenSniper.git
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment variables
   ```bash
   cp .env.example .env
   # Edit .env with your specific configurations
   ```

### Running the Application
- Development mode (full stack):
  ```bash
  npm run dev:full
  ```
- Backend only:
  ```bash
  npm run dev
  ```
- Frontend only:
  ```bash
  npm run frontend
  ```

## Security Considerations
- Never share your private keys
- Use environment variables for sensitive information
- Understand the risks of automated trading

## Recent Updates
- Added createSellTransaction() for advanced selling
- Implemented retry logic for swap quotes
- Enhanced verbose logging
- Integrated SQLite for local token tracking

## Contributing
Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License
This project is open-source. See the LICENSE file for details.

## Acknowledgements
- [DigitalBenjamins](https://x.com/digbenjamins) - Original tutorial creator
- Solana Community
- Jupiter Aggregator
- Helius RPC

## External Documentation
- [Helius RPC Nodes](https://docs.helius.dev)
- [Jupiter V6 Swap API](https://station.jup.ag/docs/apis/swap-api)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)

## Disclaimer
This tool is for educational purposes. Cryptocurrency trading involves significant risk. Use responsibly and at your own risk.
