import * as sqlite3 from "sqlite3";
import { open } from "sqlite";
import { config } from "../config";

const DB_PATH = "src/tracker/paper_trading.db";

// Paper trading database structure
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
  try {
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

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

    // Initialize virtual balance if not exists
    const balance = await db.get('SELECT * FROM virtual_balance LIMIT 1');
    if (!balance) {
      await db.run(
        'INSERT INTO virtual_balance (balance_sol, updated_at) VALUES (?, ?)',
        [10, Date.now()] // Initialize with 10 SOL
      );
    }

    await db.close();
    return true;
  } catch (error) {
    console.error('Error initializing paper trading database:', error);
    return false;
  }
}

export async function getVirtualBalance(): Promise<VirtualBalance | null> {
  try {
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

    const balance = await db.get('SELECT * FROM virtual_balance ORDER BY id DESC LIMIT 1');
    await db.close();

    return balance as VirtualBalance;
  } catch (error) {
    console.error('Error getting virtual balance:', error);
    return null;
  }
}

export async function recordSimulatedTrade(trade: SimulatedTrade): Promise<boolean> {
  try {
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

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

    await db.close();
    return true;
  } catch (error) {
    console.error('Error recording simulated trade:', error);
    return false;
  }
}

export async function updateTokenPrice(tokenMint: string, currentPrice: number): Promise<TokenTracking | null> {
  try {
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

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

    await db.close();
    return token as TokenTracking;
  } catch (error) {
    console.error('Error updating token price:', error);
    return null;
  }
}

export async function getTrackedTokens(): Promise<TokenTracking[]> {
  try {
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

    const tokens = await db.all('SELECT * FROM token_tracking');
    await db.close();
    return tokens as TokenTracking[];
  } catch (error) {
    console.error('Error getting tracked tokens:', error);
    return [];
  }
}