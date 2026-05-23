import axios from 'axios';
import { clearAuth, getToken } from './auth';

const baseURL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: baseURL.endsWith('/api/v1') ? baseURL : `${baseURL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// إضافة JWT تلقائياً لكل طلب
api.interceptors.request.use((cfg) => {
  const token = getToken();
  if (token) {
    cfg.headers = cfg.headers ?? {};
    (cfg.headers as any).Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// عند 401: مسح الجلسة وإعادة توجيه للـ login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== 'undefined') {
      const onLoginPage = window.location.pathname === '/login';
      if (!onLoginPage) {
        clearAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);
