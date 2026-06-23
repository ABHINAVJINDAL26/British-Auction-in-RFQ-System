import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const isDev = import.meta.env.DEV;

let baseUrl = configuredApiUrl || (isDev ? 'http://localhost:8082/api' : '/api');

// Robust URL formatting
if (!baseUrl.endsWith('/api')) {
  baseUrl = baseUrl.endsWith('/') ? baseUrl + 'api' : baseUrl + '/api';
}

const api = axios.create({
  baseURL: baseUrl,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token.trim()}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
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
