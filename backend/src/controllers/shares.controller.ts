import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import prisma from '../config/db';

export const shareFile = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const { fileId, email } = req.body;
    const userId = req.user.id;

    if (!fileId || !email) {
      return next(new AppError('File ID and target email are required', 400));
    }

    // Verify the file exists and is owned by the current user
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file) {
      return next(new AppError('File not found', 404));
    }
    if (file.ownerId !== userId) {
      return next(new AppError('You do not have permission to share this file', 403));
    }

    // Find the target user by email
    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      return next(new AppError('User with this email not found', 404));
    }

    if (targetUser.id === userId) {
      return next(new AppError('You cannot share a file with yourself', 400));
    }

    // Create or update the share
    const share = await prisma.userShare.upsert({
      where: {
        fileId_sharedWithId: {
          fileId,
          sharedWithId: targetUser.id
        }
      },
      update: {},
      create: {
        fileId,
        sharedById: userId,
        sharedWithId: targetUser.id
      }
    });

    res.status(200).json({
      success: true,
      message: 'File shared successfully',
      data: share
    });
  } catch (error) {
    next(error);
  }
};

export const getSharedFiles = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;

    const fileShares = await prisma.userShare.findMany({
      where: { sharedWithId: userId },
      include: {
        file: true,
        sharedBy: {
          select: { name: true, email: true }
        }
      }
    });

    const folderShares = await prisma.userFolderShare.findMany({
      where: { sharedWithId: userId },
      include: {
        folder: true,
        sharedBy: {
          select: { name: true, email: true }
        }
      }
    });

    // Format the response similarly to standard getFiles
    const sharedFiles = fileShares.map(share => ({
      id: share.file?.id,
      shareId: share.id,
      type: 'file',
      originalName: share.file?.originalName,
      size: share.file?.size.toString(),
      mimeType: share.file?.mimeType,
      updatedAt: share.file?.updatedAt,
      sharedBy: share.sharedBy.name,
      sharedByEmail: share.sharedBy.email,
      sharedAt: share.createdAt,
      status: share.status
    })).filter(f => f.id);

    const sharedFolders = folderShares.map(share => ({
      id: share.folder?.id,
      shareId: share.id,
      type: 'folder',
      originalName: share.folder?.name,
      size: '0',
      mimeType: 'folder',
      updatedAt: share.folder?.updatedAt,
      sharedBy: share.sharedBy.name,
      sharedByEmail: share.sharedBy.email,
      sharedAt: share.createdAt,
      status: share.status
    })).filter(f => f.id);

    const allShares = [...sharedFiles, ...sharedFolders].sort((a, b) => new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime());

    res.status(200).json({
      success: true,
      data: allShares
    });
  } catch (error) {
    next(error);
  }
};

export const updateShareStatus = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!['ACCEPTED', 'DECLINED'].includes(status)) {
      return next(new AppError('Invalid status', 400));
    }

    let share = await prisma.userShare.findUnique({ where: { id } });
    let isFolder = false;
    
    if (!share) {
      const folderShare = await prisma.userFolderShare.findUnique({ where: { id } });
      if (folderShare) {
        share = folderShare as any;
        isFolder = true;
      }
    }

    if (!share) {
      return next(new AppError('Share not found', 404));
    }
    if (share.sharedWithId !== userId) {
      return next(new AppError('Unauthorized', 403));
    }

    let updatedShare;
    if (isFolder) {
      updatedShare = await prisma.userFolderShare.update({
        where: { id },
        data: { status }
      });
    } else {
      updatedShare = await prisma.userShare.update({
        where: { id },
        data: { status }
      });
    }

    res.status(200).json({
      success: true,
      message: `Transfer request ${status.toLowerCase()}`,
      data: updatedShare
    });
  } catch (error) {
    next(error);
  }
};

export const shareFolder = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const { folderId, email } = req.body;
    const userId = req.user.id;

    if (!folderId || !email) {
      return next(new AppError('Folder ID and target email are required', 400));
    }

    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) {
      return next(new AppError('Folder not found', 404));
    }
    if (folder.ownerId !== userId) {
      return next(new AppError('You do not have permission to share this folder', 403));
    }

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      return next(new AppError('User with this email not found', 404));
    }

    if (targetUser.id === userId) {
      return next(new AppError('You cannot share a folder with yourself', 400));
    }

    const share = await prisma.userFolderShare.upsert({
      where: {
        folderId_sharedWithId: {
          folderId,
          sharedWithId: targetUser.id
        }
      },
      update: {},
      create: {
        folderId,
        sharedById: userId,
        sharedWithId: targetUser.id
      }
    });

    res.status(200).json({
      success: true,
      message: 'Folder shared successfully',
      data: share
    });
  } catch (error) {
    next(error);
  }
};
