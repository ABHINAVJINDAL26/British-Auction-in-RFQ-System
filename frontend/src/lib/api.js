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
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
