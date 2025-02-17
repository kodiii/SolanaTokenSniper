import * as sqlite3 from "sqlite3";
import { ConnectionManager } from "./db/connection_manager";
import { config } from "../config";

const DB_PATH = "src/tracker/paper_trading.db";

interface VirtualBalance {
  balance_sol: number;
  updated_at: number;
}

interface SimulatedTrade {
  timestamp: number;
  token_mint: string;
  token_name: string;
  amount_sol: number;
  amount_token: number;
  price_per_token: number;
  type: 'buy' | 'sell';
  fees: number;
}

interface TokenTracking {
  token_mint: string;
  token_name: string;
  amount: number;
  buy_price: number;
  current_price: number;
  last_updated: number;
  stop_loss: number;
  take_profit: number;
}

// Create tables
export async function initializePaperTradingDB(): Promise<boolean> {
  const connectionManager = ConnectionManager.getInstance(DB_PATH);
  try {
    await connectionManager.initialize();
    const db = await connectionManager.getConnection();

    // Virtual balance table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS virtual_balance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        balance_sol REAL NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Simulated trades table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS simulated_trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        token_mint TEXT NOT NULL,
        token_name TEXT NOT NULL,
        amount_sol REAL NOT NULL,
        amount_token REAL NOT NULL,
        price_per_token REAL NOT NULL,
        type TEXT NOT NULL,
        fees REAL NOT NULL
      );
    `);

    // Token tracking table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS token_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_mint TEXT UNIQUE NOT NULL,
        token_name TEXT NOT NULL,
        amount REAL NOT NULL,
        buy_price REAL NOT NULL,
        current_price REAL NOT NULL,
        last_updated INTEGER NOT NULL,
        stop_loss REAL NOT NULL,
        take_profit REAL NOT NULL
      );
    `);

    // Get current balance
    const balance = await db.get('SELECT * FROM virtual_balance ORDER BY id DESC LIMIT 1');
    
    // Initialize or update balance if it doesn't match config
    if (!balance || balance.balance_sol !== config.paper_trading.initial_balance) {
      await db.run(
        'INSERT INTO virtual_balance (balance_sol, updated_at) VALUES (?, ?)',
        [config.paper_trading.initial_balance, Date.now()]
      );
      console.log(`🎮 Paper Trading balance set to ${config.paper_trading.initial_balance} SOL`);
    }

    connectionManager.releaseConnection(db);
    return true;
  } catch (error) {
    console.error('Error initializing paper trading database:', error);
    return false;
  }
}

export async function getVirtualBalance(): Promise<VirtualBalance | null> {
  const connectionManager = ConnectionManager.getInstance(DB_PATH);
  try {
    const db = await connectionManager.getConnection();
    const balance = await db.get('SELECT * FROM virtual_balance ORDER BY id DESC LIMIT 1');
    connectionManager.releaseConnection(db);
    return balance as VirtualBalance;
  } catch (error) {
    console.error('Error getting virtual balance:', error);
    return null;
  }
}

export async function recordSimulatedTrade(trade: SimulatedTrade): Promise<boolean> {
  const connectionManager = ConnectionManager.getInstance(DB_PATH);
  try {
    const db = await connectionManager.getConnection();

    await connectionManager.transaction(async (transaction) => {
      await db.run(
        `INSERT INTO simulated_trades (timestamp, token_mint, token_name, amount_sol, amount_token, price_per_token, type, fees)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [trade.timestamp, trade.token_mint, trade.token_name, trade.amount_sol, trade.amount_token, trade.price_per_token, trade.type, trade.fees]
      );

      // Update virtual balance
      const currentBalance = await getVirtualBalance();
      if (currentBalance) {
        const newBalance = trade.type === 'buy' 
          ? currentBalance.balance_sol - (trade.amount_sol + trade.fees)
          : currentBalance.balance_sol + (trade.amount_sol - trade.fees);

        await db.run(
          'INSERT INTO virtual_balance (balance_sol, updated_at) VALUES (?, ?)',
          [newBalance, Date.now()]
        );
      }

      // Update token tracking
      if (trade.type === 'buy') {
        await db.run(
          `INSERT INTO token_tracking 
           (token_mint, token_name, amount, buy_price, current_price, last_updated, stop_loss, take_profit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(token_mint) DO UPDATE SET
           amount = amount + ?,
           current_price = ?,
           last_updated = ?`,
          [
            trade.token_mint,
            trade.token_name,
            trade.amount_token,
            trade.price_per_token,
            trade.price_per_token,
            trade.timestamp,
            trade.price_per_token * (1 - config.sell.stop_loss_percent/100),
            trade.price_per_token * (1 + config.sell.take_profit_percent/100),
            trade.amount_token,
            trade.price_per_token,
            trade.timestamp
          ]
        );
      } else {
        await db.run('DELETE FROM token_tracking WHERE token_mint = ?', [trade.token_mint]);
      }
    });

    connectionManager.releaseConnection(db);
    return true;
  } catch (error) {
    console.error('Error recording simulated trade:', error);
    return false;
  }
}

export async function updateTokenPrice(tokenMint: string, currentPrice: number): Promise<TokenTracking | null> {
  const connectionManager = ConnectionManager.getInstance(DB_PATH);
  try {
    const db = await connectionManager.getConnection();
    
    await db.run(
      `UPDATE token_tracking 
       SET current_price = ?, last_updated = ?
       WHERE token_mint = ?`,
      [currentPrice, Date.now(), tokenMint]
    );

    const token = await db.get(
      'SELECT * FROM token_tracking WHERE token_mint = ?',
      [tokenMint]
    );

    connectionManager.releaseConnection(db);
    return token as TokenTracking;
  } catch (error) {
    console.error('Error updating token price:', error);
    return null;
  }
}

export async function getTrackedTokens(): Promise<TokenTracking[]> {
  const connectionManager = ConnectionManager.getInstance(DB_PATH);
  try {
    const db = await connectionManager.getConnection();
    const tokens = await db.all('SELECT * FROM token_tracking');
    connectionManager.releaseConnection(db);
    return tokens as TokenTracking[];
  } catch (error) {
    console.error('Error getting tracked tokens:', error);
    return [];
  }
}