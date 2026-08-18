import { apiClient } from './client';
import { API_ENDPOINTS } from '../../config/api';
import { ApiResponse, FileItem, FolderItem } from '../../types';

export const shareFileApi = async (fileId: string, targetEmail: string): Promise<boolean> => {
  const res = await apiClient.post<ApiResponse<null>>(API_ENDPOINTS.SHARES.SHARE_FILE, {
    fileId,
    targetEmail,
  });
  return res.data.success;
};

export const shareFolderApi = async (folderId: string, targetEmail: string): Promise<boolean> => {
  const res = await apiClient.post<ApiResponse<null>>(API_ENDPOINTS.SHARES.SHARE_FOLDER, {
    folderId,
    targetEmail,
  });
  return res.data.success;
};

export const getSharedWithMeApi = async (): Promise<{ files: FileItem[]; folders: FolderItem[] }> => {
  const res = await apiClient.get<ApiResponse<{ files: FileItem[]; folders: FolderItem[] }>>(
    API_ENDPOINTS.SHARES.SHARED_WITH_ME
  );
  return res.data.data || { files: [], folders: [] };
};
