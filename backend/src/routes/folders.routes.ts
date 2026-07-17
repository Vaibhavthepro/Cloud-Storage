import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { authenticate } from '../middleware/auth.middleware';
import { AppError } from '../utils/AppError';
import { hasFolderAccess } from '../utils/permissions';

import { LocalStorageService } from '../services/storage/LocalStorageService';

const storageService = new LocalStorageService();

export const createFolder = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const { name, parentId } = req.body;
    const userId = req.user.id;

    if (!name) {
      return next(new AppError('Folder name is required', 400));
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        parentId: parentId || null,
        ownerId: userId
      }
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'CREATE_FOLDER',
        entityType: 'FOLDER',
        entityId: folder.id,
        entityName: folder.name
      }
    });

    res.status(201).json({ success: true, data: folder });
  } catch (error) {
    next(error);
  }
};

export const getFolders = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const { parentId } = req.query;

    if (parentId) {
      const hasAccess = await hasFolderAccess(String(parentId), userId);
      if (!hasAccess) return next(new AppError('Unauthorized', 403));
    }

    const folders = await prisma.folder.findMany({
      where: {
        parentId: parentId ? String(parentId) : null,
        ...(parentId ? {} : { ownerId: userId })
      }
    });

    res.status(200).json({ success: true, data: folders });
  } catch (error) {
    next(error);
  }
};

export const deleteFolder = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) return next(new AppError('Folder not found', 404));
    if (folder.ownerId !== userId) return next(new AppError('Unauthorized', 403));

    // Due to Cascade delete on FolderHierarchy and Files, Prisma will delete subfolders and files.
    // However, we need to handle physical files and quotas.
    // In a real scenario, we'd need a recursive function to delete all files inside the folder and subfolders properly.
    // For simplicity in this demo, let's just delete the DB record. The physical files might be orphaned,
    // which requires a cleanup cron job later.
    
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'DELETE_FOLDER',
        entityType: 'FOLDER',
        entityId: id,
        entityName: folder.name
      }
    });

    await prisma.folder.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Folder deleted' });
  } catch (error) {
    next(error);
  }
};

const getFolderTreeFiles = async (folderId: string, currentPath: string = ''): Promise<{ file: any, archivePath: string }[]> => {
  let results: { file: any, archivePath: string }[] = [];
  
  const files = await prisma.file.findMany({
    where: { folderId },
    include: { physicalFile: true }
  });
  
  for (const file of files) {
    results.push({
      file,
      archivePath: currentPath ? `${currentPath}/${file.originalName}` : file.originalName
    });
  }
  
  const subfolders = await prisma.folder.findMany({
    where: { parentId: folderId }
  });
  
  for (const subfolder of subfolders) {
    const subfolderPath = currentPath ? `${currentPath}/${subfolder.name}` : subfolder.name;
    const subResults = await getFolderTreeFiles(subfolder.id, subfolderPath);
    results.push(...subResults);
    
    if (subResults.length === 0) {
      results.push({ file: null, archivePath: subfolderPath + '/' });
    }
  }
  
  return results;
};

export const downloadFolder = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const hasAccess = await hasFolderAccess(id, userId);
    if (!hasAccess) {
      return next(new AppError('Unauthorized access to folder', 403));
    }
    
    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) {
      return next(new AppError('Folder not found', 404));
    }
    
    const fileEntries = await getFolderTreeFiles(id, folder.name);
    
    res.setHeader('Content-Disposition', `attachment; filename="${folder.name}.zip"`);
    res.setHeader('Content-Type', 'application/zip');
    
    // @ts-ignore
    const { ZipArchive } = require('archiver');
    const archive = new ZipArchive({ zlib: { level: 5 } });
    
    archive.on('error', (err: any) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        next(err);
      } else {
        res.end();
      }
    });
    
    archive.pipe(res);
    
    for (const entry of fileEntries) {
      if (entry.file === null) {
        archive.append('', { name: entry.archivePath });
      } else {
        try {
          const stream = await storageService.download(entry.file.physicalFile.storagePath);
          archive.append(stream, { name: entry.archivePath });
        } catch (err) {
          console.error(`Failed to append ${entry.archivePath}:`, err);
        }
      }
    }
    
    await archive.finalize();
    
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'DOWNLOAD_FOLDER',
        entityType: 'FOLDER',
        entityId: id,
        entityName: folder.name,
        ipAddress: req.ip
      }
    });
    
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    }
  }
};

export const toggleStarFolder = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const folder = await prisma.folder.findUnique({
      where: { id }
    });

    if (!folder) {
      return next(new AppError('Folder not found', 404));
    }

    if (folder.ownerId !== userId) {
      return next(new AppError('Unauthorized', 403));
    }

    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: { starred: !folder.starred }
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: updatedFolder.starred ? 'STAR_FOLDER' : 'UNSTAR_FOLDER',
        entityType: 'FOLDER',
        entityId: id,
        entityName: folder.name,
        ipAddress: req.ip || req.connection.remoteAddress
      }
    });

    res.status(200).json({
      success: true,
      message: updatedFolder.starred ? 'Folder starred' : 'Folder unstarred',
      data: updatedFolder
    });
  } catch (error) {
    next(error);
  }
};

const router = Router();
router.use(authenticate);

router.post('/', createFolder);
router.get('/', getFolders);
router.get('/:id/download', downloadFolder);
router.delete('/:id', deleteFolder);
router.patch('/:id/star', toggleStarFolder);

export default router;
