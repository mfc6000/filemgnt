import axios from 'axios';

const http = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

http.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Placeholder: dispatch logout or redirect logic later
      console.warn('Unauthorized, please login again');
    }
    return Promise.reject(error);
  }
);

export default http;
