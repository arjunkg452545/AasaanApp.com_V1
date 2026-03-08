import axios from 'axios';

// REACT_APP_API_URL = full API URL including /api (e.g. https://backend.railway.app/api)
// REACT_APP_BACKEND_URL = backend root only (e.g. https://backend.railway.app)
// Priority: REACT_APP_API_URL > REACT_APP_BACKEND_URL + /api > empty
const API_URL = process.env.REACT_APP_API_URL;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const API = API_URL || (BACKEND_URL ? `${BACKEND_URL}/api` : '');

if (!API) {
  console.error('[API] Neither REACT_APP_API_URL nor REACT_APP_BACKEND_URL is set! API calls will fail.');
}

const api = axios.create({
  baseURL: API,
});

// Request interceptor: attach Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track whether a force-logout has already been triggered this session
let _logoutTriggered = false;

function forceLogout() {
  if (_logoutTriggered) return; // Prevent multiple clears from racing 401s
  _logoutTriggered = true;
  localStorage.clear();
  window.location.href = '/';
}

// Response interceptor: force logout ONLY on definitive auth failures
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // No response at all (network error, offline, app backgrounded) — never logout
    if (!error.response) return Promise.reject(error);

    const status = error.response?.status;
    const detail = error.response?.data?.detail || '';

    // Force logout ONLY on account-level problems (disabled/suspended/password changed)
    if (
      (status === 401 || status === 403) &&
      typeof detail === 'string' &&
      (detail.includes('disabled') || detail.includes('suspended') ||
       detail.includes('deactivated') || detail.includes('Password was changed'))
    ) {
      forceLogout();
      return Promise.reject(error);
    }

    // Force logout ONLY when token is definitely expired/invalid AND it's from an auth endpoint
    if (
      status === 401 &&
      typeof detail === 'string' &&
      (detail === 'Invalid token' || detail === 'Token has expired' || detail === 'Not authenticated')
    ) {
      // Double-check: if the token_expires_at is still in the future, don't logout
      // (could be a transient backend issue)
      const expiresAt = localStorage.getItem('token_expires_at');
      if (expiresAt) {
        const expiry = new Date(expiresAt);
        const now = new Date();
        if (expiry > now) {
          // Token should still be valid — don't logout on transient 401
          return Promise.reject(error);
        }
      }
      forceLogout();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// Token refresh: once per session, check if token is expiring within 7 days
let _refreshAttempted = false;

export async function tryRefreshToken() {
  if (_refreshAttempted) return;
  _refreshAttempted = true;

  const token = localStorage.getItem('token');
  const expiresAt = localStorage.getItem('token_expires_at');
  const role = localStorage.getItem('role');

  if (!token || !expiresAt) return;
  // Only refresh member/admin tokens
  if (!['member', 'admin'].includes(role)) return;

  const expiry = new Date(expiresAt);
  const now = new Date();
  const daysLeft = (expiry - now) / (1000 * 60 * 60 * 24);

  if (daysLeft > 7 || daysLeft <= 0) return;

  try {
    const res = await api.post('/member/refresh-token');
    if (res.data.refreshed) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('token_expires_at', res.data.expires_at);
    }
  } catch {
    // Silently fail — token still works until expiry
  }
}

export default api;
