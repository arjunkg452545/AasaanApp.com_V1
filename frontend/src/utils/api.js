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

// Response interceptor — ULTRA CONSERVATIVE logout logic
// Rule: NEVER clear localStorage unless token_expires_at is DEFINITELY in the past
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // No response = network error / offline / app backgrounded → NEVER logout
    if (!error.response) return Promise.reject(error);

    const status = error.response?.status;

    // Only care about 401s — all other errors pass through
    if (status !== 401) return Promise.reject(error);

    // FIRST CHECK: Is token_expires_at still in the future?
    // If yes → this is a transient 401 → NEVER logout
    const expiresAt = localStorage.getItem('token_expires_at');
    if (expiresAt) {
      try {
        const expiryDate = new Date(expiresAt);
        if (expiryDate > new Date()) {
          // Token should still be valid — transient failure, do NOT logout
          return Promise.reject(error);
        }
      } catch { /* bad date format — fall through */ }
    }

    // Token is expired (or no expires_at stored) AND we got a 401
    // Safe to clear — token is genuinely dead
    const detail = error.response?.data?.detail;
    const detailStr = typeof detail === 'string' ? detail : '';

    // Only logout on definitive auth failure messages
    if (
      detailStr === 'Invalid token' ||
      detailStr === 'Token has expired' ||
      detailStr === 'Not authenticated' ||
      detailStr.includes('disabled') ||
      detailStr.includes('suspended') ||
      detailStr.includes('Password was changed')
    ) {
      localStorage.clear();
      window.location.href = '/';
    }

    return Promise.reject(error);
  }
);

export default api;
