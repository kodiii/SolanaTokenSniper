import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
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

export const getLogs = async (req: Request, res: Response) => {
  try {
    logger.info('Fetching application logs');
    const limit = parseInt(req.query.limit as string) || 100; // Default to last 100 lines
    const logFile = path.resolve(process.cwd(), 'combined.log');

    // Read the log file
    const fileContent = await fs.readFile(logFile, 'utf-8');
    const logLines = fileContent.trim().split('\n');

    // Parse and format the logs
    const formattedLogs = logLines
      .slice(-limit) // Get last N lines
      .map(line => {
        try {
          const logEntry = JSON.parse(line);
          const timestamp = new Date(logEntry.timestamp).toLocaleString();
          // Format the log message
          return {
            timestamp,
            level: logEntry.level.toUpperCase(),
            message: logEntry.message,
            ...logEntry
          };
        } catch (error) {
          return {
            timestamp: new Date().toLocaleString(),
            level: 'ERROR',
            message: `Failed to parse log line: ${line}`
          };
        }
      })
      .reverse(); // Most recent first

    res.json(formattedLogs);
    logger.info(`Successfully fetched ${formattedLogs.length} log entries`);
  } catch (error) {
    logger.error('Error fetching logs', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    res.status(500).json({ 
      error: 'Failed to fetch logs', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
};
