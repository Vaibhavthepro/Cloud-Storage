export interface StorageMetadata {
  size: number;
  hash?: string;
}

export interface StorageProvider {
  upload(filePath: string, fileStream: Buffer | NodeJS.ReadableStream): Promise<string>;
  download(filePath: string, options?: { start?: number; end?: number }): Promise<NodeJS.ReadableStream>;
  delete(filePath: string): Promise<boolean>;
  move(sourcePath: string, destinationPath: string): Promise<boolean>;
  copy(sourcePath: string, destinationPath: string): Promise<boolean>;
  exists(filePath: string): Promise<boolean>;
  getMetadata(filePath: string): Promise<StorageMetadata>;
}
