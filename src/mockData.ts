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
    const db = await open({
      filename: config.swap.db_name_tracker_holdings,
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
        Program TEXT NOT NULL
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
        Program: 'raydium'
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
        Program: 'raydium'
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
        Program: 'raydium'
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
        Program: 'raydium'
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
        Program: 'raydium'
      }
    ];

    for (const data of mockData) {
      await db.run(`
        INSERT INTO holdings (
          Time, Token, TokenName, Balance, SolPaid, SolFeePaid, 
          SolPaidUSDC, SolFeePaidUSDC, PerTokenPaidUSDC, Slot, Program
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.Time, data.Token, data.TokenName, data.Balance, data.SolPaid,
        data.SolFeePaid, data.SolPaidUSDC, data.SolFeePaidUSDC,
        data.PerTokenPaidUSDC, data.Slot, data.Program
      ]);
    }

    logger.info('Mock data inserted successfully');
    await db.close();
  } catch (error) {
    logger.error('Error inserting mock data', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    throw error;
  }
}
