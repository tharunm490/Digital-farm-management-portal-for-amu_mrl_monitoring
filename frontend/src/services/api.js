import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
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

// Response interceptor to handle auth errors
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

// Batches API
export const batchAPI = {
  getAll: () => api.get('/batches'),
  getById: (id) => api.get(`/batches/${id}`),
  create: (data) => api.post('/batches', data),
};

// AMU API
export const amuAPI = {
  getByBatchId: (batch_id) => api.get(`/amu/${batch_id}`),
  create: (data) => api.post('/amu', data),
};

// QR API
export const qrAPI = {
  generate: (batch_id) => api.get(`/qr/${batch_id}`),
};

// Verification API
export const verifyAPI = {
  verifyBatch: (batch_id) => api.get(`/verify/${batch_id}`),
};

export default api;
