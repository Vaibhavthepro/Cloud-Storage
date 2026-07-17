import fs from 'fs';
import path from 'path';
import { StorageProvider, StorageMetadata } from './StorageProvider';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';

export class LocalStorageService implements StorageProvider {
  private baseDir: string;

  constructor(baseDir: string = path.join(__dirname, '../../../storage')) {
    this.baseDir = baseDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getFullPath(filePath: string): string {
    return path.join(this.baseDir, filePath);
  }

  async upload(filePath: string, fileStream: Buffer | NodeJS.ReadableStream): Promise<string> {
    const fullPath = this.getFullPath(filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (Buffer.isBuffer(fileStream)) {
      await fs.promises.writeFile(fullPath, fileStream);
    } else {
      const writeStream = fs.createWriteStream(fullPath);
      await pipeline(fileStream, writeStream);
    }
    return fullPath;
  }

  async download(filePath: string, options?: { start?: number; end?: number }): Promise<NodeJS.ReadableStream> {
    const fullPath = this.getFullPath(filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found');
    }
    return fs.createReadStream(fullPath, options);
  }

  async delete(filePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(filePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      return true;
    }
    return false;
  }

  async move(sourcePath: string, destinationPath: string): Promise<boolean> {
    const fullSourcePath = this.getFullPath(sourcePath);
    const fullDestPath = this.getFullPath(destinationPath);
    
    if (fs.existsSync(fullSourcePath)) {
      const destDir = path.dirname(fullDestPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      await fs.promises.rename(fullSourcePath, fullDestPath);
      return true;
    }
    return false;
  }

  async copy(sourcePath: string, destinationPath: string): Promise<boolean> {
    const fullSourcePath = this.getFullPath(sourcePath);
    const fullDestPath = this.getFullPath(destinationPath);

    if (fs.existsSync(fullSourcePath)) {
      const destDir = path.dirname(fullDestPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      await fs.promises.copyFile(fullSourcePath, fullDestPath);
      return true;
    }
    return false;
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(filePath);
    try {
      await fs.promises.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(filePath: string): Promise<StorageMetadata> {
    const fullPath = this.getFullPath(filePath);
    const stats = await fs.promises.stat(fullPath);
    
    // Calculate SHA-256 hash
    const hash = crypto.createHash('sha256');
    const readStream = fs.createReadStream(fullPath);
    
    return new Promise((resolve, reject) => {
      readStream.on('data', (chunk) => hash.update(chunk));
      readStream.on('end', () => {
        resolve({
          size: stats.size,
          hash: hash.digest('hex'),
        });
      });
      readStream.on('error', reject);
    });
  }
}
