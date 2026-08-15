import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import prisma from '../config/db';
import { StorageProvider } from './storage/StorageProvider';
import { getStorageProvider } from './storage/StorageFactory';
import { VirusScannerService } from './VirusScannerService';
import { AppError } from '../utils/AppError';

const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : 5 * 1024 * 1024 * 1024; // Default: 5 GB
const CHUNK_SIZE = process.env.CHUNK_SIZE ? parseInt(process.env.CHUNK_SIZE) : 10 * 1024 * 1024; // Default: 10 MB
const TEMP_DIR = path.join(__dirname, '../../../storage/temp_chunks');

export class ChunkUploadService {
  private storageService: StorageProvider;
  private virusScanner: VirusScannerService;

  constructor() {
    this.storageService = getStorageProvider();
    this.virusScanner = new VirusScannerService();
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
  }

  public async initiateUpload(
    userId: string,
    filename: string,
    size: number,
    mimeType: string,
    folderId?: string
  ) {
    if (size > MAX_FILE_SIZE) {
      throw new AppError(`File exceeds maximum upload size of ${MAX_FILE_SIZE / (1024 * 1024 * 1024)} GB`, 400);
    }

    // Check user storage quota
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const defaultQuota = process.env.DEFAULT_STORAGE_QUOTA ? BigInt(process.env.DEFAULT_STORAGE_QUOTA) : BigInt(1073741824);
    if (user.storageQuota < defaultQuota) {
      user = await prisma.user.update({
        where: { id: userId },
        data: { storageQuota: defaultQuota }
      });
    }

    if (user.storageUsed + BigInt(size) > user.storageQuota) {
      throw new AppError('Storage quota exceeded', 400);
    }

    const totalChunks = Math.ceil(size / CHUNK_SIZE);
    const extension = path.extname(filename).substring(1);

    const session = await prisma.uploadSession.create({
      data: {
        userId,
        filename,
        mimeType,
        extension,
        size: BigInt(size),
        folderId: folderId || null,
        chunkSize: CHUNK_SIZE,
        totalChunks,
        status: 'PENDING',
      },
    });

    // Bulk insert chunk metadata
    const chunksData = Array.from({ length: totalChunks }).map((_, i) => ({
      sessionId: session.id,
      chunkIndex: i,
      size: i === totalChunks - 1 ? size - i * CHUNK_SIZE : CHUNK_SIZE,
      checksum: '',
      isUploaded: false,
    }));

    await prisma.uploadChunk.createMany({
      data: chunksData,
    });

    return {
      uploadId: session.id,
      chunkSize: CHUNK_SIZE,
      totalChunks,
    };
  }

  public async getUploadStatus(userId: string, uploadId: string) {
    const session = await prisma.uploadSession.findFirst({
      where: { id: uploadId, userId },
      include: {
        chunks: {
          where: { isUploaded: true },
          select: { chunkIndex: true },
        },
      },
    });

    if (!session) {
      throw new AppError('Upload session not found', 404);
    }

    return {
      uploadId: session.id,
      filename: session.filename,
      size: session.size.toString(),
      totalChunks: session.totalChunks,
      chunkSize: session.chunkSize,
      uploadedChunks: session.chunks.map((c) => c.chunkIndex),
      status: session.status,
    };
  }

  public async saveChunk(
    userId: string,
    uploadId: string,
    chunkIndex: number,
    checksum: string,
    size: number,
    stream: NodeJS.ReadableStream
  ) {
    const session = await prisma.uploadSession.findFirst({
      where: { id: uploadId, userId },
    });

    if (!session) {
      throw new AppError('Upload session not found', 404);
    }

    if (session.status !== 'PENDING') {
      throw new AppError(`Upload session is not in PENDING state. Current status: ${session.status}`, 400);
    }

    const chunkMeta = await prisma.uploadChunk.findUnique({
      where: {
        sessionId_chunkIndex: {
          sessionId: uploadId,
          chunkIndex,
        },
      },
    });

    if (!chunkMeta) {
      throw new AppError(`Chunk index ${chunkIndex} metadata not found for session ${uploadId}`, 404);
    }

    // If already uploaded, skip and return success (idempotent retry)
    if (chunkMeta.isUploaded) {
      return true;
    }

    const sessionDir = path.join(TEMP_DIR, uploadId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const chunkPath = path.join(sessionDir, `chunk-${chunkIndex}`);
    const writeStream = fs.createWriteStream(chunkPath);
    let bytesWritten = 0;

    // Save to disk
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk) => {
        bytesWritten += chunk.length;
      });

