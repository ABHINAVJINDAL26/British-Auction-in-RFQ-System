import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const isDev = import.meta.env.DEV;

// Remove trailing slashes first
let rawUrl = configuredApiUrl || (isDev ? 'http://localhost:8082/api' : '/api');
rawUrl = rawUrl.replace(/\/+$/, '');

if (!rawUrl.endsWith('/api')) {
  rawUrl += '/api';
}

const api = axios.create({
  baseURL: rawUrl,
  timeout: 90000,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token.trim()}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Check if live server returned HTML page (e.g. Vercel fallback) instead of JSON
    if (typeof response.data === 'string' && response.data.trim().startsWith('<!DOCTYPE')) {
      const error = new Error('Received HTML response instead of JSON. Backend API URL might be misconfigured.');
      error.response = { status: 502, data: { error: 'Invalid API endpoint. Server returned HTML.' } };
      return Promise.reject(error);
    }
    return response;
  },
  (error) => {
    if (error?.response?.status === 401) {
      // Token missing/expired/stale for current backend; reset auth and force login.
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
