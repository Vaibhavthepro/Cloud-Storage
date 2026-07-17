import app from './app';
import dotenv from 'dotenv';
import { ChunkUploadService } from './services/ChunkUploadService';

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Initialize and start background cleanup task
  const chunkUploadService = new ChunkUploadService();
  console.log('Starting background cleanup job for abandoned chunk uploads...');
  
  // Run once on startup
  chunkUploadService.cleanupAbandonedUploads().catch((err) => {
    console.error('Error running initial chunk cleanup:', err);
  });

  // Run every hour
  setInterval(() => {
    console.log('Running scheduled chunk upload cleanup...');
    chunkUploadService.cleanupAbandonedUploads().catch((err) => {
      console.error('Error running scheduled chunk cleanup:', err);
    });
  }, 60 * 60 * 1000);
});
