import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import { uploadFile, downloadFile, deleteFile, getFiles } from '../controllers/files.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ dest: os.tmpdir() }); // Store temp files in OS temp dir

router.use(authenticate);

router.post('/upload', upload.single('file'), uploadFile);
router.get('/', getFiles);
router.get('/:id/download', downloadFile);
router.delete('/:id', deleteFile);

export default router;
