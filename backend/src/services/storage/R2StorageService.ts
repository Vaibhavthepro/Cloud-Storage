import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { StorageProvider, StorageMetadata } from './StorageProvider';
import { AppError } from '../../utils/AppError';
import { Readable } from 'stream';

export class R2StorageService implements StorageProvider {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME || '';

    if (!accessKeyId || !secretAccessKey || !this.bucketName) {
      console.warn('R2 Storage initialized without complete credentials/bucketName. Ensure R2_* env vars are set.');
    }

    const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  async upload(filePath: string, fileStream: Buffer | NodeJS.ReadableStream): Promise<string> {
    try {
      const parallelUploadS3 = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: filePath,
          Body: fileStream as any,
        },
      });

      await parallelUploadS3.done();
      return filePath;
    } catch (error: any) {
      console.error('Error uploading file to R2:', error);
      throw new AppError(`Failed to upload file to Cloudflare R2: ${error.message || error}`, 500);
    }
  }

  async download(filePath: string, options?: { start?: number; end?: number }): Promise<NodeJS.ReadableStream> {
    try {
      let rangeHeader: string | undefined;
      if (options && options.start !== undefined && options.end !== undefined) {
        rangeHeader = `bytes=${options.start}-${options.end}`;
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
        Range: rangeHeader,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new AppError('File content empty or unavailable', 404);
      }

      // AWS SDK v3 stream to Node readable stream
      return response.Body as Readable;
    } catch (error: any) {
      console.error('Error downloading file from R2:', error);
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        throw new AppError('File not found in storage', 404);
      }
      throw new AppError(`Failed to download file from Cloudflare R2: ${error.message || error}`, 500);
    }
  }

  async delete(filePath: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });
      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      console.error('Error deleting object from R2:', error);
      return false;
    }
  }

  async move(sourcePath: string, destinationPath: string): Promise<boolean> {
    const copied = await this.copy(sourcePath, destinationPath);
    if (copied) {
      return await this.delete(sourcePath);
    }
    return false;
  }

  async copy(sourcePath: string, destinationPath: string): Promise<boolean> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourcePath}`,
        Key: destinationPath,
      });
      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      console.error('Error copying object in R2:', error);
      return false;
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });
      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      return false;
    }
  }

  async getMetadata(filePath: string): Promise<StorageMetadata> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });
      const response = await this.s3Client.send(command);
      return {
        size: response.ContentLength || 0,
        hash: response.ETag ? response.ETag.replace(/"/g, '') : undefined,
      };
    } catch (error: any) {
      console.error('Error getting metadata from R2:', error);
      throw new AppError('File metadata not found in storage', 404);
    }
  }
}
