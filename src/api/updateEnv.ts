import express from 'express';
import fs from 'fs';
import path from 'path';

const router: express.Router = express.Router();

router.post('/update-env', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    console.log('Received request to update .env file');
    const { content } = req.body;
    
    if (!content) {
      console.error('No content provided in request body');
      return res.status(400).json({ message: 'Content is required' });
    }

    // Get the absolute path to the .env file
    const envPath = path.resolve(process.cwd(), '.env');
    console.log('Writing to .env file at:', envPath);
    
    // Create a backup of the current .env file
    const backupPath = path.resolve(process.cwd(), '.env.backup');
    if (fs.existsSync(envPath)) {
      console.log('Creating backup at:', backupPath);
      await fs.promises.copyFile(envPath, backupPath);
    }

    // Ensure the directory exists
    const envDir = path.dirname(envPath);
    if (!fs.existsSync(envDir)) {
      console.log('Creating directory:', envDir);
      await fs.promises.mkdir(envDir, { recursive: true });
    }

    // Write the new content to the .env file
    await fs.promises.writeFile(envPath, content, 'utf8');
    console.log('.env file updated successfully');

    // Reload environment variables
    require('dotenv').config();

    return res.status(200).json({ 
      message: '.env file updated successfully',
      path: envPath
    });
  } catch (error) {
    console.error('Error updating .env file:', error);
    next(error); // Pass error to error handling middleware
  }
});

export const updateEnvRouter: express.Router = router;
