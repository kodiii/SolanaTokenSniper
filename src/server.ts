import express from 'express';
import { updateEnvRouter } from './api/updateEnv';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Routes
app.use('/api', updateEnvRouter);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
