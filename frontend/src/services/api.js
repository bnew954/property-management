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

export const getAgentSkills = () => api.get("agent-skills/");
export const toggleAgentSkill = (id) => api.post(`agent-skills/${id}/toggle/`);
export const runAgentSkill = (id) => api.post(`agent-skills/${id}/run/`);
export const getAgentTasks = (params = {}) => api.get("agent-tasks/", { params });
export const getAgentTaskFeed = () => api.get("agent-tasks/feed/");
export const getAgentTaskSummary = () => api.get("agent-tasks/summary/");
export const previewAgentTask = (id) => api.get(`agent-tasks/${id}/preview/`);
export const executeAgentTask = (id) => api.post(`agent-tasks/${id}/execute/`);
export const approveAgentTask = (id, data) => api.post(`agent-tasks/${id}/approve/`, data);
export const dismissAgentTask = (id, data) => api.post(`agent-tasks/${id}/dismiss/`, data);

export const getLeads = (params = {}) => api.get("leads/", { params });
export const getLead = (id) => api.get(`leads/${id}/`);
export const createLead = (data) => api.post("leads/", data);
export const updateLead = (id, data) => api.patch(`leads/${id}/`, data);
export const deleteLead = (id) => api.delete(`leads/${id}/`);
export const addLeadActivity = (id, data) => api.post(`leads/${id}/add_activity/`, data);
export const scheduleTour = (id, data) => api.post(`leads/${id}/schedule_tour/`, data);
export const completeTour = (id, data) => api.post(`leads/${id}/complete_tour/`, data);
export const markLeadLost = (id, data) => api.post(`leads/${id}/mark_lost/`, data);
export const convertLeadToApplication = (id) => api.post(`leads/${id}/convert_to_application/`);
export const getLeadSummary = () => api.get("leads/summary/");
export const getLeadPipeline = () => api.get("leads/pipeline/");

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
export const updateScreening = (id, data) => api.patch(`screenings/${id}/`, data);
export const deleteScreening = (id) => api.delete(`screenings/${id}/`);
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
export const getReconciliations = () => api.get("accounting/reconciliations/");
export const createReconciliation = (data) =>
  api.post("accounting/reconciliations/", data);
export const getReconciliation = (id) =>
  api.get(`accounting/reconciliations/${id}/`);
export const completeReconciliation = (id) =>
  api.post(`accounting/reconciliations/${id}/complete/`);
export const addReconciliationMatch = (id, payload) =>
  api.post(`accounting/reconciliations/${id}/add-match/`, payload);
export const removeReconciliationMatch = (id, payload) =>
  api.post(`accounting/reconciliations/${id}/remove-match/`, payload);
