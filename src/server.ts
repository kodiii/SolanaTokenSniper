import express from 'express';
import { updateEnvRouter } from './api/updateEnv';
import { sellToken } from './api/sellToken';
import { getTransactions } from './api/getTransactions';
import { getLogs } from './api/getLogs';
import { startBot, stopBot, getBotStatus } from './api/botControl';
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

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    message: 'Internal Server Error',
    error: err.message
  });
});

// Create router for API routes
const apiRouter = express.Router();

// API routes
apiRouter.use('/', updateEnvRouter);
apiRouter.post('/sell-token', sellToken);
apiRouter.get('/transactions', getTransactions);
apiRouter.get('/logs', getLogs);
apiRouter.get('/bot/status', getBotStatus);
apiRouter.post('/bot/start', startBot);
apiRouter.post('/bot/stop', stopBot);

// Mount API router
app.use('/api', apiRouter);

// Health check endpoint
app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok' });
});

// Log registered routes
app._router.stack.forEach((r: any) => {
  if (r.route && r.route.path) {
    console.log(`Route: ${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
  }
});

// Export the app and port
export { app, port };
