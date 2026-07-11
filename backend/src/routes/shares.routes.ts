import { Router } from 'express';
import { shareFile, shareFolder, getSharedFiles, updateShareStatus } from '../controllers/shares.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/share', shareFile);
router.post('/share-folder', shareFolder);
router.get('/shared-with-me', getSharedFiles);
router.patch('/:id/status', updateShareStatus);

export default router;
