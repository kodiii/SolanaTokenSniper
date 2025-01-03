import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { config } from './config';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});

export async function insertMockData() {
  try {
    const dbPath = config.swap.db_name_tracker_holdings;
    logger.info(`Attempting to open database at: ${dbPath}`);
    logger.info(`Current working directory: ${process.cwd()}`);

    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Create table if it doesn't exist
    await db.exec(`
      DROP TABLE IF EXISTS holdings;
      CREATE TABLE holdings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        Time INTEGER NOT NULL,
        Token TEXT NOT NULL,
        TokenName TEXT NOT NULL,
        Balance REAL NOT NULL,
        SolPaid REAL NOT NULL,
        SolFeePaid REAL NOT NULL,
        SolPaidUSDC REAL,
        SolFeePaidUSDC REAL,
        PerTokenPaidUSDC REAL,
        Slot INTEGER NOT NULL,
        Program TEXT NOT NULL,
        WalletAddress TEXT
      );
    `);

    // Clear existing data
    await db.run('DELETE FROM holdings');

    // Insert mock data
    const mockData = [
      {
        Time: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        Token: 'TokenA123',
        TokenName: 'Token A',
        Balance: 1000,
        SolPaid: 1.5,
        SolFeePaid: 0.001,
        SolPaidUSDC: 1.8,
        SolFeePaidUSDC: 0.001,
        PerTokenPaidUSDC: 0.0018,
        Slot: 1234567,
        Program: 'raydium',
        WalletAddress: 'WALLET_ADDRESS_1'
      },
      {
        Time: Math.floor(Date.now() / 1000) - 1800, // 30 minutes ago
        Token: 'TokenB456',
        TokenName: 'Token B',
        Balance: 500,
        SolPaid: 0.8,
        SolFeePaid: 0.001,
        SolPaidUSDC: null,  // Open position
        SolFeePaidUSDC: null,
        PerTokenPaidUSDC: null,
        Slot: 1234568,
        Program: 'raydium',
        WalletAddress: 'WALLET_ADDRESS_2'
      },
      {
        Time: Math.floor(Date.now() / 1000) - 900, // 15 minutes ago
        Token: 'TokenC789',
        TokenName: 'Token C',
        Balance: 2000,
        SolPaid: 2.0,
        SolFeePaid: 0.001,
        SolPaidUSDC: 2.5,
        SolFeePaidUSDC: 0.001,
        PerTokenPaidUSDC: 0.00125,
        Slot: 1234569,
        Program: 'raydium',
        WalletAddress: 'WALLET_ADDRESS_3'
      },
      {
        Time: Math.floor(Date.now() / 1000) - 300, // 5 minutes ago
        Token: 'TokenD101',
        TokenName: 'Token D',
        Balance: 1500,
        SolPaid: 1.2,
        SolFeePaid: 0.001,
        SolPaidUSDC: null,  // Open position
        SolFeePaidUSDC: null,
        PerTokenPaidUSDC: null,
        Slot: 1234570,
        Program: 'raydium',
        WalletAddress: 'WALLET_ADDRESS_4'
      },
      {
        Time: Math.floor(Date.now() / 1000) - 60, // 1 minute ago
        Token: 'TokenE202',
        TokenName: 'Token E',
        Balance: 3000,
        SolPaid: 3.0,
        SolFeePaid: 0.001,
        SolPaidUSDC: null,  // Open position
        SolFeePaidUSDC: null,
        PerTokenPaidUSDC: null,
        Slot: 1234571,
        Program: 'raydium',
        WalletAddress: 'WALLET_ADDRESS_5'
      }
    ];

    // Prepare the insert statement
    const insertStmt = await db.prepare(`
      INSERT INTO holdings (
        Time, Token, TokenName, Balance, SolPaid, SolFeePaid, 
        SolPaidUSDC, SolFeePaidUSDC, PerTokenPaidUSDC, 
        Slot, Program, WalletAddress
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Insert each mock data entry
    for (const entry of mockData) {
      await insertStmt.run(
        entry.Time, entry.Token, entry.TokenName, entry.Balance, 
        entry.SolPaid, entry.SolFeePaid, entry.SolPaidUSDC, 
        entry.SolFeePaidUSDC, entry.PerTokenPaidUSDC, 
        entry.Slot, entry.Program, entry.WalletAddress
      );
    }

    await insertStmt.finalize();

    logger.info('Mock data inserted successfully');
    await db.close();
  } catch (error) {
    logger.error('Error inserting mock data', { error });
    throw error;
  }
}
