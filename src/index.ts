import WebSocket from "ws"; // Node.js websocket library
import dotenv from "dotenv"; // zero-dependency module that loads environment variables from a .env
import { WebSocketRequest } from "./types"; // Typescript Types for type safety
import { config } from "./config"; // Configuration parameters for our bot
import { fetchTransactionDetails, createSwapTransaction, getRugCheckConfirmed, fetchAndSaveSwapDetails } from "./transactions";
import { app, port } from './server';
import winston from 'winston';
import path from 'path';

// Configure Winston logger with absolute file paths
const logger = winston.createLogger({
  level: 'debug', // Changed to debug to capture more logs
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.resolve(process.cwd(), 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.resolve(process.cwd(), 'combined.log') 
    }),
    new winston.transports.Console({ 
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Global error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { 
    error: error.message, 
    stack: error.stack 
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { 
    reason: reason instanceof Error ? reason.message : String(reason),
    promise: promise.toString()
  });
});

// Load environment variables from the .env file
dotenv.config();

// Log startup information
logger.info('Application Startup', {
  environment: process.env.NODE_ENV || 'development',
  pid: process.pid,
  platform: process.platform,
  nodeVersion: process.version
});

// Start the HTTP server
app.listen(port, () => {
  logger.info(`HTTP Server running on port ${port}`, {
    port,
    wsUri: process.env.HELIUS_WSS_URI
  });
});

// Function used to open our websocket connection
function sendRequest(ws: WebSocket): void {
  const request: WebSocketRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "logsSubscribe",
    params: [
      {
        mentions: [config.liquidity_pool.radiyum_program_id],
      },
      {
        commitment: "processed", // Can use finalized to be more accurate.
      },
    ],
  };
  ws.send(JSON.stringify(request));
}

let init = false;
async function websocketHandler(): Promise<void> {
  // Create a WebSocket connection
  let ws: WebSocket | null = new WebSocket(process.env.HELIUS_WSS_URI || "");
  let transactionOngoing = false;
  if (!init) console.clear();

  // Send subscription to the websocket once the connection is open
  ws.on("open", () => {
    if (ws) {
      try {
        sendRequest(ws); // Send a request once the WebSocket is open
        logger.info('WebSocket is open and listening', { 
          wsUri: process.env.HELIUS_WSS_URI 
        });
      } catch (error) {
        logger.error('Error sending WebSocket request', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
    init = true;
  });

  // Logic for the message event for the .on event listener
  ws.on("message", async (data: WebSocket.Data) => {
    try {
      const jsonString = data.toString(); // Convert data to a string
      const parsedData = JSON.parse(jsonString); // Parse the JSON string

      logger.debug('WebSocket message received', { 
        parsedData 
      });

      // Safely access the nested structure
      const logs = parsedData?.params?.result?.value?.logs;
      const signature = parsedData?.params?.result?.value?.signature;

      // Validate `logs` is an array
      if (Array.isArray(logs)) {
        const containsCreate = logs.some((log: string) => typeof log === "string" && log.includes("Program log: initialize2: InitializeInstruction2"));

        if (!containsCreate || typeof signature !== "string") return;

        // Stop the websocket from listening and restarting
        transactionOngoing = true;
        if (ws) ws.close(1000, "Handing transactions.");

        logger.info('New Liquidity Pool found', { 
          signature, 
          logs 
        });

        // Fetch the transaction details
        logger.info('Fetching transaction details');
        const data = await fetchTransactionDetails(signature);

        // Abort and restart socket
        if (!data) {
          logger.warn('Transaction aborted. No transaction data returned');
          return websocketHandler();
        }

        // Ensure required data is available
        if (!data.solMint || !data.tokenMint) {
          logger.warn('Missing solMint or tokenMint', { 
            solMint: data.solMint, 
            tokenMint: data.tokenMint 
          });
          return websocketHandler();
        }

        // Check rug check
        const isRugCheckPassed = await getRugCheckConfirmed(data.tokenMint);
        if (!isRugCheckPassed) {
          logger.warn('Rug Check not passed', { 
            tokenMint: data.tokenMint 
          });
          return websocketHandler();
        }

        // Handle ignored tokens
        if (data.tokenMint.trim().toLowerCase().endsWith("pump") && config.liquidity_pool.ignore_pump_fun) {
          logger.info('Skipping Pump.fun token', { 
            tokenMint: data.tokenMint 
          });
          return websocketHandler();
        }

        logger.info('Token found', { 
          tokenMint: data.tokenMint,
          tokenUrl: `https://gmgn.ai/sol/token/${data.tokenMint}`
        });

        const tx = await createSwapTransaction(data.solMint, data.tokenMint);

        // Abort and restart socket
        if (!tx) {
          logger.warn('Transaction aborted. No valid transaction id returned');
          return websocketHandler();
        }

        logger.info('Swap quote received', { 
          transaction: `https://solscan.io/tx/${tx}` 
        });

        // Fetch and store the transaction for tracking purposes
        const saveConfirmation = await fetchAndSaveSwapDetails(tx);
        if (!saveConfirmation) {
          logger.warn('Transaction not saved for tracking');
        }

        //Start Websocket to listen for new tokens
        return websocketHandler();
      }
    } catch (error) {
      logger.error('Error parsing JSON or processing data', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
    }
  });

  // Handle WebSocket errors
  ws.on("error", (error: Error) => {
    logger.error('WebSocket error', { 
      error: error.message,
      stack: error.stack
    });
    ws = null;
    setTimeout(websocketHandler, 5000);
  });

  // Handle WebSocket closure
  ws.on("close", () => {
    logger.info('WebSocket is closed. Restarting in 5 seconds');
    ws = null;
    setTimeout(websocketHandler, 5000);
  });
}

// Start the WebSocket handler
websocketHandler();
