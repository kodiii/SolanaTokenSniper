import WebSocket from 'ws';
import { logger } from './logger';
import { WebSocketRequest } from '../types';

let wsConnection: WebSocket | null = null;

export const initializeWebSocket = async (): Promise<{ success: boolean; error?: string; wsConnection?: WebSocket }> => {
  try {
    if (!process.env.HELIUS_WSS_URI) {
      return { success: false, error: 'WebSocket URI not configured' };
    }

    if (wsConnection) {
      wsConnection.close();
    }

    return new Promise((resolve) => {
      const ws = new WebSocket(process.env.HELIUS_WSS_URI!);

      const timeout = setTimeout(() => {
        ws.close();
        resolve({ success: false, error: 'WebSocket connection timeout' });
      }, 10000); // 10 second timeout

      ws.on('open', () => {
        clearTimeout(timeout);
        wsConnection = ws;
        resolve({ success: true, wsConnection: ws });
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        logger.error('WebSocket connection error:', error);
        resolve({ success: false, error: error.message });
      });
    });
  } catch (error) {
    logger.error('WebSocket initialization error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error initializing WebSocket' 
    };
  }
};

export const getWebSocketConnection = () => wsConnection;
