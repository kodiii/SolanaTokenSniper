import { Request, Response } from 'express';
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

let botRunning = false;
let botProcess: NodeJS.Timeout | null = null;

export const getBotStatus = async (req: Request, res: Response) => {
  res.json({ status: botRunning ? 'running' : 'stopped' });
};

export const startBot = async (req: Request, res: Response) => {
  try {
    if (botRunning) {
      return res.status(400).json({ error: 'Bot is already running' });
    }

    // Start the bot process
    botRunning = true;
    logger.info('Bot started');
    
    // TODO: Replace this with actual bot logic
    botProcess = setInterval(() => {
      logger.info('Bot is running...');
      // Add your bot logic here
    }, 5000);

    res.json({ status: 'running', message: 'Bot started successfully' });
  } catch (error) {
    logger.error('Error starting bot', { 
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(500).json({ 
      error: 'Failed to start bot',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

export const stopBot = async (req: Request, res: Response) => {
  try {
    if (!botRunning) {
      return res.status(400).json({ error: 'Bot is not running' });
    }

    // Stop the bot process
    if (botProcess) {
      clearInterval(botProcess);
      botProcess = null;
    }
    
    botRunning = false;
    logger.info('Bot stopped');
    
    res.json({ status: 'stopped', message: 'Bot stopped successfully' });
  } catch (error) {
    logger.error('Error stopping bot', { 
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(500).json({ 
      error: 'Failed to stop bot',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};
