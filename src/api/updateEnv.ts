import express from 'express';
import fs from 'fs';
import path from 'path';

const router: express.Router = express.Router();

router.post('/update-env', (req: express.Request, res: express.Response) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const envPath = path.join(process.cwd(), '.env');
    fs.writeFileSync(envPath, content);

    return res.status(200).json({ message: '.env file updated successfully' });
  } catch (error) {
    console.error('Error updating .env file:', error);
    return res.status(500).json({ message: 'Failed to update .env file' });
  }
});

export const updateEnvRouter: express.Router = router;
