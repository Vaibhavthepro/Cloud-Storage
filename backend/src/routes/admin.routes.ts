import { Router } from 'express';
import { getUsers, deleteUser, updateUserQuota, getSystemLogs } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Secure all admin routes with authentication and ADMIN role check
router.use(authenticate, authorize('ADMIN'));

router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/quota', updateUserQuota);
router.get('/logs', getSystemLogs);

export default router;
