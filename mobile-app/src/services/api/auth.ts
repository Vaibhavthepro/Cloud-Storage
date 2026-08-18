import { apiClient } from './client';
import { API_ENDPOINTS } from '../../config/api';
import { ApiResponse, User } from '../../types';

export const loginApi = async (email: string, password: string): Promise<{ token: string; user: User }> => {
  const res = await apiClient.post<ApiResponse<User>>(API_ENDPOINTS.AUTH.LOGIN, { email, password });
  if (!res.data.token || !res.data.user) {
    throw new Error('Invalid login response from server');
  }
  return { token: res.data.token, user: res.data.user };
};

export const registerApi = async (name: string, email: string, password: string): Promise<{ token: string; user: User }> => {
  const res = await apiClient.post<ApiResponse<User>>(API_ENDPOINTS.AUTH.REGISTER, { name, email, password });
  if (!res.data.token || !res.data.user) {
    throw new Error('Invalid registration response from server');
  }
  return { token: res.data.token, user: res.data.user };
};

export const getProfileApi = async (): Promise<User> => {
  const res = await apiClient.get<ApiResponse<User>>(API_ENDPOINTS.AUTH.PROFILE);
  if (!res.data.data) {
    throw new Error('User profile data empty');
  }
  return res.data.data;
};
