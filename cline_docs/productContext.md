# Product Context - Solana Token Sniper

## Purpose
The Solana Token Sniper is an automated trading bot designed to detect and trade new tokens on the Solana blockchain. It aims to provide educational insights into developing trading bots while offering practical functionality for token trading.

## Problems Solved
1. Automated Detection: Identifies new liquidity pools on Raydium
2. Risk Management: Implements rug checks and security validations
3. Trading Automation: Handles automatic buying and selling with configurable parameters
4. Portfolio Tracking: Monitors and manages acquired tokens

## Core Functionality
1. Token Sniping
   - Monitors Raydium for new liquidity pools
   - Executes automated purchases based on parameters
   - Performs rug checks via rugcheck.xyz
   - Filters pump.fun tokens

2. Token Management
   - Tracks purchased tokens in local SQLite database
   - Implements Stop Loss (SL) and Take Profit (TP) features
   - Monitors wallet balances and token prices

3. System Features
   - Configurable RPC nodes
   - Simulation mode for testing
   - Verbose logging options
   - Local database for transaction tracking