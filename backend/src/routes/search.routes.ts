import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    const userId = req.user.id;

    if (!q) {
      return res.status(200).json({ success: true, data: [] });
    }

    const searchQuery = String(q);

    const files = await prisma.file.findMany({
      where: {
        ownerId: userId,
        originalName: {
          contains: searchQuery,
          mode: 'insensitive' // Requires Prisma Client 2.15+ on Postgres
        }
      }
    });

    const folders = await prisma.folder.findMany({
      where: {
        ownerId: userId,
        name: {
          contains: searchQuery,
          mode: 'insensitive'
        }
      }
    });

    const serializedFiles = files.map(file => ({
      ...file,
      size: file.size.toString()
    }));

    res.status(200).json({
      success: true,
      data: {
        files: serializedFiles,
        folders
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
