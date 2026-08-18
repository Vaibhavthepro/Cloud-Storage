import { apiClient } from './client';
import { API_ENDPOINTS } from '../../config/api';
import { ApiResponse, FolderItem } from '../../types';

export const getFoldersApi = async (parentId?: string): Promise<FolderItem[]> => {
  const url = parentId ? `${API_ENDPOINTS.FOLDERS.BASE}?parentId=${parentId}` : API_ENDPOINTS.FOLDERS.BASE;
  const res = await apiClient.get<ApiResponse<FolderItem[]>>(url);
  return res.data.data || [];
};

export const createFolderApi = async (name: string, parentId?: string): Promise<FolderItem> => {
  const res = await apiClient.post<ApiResponse<FolderItem>>(API_ENDPOINTS.FOLDERS.BASE, {
    name,
    parentId,
  });
  if (!res.data.data) {
    throw new Error('Failed to create folder');
  }
  return res.data.data;
};

export const deleteFolderApi = async (folderId: string): Promise<boolean> => {
  const res = await apiClient.delete<ApiResponse<null>>(API_ENDPOINTS.FOLDERS.DELETE(folderId));
  return res.data.success;
};

export const toggleStarFolderApi = async (folderId: string): Promise<FolderItem> => {
  const res = await apiClient.patch<ApiResponse<FolderItem>>(API_ENDPOINTS.FOLDERS.STAR(folderId));
  if (!res.data.data) {
    throw new Error('Failed to update folder star state');
  }
  return res.data.data;
};
