import axios from 'axios';

export interface UploadProgress {
  uploadId?: string;
  percentage: number;
  currentChunk: number;
  totalChunks: number;
  speed: number; // in Bytes/second
  eta: number; // in seconds
  status: 'PENDING' | 'UPLOADING' | 'PAUSED' | 'SUCCESS' | 'FAILED' | 'VIRUS_SCANNING';
}

interface UploaderConfig {
  file: File;
  token: string;
  folderId?: string | null;
  onProgress: (progress: UploadProgress) => void;
  onSuccess: (fileRecord: any) => void;
  onError: (error: string) => void;
}

export class ChunkUploader {
  private file: File;
  private token: string;
  private folderId?: string | null;
  private onProgress: (progress: UploadProgress) => void;
  private onSuccess: (fileRecord: any) => void;
  private onError: (error: string) => void;

  private uploadId?: string;
  private chunkSize: number = 10 * 1024 * 1024; // Will be set by backend init response
  private totalChunks: number = 0;
  private uploadedChunks: Set<number> = new Set();
  
  private status: UploadProgress['status'] = 'PENDING';
  private isCancelled: boolean = false;
  private maxRetries: number = 3;

  // For speed & ETA calculations
  private startTime: number = 0;
  private totalBytesUploadedLastSession: number = 0;
  private bytesUploadedThisSession: number = 0;

  constructor(config: UploaderConfig) {
    this.file = config.file;
    this.token = config.token;
    this.folderId = config.folderId;
    this.onProgress = config.onProgress;
    this.onSuccess = config.onSuccess;
    this.onError = config.onError;
  }

  private getStorageKey(): string {
    return `upload_session_${this.file.name}_${this.file.size}_${this.file.lastModified}`;
  }

  private updateProgress() {
    // Calculate total uploaded bytes (completed chunks)
    let totalUploadedBytes = 0;
    for (let i = 0; i < this.totalChunks; i++) {
      if (this.uploadedChunks.has(i)) {
        totalUploadedBytes += i === this.totalChunks - 1
          ? this.file.size - i * this.chunkSize
          : this.chunkSize;
      }
    }
    // Add current uploading chunk bytes
    totalUploadedBytes += this.bytesUploadedThisSession;
    if (totalUploadedBytes > this.file.size) {
      totalUploadedBytes = this.file.size;
    }

    const percentage = Math.round((totalUploadedBytes / this.file.size) * 100);

    // Speed calculation (bytes per second)
    const now = Date.now();
    const elapsedSeconds = (now - this.startTime) / 1000;
    
    // Calculate speed only based on current session to avoid skewing from paused time
    let speed = 0;
    let eta = 0;
    if (elapsedSeconds > 0) {
      // Total bytes uploaded in this active session
      const bytesUploadedInCurrentSession = Math.max(0, totalUploadedBytes - this.totalBytesUploadedLastSession);
      speed = bytesUploadedInCurrentSession / elapsedSeconds;
      
      const remainingBytes = this.file.size - totalUploadedBytes;
      eta = speed > 0 ? Math.ceil(remainingBytes / speed) : 0;
    }

    this.onProgress({
      uploadId: this.uploadId,
      percentage,
      currentChunk: this.uploadedChunks.size + 1 > this.totalChunks ? this.totalChunks : this.uploadedChunks.size + 1,
      totalChunks: this.totalChunks,
      speed,
      eta,
      status: this.status,
    });
  }

  public async start() {
    this.isCancelled = false;
    this.status = 'UPLOADING';
    this.startTime = Date.now();

    try {
      // 1. Check if we can resume a cached session
      const cachedUploadId = localStorage.getItem(this.getStorageKey());
      if (cachedUploadId) {
        try {
          const statusRes = await axios.get(`/api/files/upload/status?uploadId=${cachedUploadId}`, {
            headers: { Authorization: `Bearer ${this.token}` },
          });
          const sessionData = statusRes.data.data;
          
          this.uploadId = cachedUploadId;
          this.chunkSize = sessionData.chunkSize;
          this.totalChunks = sessionData.totalChunks;
          this.uploadedChunks = new Set(sessionData.uploadedChunks);
          
          console.log(`Resuming upload session ${this.uploadId}. Already uploaded chunks:`, sessionData.uploadedChunks);
        } catch (err) {
          console.warn('Failed to resume upload session. Initializing a new one.', err);
          localStorage.removeItem(this.getStorageKey());
        }
      }

      // 2. If no session resumed, initialize a new one
      if (!this.uploadId) {
        const initRes = await axios.post(
          '/api/files/upload/init',
          {
            filename: this.file.name,
            size: this.file.size,
            mimeType: this.file.type || 'application/octet-stream',
            folderId: this.folderId || null,
          },
          {
            headers: { Authorization: `Bearer ${this.token}` },
          }
        );
        const data = initRes.data.data;
        this.uploadId = data.uploadId;
        this.chunkSize = data.chunkSize;
        this.totalChunks = data.totalChunks;
        this.uploadedChunks = new Set();
        
        localStorage.setItem(this.getStorageKey(), this.uploadId!);
      }

      // Record baseline for speed calculation
      this.totalBytesUploadedLastSession = 0;
      for (let i = 0; i < this.totalChunks; i++) {
        if (this.uploadedChunks.has(i)) {
          this.totalBytesUploadedLastSession += i === this.totalChunks - 1
            ? this.file.size - i * this.chunkSize
            : this.chunkSize;
        }
      }

      // 3. Upload chunks
      await this.uploadChunksLoop();
    } catch (err: any) {
      this.status = 'FAILED';
      this.updateProgress();
      this.onError(err.response?.data?.message || err.message || 'Upload initialization failed');
    }
  }