export const excludeReconciliationItem = (id, payload) =>
  api.post(`accounting/reconciliations/${id}/exclude/`, payload);
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
export const getTransactionImports = () => api.get("accounting/imports/");
export const createTransactionImport = (formData) =>
  api.post("accounting/imports/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const getTransactionImport = (id) => api.get(`accounting/imports/${id}/`);
export const confirmImportMapping = (id, mapping) =>
  api.post(`accounting/imports/${id}/confirm-mapping/`, mapping);
export const bookImport = (id) => api.post(`accounting/imports/${id}/book/`);
export const getImportedTransactions = (importId) =>
  api.get(`accounting/imported-transactions/?import_id=${importId}`);
export const updateImportedTransaction = (id, payload) =>
  api.patch(`accounting/imported-transactions/${id}/`, payload);
export const bulkApproveTransactions = (payload) =>
  api.post("accounting/imported-transactions/bulk-approve/", payload);
export const getClassificationRules = () => api.get("accounting/classification-rules/");
export const createClassificationRule = (payload) =>
  api.post("accounting/classification-rules/", payload);
export const updateClassificationRule = (id, payload) =>
  api.patch(`accounting/classification-rules/${id}/`, payload);
export const deleteClassificationRule = (id) =>
  api.delete(`accounting/classification-rules/${id}/`);
export const createRuleFromTransaction = (payload) =>
  api.post("accounting/classification-rules/create-from-transaction/", payload);
export const testClassificationRule = (payload) =>
  api.post("accounting/classification-rules/test/", payload);
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
export const deleteRecurringTransaction = (id) =>
  api.delete(`accounting/recurring/${id}/`);
export const runRecurringTransaction = (id) =>
  api.post(`accounting/recurring/${id}/run/`);
export const runAllRecurring = () => api.post("accounting/recurring/run-all/");

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

export const getVendors = () => api.get("/api/vendors/");
export const getVendor = (id) => api.get(`/api/vendors/${id}/`);
export const createVendor = (data) => api.post("/api/vendors/", data);
export const updateVendor = (id, data) => api.patch(`/api/vendors/${id}/`, data);
export const deleteVendor = (id) => api.delete(`/api/vendors/${id}/`);
export const inviteVendor = (vendorId) => api.post(`/vendors/${vendorId}/invite/`);
export const getVendorBills = (id) => api.get(`/api/vendors/${id}/bills/`);
export const getVendorSummary = () => api.get("/api/vendors/summary/");

export const getBills = (params) => api.get("/api/bills/", { params });
export const getBill = (id) => api.get(`/api/bills/${id}/`);
export const createBill = (data) => api.post("/api/bills/", data);
export const updateBill = (id, data) => api.patch(`/api/bills/${id}/`, data);
export const deleteBill = (id) => api.delete(`/api/bills/${id}/`);
export const payBill = (id, data) => api.post(`/api/bills/${id}/pay/`, data);
export const cancelBill = (id, data) => api.post(`/api/bills/${id}/cancel/`, data);
export const getBillSummary = () => api.get("/api/bills/summary/");
export const getBillAging = () => api.get("/api/bills/aging/");

export const getBillPayments = (params) => api.get("/api/bill-payments/", { params });

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
export const patchMaintenanceRequest = (id, data) =>
  api.patch(`maintenance-requests/${id}/`, data);
export const deleteMaintenanceRequest = (id) =>
  api.delete(`maintenance-requests/${id}/`);

export const getWorkOrders = (params = {}) => api.get("work-orders/", { params });
export const getWorkOrder = (id) => api.get(`work-orders/${id}/`);
export const createWorkOrder = (data) => api.post("work-orders/", data);
export const updateWorkOrder = (id, data) => api.patch(`work-orders/${id}/`, data);
export const deleteWorkOrder = (id) => api.delete(`work-orders/${id}/`);
export const addWorkOrderNote = (id, data) => api.post(`work-orders/${id}/add_note/`, data);
export const getWorkOrderSummary = () => api.get("work-orders/summary/");

export const getVendorPortalWorkOrders = () => api.get("vendor-portal/work-orders/");
export const getVendorPortalWorkOrder = (id) => api.get(`vendor-portal/work-orders/${id}/`);
export const vendorAcceptWorkOrder = (id) => api.post(`vendor-portal/work-orders/${id}/accept/`);
export const vendorStartWork = (id) => api.post(`vendor-portal/work-orders/${id}/start_work/`);
export const vendorCompleteWork = (id, data) => api.post(`vendor-portal/work-orders/${id}/complete/`, data);
export const vendorRejectWorkOrder = (id, data) => api.post(`vendor-portal/work-orders/${id}/reject/`, data);
export const updateVendorPortalWorkOrder = (id, data) => api.patch(`vendor-portal/work-orders/${id}/`, data);
export const vendorAddNote = (id, data) => api.post(`vendor-portal/work-orders/${id}/add_note/`, data);
export const vendorSubmitInvoice = (id, data) => api.post(`vendor-portal/work-orders/${id}/submit_invoice/`, data);
export const getVendorPortalProfile = () => api.get("vendor-portal/profile/");
export const updateVendorPortalProfile = (data) => api.patch("vendor-portal/profile/", data);
export const getVendorPortalDashboard = () => api.get("vendor-portal/dashboard/");

export const vendorRegister = (token, data) => api.post(`vendor-portal/register/${token}/`, data);

export const getListings = (params = {}) => api.get("listings/", { params });
export const getListingBySlug = (slug) => api.get(`listings/${slug}/`);
export const submitListingApplication = (slug, data) =>
  api.post(`listings/${slug}/apply/`, data);

export const getBlogPosts = (params) => api.get("/api/blog/", { params });
export const getBlogPost = (slug) => api.get(`/api/blog/${slug}/`);

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
export const sendAiMessage = (data) => api.post("/api/ai/chat/", data);
export const markMessageRead = (id) => api.patch(`messages/${id}/mark-read/`);
export const replyMessage = (id, data) => api.post(`messages/${id}/reply/`, data);

export default api;

