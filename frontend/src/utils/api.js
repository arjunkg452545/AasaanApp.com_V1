import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const API = API_URL || (BACKEND_URL ? `${BACKEND_URL}/api` : '');

if (!API) {
  console.error('[API] Neither REACT_APP_API_URL nor REACT_APP_BACKEND_URL is set!');
}

const api = axios.create({ baseURL: API });

// Request interceptor: attach Bearer token + cache-bust header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Prevent service worker / browser from caching API responses
  config.headers['Cache-Control'] = 'no-cache, no-store';
  config.headers['Pragma'] = 'no-cache';
  return config;
});

// Response interceptor — NUCLEAR CONSERVATIVE logout logic
// ONLY logout if BOTH conditions are true:
// 1. Server says token is expired/invalid (401 + specific detail message)
// 2. token_expires_at is in the past (or missing)
// If token_expires_at is in the future → NEVER logout, period.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // No response = network error / offline / app backgrounded → NEVER logout
    if (!error.response) return Promise.reject(error);

    // Only care about 401s — all other errors pass through
    if (error.response.status !== 401) return Promise.reject(error);

    // FIRST CHECK: Is token_expires_at still in the future?
    const tokenExpiry = localStorage.getItem('token_expires_at');
    if (tokenExpiry) {
      try {
        const expiryTime = new Date(tokenExpiry).getTime();
        const nowTime = Date.now();
        if (expiryTime > nowTime) {
          // Token not expired yet — this 401 is transient, DO NOT logout
          console.log('[API] 401 but token still valid, not logging out');
          return Promise.reject(error);
        }
      } catch (e) {
        // Date parse failed — don't logout on parse error either
        console.log('[API] 401 but token_expires_at parse failed, not logging out');
        return Promise.reject(error);
      }
    }

    // Token IS expired or no expiry stored — check if server confirms
    const detail = error.response?.data?.detail || '';
    const isTokenError = typeof detail === 'string' && (
      detail.includes('expired') ||
      detail.includes('Invalid token') ||
      detail.includes('Not authenticated') ||
      detail.includes('disabled') ||
      detail.includes('suspended')
    );

    if (isTokenError) {
      console.log('[API] Token truly expired, logging out:', detail);
      localStorage.clear();
      window.location.href = '/';
    }

    return Promise.reject(error);
  }
);

export default api;
