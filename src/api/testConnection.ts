import { Request, Response } from 'express';
import { initializeWebSocket } from '../services/websocket';

export const testConnection = async (req: Request, res: Response) => {
  try {
    const result = await initializeWebSocket();
    if (result.success) {
      res.json({ success: true, message: 'WebSocket connection successful' });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error || 'Failed to establish WebSocket connection' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error testing connection' 
    });
  }
};
