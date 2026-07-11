import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import prisma from '../config/db';
import { LocalStorageService } from './storage/LocalStorageService';
import { VirusScannerService } from './VirusScannerService';
import { AppError } from '../utils/AppError';

export class FileService {
  private storageService: LocalStorageService;
  private virusScanner: VirusScannerService;

  constructor() {
    this.storageService = new LocalStorageService();
    this.virusScanner = new VirusScannerService();
  }

  private calculateHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  public async handleUpload(
    userId: string,
    file: Express.Multer.File,
    folderId?: string
  ) {
    const tempPath = file.path;

    try {
      // 1. Virus Scanning
      const { isInfected, viruses } = await this.virusScanner.scanFile(tempPath);
      
      if (isInfected) {
        // Log virus detection
        // For a real system, you might want to create a dummy file record to link the log to,
        // or log it against the user directly.
        await prisma.activityLog.create({
          data: {
            userId,
            action: 'VIRUS_DETECTED',
            entityType: 'FILE',
            ipAddress: 'System', // Could pass from req
          }
        });
        
        fs.unlinkSync(tempPath); // Delete infected file
        throw new AppError(`File is infected with virus: ${viruses.join(', ')}`, 400);
      }

      // 2. Duplicate Detection (Calculate Hash)
      const fileHash = await this.calculateHash(tempPath);
      const size = BigInt(file.size);

      // Check if physical file exists
      let physicalStorage = await prisma.physicalStorage.findUnique({
        where: { hash: fileHash }
      });

      if (physicalStorage) {
        // Increment reference count and delete temp file since we don't need it
        physicalStorage = await prisma.physicalStorage.update({
          where: { id: physicalStorage.id },
          data: { referenceCount: { increment: 1 } }
        });
        fs.unlinkSync(tempPath);
      } else {
        // Move temp file to permanent storage
        const permanentPath = path.join('uploads', `${fileHash}-${file.originalname}`);
        const readStream = fs.createReadStream(tempPath);
        await this.storageService.upload(permanentPath, readStream);
        fs.unlinkSync(tempPath);
        
        // Create new physical storage record
        physicalStorage = await prisma.physicalStorage.create({
          data: {
            hash: fileHash,
            storagePath: permanentPath,
            size: size
          }
        });
      }

      // 3. Create virtual File record linked to physical storage
      const extension = path.extname(file.originalname).substring(1);
      
      const newFile = await prisma.file.create({
        data: {
          originalName: file.originalname,
          mimeType: file.mimetype,
          extension,
          size: size,
          isInfected: false,
          ownerId: userId,
          physicalId: physicalStorage.id,
          folderId: folderId || null
        }
      });

      // Update user storage used
      if (!physicalStorage.referenceCount || physicalStorage.referenceCount === 1) {
         // Only bill user quota if they uploaded a unique file? 
         // Actually, cloud providers usually bill for the virtual size. 
         // Let's bill them for the virtual size.
         await prisma.user.update({
           where: { id: userId },
           data: { storageUsed: { increment: size } }
         });
      }

      await prisma.activityLog.create({
        data: {
          userId,
          action: 'UPLOAD_FILE',
          entityType: 'FILE',
          entityId: newFile.id
        }
      });

      return newFile;
    } catch (error) {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw error;
    }
  }

  public async getDownloadStream(fileId: string, userId: string): Promise<{ stream: NodeJS.ReadableStream, filename: string, mimeType: string }> {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: { physicalFile: true }
    });

    if (!file) {
      throw new AppError('File not found', 404);
    }

    // Check ownership or if shared
    // Simplified for now, just check ownership
    if (file.ownerId !== userId) {
        throw new AppError('Unauthorized access to file', 403);
    }

    const stream = await this.storageService.download(file.physicalFile.storagePath);
    return { stream, filename: file.originalName, mimeType: file.mimeType };
  }

  public async deleteFile(fileId: string, userId: string) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: { physicalFile: true }
    });

    if (!file) {
      throw new AppError('File not found', 404);
    }

    if (file.ownerId !== userId) {
      throw new AppError('Unauthorized access to file', 403);
    }

    await prisma.$transaction(async (tx) => {
      // Delete virtual file
      await tx.file.delete({ where: { id: fileId } });

      // Update user quota
      await tx.user.update({
        where: { id: userId },
        data: { storageUsed: { decrement: file.size } }
      });

      // Decrement physical reference count
      const updatedPhysical = await tx.physicalStorage.update({
        where: { id: file.physicalId },
        data: { referenceCount: { decrement: 1 } }
      });

      // If reference count is 0, delete physical file
      if (updatedPhysical.referenceCount <= 0) {
        await tx.physicalStorage.delete({ where: { id: file.physicalId } });
        await this.storageService.delete(file.physicalFile.storagePath);
      }

      await tx.activityLog.create({
        data: {
          userId,
          action: 'DELETE_FILE',
          entityType: 'FILE',
          entityId: fileId
        }
      });
    });

    return true;
  }
}
