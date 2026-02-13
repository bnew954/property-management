import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  logout,
  refreshAccessToken,
} from "./auth";

const api = axios.create({
  baseURL: "http://localhost:8000/api/",
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((pending) => {
    if (error) {
      pending.reject(error);
    } else {
      pending.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (!getRefreshToken()) {
      logout();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((queueError) => Promise.reject(queueError));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const newAccessToken = await refreshAccessToken();
      processQueue(null, newAccessToken);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export const getProperties = () => api.get("properties/");
export const getProperty = (id) => api.get(`properties/${id}/`);
export const createProperty = (data) => api.post("properties/", data);
export const updateProperty = (id, data) => api.put(`properties/${id}/`, data);
export const deleteProperty = (id) => api.delete(`properties/${id}/`);

export const getUnits = (params = {}) => api.get("units/", { params });
export const getUnit = (id) => api.get(`units/${id}/`);
export const createUnit = (data) => api.post("units/", data);
export const updateUnit = (id, data) => api.put(`units/${id}/`, data);
export const deleteUnit = (id) => api.delete(`units/${id}/`);

export const getTenants = () => api.get("tenants/");
export const getTenant = (id) => api.get(`tenants/${id}/`);
export const createTenant = (data) => api.post("tenants/", data);
export const updateTenant = (id, data) => api.put(`tenants/${id}/`, data);
export const deleteTenant = (id) => api.delete(`tenants/${id}/`);

export const getLeases = () => api.get("leases/");
export const getLease = (id) => api.get(`leases/${id}/`);
export const createLease = (data) => api.post("leases/", data);
export const updateLease = (id, data) => api.put(`leases/${id}/`, data);
export const deleteLease = (id) => api.delete(`leases/${id}/`);

export const getPayments = () => api.get("payments/");
export const getPayment = (id) => api.get(`payments/${id}/`);
export const createPayment = (data) => api.post("payments/", data);
export const updatePayment = (id, data) => api.put(`payments/${id}/`, data);
export const deletePayment = (id) => api.delete(`payments/${id}/`);
export const createPaymentIntent = (leaseId) =>
  api.post("payments/create-intent/", { lease_id: leaseId });
export const confirmStripePayment = (data) =>
  api.post("payments/confirm/", data);
export const getPaymentHistory = () => api.get("payments/history/");

export const getMaintenanceRequests = () => api.get("maintenance-requests/");
export const getMaintenanceRequest = (id) => api.get(`maintenance-requests/${id}/`);
export const createMaintenanceRequest = (data) =>
  api.post("maintenance-requests/", data);
export const updateMaintenanceRequest = (id, data) =>
  api.put(`maintenance-requests/${id}/`, data);
export const deleteMaintenanceRequest = (id) =>
  api.delete(`maintenance-requests/${id}/`);

export const getMe = () => api.get("me/");

export default api;
