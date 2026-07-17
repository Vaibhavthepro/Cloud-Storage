import { Request, Response, NextFunction } from 'express';
import { FileService } from '../services/FileService';
import { ChunkUploadService } from '../services/ChunkUploadService';
import { AppError } from '../utils/AppError';
import prisma from '../config/db';
import { hasFolderAccess } from '../utils/permissions';

const fileService = new FileService();
const chunkUploadService = new ChunkUploadService();

export const uploadFile = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const { folderId } = req.body;
    const userId = req.user.id;

    // Check storage quota
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const defaultQuota = process.env.DEFAULT_STORAGE_QUOTA ? BigInt(process.env.DEFAULT_STORAGE_QUOTA) : BigInt(1073741824);
      if (user.storageQuota < defaultQuota) {
        user = await prisma.user.update({
          where: { id: userId },
          data: { storageQuota: defaultQuota }
        });
      }

      if (user.storageUsed + BigInt(req.file.size) > user.storageQuota) {
        return next(new AppError('Storage quota exceeded', 400));
      }
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

export const initiateChunkUpload = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const { filename, size, mimeType, folderId } = req.body;
    const userId = req.user.id;

    if (!filename || size === undefined || !mimeType) {
      return next(new AppError('Filename, size, and mimeType are required', 400));
    }

    const sessionInfo = await chunkUploadService.initiateUpload(
      userId,
      filename,
      parseInt(size, 10),
      mimeType,
      folderId
    );

    res.status(201).json({
      success: true,
      data: sessionInfo
    });
  } catch (error) {
    next(error);
  }
};

export const getChunkUploadStatus = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const { uploadId } = req.query;
    const userId = req.user.id;

    if (!uploadId) {
      return next(new AppError('uploadId query parameter is required', 400));
    }

    const status = await chunkUploadService.getUploadStatus(userId, String(uploadId));

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};

export const uploadChunk = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const uploadId = req.headers['x-upload-id'];
    const chunkIndexStr = req.headers['x-chunk-index'];
    const checksum = req.headers['x-chunk-checksum'];
    const sizeStr = req.headers['x-chunk-size'];
    const userId = req.user.id;

    if (!uploadId || chunkIndexStr === undefined || !checksum || !sizeStr) {
      return next(new AppError('x-upload-id, x-chunk-index, x-chunk-checksum, and x-chunk-size headers are required', 400));
    }

    const chunkIndex = parseInt(String(chunkIndexStr), 10);
    const size = parseInt(String(sizeStr), 10);

    await chunkUploadService.saveChunk(
      userId,
      String(uploadId),
      chunkIndex,
      String(checksum),
      size,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Chunk uploaded successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const completeChunkUpload = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const { uploadId } = req.body;
    const userId = req.user.id;

    if (!uploadId) {
      return next(new AppError('uploadId is required', 400));
    }

    const fileRecord = await chunkUploadService.completeUpload(userId, String(uploadId));

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

export const cancelChunkUpload = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const { uploadId } = req.body;
    const userId = req.user.id;

    if (!uploadId) {
      return next(new AppError('uploadId is required', 400));
    }

    await chunkUploadService.cancelUpload(userId, String(uploadId));

    res.status(200).json({
      success: true,
      message: 'Upload cancelled successfully'
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

    const rangeHeader = req.headers.range;
    let stream;
    const totalSize = Number(file.size);

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (isNaN(start) || start >= totalSize || end >= totalSize || start > end) {
        res.setHeader('Content-Range', `bytes */${totalSize}`);
        res.status(416).end();
        return;
      }

      const chunksize = (end - start) + 1;
      const downloadResult = await fileService.getDownloadStream(id, file.ownerId, { start, end });
      stream = downloadResult.stream;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${file.originalName}"`
      });
    } else {
      const downloadResult = await fileService.getDownloadStream(id, file.ownerId);
      stream = downloadResult.stream;

      res.writeHead(200, {
        'Content-Length': totalSize,
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${file.originalName}"`,
        'Accept-Ranges': 'bytes'
      });
    }

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

export const toggleStarFile = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const file = await prisma.file.findUnique({
      where: { id }
    });

    if (!file) {
      return next(new AppError('File not found', 404));
    }

    if (file.ownerId !== userId) {
      return next(new AppError('Unauthorized', 403));
    }

    const updatedFile = await prisma.file.update({
      where: { id },
      data: { starred: !file.starred }
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: updatedFile.starred ? 'STAR_FILE' : 'UNSTAR_FILE',
        entityType: 'FILE',
        entityId: id,
        entityName: file.originalName,
        ipAddress: req.ip || req.connection.remoteAddress
      }
    });

    res.status(200).json({
      success: true,
      message: updatedFile.starred ? 'File starred' : 'File unstarred',
      data: {
        ...updatedFile,
        size: updatedFile.size.toString()
      }
    });
  } catch (error) {
    next(error);
  }
};
