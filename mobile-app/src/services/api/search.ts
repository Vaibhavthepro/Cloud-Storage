import { apiClient } from './client';
import { API_ENDPOINTS } from '../../config/api';
import { ApiResponse, FileItem, FolderItem } from '../../types';

export const searchApi = async (query: string): Promise<{ files: FileItem[]; folders: FolderItem[] }> => {
  const res = await apiClient.get<ApiResponse<{ files: FileItem[]; folders: FolderItem[] }>>(
    `${API_ENDPOINTS.SEARCH}?q=${encodeURIComponent(query)}`
  );
  return res.data.data || { files: [], folders: [] };
};
