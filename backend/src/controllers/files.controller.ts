import { Request, Response, NextFunction } from 'express';
import { FileService } from '../services/FileService';
import { AppError } from '../utils/AppError';
import prisma from '../config/db';
import { hasFolderAccess } from '../utils/permissions';

const fileService = new FileService();

export const uploadFile = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const { folderId } = req.body;
    const userId = req.user.id;

    // Check storage quota
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.storageUsed + BigInt(req.file.size) > user.storageQuota) {
      return next(new AppError('Storage quota exceeded', 400));
    }

    const fileRecord = await fileService.handleUpload(userId, req.file, folderId);

    // Convert BigInt for JSON serialization
    const responseFile = {
      ...fileRecord,
      size: fileRecord.size.toString()
    };

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: responseFile
    });
  } catch (error) {
    next(error);
  }
};

export const getFiles = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.query;

    if (folderId) {
      const hasAccess = await hasFolderAccess(String(folderId), userId);
      if (!hasAccess) return next(new AppError('Unauthorized', 403));
    }

    const files = await prisma.file.findMany({
      where: {
        folderId: folderId ? String(folderId) : null,
        ...(folderId ? {} : { ownerId: userId })
      }
    });

    const serializedFiles = files.map(file => ({
      ...file,
      size: file.size.toString()
    }));

    res.status(200).json({
      success: true,
      data: serializedFiles
    });
  } catch (error) {
    next(error);
  }
};

export const downloadFile = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user owns the file or if it's shared with them
    const file = await prisma.file.findUnique({
      where: { id },
      include: { userShares: { where: { sharedWithId: userId } } }
    });

    if (!file) {
      return next(new AppError('File not found', 404));
    }

    if (file.ownerId !== userId && file.userShares.length === 0) {
      return next(new AppError('Unauthorized to download this file', 403));
    }

    // Now proceed to get the download stream (bypass ownership check inside service if possible, or we may need to adjust FileService too)
    const { stream, filename, mimeType } = await fileService.getDownloadStream(id, file.ownerId);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', mimeType);

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await fileService.deleteFile(id, userId);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
