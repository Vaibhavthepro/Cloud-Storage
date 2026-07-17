import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import {
  uploadFile,
  downloadFile,
  deleteFile,
  getFiles,
  initiateChunkUpload,
  getChunkUploadStatus,
  uploadChunk,
  completeChunkUpload,
  cancelChunkUpload,
  toggleStarFile
} from '../controllers/files.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ dest: os.tmpdir() }); // Store temp files in OS temp dir

router.use(authenticate);

// Legacy upload
router.post('/upload', upload.single('file'), uploadFile);

// Chunk upload flow
router.post('/upload/init', initiateChunkUpload);
router.get('/upload/status', getChunkUploadStatus);
router.post('/upload/chunk', uploadChunk);
router.post('/upload/complete', completeChunkUpload);
router.post('/upload/cancel', cancelChunkUpload);

router.get('/', getFiles);
router.get('/:id/download', downloadFile);
router.delete('/:id', deleteFile);
router.patch('/:id/star', toggleStarFile);

export default router;
