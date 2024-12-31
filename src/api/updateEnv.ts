import express from 'express';
import fs from 'fs';
import path from 'path';

const router: express.Router = express.Router();

// GET endpoint to read current environment settings
router.get('/update-env', async (req: express.Request, res: express.Response) => {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    console.log('Reading .env file from:', envPath);
    
    if (!fs.existsSync(envPath)) {
      console.log('.env file not found');
      return res.status(404).json({ message: 'Environment file not found' });
    }

    const envContent = await fs.promises.readFile(envPath, 'utf8');
    const envVars: { [key: string]: string } = {};
    
    // Parse the .env file content
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    });

    console.log('Successfully read .env file');
    res.json({ content: envVars });
  } catch (error: unknown) {
    console.error('Error reading .env file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ message: 'Error reading environment settings', error: errorMessage });
  }
});

router.post('/update-env', async (req: express.Request, res: express.Response) => {
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

    // Write the new content
    await fs.promises.writeFile(envPath, content);
    console.log('Successfully updated .env file');
    
    res.json({ message: 'Environment file updated successfully' });
  } catch (error: unknown) {
    console.error('Error updating .env file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ message: 'Error updating environment settings', error: errorMessage });
  }
});

export const updateEnvRouter = router;
