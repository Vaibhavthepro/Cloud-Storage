import { apiClient } from './client';
import { API_ENDPOINTS } from '../../config/api';
import { ApiResponse, DashboardStats } from '../../types';

export const getDashboardStatsApi = async (): Promise<DashboardStats> => {
  const res = await apiClient.get<ApiResponse<DashboardStats>>(API_ENDPOINTS.DASHBOARD);
  if (!res.data.data) {
    throw new Error('Dashboard stats empty');
  }
  return res.data.data;
};
