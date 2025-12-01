import { Router } from 'express';
import { storagePut } from './storage';
import { nanoid } from 'nanoid';

const router = Router();

/**
 * Upload audio file to S3 storage
 */
router.post('/upload-audio', async (req, res) => {
  try {
    const { audioData } = req.body;
    
    if (!audioData) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');
    
    // Generate unique filename
    const filename = `audio/${nanoid()}.webm`;
    
    // Upload to S3
    const result = await storagePut(filename, audioBuffer, 'audio/webm');
    
    res.json({ url: result.url });
  } catch (error) {
    console.error('Audio upload error:', error);
    res.status(500).json({ error: 'Failed to upload audio' });
  }
});

export default router;
