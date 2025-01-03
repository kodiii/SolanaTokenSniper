import { app, port } from './server';
import { initializeWebSocket, getWebSocketConnection } from './services/websocket';
import { logger } from './services/logger';
import { config } from './config';
import { WebSocketRequest } from "./types";
import { fetchTransactionDetails, createSwapTransaction, getRugCheckConfirmed, fetchAndSaveSwapDetails } from "./transactions";
import WebSocket from 'ws';

// Function used to open our websocket connection
function sendRequest(ws: WebSocket): void {
  const request: WebSocketRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "liquidityPoolsSubscribe",
    params: [
      {
        ignoreList: [], // Ignore list for tokens we don't want to trade
        swapPrograms: ["675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"], // Raydium CLMM Program ID
      },
    ],
  };
  ws.send(JSON.stringify(request));
}

// Start HTTP server
const server = app.listen(port, () => {
  logger.info(`Application Startup`, {
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
});

let init = false;
async function websocketHandler(): Promise<void> {
  try {
    const ws = getWebSocketConnection();
    if (!ws) {
      logger.error('No WebSocket connection available');
      return;
    }

    if (!init) console.clear();

    // Logic for the message event for the .on event listener
    ws.on("message", async (data: WebSocket.Data) => {
      try {
        const jsonString = data.toString(); // Convert data to a string
        const parsedData = JSON.parse(jsonString); // Parse the JSON string

        // Check if we have a result object
        if (!parsedData.params?.result) return;

        // Get the signature and check if it's a create transaction
        const {
          signature,
          type,
          innerInstructions,
          timestamp,
        } = parsedData.params.result;

        // Check if we have a create transaction
        const containsCreate = type.includes("CREATE");
        if (!containsCreate || typeof signature !== "string") return;

        // Stop the websocket from listening and restarting
        ws.close(1000, "Handling transactions.");

        logger.info('New Liquidity Pool found', { 
          signature, 
          type,
          timestamp 
        });

        // Get transaction details
        const txDetails = await fetchTransactionDetails(signature);
        if (!txDetails) {
          logger.error('Failed to fetch transaction details', { signature });
          return;
        }

        // Get rug check confirmation
        const rugCheckConfirmed = await getRugCheckConfirmed(txDetails.tokenMint || null);

        if (!rugCheckConfirmed) {
          logger.error('Rug check failed', { 
            tokenMint: txDetails.tokenMint 
          });
          return;
        }

        // Create swap transaction
        const swapTx = await createSwapTransaction(
          txDetails.solMint || '',
          txDetails.tokenMint || ''
        );

        if (!swapTx) {
          logger.error('Failed to create swap transaction', { 
            tokenMint: txDetails.tokenMint 
          });
          return;
        }

        // Save swap details
        await fetchAndSaveSwapDetails(
          signature,
          txDetails.tokenMint || '',
          swapTx,
          txDetails.tokenDecimals || 0
        );

        logger.info('Transaction processed successfully', { 
          signature,
          tokenMint: txDetails.tokenMint 
        });

      } catch (error) {
        logger.error('Error processing message', { 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // Handle WebSocket errors
    ws.on("error", (error: Error) => {
      logger.error('WebSocket error', { 
        error: error.message,
        stack: error.stack
      });
      setTimeout(websocketHandler, 5000);
    });

    // Handle WebSocket close
    ws.on("close", () => {
      logger.info('WebSocket is closed. Restarting in 5 seconds');
      setTimeout(websocketHandler, 5000);
    });

    // Send initial request
    sendRequest(ws);
    init = true;
  } catch (error) {
    logger.error('Error in websocket handler:', error);
    setTimeout(websocketHandler, 5000);
  }
}

export { server, websocketHandler };
