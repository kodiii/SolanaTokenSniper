import express from 'express';
import { updateEnvRouter } from './api/updateEnv';
import { sellToken } from './api/sellToken';
import { getTransactions } from './api/getTransactions';
import { getLogs } from './api/getLogs';
import { startBot, stopBot, getBotStatus } from './api/botControl';
import { getConfig } from './api/getConfig';
import { updateConfig } from './api/updateConfig';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 45678;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// API routes
app.post('/api/sell-token', sellToken);
app.get('/api/transactions', getTransactions);
app.get('/api/logs', getLogs);
app.get('/api/bot/status', getBotStatus);
app.post('/api/bot/start', startBot);
app.post('/api/bot/stop', stopBot);
app.get('/api/config', getConfig);
app.post('/api/update-config', updateConfig);
app.use('/api', updateEnvRouter);

// Health check endpoint
app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok' });
});

// Error handling middleware - should be last
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    message: 'Internal Server Error',
    error: err.message
  });
});

// Log registered routes
app._router.stack.forEach((r: any) => {
  if (r.route && r.route.path) {
    console.log(`Route: ${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
  }
});

// Export the app and port (without starting the server)
export { app, port };