      stream.on('error', (err) => {
        writeStream.close();
        if (fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
        reject(new AppError(`Error reading stream: ${err.message}`, 400));
      });

      writeStream.on('error', (err) => {
        writeStream.close();
        if (fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
        reject(new AppError(`Error writing chunk to disk: ${err.message}`, 500));
      });

      writeStream.on('finish', () => {
        resolve();
      });

      stream.pipe(writeStream);
    });

    // Validate size
    if (bytesWritten !== size) {
      if (fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
      throw new AppError(`Chunk size mismatch. Expected ${size} bytes, got ${bytesWritten} bytes.`, 400);
    }

    // Validate checksum (SHA-256)
    const hash = crypto.createHash('sha256');
    const readStream = fs.createReadStream(chunkPath);
    const actualChecksum = await new Promise<string>((resolve, reject) => {
      readStream.on('data', (data) => hash.update(data));
      readStream.on('end', () => resolve(hash.digest('hex')));
      readStream.on('error', reject);
    });

    if (actualChecksum !== checksum) {
      if (fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
      throw new AppError('Chunk integrity verification failed: Checksum mismatch', 400);
    }

    // Update chunk status in DB
    await prisma.uploadChunk.update({
      where: {
        sessionId_chunkIndex: {
          sessionId: uploadId,
          chunkIndex,
        },
      },
      data: {
        isUploaded: true,
        checksum,
        uploadedAt: new Date(),
      },
    });

    return true;
  }

  public async completeUpload(userId: string, uploadId: string) {
    const session = await prisma.uploadSession.findFirst({
      where: { id: uploadId, userId },
      include: { chunks: true },
    });

    if (!session) {
      throw new AppError('Upload session not found', 404);
    }

    if (session.status === 'MERGING') {
      throw new AppError('File merging is already in progress', 400);
    }

    // Mark as merging to prevent duplicate merge triggers
    await prisma.uploadSession.update({
      where: { id: uploadId },
      data: { status: 'MERGING' },
    });

    try {
      // Check if all chunks are uploaded
      const missingChunks = session.chunks.filter((c) => !c.isUploaded);
      if (missingChunks.length > 0) {
        throw new AppError(`Cannot complete upload. ${missingChunks.length} chunks are still missing.`, 400);
      }

      const sessionDir = path.join(TEMP_DIR, uploadId);
      const mergedPath = path.join(sessionDir, 'merged');

      // Merge chunks sequentially and compute SHA-256 on the fly
      const writeStream = fs.createWriteStream(mergedPath);
      const hash = crypto.createHash('sha256');
      let totalBytesMerged = 0;

      for (let i = 0; i < session.totalChunks; i++) {
        const chunkPath = path.join(sessionDir, `chunk-${i}`);
        if (!fs.existsSync(chunkPath)) {
          throw new AppError(`Missing physical chunk file for index ${i}`, 500);
        }

        // Pipe and hash this chunk
        await new Promise<void>((resolve, reject) => {
          const readStream = fs.createReadStream(chunkPath);
          readStream.on('data', (chunk) => {
            hash.update(chunk);
            totalBytesMerged += chunk.length;
          });
          readStream.on('error', reject);
          readStream.pipe(writeStream, { end: false });
          readStream.on('end', resolve);
        });
      }
      writeStream.end();

      // Wait for writeStream finish
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Verify merged size
      if (BigInt(totalBytesMerged) !== session.size) {
        throw new AppError(`Reassembled file size mismatch. Expected ${session.size} bytes, got ${totalBytesMerged} bytes.`, 400);
      }

      const fileHash = hash.digest('hex');

      // Duplicate detection
      let physicalStorage = await prisma.physicalStorage.findUnique({
        where: { hash: fileHash },
      });

      let finalFileRecord;

      if (physicalStorage) {
        // Increment reference count and delete temp files
        physicalStorage = await prisma.physicalStorage.update({
          where: { id: physicalStorage.id },
          data: { referenceCount: { increment: 1 } },
        });

        // Delete temporary session folder
        this.deleteFolderRecursive(sessionDir);
      } else {
        // Virus scanning (ClamAV)
        const { isInfected, viruses } = await this.virusScanner.scanFile(mergedPath);
        if (isInfected) {
          await prisma.activityLog.create({
            data: {
              userId,
              action: 'VIRUS_DETECTED',
              entityType: 'FILE',
              entityId: uploadId,
              entityName: session.filename,
              ipAddress: 'System',
            },
          });

          this.deleteFolderRecursive(sessionDir);
          throw new AppError(`Malware detected: ${viruses.join(', ')}. Upload rejected.`, 400);
        }

        // Move to permanent storage via stream
        const permanentPath = path.join('uploads', `${fileHash}-${session.filename}`);
        const readStream = fs.createReadStream(mergedPath);
        await this.storageService.upload(permanentPath, readStream);

        // Delete temporary session folder
        this.deleteFolderRecursive(sessionDir);

        // Create new physical storage record
        physicalStorage = await prisma.physicalStorage.create({
          data: {
            hash: fileHash,
            storagePath: permanentPath,
            size: session.size,
          },
        });
      }

      // Create virtual File record
      finalFileRecord = await prisma.file.create({
        data: {
          originalName: session.filename,
          mimeType: session.mimeType,
          extension: session.extension,
          size: session.size,
          isInfected: false,
          ownerId: userId,
          physicalId: physicalStorage.id,
          folderId: session.folderId,
        },
      });

      // Update user storage used
      await prisma.user.update({
        where: { id: userId },
        data: { storageUsed: { increment: session.size } },
      });

      await prisma.activityLog.create({
        data: {
          userId,
          action: 'UPLOAD_FILE',
          entityType: 'FILE',
          entityId: finalFileRecord.id,
          entityName: finalFileRecord.originalName,
        },
      });

      // Clean up UploadSession from DB
      await prisma.uploadSession.delete({
        where: { id: uploadId },
      });

      return finalFileRecord;
    } catch (err) {
      // Revert status to FAILED in DB to allow retry if they call complete again
      await prisma.uploadSession.update({
        where: { id: uploadId },
        data: { status: 'PENDING' },
      }).catch(() => {});

      throw err;
    }
  }

  public async cancelUpload(userId: string, uploadId: string) {
    const session = await prisma.uploadSession.findFirst({
      where: { id: uploadId, userId },
    });

    if (!session) {
      throw new AppError('Upload session not found', 404);
    }

    const sessionDir = path.join(TEMP_DIR, uploadId);
    this.deleteFolderRecursive(sessionDir);

    await prisma.uploadSession.delete({
      where: { id: uploadId },
    });

    return true;
  }

  public async cleanupAbandonedUploads() {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const abandonedSessions = await prisma.uploadSession.findMany({
      where: {
        createdAt: { lt: cutoffTime },
        status: { in: ['PENDING', 'FAILED'] },
      },
    });

    for (const session of abandonedSessions) {
      console.log(`Cleaning up abandoned upload session: ${session.id} (${session.filename})`);
      const sessionDir = path.join(TEMP_DIR, session.id);
      this.deleteFolderRecursive(sessionDir);

      await prisma.uploadSession.delete({
        where: { id: session.id },
      }).catch((e) => console.error(`Error deleting session ${session.id} from DB:`, e));
    }
  }

  private deleteFolderRecursive(dirPath: string) {
    if (fs.existsSync(dirPath)) {
      fs.readdirSync(dirPath).forEach((file) => {
        const curPath = path.join(dirPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          this.deleteFolderRecursive(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(dirPath);
    }
  }
}
