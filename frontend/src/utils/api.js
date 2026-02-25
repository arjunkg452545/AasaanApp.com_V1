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

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;