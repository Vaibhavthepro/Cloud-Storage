import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageUsed: true, storageQuota: true }
    });

    const fileCount = await prisma.file.count({ where: { ownerId: userId } });
    const folderCount = await prisma.folder.count({ where: { ownerId: userId } });
    const totalUsers = await prisma.user.count();
    const recentActivity = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    res.status(200).json({
      success: true,
      data: {
        storageUsed: user?.storageUsed.toString(),
        storageQuota: user?.storageQuota.toString(),
        fileCount,
        folderCount,
        totalUsers,
        recentActivity
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
