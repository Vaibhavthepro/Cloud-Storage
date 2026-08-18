import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../../config/api';
import { getToken } from '../storage/authStorage';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout to account for Render cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token to every request
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for API response error formatting
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    let errorMessage = 'An unexpected error occurred';
    let isColdStart = false;

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage = 'Connecting to server... This may take a moment (Render cold start).';
      isColdStart = true;
    } else if (!error.response) {
      errorMessage = 'Network error. Please check your internet connection or server availability.';
    } else if (error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    } else if (error.response.status === 401) {
      errorMessage = 'Unauthorized access. Please log in again.';
    } else if (error.response.status === 403) {
      errorMessage = 'Access denied. You do not have permission for this resource.';
    } else if (error.response.status === 404) {
      errorMessage = 'Requested resource not found.';
    } else if (error.response.status === 500) {
      errorMessage = 'Server error occurred. Please try again later.';
    }

    return Promise.reject({
      status: error.response?.status,
      message: errorMessage,
      isColdStart,
      originalError: error,
    });
  }
);
