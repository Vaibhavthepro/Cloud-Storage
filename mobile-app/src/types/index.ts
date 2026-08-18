export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  storageQuota?: string;
  storageUsed?: string;
  createdAt?: string;
}

export interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
  extension: string;
  size: string;
  isInfected: boolean;
  starred: boolean;
  ownerId: string;
  physicalId: string;
  folderId: string | null;
  uploadedAt: string;
  updatedAt: string;
}

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  ipAddress: string | null;
  timestamp: string;
  user?: {
    name: string;
    email: string;
  };
}

export interface DashboardStats {
  storageUsed: string;
  storageQuota: string;
  fileCount: number;
  folderCount: number;
  totalUsers: number;
  recentActivity: ActivityLog[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  user?: User;
}

export interface ChunkUploadInitResponse {
  uploadId: string;
  chunkSize: number;
  totalChunks: number;
}
