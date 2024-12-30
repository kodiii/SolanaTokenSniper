import express from 'express';
import { updateEnvRouter } from './api/updateEnv';
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

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    message: 'Internal Server Error',
    error: err.message
  });
});

// Routes
app.use('/api', updateEnvRouter);

// Health check endpoint
app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok' });
});

// Export the app and port without starting the server
export { app, port };
