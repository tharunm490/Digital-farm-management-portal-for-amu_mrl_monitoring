import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

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
    console.log('Making API request to:', config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log('API response received for:', response.config.url, 'Status:', response.status);
    return response;
  },
  (error) => {
    console.error('API request failed for:', error.config?.url, 'Error:', error.message);
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
  getByFarmer: (farmer_id) => api.get(`/amu/farmer/${farmer_id}`),
  getByVet: (vet_id) => api.get(`/amu/vet/${vet_id}`),
  create: (data) => api.post('/amu', data),
};

// Vaccination API
export const vaccinationAPI = {
  getAll: () => api.get('/vaccinations'),
  getUpcoming: (userId, days = 30) => api.get(`/vaccinations/upcoming/${days}`),
  getOverdue: (userId) => api.get('/vaccinations/overdue'),
  getByEntity: (entityId) => api.get(`/vaccinations/entity/${entityId}`),
  getById: (id) => api.get(`/vaccinations/${id}`),
  create: (data) => api.post('/vaccinations', data),
  update: (id, data) => api.put(`/vaccinations/${id}`, data),
  delete: (id) => api.delete(`/vaccinations/${id}`),
  getHistory: () => api.get('/vaccinations/history'),
  markDone: (vaccId) => api.post(`/vaccinations/history/${vaccId}/mark-done`),
};

// Verification API
export const verifyAPI = {
  verifyBatch: (batch_id) => api.get(`/verify/${batch_id}`),
};

// Prediction API
export const predictAPI = {
  predict: (data) => api.post('/predict', data),
};

// Notification API
export const notificationAPI = {
  getAll: (limit = 50) => api.get(`/notifications?limit=${limit}`),
  getByType: (type, limit = 50) => api.get(`/notifications/type/${type}?limit=${limit}`),
  getUnread: () => api.get('/notifications/unread'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
};

// Vet Farm Mapping API
export const vetFarmAPI = {
  getVetForFarm: (farmId) => api.get(`/vet-farm-mapping/farm/${farmId}`),
  debugVetAssignment: (farmId) => api.get(`/vet-farm-mapping/debug/${farmId}`),
};

export default api;
