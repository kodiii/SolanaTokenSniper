import { Request, Response } from 'express';
import { config } from '../config';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import winston from 'winston';

// Configure logging
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

export const getTransactions = async (req: Request, res: Response) => {
  try {
    logger.info('Opening database connection');
    // Open the database
    const db = await open({
      filename: config.swap.db_name_tracker_holdings,
      driver: sqlite3.Database
    });

    logger.info('Fetching transactions from database');
    // Fetch transactions with calculated fields
    const transactions = await db.all(`
      SELECT 
        Token as token,
        Token as tokenAddress,
        SolPaid as buyPrice,
        COALESCE(SolPaid * 0.95, SolPaid) as stopLoss,
        SolPaidUSDC as soldPrice,
        CASE 
          WHEN SolPaidUSDC IS NOT NULL 
          THEN ((SolPaidUSDC - SolPaid) / NULLIF(SolPaid, 0)) * 100
          ELSE 0 
        END as pnl,
        CASE 
          WHEN SolPaidUSDC IS NOT NULL THEN 'closed' 
          ELSE 'open' 
        END as status
      FROM holdings
      ORDER BY Time DESC
    `);

    // Close the database connection
    await db.close();
    logger.info(`Found ${transactions.length} transactions`);

    // Format the response to match the frontend interface
    const formattedTransactions = transactions.map(tx => ({
      token: tx.token,
      tokenAddress: tx.tokenAddress,
      buyPrice: Number(tx.buyPrice),
      stopLoss: Number(tx.stopLoss),
      soldPrice: tx.soldPrice ? Number(tx.soldPrice) : null,
      pnl: Number(tx.pnl.toFixed(2)), // Round to 2 decimal places
      status: tx.status as 'open' | 'closed'
    }));

    // Send response
    res.json(formattedTransactions);
    logger.info('Successfully sent transactions response');
  } catch (error) {
    logger.error('Error fetching transactions', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    res.status(500).json({ 
      error: 'Failed to fetch transactions', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
};