  private async calculateChunkHash(chunk: Blob): Promise<string> {
    const arrayBuffer = await chunk.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private async uploadChunksLoop() {
    for (let chunkIndex = 0; chunkIndex < this.totalChunks; chunkIndex++) {
      if ((this.status as string) === 'PAUSED' || this.isCancelled) {
        return;
      }

      if (this.uploadedChunks.has(chunkIndex)) {
        continue;
      }

      const startByte = chunkIndex * this.chunkSize;
      const endByte = Math.min(startByte + this.chunkSize, this.file.size);
      const chunkBlob = this.file.slice(startByte, endByte);

      // Compute hash and upload with retry logic
      let attempt = 0;
      let success = false;
      let lastError = null;

      const checksum = await this.calculateChunkHash(chunkBlob);

      while (attempt < this.maxRetries && !success) {
        if ((this.status as string) === 'PAUSED' || this.isCancelled) {
          return;
        }

        try {
          this.bytesUploadedThisSession = 0;
          this.updateProgress();

          await axios.post('/api/files/upload/chunk', chunkBlob, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'x-upload-id': this.uploadId!,
              'x-chunk-index': chunkIndex.toString(),
              'x-chunk-checksum': checksum,
              'x-chunk-size': chunkBlob.size.toString(),
              Authorization: `Bearer ${this.token}`,
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.loaded !== undefined) {
                this.bytesUploadedThisSession = progressEvent.loaded;
                this.updateProgress();
              }
            },
          });

          this.uploadedChunks.add(chunkIndex);
          this.bytesUploadedThisSession = 0;
          this.updateProgress();
          success = true;
        } catch (err: any) {
          attempt++;
          lastError = err;
          console.warn(`Chunk ${chunkIndex} upload failed (attempt ${attempt}/${this.maxRetries}):`, err);
          
          if (attempt < this.maxRetries) {
            // Exponential backoff
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }

      if (!success) {
        this.status = 'FAILED';
        this.updateProgress();
        this.onError(lastError?.response?.data?.message || lastError?.message || `Chunk ${chunkIndex} upload failed`);
        return;
      }
    }

    // 4. Complete upload
    if (this.uploadedChunks.size === this.totalChunks) {
      this.status = 'VIRUS_SCANNING';
      this.updateProgress();
      
      try {
        const completeRes = await axios.post(
          '/api/files/upload/complete',
          { uploadId: this.uploadId },
          {
            headers: { Authorization: `Bearer ${this.token}` },
          }
        );
        
        localStorage.removeItem(this.getStorageKey());
        this.status = 'SUCCESS';
        this.updateProgress();
        this.onSuccess(completeRes.data.data);
      } catch (err: any) {
        this.status = 'FAILED';
        this.updateProgress();
        this.onError(err.response?.data?.message || err.message || 'File assembly or virus scan failed');
      }
    }
  }

  public pause() {
    if (this.status === 'UPLOADING') {
      this.status = 'PAUSED';
      this.bytesUploadedThisSession = 0;
      this.updateProgress();
      console.log(`Upload session ${this.uploadId} PAUSED.`);
    }
  }

  public async resume() {
    if (this.status === 'PAUSED' || this.status === 'FAILED') {
      this.status = 'UPLOADING';
      this.startTime = Date.now();
      
      // Calculate bytes previously uploaded for current speed baseline
      this.totalBytesUploadedLastSession = 0;
      for (let i = 0; i < this.totalChunks; i++) {
        if (this.uploadedChunks.has(i)) {
          this.totalBytesUploadedLastSession += i === this.totalChunks - 1
            ? this.file.size - i * this.chunkSize
            : this.chunkSize;
        }
      }
      
      console.log(`Upload session ${this.uploadId} RESUMED.`);
      this.uploadChunksLoop();
    }
  }

  public async cancel() {
    this.isCancelled = true;
    this.status = 'FAILED';
    localStorage.removeItem(this.getStorageKey());
    
    if (this.uploadId) {
      try {
        await axios.post(
          '/api/files/upload/cancel',
          { uploadId: this.uploadId },
          {
            headers: { Authorization: `Bearer ${this.token}` },
          }
        );
      } catch (err) {
        console.error('Failed to call cancel upload API:', err);
      }
    }
    this.onError('Upload cancelled by user');
  }
}
