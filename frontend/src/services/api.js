import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  logout,
  refreshAccessToken,
} from "./auth";

const API_BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:8000/api/").replace(/\/?$/, "/");

const api = axios.create({
  baseURL: API_BASE_URL,
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
export const getScreenings = () => api.get("screenings/");
export const getScreening = (id) => api.get(`screenings/${id}/`);
export const createScreening = (data) => api.post("screenings/", data);
export const runScreening = (id) => api.post(`screenings/${id}/run-screening/`);
export const sendScreeningConsent = (id) => api.post(`screenings/${id}/send-consent/`);
export const getScreeningConsentDetails = (token) => api.get(`screening/consent/${token}/`);
export const submitScreeningConsent = (token, payload) =>
  api.post(`screening/consent/${token}/`, payload);
export const getDocuments = (params = {}) => api.get("documents/", { params });
export const getDocument = (id) => api.get(`documents/${id}/`);
export const uploadDocument = (formData, onUploadProgress) =>
  api.post("documents/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
  });
export const updateDocument = (id, data) => api.patch(`documents/${id}/`, data);
export const deleteDocument = (id) => api.delete(`documents/${id}/`);
export const downloadDocument = (id) =>
  api.get(`documents/${id}/download/`, { responseType: "blob" });

export const getExpenses = (params = {}) => api.get("expenses/", { params });
export const getExpense = (id) => api.get(`expenses/${id}/`);
export const createExpense = (data) => api.post("expenses/", data);
export const updateExpense = (id, data) => api.patch(`expenses/${id}/`, data);
export const deleteExpense = (id) => api.delete(`expenses/${id}/`);

export const getRentLedgerEntries = (params = {}) =>
  api.get("rent-ledger/", { params });
export const getLateFeeRules = () => api.get("accounting/late-fee-rules/");
export const createLateFeeRule = (data) => api.post("accounting/late-fee-rules/", data);
export const updateLateFeeRule = (id, data) =>
  api.patch(`accounting/late-fee-rules/${id}/`, data);
export const deleteLateFeeRule = (id) => api.delete(`accounting/late-fee-rules/${id}/`);

export const generateAccountingCharges = () =>
  api.post("accounting/generate-charges/");
export const getAccountingDashboard = (params = {}) =>
  api.get("accounting/dashboard/", { params });
export const getAccountingPnL = (params = {}) =>
  api.get("accounting/pnl/", { params });
export const getAccountingCashflow = (params = {}) =>
  api.get("accounting/cashflow/", { params });
export const getAccountingRentRoll = (params = {}) =>
  api.get("accounting/rent-roll/", { params });
export const getAccountingTaxReport = (params = {}) =>
  api.get("accounting/tax-report/", { params });
export const getAccountingCategories = (params = {}) =>
  api.get("accounting/categories/", { params });
export const getAccountingCategoryTree = (params = {}) =>
  api.get("accounting/categories/", { params: { ...params, tree: true } });
export const getAccountingCategoryLedger = (categoryId, params = {}) =>
  api.get(`accounting/categories/${categoryId}/ledger/`, { params });
export const createAccountingCategory = (data) =>
  api.post("accounting/categories/", data);
export const updateAccountingCategory = (id, data) =>
  api.patch(`accounting/categories/${id}/`, data);
export const deleteAccountingCategory = (id) =>
  api.delete(`accounting/categories/${id}/`);
export const getTransactions = (params = {}) =>
  api.get("accounting/transactions/", { params });
export const createTransaction = (data) => api.post("accounting/transactions/", data);
export const updateTransaction = (id, data) => api.patch(`accounting/transactions/${id}/`, data);
export const deleteTransaction = (id) => api.delete(`accounting/transactions/${id}/`);

export const getJournalEntries = (params = {}) =>
  api.get("accounting/journal-entries/", { params });
export const createJournalEntry = (data) =>
  api.post("accounting/journal-entries/", data);
export const getJournalEntry = (id) =>
  api.get(`accounting/journal-entries/${id}/`);
export const postJournalEntry = (id) =>
  api.post(`accounting/journal-entries/${id}/post/`);
export const reverseJournalEntry = (id) =>
  api.post(`accounting/journal-entries/${id}/reverse/`);
export const voidJournalEntry = (id) =>
  api.post(`accounting/journal-entries/${id}/void/`);
export const recordIncome = (payload) =>
  api.post("accounting/record-income/", payload);
export const recordExpense = (payload) =>
  api.post("accounting/record-expense/", payload);
export const recordTransfer = (payload) =>
  api.post("accounting/record-transfer/", payload);
export const getTrialBalanceReport = (params = {}) =>
  api.get("accounting/reports/trial-balance/", { params });
export const getBalanceSheetReport = (params = {}) =>
  api.get("accounting/reports/balance-sheet/", { params });
export const getGeneralLedgerReport = (params = {}) =>
  api.get("accounting/reports/general-ledger/", { params });

export const getAccountingPeriods = (params = {}) =>
  api.get("accounting/periods/", { params });
export const createAccountingPeriod = (data) =>
  api.post("accounting/periods/", data);
export const lockAccountingPeriod = (id) =>
  api.post(`accounting/periods/${id}/lock/`);
export const unlockAccountingPeriod = (id) =>
  api.post(`accounting/periods/${id}/unlock/`);

export const getRecurringTransactions = (params = {}) =>
  api.get("accounting/recurring/", { params });
export const createRecurringTransaction = (data) =>
  api.post("accounting/recurring/", data);
export const updateRecurringTransaction = (id, data) =>
  api.patch(`accounting/recurring/${id}/`, data);
export const runRecurringTransaction = (id) =>
  api.post(`accounting/recurring/${id}/run/`);

export const getOwnerStatements = (params = {}) =>
  api.get("accounting/owner-statements/", { params });
export const generateOwnerStatement = (data) =>
  api.post("accounting/owner-statements/generate/", data);

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

export const generateLeaseDocument = (id) => api.post(`leases/${id}/generate-document/`);
export const sendLeaseForSigning = (id) => api.post(`leases/${id}/send-for-signing/`);
export const landlordSignLease = (id, payload) =>
  api.post(`leases/${id}/landlord-sign/`, payload);
export const createLeaseFromApplication = (id) =>
  api.post(`applications/${id}/create-lease/`);
export const getLeaseSigningDetails = (token) => api.get(`lease/sign/${token}/`);
export const submitLeaseSigning = (token, payload) => api.post(`lease/sign/${token}/`, payload);

export const getMaintenanceRequests = () => api.get("maintenance-requests/");
export const getMaintenanceRequest = (id) => api.get(`maintenance-requests/${id}/`);
export const createMaintenanceRequest = (data) =>
  api.post("maintenance-requests/", data);
export const updateMaintenanceRequest = (id, data) =>
  api.put(`maintenance-requests/${id}/`, data);
export const deleteMaintenanceRequest = (id) =>
  api.delete(`maintenance-requests/${id}/`);

export const getListings = (params = {}) => api.get("listings/", { params });
export const getListingBySlug = (slug) => api.get(`listings/${slug}/`);
export const submitListingApplication = (slug, data) =>
  api.post(`listings/${slug}/apply/`, data);

export const getApplications = (params = {}) => api.get("applications/", { params });
export const getApplication = (id) => api.get(`applications/${id}/`);
export const updateApplication = (id, data) => api.patch(`applications/${id}/`, data);
export const approveApplication = (id, data = {}) => api.post(`applications/${id}/approve/`, data);
export const denyApplication = (id, data = {}) => api.post(`applications/${id}/deny/`, data);
export const runApplicationScreening = (id) => api.post(`applications/${id}/run-screening/`);

export const getMe = () => api.get("me/");
export const getOrganization = () => api.get("organization/");
export const updateOrganization = (data) => api.patch("organization/", data);
export const inviteMember = (email, role) =>
  api.post("organization/invite/", { email, role });
export const getOrgMembers = () => api.get("organization/members/");
export const getOrgInvitations = () => api.get("organization/invitations/");

export const getNotifications = () => api.get("notifications/");
export const markNotificationRead = (id) =>
  api.patch(`notifications/${id}/`, { is_read: true });
export const markAllNotificationsRead = () =>
  api.patch("notifications/mark-all-read/");
export const deleteNotification = (id) => api.delete(`notifications/${id}/`);
export const getUnreadNotificationsCount = () =>
  api.get("notifications/unread-count/");

export const getInboxMessages = () => api.get("messages/");
export const getSentMessages = () => api.get("messages/sent/");
export const getMessageRecipients = () => api.get("messages/users/");
export const getOrganizationUsers = () => api.get("organization/users/");
export const sendMessage = (data) => api.post("messages/", data);
export const markMessageRead = (id) => api.patch(`messages/${id}/mark-read/`);
export const replyMessage = (id, data) => api.post(`messages/${id}/reply/`, data);

export default api;
