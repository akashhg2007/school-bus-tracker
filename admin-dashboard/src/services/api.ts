import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Backend list endpoints return `{ success, message, data: { <items>, total, page, limit } }`.
// This helper extracts the actual array regardless of the payload shape.
export const unwrapList = (payload: any): any[] => {
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
