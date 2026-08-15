import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import { StorageProvider, StorageMetadata } from './StorageProvider';
import { AppError } from '../../utils/AppError';
import { Readable } from 'stream';
import path from 'path';

export class SupabaseStorageService implements StorageProvider {
  private supabase: SupabaseClient;
  private bucketName: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';
    this.bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'cloud-storage-files';

    if (!supabaseUrl || !supabaseSecretKey) {
      console.warn('SupabaseStorageService initialized without SUPABASE_URL or SUPABASE_SECRET_KEY.');
    }

    this.supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        transport: ws as any,
      },
    });
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async upload(filePath: string, fileStream: Buffer | NodeJS.ReadableStream): Promise<string> {
    try {
      const buffer = Buffer.isBuffer(fileStream) ? fileStream : await this.streamToBuffer(fileStream);

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, buffer, {
          upsert: true,
          contentType: 'application/octet-stream',
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new AppError(`Supabase Storage upload error: ${error.message}`, 500);
      }

      return data.path;
    } catch (error: any) {
      console.error('Error uploading file to Supabase Storage:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to upload file to Supabase Storage: ${error.message || error}`, 500);
    }
  }

  async download(filePath: string, options?: { start?: number; end?: number }): Promise<NodeJS.ReadableStream> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .download(filePath);

      if (error || !data) {
        throw new AppError(`File not found in Supabase storage: ${error?.message || 'Empty response'}`, 404);
      }

      const arrayBuffer = await data.arrayBuffer();
      let buffer = Buffer.from(arrayBuffer);

      if (options && (options.start !== undefined || options.end !== undefined)) {
        const start = options.start || 0;
        const end = options.end !== undefined ? options.end + 1 : buffer.length;
        buffer = buffer.subarray(start, end);
      }

      return Readable.from(buffer);
    } catch (error: any) {
      console.error('Error downloading file from Supabase Storage:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to download file from Supabase Storage: ${error.message || error}`, 500);
    }
  }

  async delete(filePath: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting file from Supabase Storage:', error);
        return false;
      }
      return true;
    } catch (error: any) {
      console.error('Error deleting file from Supabase Storage:', error);
      return false;
    }
  }

  async move(sourcePath: string, destinationPath: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .move(sourcePath, destinationPath);

      if (error) {
        console.error('Error moving file in Supabase Storage:', error);
        return false;
      }
      return true;
    } catch (error: any) {
      console.error('Error moving file in Supabase Storage:', error);
      return false;
    }
  }

  async copy(sourcePath: string, destinationPath: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .copy(sourcePath, destinationPath);

      if (error) {
        console.error('Error copying file in Supabase Storage:', error);
        return false;
      }
      return true;
    } catch (error: any) {
      console.error('Error copying file in Supabase Storage:', error);
      return false;
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const dir = path.dirname(filePath);
      const filename = path.basename(filePath);
      const searchDir = dir === '.' ? '' : dir;

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(searchDir, { search: filename });

      if (error || !data) return false;
      return data.some((item) => item.name === filename);
    } catch (error) {
      return false;
    }
  }

  async getMetadata(filePath: string): Promise<StorageMetadata> {
    try {
      const dir = path.dirname(filePath);
      const filename = path.basename(filePath);
      const searchDir = dir === '.' ? '' : dir;

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(searchDir, { search: filename });

      if (error || !data || data.length === 0) {
        throw new AppError('File metadata not found in Supabase storage', 404);
      }

      const match = data.find((item) => item.name === filename) || data[0];
      return {
        size: match.metadata?.size || match.metadata?.contentLength || 0,
        hash: match.id || match.metadata?.eTag,
      };
    } catch (error: any) {
      console.error('Error getting metadata from Supabase Storage:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('File metadata not found in storage', 404);
    }
  }
}
