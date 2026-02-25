import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

if (!BACKEND_URL) {
  console.error('[API] REACT_APP_BACKEND_URL is not set! API calls will fail.');
}

export const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const api = axios.create({
  baseURL: API,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;