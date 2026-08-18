import { apiClient } from './client';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api';
import { ApiResponse, FileItem, ChunkUploadInitResponse } from '../../types';
import { getToken } from '../storage/authStorage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export const getFilesApi = async (folderId?: string): Promise<FileItem[]> => {
  const url = folderId ? `${API_ENDPOINTS.FILES.BASE}?folderId=${folderId}` : API_ENDPOINTS.FILES.BASE;
  const res = await apiClient.get<ApiResponse<FileItem[]>>(url);
  return res.data.data || [];
};

export const uploadFileApi = async (
  fileUri: string,
  fileName: string,
  mimeType: string,
  folderId?: string,
  onProgress?: (percent: number) => void
): Promise<FileItem> => {
  const formData = new FormData();
  
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType || 'application/octet-stream',
  } as any);

  if (folderId) {
    formData.append('folderId', folderId);
  }

  const token = await getToken();

  const res = await apiClient.post<ApiResponse<FileItem>>(API_ENDPOINTS.FILES.UPLOAD, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });

  if (!res.data.data) {
    throw new Error('Upload response missing file record');
  }

  return res.data.data;
};

export const downloadAndOpenFileApi = async (
  fileId: string,
  filename: string,
  onProgress?: (percent: number) => void
): Promise<string> => {
  const token = await getToken();
  const downloadUrl = `${API_BASE_URL}${API_ENDPOINTS.FILES.DOWNLOAD(fileId)}`;
  const localUri = `${FileSystem.documentDirectory}${filename}`;

  const downloadResumable = FileSystem.createDownloadResumable(
    downloadUrl,
    localUri,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    (downloadProgress) => {
      if (downloadProgress.totalBytesExpectedToWrite > 0 && onProgress) {
        const progress = Math.round(
          (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
        );
        onProgress(progress);
      }
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result || !result.uri) {
    throw new Error('Failed to download file');
  }

  // Attempt to open/share downloaded file using native Android intent handler
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri);
  }

  return result.uri;
};

export const deleteFileApi = async (fileId: string): Promise<boolean> => {
  const res = await apiClient.delete<ApiResponse<null>>(API_ENDPOINTS.FILES.DELETE(fileId));
  return res.data.success;
};

export const toggleStarFileApi = async (fileId: string): Promise<FileItem> => {
  const res = await apiClient.patch<ApiResponse<FileItem>>(API_ENDPOINTS.FILES.STAR(fileId));
  if (!res.data.data) {
    throw new Error('Failed to update star state');
  }
  return res.data.data;
};

// Resumable Chunk Upload Flow Helper
export const initiateChunkUploadApi = async (
  filename: string,
  size: number,
  mimeType: string,
  folderId?: string
): Promise<ChunkUploadInitResponse> => {
  const res = await apiClient.post<ApiResponse<ChunkUploadInitResponse>>(API_ENDPOINTS.FILES.CHUNK_INIT, {
    filename,
    size,
    mimeType,
    folderId,
  });
  if (!res.data.data) {
    throw new Error('Failed to initiate chunk upload');
  }
  return res.data.data;
};

export const completeChunkUploadApi = async (uploadId: string): Promise<FileItem> => {
  const res = await apiClient.post<ApiResponse<FileItem>>(API_ENDPOINTS.FILES.CHUNK_COMPLETE, { uploadId });
  if (!res.data.data) {
    throw new Error('Failed to complete chunk upload');
  }
  return res.data.data;
};
