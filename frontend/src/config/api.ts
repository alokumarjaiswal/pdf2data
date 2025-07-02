// API Configuration
// In development with Vite proxy, use relative URLs
// In production, use the environment variable or fallback
const isDevelopment = import.meta.env.DEV;
export const API_BASE_URL = isDevelopment 
  ? '' // Use relative URLs in development (proxied by Vite)
  : import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// API endpoints
export const API_ENDPOINTS = {
  upload: `${API_BASE_URL}/upload`,
  extract: `${API_BASE_URL}/extract`,
  extractStream: `${API_BASE_URL}/extract/stream`,
  parse: `${API_BASE_URL}/parse`,
  list: `${API_BASE_URL}/api/list`,
  data: (fileId: string) => `${API_BASE_URL}/api/data/${fileId}`,
  dataWithPretty: (fileId: string) => `${API_BASE_URL}/api/data/${fileId}?pretty=1`,
  delete: (fileId: string) => `${API_BASE_URL}/api/delete/${fileId}`,
  logs: (fileId: string) => `${API_BASE_URL}/api/logs/${fileId}`,
  stats: `${API_BASE_URL}/api/stats`,
} as const; 