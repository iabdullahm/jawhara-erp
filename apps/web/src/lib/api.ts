import axios from 'axios';

const baseURL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: baseURL.endsWith('/api/v1') ? baseURL : `${baseURL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// لاحقاً: interceptor لإضافة JWT Auth header
// api.interceptors.request.use((cfg) => {
//   const token = localStorage.getItem('access_token');
//   if (token) cfg.headers.Authorization = `Bearer ${token}`;
//   return cfg;
// });
