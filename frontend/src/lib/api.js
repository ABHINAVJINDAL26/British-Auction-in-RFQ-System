import axios from 'axios';

let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Robust URL formatting
if (!baseUrl.endsWith('/api')) {
  baseUrl = baseUrl.endsWith('/') ? baseUrl + 'api' : baseUrl + '/api';
}

const api = axios.create({
  baseURL: baseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
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
