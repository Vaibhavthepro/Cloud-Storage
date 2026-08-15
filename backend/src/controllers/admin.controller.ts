import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { getStorageProvider } from '../services/storage/StorageFactory';

const storageService = getStorageProvider();
const TEMP_DIR = path.join(__dirname, '../../../storage/temp_chunks');

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        storageQuota: true,
        storageUsed: true,
        createdAt: true,
      },
    });

    // Convert BigInt to string for JSON serialization
    const serializedUsers = users.map((u) => ({
      ...u,
      storageQuota: u.storageQuota.toString(),
      storageUsed: u.storageUsed.toString(),
    }));

    res.status(200).json({
      success: true,
      data: serializedUsers,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const targetUserId = req.params.id;
    const adminId = req.user.id;

    if (targetUserId === adminId) {
      return next(new AppError('You cannot delete your own administrator account', 400));
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // 1. Find all virtual files owned by the user
    const userFiles = await prisma.file.findMany({
      where: { ownerId: targetUserId },
      include: { physicalFile: true },
    });

    // 2. Find all upload sessions owned by the user
    const userSessions = await prisma.uploadSession.findMany({
      where: { userId: targetUserId },
    });

    const pathsToDelete: string[] = [];

    // 3. Perform transactional database cleanup and gather physical files to delete
    await prisma.$transaction(async (tx) => {
      for (const file of userFiles) {
        // Decrement reference count on physical storage record
        const updatedPhysical = await tx.physicalStorage.update({
          where: { id: file.physicalId },
          data: { referenceCount: { decrement: 1 } },
        });

        // If no more files reference this physical file, queue it for disk deletion and delete DB record
        if (updatedPhysical.referenceCount <= 0) {
          await tx.physicalStorage.delete({
            where: { id: file.physicalId },
          });
          pathsToDelete.push(file.physicalFile.storagePath);
        }
      }

      // Delete the user record. This automatically cascade deletes files, folders, shares, and activity logs.
      await tx.user.delete({
        where: { id: targetUserId },
      });
    });

    // 4. Delete physical files from disk (performed after DB transaction succeeds to prevent data loss on rollback)
    for (const storagePath of pathsToDelete) {
      await storageService.delete(storagePath).catch((err) => {
        console.error(`Failed to delete physical file from disk at ${storagePath}:`, err);
      });
    }

    // 5. Delete temporary upload session folders
    for (const session of userSessions) {
      const sessionDir = path.join(TEMP_DIR, session.id);
      deleteFolderRecursive(sessionDir);
    }

    res.status(200).json({
      success: true,
      message: 'User and all associated files/data deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const deleteFolderRecursive = (dirPath: string) => {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
};

export const updateUserQuota = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetUserId = req.params.id as string;
    const { storageQuota } = req.body;

    if (storageQuota === undefined || isNaN(Number(storageQuota)) || Number(storageQuota) < 0) {
      return next(new AppError('Invalid storage quota value', 400));
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, storageUsed: true }
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const newQuota = BigInt(storageQuota);
    if (newQuota < user.storageUsed) {
      return next(new AppError(`Cannot reduce quota below current storage used`, 400));
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { storageQuota: newQuota },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        storageQuota: true,
        storageUsed: true,
        createdAt: true,
      }
    });

    res.status(200).json({
      success: true,
      message: 'User storage quota updated successfully',
      data: {
        ...updatedUser,
        storageQuota: updatedUser.storageQuota.toString(),
        storageUsed: updatedUser.storageUsed.toString(),
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getSystemLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.activityLog.findMany({
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};
