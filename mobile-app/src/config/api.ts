export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://cloud-storage-backend-gtpf.onrender.com';

export const API_ENDPOINTS = {
  HEALTH: '/health',
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    PROFILE: '/api/auth/profile',
  },
  FILES: {
    BASE: '/api/files',
    UPLOAD: '/api/files/upload',
    CHUNK_INIT: '/api/files/upload/init',
    CHUNK_STATUS: '/api/files/upload/status',
    CHUNK_UPLOAD: '/api/files/upload/chunk',
    CHUNK_COMPLETE: '/api/files/upload/complete',
    CHUNK_CANCEL: '/api/files/upload/cancel',
    DOWNLOAD: (id: string) => `/api/files/${id}/download`,
    DELETE: (id: string) => `/api/files/${id}`,
    STAR: (id: string) => `/api/files/${id}/star`,
  },
  FOLDERS: {
    BASE: '/api/folders',
    DOWNLOAD: (id: string) => `/api/folders/${id}/download`,
    DELETE: (id: string) => `/api/folders/${id}`,
    STAR: (id: string) => `/api/folders/${id}/star`,
  },
  SEARCH: '/api/search',
  DASHBOARD: '/api/dashboard',
  SHARES: {
    SHARE_FILE: '/api/shares/share',
    SHARE_FOLDER: '/api/shares/share-folder',
    SHARED_WITH_ME: '/api/shares/shared-with-me',
    UPDATE_STATUS: (id: string) => `/api/shares/${id}/status`,
  },
};
