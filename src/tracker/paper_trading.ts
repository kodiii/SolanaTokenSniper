import axios from "axios";
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
  volume_m5: number;
  market_cap: number;
  liquidity_usd: number;
  amount: number;
  buy_price: number;
  current_price: number;
  last_updated: number;
  buy_time: number;
  stop_loss: number;
  sell_time: number | null;
  take_profit: number;
}

async function fetchMarketData(tokenMint: string): Promise<{
  volume_m5: number;
  market_cap: number;
  liquidity_usd: number;
} | null> {
  try {
    const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`);
    const pair = response.data.pairs?.[0];
    return pair ? {
      volume_m5: pair.volume?.m5 || 0,
      market_cap: pair.fdv || 0,
      liquidity_usd: pair.liquidity?.usd || 0,
    } : null;
  } catch (error) {
    console.error('Error fetching market data:', error);
    return null;
  }
}

async function createTables(db: any): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS virtual_balance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      balance_sol REAL NOT NULL,
      updated_at INTEGER NOT NULL
    );

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

    CREATE TABLE IF NOT EXISTS token_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_mint TEXT UNIQUE NOT NULL,
      token_name TEXT NOT NULL,
      volume_m5 REAL DEFAULT 0,
      market_cap REAL DEFAULT 0,
      liquidity_usd REAL DEFAULT 0,
      amount REAL NOT NULL,
      buy_price REAL NOT NULL,
      current_price REAL NOT NULL,
      last_updated INTEGER NOT NULL,
      buy_time INTEGER NOT NULL,
      stop_loss REAL NOT NULL,
      sell_time INTEGER,
      take_profit REAL NOT NULL
    );
  `);
}

async function ensureMigrations(): Promise<void> {
  const connectionManager = ConnectionManager.getInstance(DB_PATH);
  try {
    const db = await connectionManager.getConnection();

    // Get existing columns
    const columns = await db.all(`PRAGMA table_info(token_tracking)`);
    const columnNames = columns.map(col => col.name);

    // Add each missing column individually
    const migrations = [
      {
        name: 'volume_m5',
        sql: `ALTER TABLE token_tracking ADD COLUMN volume_m5 REAL DEFAULT 0`
      },
      {
        name: 'market_cap',
        sql: `ALTER TABLE token_tracking ADD COLUMN market_cap REAL DEFAULT 0`
      },
      {
        name: 'liquidity_usd',
        sql: `ALTER TABLE token_tracking ADD COLUMN liquidity_usd REAL DEFAULT 0`
      },
      {
        name: 'buy_time',
        sql: `ALTER TABLE token_tracking ADD COLUMN buy_time INTEGER DEFAULT (strftime('%s','now'))`
      },
      {
        name: 'sell_time',
        sql: `ALTER TABLE token_tracking ADD COLUMN sell_time INTEGER DEFAULT NULL`
      }
    ];

    for (const migration of migrations) {
      if (!columnNames.includes(migration.name)) {
        await db.exec(migration.sql);
      }
    }
      
    await db.exec('PRAGMA foreign_keys=on');
    
    connectionManager.releaseConnection(db);
  } catch (error) {
    console.error('Migration error:', error);
  }
}

// Create tables
export async function initializePaperTradingDB(): Promise<boolean> {
  const connectionManager = ConnectionManager.getInstance(DB_PATH);
  try {
    await connectionManager.initialize();
    // Ensure migrations before initialization
    await ensureMigrations();
    
    const db = await connectionManager.getConnection();
    
    // Create tables with the latest schema
    await createTables(db);

    // Get current balance
    const balance = await db.get('SELECT * FROM virtual_balance ORDER BY id DESC LIMIT 1');
    
    // Initialize balance only if it doesn't exist
    if (!balance) {
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
    // Ensure migrations before recording trade
    await ensureMigrations();

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
           (token_mint, token_name, amount, buy_price, current_price, last_updated, buy_time, stop_loss, take_profit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(token_mint) DO UPDATE SET
           amount = amount + ?,
           current_price = ?,
           last_updated = ?,
           buy_time = ?`,
          [
            trade.token_mint,
            trade.token_name,
            trade.amount_token,
            trade.price_per_token,
            trade.price_per_token,
            trade.timestamp,
            trade.timestamp,
            trade.price_per_token * (1 - config.sell.stop_loss_percent/100),
            trade.price_per_token * (1 + config.sell.take_profit_percent/100),
            trade.amount_token,
            trade.price_per_token,
            trade.timestamp,
            trade.timestamp
          ]
        );
      } else {
        // Update sell time before deleting
        await db.run(
          `UPDATE token_tracking 
           SET sell_time = ?, current_price = ?
           WHERE token_mint = ?`,
          [trade.timestamp, trade.price_per_token, trade.token_mint]
        );
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
  // Ensure migrations are run before any operation
  await ensureMigrations();
  
  const connectionManager = ConnectionManager.getInstance(DB_PATH);
  try {
    const db = await connectionManager.getConnection();

    // Fetch market data
    const marketData = await fetchMarketData(tokenMint);
    
    await db.run(
      `UPDATE token_tracking 
       SET current_price = ?, last_updated = ?, volume_m5 = ?, market_cap = ?, liquidity_usd = ?
       WHERE token_mint = ?`,
      [currentPrice, Date.now(),
       marketData?.volume_m5 || 0,
       marketData?.market_cap || 0,
       marketData?.liquidity_usd || 0,
       tokenMint]
    );
    
    // Get updated token data
    const token = await db.get(
      'SELECT * FROM token_tracking WHERE token_mint = ?',
      [tokenMint]
    );

    connectionManager.releaseConnection(db);
    return token as TokenTracking | null;
  } catch (error) {
    console.error('Error updating token price:', error);
    return null;
  }
}

export async function getTrackedTokens(): Promise<TokenTracking[]> {
  const connectionManager = ConnectionManager.getInstance(DB_PATH);
  try {
    // Ensure migrations before getting tokens
    await ensureMigrations();
    
    const db = await connectionManager.getConnection();
    const tokens = await db.all('SELECT * FROM token_tracking');
    connectionManager.releaseConnection(db);
    return tokens as TokenTracking[];
  } catch (error) {
    console.error('Error getting tracked tokens:', error);
    return [];
  }
}

export async function resetPaperTrading(): Promise<boolean> {
  const connectionManager = ConnectionManager.getInstance(DB_PATH);
  try {
    const db = await connectionManager.getConnection();

    // Drop all tables
    await db.exec(`
      DROP TABLE IF EXISTS virtual_balance;
      DROP TABLE IF EXISTS simulated_trades;
      DROP TABLE IF EXISTS token_tracking;
    `);

    // Recreate tables with latest schema
    await createTables(db);

    // Initialize with fresh balance
    await db.run(
      'INSERT INTO virtual_balance (balance_sol, updated_at) VALUES (?, ?)',
      [config.paper_trading.initial_balance, Date.now()]
    );

    console.log('🔄 Paper trading data reset successfully');
    console.log(`💰 Initial balance set to ${config.paper_trading.initial_balance} SOL`);

    connectionManager.releaseConnection(db);
    return true;
  } catch (error) {
    console.error('Error resetting paper trading data:', error);
    return false;
  }
}