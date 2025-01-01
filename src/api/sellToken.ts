import { Request, Response } from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import { createSellTransaction } from '../transactions';
import { config } from '../config';
import winston from 'winston';

// Configure Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({ format: winston.format.simple() })
    ]
});

export const sellToken = async (req: Request, res: Response) => {
    try {
        logger.info('Sell Token Request Received', { 
            body: req.body,
            headers: req.headers
        });

        const { tokenAddress, walletAddress } = req.body;

        if (!tokenAddress || !walletAddress) {
            logger.warn('Missing required parameters', { 
                tokenAddress, 
                walletAddress 
            });
            return res.status(400).json({
                error: 'Missing required parameters: tokenAddress or walletAddress'
            });
        }

        logger.info('Establishing Solana Connection', { 
            rpcEndpoint: process.env.HELIUS_HTTPS_URI 
        });
        const connection = new Connection(process.env.HELIUS_HTTPS_URI || "");

        logger.info('Creating Sell Transaction', { 
            tokenAddress, 
            walletAddress 
        });
        // Create and execute sell transaction
        const result = await createSellTransaction(
            new PublicKey(tokenAddress),
            new PublicKey(walletAddress),
            connection,
            config
        );

        logger.info('Sell Transaction Result', { 
            success: result.success, 
            signature: result.signature,
            error: result.error
        });

        if (!result.success) {
            return res.status(400).json({
                error: result.error || 'Failed to sell token'
            });
        }

        res.json({
            message: 'Token sold successfully',
            signature: result.signature
        });
    } catch (error) {
        logger.error('Sell Token Error', { 
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : 'No stack trace'
        });
        res.status(500).json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};
