import axios from 'axios';

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => { authToken = token; };
export const getAuthToken = () => authToken;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authToken = null;
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const unwrapList = <T = any>(payload: any): T[] => {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const KEYS = ['buses', 'students', 'drivers', 'routes', 'notifications', 'trips', 'stops', 'attendance', 'leaves', 'announcements'];
    for (const key of KEYS) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  return Array.isArray(payload) ? payload : [];
};

export default api;
