import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SendIcon from "@mui/icons-material/Send";
import {
  getVendorBills,
  getVendorPortalDashboard,
  getVendorPortalProfile,
  getVendorPortalWorkOrders,
  updateVendorPortalProfile,
  updateVendorPortalWorkOrder,
  vendorAcceptWorkOrder,
  vendorAddNote,
  vendorCompleteWork,
  vendorRejectWorkOrder,
  vendorStartWork,
  vendorSubmitInvoice,
} from "../services/api";
import { useUser } from "../services/userContext";

const parseList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};

const formatCurrency = (value) =>
  toNumber(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const toTitle = (value = "") =>
  String(value)
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");

const statusBadge = (status) => {
  const map = {
    assigned: { backgroundColor: "rgba(59,130,246,0.16)", color: "#60a5fa", borderColor: "rgba(59,130,246,0.28)" },
    accepted: { backgroundColor: "rgba(16,185,129,0.16)", color: "#34d399", borderColor: "rgba(16,185,129,0.28)" },
    in_progress: { backgroundColor: "rgba(245,158,11,0.16)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.28)" },
    completed: { backgroundColor: "rgba(16,185,129,0.16)", color: "#22c55e", borderColor: "rgba(16,185,129,0.28)" },
    rejected: { backgroundColor: "rgba(239,68,68,0.16)", color: "#f87171", borderColor: "rgba(239,68,68,0.28)" },
    paid: { backgroundColor: "rgba(34,197,94,0.16)", color: "#22c55e", borderColor: "rgba(34,197,94,0.28)" },
    pending: { backgroundColor: "rgba(245,158,11,0.16)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.28)" },
    partial: { backgroundColor: "rgba(245,158,11,0.16)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.28)" },
    overdue: { backgroundColor: "rgba(239,68,68,0.16)", color: "#f87171", borderColor: "rgba(239,68,68,0.28)" },
    draft: { backgroundColor: "rgba(148,163,184,0.16)", color: "#9ca3af", borderColor: "rgba(148,163,184,0.28)" },
  };
  const normalized = String(status || "").toLowerCase();
  return (
    map[normalized] || {
      backgroundColor: "rgba(148,163,184,0.16)",
      color: "#9ca3af",
      borderColor: "rgba(148,163,184,0.28)",
    }
  );
};

const priorityBadge = (priority) => {
  const normalized = String(priority || "").toLowerCase();
  if (normalized === "emergency") {
    return { backgroundColor: "rgba(239,68,68,0.16)", color: "#ef4444", borderColor: "rgba(239,68,68,0.28)" };
  }
  if (normalized === "high") {
    return { backgroundColor: "rgba(249,115,22,0.16)", color: "#f97316", borderColor: "rgba(249,115,22,0.28)" };
  }
  if (normalized === "medium") {
    return { backgroundColor: "rgba(245,158,11,0.16)", color: "#fbbf24", borderColor: "rgba(251,191,36,0.28)" };
  }
  return { backgroundColor: "rgba(156,163,175,0.16)", color: "#9ca3af", borderColor: "rgba(156,163,175,0.28)" };
};

const getOrderLocation = (order) => {
  const property = order?.property_name || order?.property || "";
  const unit = order?.unit_number || order?.unit || "";
  if (property && unit) return `${property} · ${unit}`;
  if (property) return property;
  if (unit) return unit;
  return "—";
};

const shortStatus = (status) => {
  const map = {
    assigned: "Assigned",
    accepted: "Accepted",
    in_progress: "In Progress",
    completed: "Completed",
    rejected: "Rejected",
  };
  return map[String(status || "").toLowerCase()] || "Unknown";
};

const isCurrentMonth = (value) => {
  const date = parseDate(value);
  if (!date) return false;
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

const formatErrorMessage = (error, fallback) => {
  const detail =
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.response?.data?.non_field_errors?.[0];
  return typeof detail === "string" ? detail : fallback;
};

function VendorPortal() {
  const { user, loading: userLoading, refreshUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const segments = location.pathname.split("/").filter(Boolean);
  const activeSection = ["dashboard", "work-orders", "invoices", "profile"].includes(segments[1])
    ? segments[1]
    : "dashboard";
  const selectedWorkOrderIdFromPath =
    activeSection === "work-orders" && segments[2] ? Number(segments[2]) : null;
  const activeWorkOrderId = Number.isNaN(selectedWorkOrderIdFromPath) ? null : selectedWorkOrderIdFromPath;

  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState("");
  const [globalMessage, setGlobalMessage] = useState({ open: false, message: "", severity: "success" });
  const [dashboard, setDashboard] = useState({});
  const [workOrders, setWorkOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [workOrderFilter, setWorkOrderFilter] = useState("All");
  const [expandedOrders, setExpandedOrders] = useState(() => new Set());
  const [isSubmitting, setIsSubmitting] = useState({});
  const [noteDrafts, setNoteDrafts] = useState({});
  const [vendorNoteDrafts, setVendorNoteDrafts] = useState({});
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceTarget, setInvoiceTarget] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({ amount: "", description: "", notes: "" });
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completeForm, setCompleteForm] = useState({ actual_cost: "", vendor_notes: "" });
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    contact_name: "",
    email: "",
    phone: "",
    address: "",
  });

  const vendorProfileId = useMemo(() => {
    const rawVendor = user?.vendor_profile;
    return String(rawVendor?.id || rawVendor?.vendor_id || rawVendor?.pk || "");
  }, [user]);

  const vendorName = useMemo(() => {
    return (
      profile?.name ||
      user?.vendor_profile?.name ||
      user?.vendor_profile?.vendor_name ||
      "Vendor"
    );
  }, [profile, user]);

  const vendorCategory = useMemo(() => {
    const source = profile?.category || user?.vendor_profile?.category;
    return source ? toTitle(String(source).replace("_", " ")) : "Vendor";
  }, [profile, user]);

  const normalizedWorkOrders = useMemo(
    () => workOrders.map((order) => ({ ...order, status: String(order.status || "").toLowerCase() })),
    [workOrders]
  );

  const activeWorkOrders = useMemo(
    () =>
      normalizedWorkOrders.filter((order) => ["assigned", "accepted", "in_progress"].includes(order.status)),
    [normalizedWorkOrders]
  );

  const recentCompletions = useMemo(() => {
    return [...normalizedWorkOrders]
      .filter((order) => order.status === "completed")
      .sort((a, b) => {
        const aDate = parseDate(a.completed_date || a.updated_at || a.created_at)?.getTime() || 0;
        const bDate = parseDate(b.completed_date || b.updated_at || b.created_at)?.getTime() || 0;
        return bDate - aDate;
      })
      .slice(0, 5);
  }, [normalizedWorkOrders]);

  const filterWorkOrders = useMemo(() => {
    if (workOrderFilter === "All") return normalizedWorkOrders;
    if (workOrderFilter === "Assigned") {
      return normalizedWorkOrders.filter((order) => ["assigned", "accepted"].includes(order.status));
    }
    if (workOrderFilter === "In Progress") {
      return normalizedWorkOrders.filter((order) => order.status === "in_progress");
    }
    if (workOrderFilter === "Completed") {
      return normalizedWorkOrders.filter((order) => order.status === "completed");
    }
    if (workOrderFilter === "Rejected") {
      return normalizedWorkOrders.filter((order) => order.status === "rejected");
    }
    return normalizedWorkOrders;
  }, [normalizedWorkOrders, workOrderFilter]);

  const completedThisMonth = useMemo(() => {
    return normalizedWorkOrders.filter(
      (order) => order.status === "completed" && isCurrentMonth(order.completed_date || order.updated_at)
    ).length;
  }, [normalizedWorkOrders]);

  const metricCards = useMemo(() => {
    const assigned = normalizedWorkOrders.filter((order) => order.status === "assigned").length;
    const inProgress = normalizedWorkOrders.filter((order) => order.status === "in_progress").length;
    const totalEarned = dashboard?.total_earned || 0;
    const pendingPayment = dashboard?.pending_payment || 0;
    return [
      { label: "Assigned", value: assigned, background: "rgba(59,130,246,0.12)", borderColor: "rgba(59,130,246,0.32)" },
      { label: "In Progress", value: inProgress, background: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.32)" },
      { label: "Completed", value: completedThisMonth, background: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.32)" },
      { label: "Total Earned", value: formatCurrency(totalEarned), background: "rgba(168,85,247,0.12)", borderColor: "rgba(168,85,247,0.32)" },
      { label: "Pending Payment", value: formatCurrency(pendingPayment), background: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.32)" },
    ];
  }, [dashboard, completedThisMonth, normalizedWorkOrders]);

  const isBusy = (id) => Boolean(isSubmitting[id]);

  const loadPortalData = useCallback(async () => {
    if (!user || userLoading || !user.vendor_profile) return;
    setLoading(true);
    setLoadingError("");
    try {
      const [dashboardRes, profileRes, workOrdersRes] = await Promise.all([
        getVendorPortalDashboard(),
        getVendorPortalProfile(),
        getVendorPortalWorkOrders(),
      ]);
      setDashboard(dashboardRes.data || {});
      const profileData = profileRes.data || {};
      setProfile(profileData);
      setProfileForm({
        contact_name: profileData.contact_name || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        address: profileData.address || "",
      });
      setWorkOrders(parseList(workOrdersRes.data || []));
      if (vendorProfileId) {
        const billsRes = await getVendorBills(vendorProfileId);
        setInvoices(parseList(billsRes.data || []));
      } else {
        setInvoices([]);
      }
    } catch (error) {
      setLoadingError(formatErrorMessage(error, "Failed to load vendor portal data."));
    } finally {
      setLoading(false);
    }
  }, [user, userLoading, vendorProfileId]);

  const refreshWorkOrders = useCallback(async () => {
    if (!user || userLoading) return;
    const workOrdersRes = await getVendorPortalWorkOrders();
    setWorkOrders(parseList(workOrdersRes.data || []));
  }, [user, userLoading]);
  const refreshInvoices = useCallback(async () => {
    if (!vendorProfileId) {
      setInvoices([]);
      return;
    }
    const billsRes = await getVendorBills(vendorProfileId);
    setInvoices(parseList(billsRes.data || []));
  }, [vendorProfileId]);

  const setOrderBusy = useCallback((orderId, busy) => {
    setIsSubmitting((current) => ({ ...current, [orderId]: busy }));
  }, []);

  const updateOrderInState = useCallback((updatedOrder) => {
    if (!updatedOrder?.id) {
      return;
    }
    setWorkOrders((current) =>
      current.map((order) =>
        String(order.id) === String(updatedOrder.id) ? { ...order, ...updatedOrder } : order
      )
    );
    setVendorNoteDrafts((current) => {
      if (!Object.prototype.hasOwnProperty.call(updatedOrder, "vendor_notes")) {
        return current;
      }
      return {
        ...current,
        [updatedOrder.id]: updatedOrder.vendor_notes || "",
      };
    });
  }, []);

  const sendAction = useCallback(
    async (orderId, action, payload = null) => {
      setOrderBusy(orderId, true);
      try {
        const response = await action(orderId, payload || undefined);
        updateOrderInState(response.data || {});
        setGlobalMessage({ open: true, message: "Work order updated.", severity: "success" });
        await refreshWorkOrders();
        await refreshInvoices();
      } catch (error) {
        setGlobalMessage({
          open: true,
          message: formatErrorMessage(error, "Unable to update work order."),
          severity: "error",
        });
      } finally {
        setOrderBusy(orderId, false);
      }
    },
    [refreshInvoices, refreshWorkOrders, setOrderBusy, updateOrderInState]
  );

  const handleAccept = (orderId) => {
    sendAction(orderId, vendorAcceptWorkOrder);
  };

  const handleStart = (orderId) => {
    sendAction(orderId, vendorStartWork);
  };

  const handleReject = (orderId) => {
    const payload = { vendor_notes: vendorNoteDrafts[orderId]?.trim() || "Vendor rejected the work order." };
    sendAction(orderId, vendorRejectWorkOrder, payload);
  };

  const handleMarkComplete = (order) => {
    setCompleteTarget(order);
    setCompleteForm({
      actual_cost: order.actual_cost ? String(order.actual_cost) : "",
      vendor_notes: order.vendor_notes || "",
    });
    setCompleteDialogOpen(true);
  };

  const submitCompleteWork = async () => {
    if (!completeTarget) return;
    try {
      setOrderBusy(completeTarget.id, true);
      const payload = {};
      if (completeForm.actual_cost !== "") {
        const value = Number(completeForm.actual_cost);
        if (!Number.isNaN(value)) payload.actual_cost = value;
      }
      if (completeForm.vendor_notes.trim()) payload.vendor_notes = completeForm.vendor_notes.trim();

      await vendorCompleteWork(completeTarget.id, payload);
      setGlobalMessage({ open: true, message: "Work order marked as complete.", severity: "success" });
      await refreshWorkOrders();
      await refreshInvoices();
      setCompleteDialogOpen(false);
      setCompleteTarget(null);
    } catch (error) {
      setGlobalMessage({
        open: true,
        message: formatErrorMessage(error, "Unable to complete this work order."),
        severity: "error",
      });
    } finally {
      if (completeTarget?.id) {
        setOrderBusy(completeTarget.id, false);
      }
    }
  };

  const handleSubmitInvoice = (order) => {
    setInvoiceTarget(order);
    setInvoiceForm({
      amount: order.actual_cost ? String(order.actual_cost) : "",
      description: `Invoice for ${order.title || "work order"}`,
      notes: "",
    });
    setInvoiceDialogOpen(true);
  };

  const submitInvoice = async () => {
    if (!invoiceTarget) return;
    if (!invoiceForm.amount || Number.isNaN(Number(invoiceForm.amount)) || Number(invoiceForm.amount) <= 0) {
      setGlobalMessage({
        open: true,
        message: "Amount is required to submit an invoice.",
        severity: "error",
      });
      return;
    }

    try {
      setOrderBusy(invoiceTarget.id, true);
      const payload = {
        amount: Number(invoiceForm.amount),
        description: invoiceForm.description || "",
        notes: invoiceForm.notes || "",
      };
      await vendorSubmitInvoice(invoiceTarget.id, payload);
      setGlobalMessage({
        open: true,
        message: "Invoice submitted — awaiting payment",
        severity: "success",
      });
      await refreshWorkOrders();
      await refreshInvoices();
      setInvoiceDialogOpen(false);
      setInvoiceTarget(null);
    } catch (error) {
      setGlobalMessage({
        open: true,
        message: formatErrorMessage(error, "Unable to submit invoice."),
        severity: "error",
      });
    } finally {
      if (invoiceTarget?.id) {
        setOrderBusy(invoiceTarget.id, false);
      }
    }
  };

  const sendNote = async (orderId) => {
    const message = (noteDrafts[orderId] || "").trim();
    if (!message) return;
    try {
      setOrderBusy(orderId, true);
      const response = await vendorAddNote(orderId, { message });
      updateOrderInState(response.data || {});
      setNoteDrafts((current) => ({ ...current, [orderId]: "" }));
      setGlobalMessage({ open: true, message: "Note added.", severity: "success" });
    } catch (error) {
      setGlobalMessage({
        open: true,
        message: formatErrorMessage(error, "Unable to add note."),
        severity: "error",
      });
    } finally {
      setOrderBusy(orderId, false);
    }
  };

  const saveVendorNotes = async (order) => {
    const updatedText = vendorNoteDrafts[order.id] ?? order.vendor_notes ?? "";
    try {
      setOrderBusy(order.id, true);
      const response = await updateVendorPortalWorkOrder(order.id, { vendor_notes: updatedText.trim() });
      updateOrderInState(response.data || {});
      setGlobalMessage({ open: true, message: "Vendor notes updated.", severity: "success" });
    } catch (error) {
      setGlobalMessage({
        open: true,
        message: formatErrorMessage(error, "Unable to save vendor notes."),
        severity: "error",
      });
    } finally {
      setOrderBusy(order.id, false);
    }
  };

  const toggleOrderExpand = (orderId) => {
    setExpandedOrders((current) => {
      const next = new Set(current);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
    if (activeSection === "work-orders") {
      navigate(`/vendor-portal/work-orders/${orderId}`, { replace: false });
    }
  };

  const loadProfileForEdit = useCallback(() => {
    setProfileForm({
      contact_name: profile?.contact_name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
    });
  }, [profile]);

  const saveProfile = async () => {
    try {
      setOrderBusy("profile", true);
      const response = await updateVendorPortalProfile({
        contact_name: profileForm.contact_name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
      });
      setProfile(response.data || {});
      setProfileEditing(false);
      setGlobalMessage({ open: true, message: "Profile updated.", severity: "success" });
      await refreshUser();
    } catch (error) {
      setGlobalMessage({
        open: true,
        message: formatErrorMessage(error, "Unable to update profile."),
        severity: "error",
      });
    } finally {
      setOrderBusy("profile", false);
    }
  };

  const invoiceStatusText = (invoice) => {
    const status = String(invoice.status || "").toLowerCase();
    if (status === "draft") return "Draft";
    if (status === "pending") return "Pending";
    if (status === "partial") return "Partial";
    if (status === "paid") return "Paid";
    if (status === "overdue") return "Overdue";
    if (status === "cancelled") return "Cancelled";
    return status ? status[0].toUpperCase() + status.slice(1) : "Unknown";
  };

  const getInvoicePaymentMethod = (invoice) => {
    const payment = parseList(invoice.payments).slice().sort((a, b) => {
      const aDate = parseDate(a.payment_date)?.getTime() || 0;
      const bDate = parseDate(b.payment_date)?.getTime() || 0;
      return bDate - aDate;
    })[0];
    if (!payment) return null;
    return {
      date: formatDate(payment.payment_date),
      method: toTitle(payment.payment_method || "Payment"),
      amount: payment.amount,
    };
  };

  useEffect(() => {
    loadPortalData();
  }, [loadPortalData]);

  useEffect(() => {
    if (activeSection === "work-orders" && activeWorkOrderId) {
      setExpandedOrders((current) => {
        const next = new Set(current);
        next.add(activeWorkOrderId);
        return next;
      });
    }
  }, [activeSection, activeWorkOrderId]);

  useEffect(() => {
    if (profileEditing) {
      loadProfileForEdit();
    }
  }, [profileEditing, loadProfileForEdit]);
  if (userLoading || !user) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "35vh" }}>
        <CircularProgress size={22} />
      </Box>
    );
  }

  if (!user.vendor_profile) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Vendor portal is only available for portal-enabled vendor accounts.
      </Alert>
    );
  }

  return (
    <Box sx={{ color: "text.primary" }}>
      {loadingError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadingError}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "35vh" }}>
          <CircularProgress size={24} />
        </Box>
      ) : null}

      {!loading && (
        <>
          {activeSection === "dashboard" && (
            <Box>
              <Typography variant="h5" sx={{ mb: 0.4, fontWeight: 700 }}>
                Welcome back, {vendorName}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                {vendorCategory}
              </Typography>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
                {metricCards.map((card) => (
                  <Paper
                    key={card.label}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      p: 2,
                      borderRadius: "12px",
                      backgroundColor: card.background,
                      border: `1px solid ${card.borderColor}`,
                    }}
                  >
                    <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: "0.85rem" }}>{card.label}</Typography>
                    <Typography variant="h5" sx={{ mt: 0.6, fontWeight: 700 }}>{card.value}</Typography>
                  </Paper>
                ))}
              </Stack>

              <Typography sx={{ mb: 1.2, fontSize: 18, fontWeight: 600 }}>
                Active Work Orders ({activeWorkOrders.length})
              </Typography>

              <Stack spacing={2} sx={{ mb: 3 }}>
                {activeWorkOrders.map((order) => (
                  <Box
                    key={order.id}
                    sx={{
                      backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "12px",
                      p: 3,
                    }}
                  >
                    <Typography sx={{ color: "white", fontWeight: 700 }}>{order.title || "Work Order"}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.4 }}>
                      {getOrderLocation(order)}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1.2, mb: 1.2 }}>
                      <Chip
                        size="small"
                        label={toTitle(order.priority || "low")}
                        sx={{ ...priorityBadge(order.priority), fontSize: "0.7rem", fontWeight: 600, textTransform: "capitalize" }}
                      />
                      <Chip
                        size="small"
                        label={shortStatus(order.status)}
                        sx={{ ...statusBadge(order.status), fontSize: "0.7rem", fontWeight: 600, textTransform: "capitalize" }}
                      />
                    </Stack>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mb: 1 }}>
                      {(order.description || "No description provided.").slice(0, 100)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                      Scheduled: {formatDate(order.scheduled_date)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.3 }}>
                      Estimated cost: {formatCurrency(order.estimated_cost)}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap" }}>
                      {order.status === "assigned" && (
                        <>
                          <Button size="small" variant="contained" disabled={isBusy(order.id)} onClick={() => handleAccept(order.id)} sx={{ backgroundColor: "#16a34a" }}>Accept</Button>
                          <Button size="small" variant="outlined" color="error" disabled={isBusy(order.id)} onClick={() => handleReject(order.id)}>Reject</Button>
                        </>
                      )}
                      {order.status === "accepted" && (
                        <Button size="small" variant="contained" disabled={isBusy(order.id)} onClick={() => handleStart(order.id)} sx={{ backgroundColor: "#f59e0b", color: "#111827" }}>Start Work</Button>
                      )}
                      {order.status === "in_progress" && (
                        <Button size="small" variant="contained" disabled={isBusy(order.id)} onClick={() => handleMarkComplete(order)} sx={{ backgroundColor: "#16a34a" }}>Mark Complete</Button>
                      )}
                      <Button size="small" variant="text" onClick={() => navigate(`/vendor-portal/work-orders/${order.id}`)}>
                        View Details
                      </Button>
                    </Stack>
                  </Box>
                ))}
                {!activeWorkOrders.length ? (
                  <Paper sx={{ p: 2, borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.03)" }}>
                    <Typography sx={{ color: "text.secondary" }}>No active work orders right now.</Typography>
                  </Paper>
                ) : null}
              </Stack>

              <Typography sx={{ mb: 1.2, fontSize: 18, fontWeight: 600 }}>Recent Completions</Typography>
              <Stack spacing={1}>
                {recentCompletions.length ? (
                  recentCompletions.map((order) => (
                    <Box
                      key={order.id}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 1,
                        alignItems: "center",
                        p: 1.4,
                        borderRadius: "10px",
                        backgroundColor: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: "white", fontWeight: 600 }}>{order.title || "Work Order"}</Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>{getOrderLocation(order)}</Typography>
                      </Box>
                      <Box sx={{ textAlign: "right", color: "text.secondary" }}>
                        <Typography sx={{ fontWeight: 600, color: "#22c55e", fontSize: "0.9rem" }}>
                          {formatCurrency(order.actual_cost)}
                        </Typography>
                        <Typography variant="caption">{formatDate(order.completed_date || order.updated_at)}</Typography>
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Typography sx={{ color: "text.secondary" }}>No recent completions yet.</Typography>
                )}
              </Stack>
            </Box>
          )}

          {activeSection === "work-orders" && (
            <Box>
              <Typography sx={{ mb: 0.6, fontSize: 24, fontWeight: 700 }}>Work Orders</Typography>
              <Tabs value={workOrderFilter} onChange={(event, value) => setWorkOrderFilter(value)} textColor="primary" indicatorColor="primary" sx={{ mb: 2 }} variant="scrollable">
                <Tab value="All" label="All" />
                <Tab value="Assigned" label="Assigned" />
                <Tab value="In Progress" label="In Progress" />
                <Tab value="Completed" label="Completed" />
                <Tab value="Rejected" label="Rejected" />
              </Tabs>

              <Stack spacing={2}>
                {filterWorkOrders.map((order) => {
                  const expanded = expandedOrders.has(order.id);
                  const notes = parseList(order.notes);
                  const locationLabel = getOrderLocation(order);
                  const noteDraft = noteDrafts[order.id] || "";
                  const vendorNotes = vendorNoteDrafts[order.id] ?? order.vendor_notes ?? "";

                  return (
                    <Paper key={order.id} sx={{ borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                      <Box sx={{ p: 2.2, cursor: "pointer" }} onClick={() => toggleOrderExpand(order.id)}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ color: "white", fontWeight: 700 }}>{order.title || "Work Order"}</Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                              {locationLabel}
                            </Typography>
                          </Box>
                          <Chip size="small" label={toTitle(order.priority || "low")} sx={{ ...priorityBadge(order.priority), height: 23, textTransform: "capitalize", fontWeight: 600, fontSize: "0.7rem" }} />
                          <Chip size="small" label={shortStatus(order.status)} sx={{ ...statusBadge(order.status), height: 23, textTransform: "capitalize", fontWeight: 600, fontSize: "0.7rem" }} />
                          {expanded ? <ExpandLessIcon sx={{ color: "text.secondary" }} /> : <ExpandMoreIcon sx={{ color: "text.secondary" }} />}
                        </Stack>
                        <Typography sx={{ mt: 1.2, color: "rgba(255,255,255,0.72)", fontSize: "0.84rem" }}>
                          {`Scheduled: ${formatDate(order.scheduled_date)} · Estimated: ${formatCurrency(order.estimated_cost)}`}
                        </Typography>
                      </Box>

                      <Collapse in={expanded} timeout="auto" unmountOnExit>
                        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
                        <Box sx={{ p: 2.2 }}>
                          <Typography sx={{ color: "text.secondary", mb: 0.6 }} variant="body2">Description</Typography>
                          <Typography sx={{ color: "rgba(255,255,255,0.8)", mb: 1.4 }}>{order.description || "No description."}</Typography>

                          <Typography sx={{ color: "text.secondary", mb: 0.6 }} variant="body2">Landlord Notes</Typography>
                          <Typography sx={{ color: "rgba(255,255,255,0.8)", mb: 1.4 }}>{order.landlord_notes || "No landlord notes."}</Typography>

                          <Typography sx={{ color: "text.secondary", mb: 0.6 }} variant="body2">Vendor Notes</Typography>
                          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems="flex-start" sx={{ mb: 1.6 }}>
                            <TextField
                              fullWidth
                              size="small"
                              multiline
                              minRows={2}
                              value={vendorNotes}
                              onChange={(event) =>
                                setVendorNoteDrafts((current) => ({ ...current, [order.id]: event.target.value }))
                              }
                              placeholder="Add internal notes for this work order."
                            />
                            <Button variant="contained" disabled={isBusy(order.id)} onClick={() => saveVendorNotes(order)} sx={{ backgroundColor: "#7c5cfc", height: 40 }}>
                              Save
                            </Button>
                          </Stack>

                          <Typography sx={{ color: "text.secondary", mb: 1 }} variant="body2">Communication Thread</Typography>
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.1, mb: 2 }}>
                            {notes.length ? (
                              notes.map((note) => {
                                const mine = Boolean(note?.is_vendor);
                                return (
                                  <Box key={note.id || `${note.author_name}-${note.created_at}`} sx={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                                    <Box
                                      sx={{
                                        maxWidth: "80%",
                                        p: 1.2,
                                        borderRadius: mine ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                                        backgroundColor: mine ? "rgba(124,92,252,0.16)" : "rgba(255,255,255,0.04)",
                                        border: `1px solid ${mine ? "rgba(124,92,252,0.36)" : "rgba(255,255,255,0.08)"}`,
                                      }}
                                    >
                                      <Typography sx={{ color: mine ? "#b197ff" : "text.secondary", fontSize: 11 }}>{note.author_name || "Unknown"}</Typography>
                                      <Typography sx={{ color: mine ? "white" : "rgba(255,255,255,0.85)" }}>{note.message}</Typography>
                                      <Typography sx={{ mt: 0.5, color: "text.secondary", fontSize: 11 }}>{formatDate(note.created_at)}</Typography>
                                    </Box>
                                  </Box>
                                );
                              })
                            ) : (
                              <Typography sx={{ color: "text.secondary", fontSize: 13 }}>No messages yet. Send one below.</Typography>
                            )}
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="flex-end">
                            <TextField
                              fullWidth
                              size="small"
                              label="Add a note..."
                              value={noteDraft}
                              onChange={(event) => setNoteDrafts((current) => ({ ...current, [order.id]: event.target.value }))}
                            />
                            <Button
                              variant="contained"
                              endIcon={<SendIcon />}
                              disabled={isBusy(order.id) || !noteDraft.trim()}
                              onClick={() => sendNote(order.id)}
                              sx={{ backgroundColor: "#7c5cfc" }}
                            >
                              Send
                            </Button>
                          </Stack>

                          <Divider sx={{ mt: 1.4, mb: 1.2, borderColor: "rgba(255,255,255,0.08)" }} />
                          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                            {order.status === "assigned" && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  disabled={isBusy(order.id)}
                                  onClick={() => handleAccept(order.id)}
                                  sx={{ backgroundColor: "#16a34a" }}
                                >Accept</Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  disabled={isBusy(order.id)}
                                  onClick={() => handleReject(order.id)}
                                >Reject</Button>
                              </>
                            )}
                            {order.status === "accepted" && (
                              <Button
                                size="small"
                                variant="contained"
                                disabled={isBusy(order.id)}
                                onClick={() => handleStart(order.id)}
                                sx={{ backgroundColor: "#f59e0b", color: "#111827" }}
                              >Start Work</Button>
                            )}
                            {order.status === "in_progress" && (
                              <Button
                                size="small"
                                variant="contained"
                                disabled={isBusy(order.id)}
                                onClick={() => handleMarkComplete(order)}
                                sx={{ backgroundColor: "#16a34a" }}
                              >Mark Complete</Button>
                            )}
                            {order.status === "completed" && !order.bill && (
                              <Button
                                size="small"
                                variant="contained"
                                disabled={isBusy(order.id)}
                                onClick={() => handleSubmitInvoice(order)}
                                sx={{ backgroundColor: "#7c5cfc" }}
                              >Submit Invoice</Button>
                            )}
                          </Stack>
                        </Box>
                      </Collapse>
                    </Paper>
                  );
                })}
                {!filterWorkOrders.length ? <Typography sx={{ color: "text.secondary" }}>No work orders in this view.</Typography> : null}
              </Stack>
            </Box>
          )}

          {activeSection === "invoices" && (
            <Box>
              <Typography sx={{ mb: 0.6, fontSize: 24, fontWeight: 700 }}>Invoices</Typography>
              <Stack spacing={1}>
                {invoices.length ? (
                  invoices.map((invoice) => {
                    const status = String(invoice.status || "").toLowerCase();
                    const payment = getInvoicePaymentMethod(invoice);
                    const invoiceAmount = invoice.total_amount || invoice.amount || invoice.amount_total || 0;
                    const invoiceTitle = invoice.work_order_title || `Invoice #${invoice.bill_number || invoice.id}`;
                    return (
                      <Paper
                        key={invoice.id || invoice.bill_number}
                        sx={{ p: 1.8, borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                      >
                        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1}>
                          <Box>
                            <Typography sx={{ color: "white", fontWeight: 700 }}>{invoiceTitle}</Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>{invoice.description || "No description"} · {formatDate(invoice.bill_date)}</Typography>
                          </Box>
                          <Chip size="small" label={invoiceStatusText(invoice)} sx={{ ...statusBadge(status), fontSize: "0.72rem", fontWeight: 600, textTransform: "capitalize" }} />
                        </Stack>
                        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" sx={{ mt: 0.8 }} spacing={1}>
                          <Typography sx={{ color: "#22c55e", fontWeight: 700 }}>{formatCurrency(invoiceAmount)}</Typography>
                          <Box sx={{ color: "text.secondary", fontSize: "0.83rem", textAlign: { md: "right" } }}>
                            <Typography variant="caption" display="block">Payment status</Typography>
                            <Typography sx={{ color: "rgba(255,255,255,0.85)" }}>
                              {status === "paid" && payment
                                ? `${formatCurrency(payment.amount || 0)} · ${payment.date} · ${payment.method}`
                                : "Pending"}
                            </Typography>
                          </Box>
                        </Stack>
                        {status === "paid" && payment ? (
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                            Paid on {payment.date} via {payment.method}
                          </Typography>
                        ) : null}
                      </Paper>
                    );
                  })
                ) : (
                  <Alert severity="info">No invoices found for this vendor.</Alert>
                )}
              </Stack>
            </Box>
          )}

          {activeSection === "profile" && (
            <Box>
              <Typography sx={{ mb: 0.5, fontSize: 24, fontWeight: 700 }}>Profile</Typography>
              <Paper sx={{ p: 2.2, borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.03)", mb: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }} spacing={1}>
                  <Typography sx={{ fontWeight: 600 }}>Vendor Info</Typography>
                  {profileEditing ? null : (
                    <Button size="small" variant="contained" sx={{ backgroundColor: "#7c5cfc" }} onClick={() => setProfileEditing(true)}>
                      Edit
                    </Button>
                  )}
                </Stack>

                {profileEditing ? (
                  <Stack spacing={1.6}>
                    <TextField label="Vendor Name" value={vendorName} InputProps={{ readOnly: true }} size="small" fullWidth />
                    <TextField label="Category" value={vendorCategory} InputProps={{ readOnly: true }} size="small" fullWidth />
                    <TextField
                      label="Contact Name"
                      value={profileForm.contact_name}
                      onChange={(event) => setProfileForm((current) => ({ ...current, contact_name: event.target.value }))}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Email"
                      type="email"
                      value={profileForm.email}
                      onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Phone"
                      value={profileForm.phone}
                      onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Address"
                      multiline
                      minRows={2}
                      value={profileForm.address}
                      onChange={(event) => setProfileForm((current) => ({ ...current, address: event.target.value }))}
                      size="small"
                      fullWidth
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        disabled={isBusy("profile")}
                        onClick={() => {
                          setProfileEditing(false);
                          loadProfileForEdit();
                        }}
                      >Cancel</Button>
                      <Button
                        variant="contained"
                        disabled={isBusy("profile")}
                        onClick={saveProfile}
                        sx={{ backgroundColor: "#7c5cfc" }}
                      >Save Changes</Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Stack spacing={1.4}>
                    <Box><Typography variant="caption" sx={{ color: "text.secondary" }}>Vendor Name</Typography><Typography sx={{ color: "white" }}>{vendorName}</Typography></Box>
                    <Box><Typography variant="caption" sx={{ color: "text.secondary" }}>Category</Typography><Typography>{vendorCategory}</Typography></Box>
                    <Box><Typography variant="caption" sx={{ color: "text.secondary" }}>Contact Name</Typography><Typography>{profileForm.contact_name || "—"}</Typography></Box>
                    <Box><Typography variant="caption" sx={{ color: "text.secondary" }}>Email</Typography><Typography>{profileForm.email || "—"}</Typography></Box>
                    <Box><Typography variant="caption" sx={{ color: "text.secondary" }}>Phone</Typography><Typography>{profileForm.phone || "—"}</Typography></Box>
                    <Box><Typography variant="caption" sx={{ color: "text.secondary" }}>Address</Typography><Typography>{profileForm.address || "—"}</Typography></Box>
                  </Stack>
                )}
              </Paper>
              <Paper sx={{ p: 2.2, borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.02)" }}>
                <Typography sx={{ mb: 1.2, fontWeight: 600 }}>Account</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Username</Typography>
                <Typography sx={{ mb: 1 }}>{user?.username || "—"}</Typography>
                <Button variant="outlined" color="inherit" disabled>Change Password</Button>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 1 }}>Password changes are managed by account admin.</Typography>
              </Paper>
            </Box>
          )}

      <Dialog open={invoiceDialogOpen} onClose={() => setInvoiceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Invoice</DialogTitle>
        <DialogContent>
          {invoiceTarget ? (
            <>
              <Typography sx={{ mb: 1.2, color: "text.secondary" }}>{invoiceTarget.title || "Work Order"} · {getOrderLocation(invoiceTarget)}</Typography>
              <TextField
                fullWidth
                size="small"
                label="Amount"
                type="number"
                value={invoiceForm.amount}
                onChange={(event) => setInvoiceForm((current) => ({ ...current, amount: event.target.value }))}
                inputProps={{ min: 0.01, step: 0.01 }}
                sx={{ mb: 1.2 }}
              />
              <TextField
                fullWidth
                size="small"
                label="Description"
                value={invoiceForm.description}
                onChange={(event) => setInvoiceForm((current) => ({ ...current, description: event.target.value }))}
                sx={{ mb: 1.2 }}
              />
              <TextField
                fullWidth
                size="small"
                label="Notes"
                multiline
                minRows={3}
                value={invoiceForm.notes}
                onChange={(event) => setInvoiceForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={isBusy(invoiceTarget?.id)} sx={{ backgroundColor: "#7c5cfc" }} onClick={submitInvoice}>Submit Invoice</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Mark Work Complete</DialogTitle>
        <DialogContent>
          {completeTarget ? (
            <>
              <Typography sx={{ mb: 1.2, color: "text.secondary" }}>{completeTarget.title || "Work Order"} · {getOrderLocation(completeTarget)}</Typography>
              <TextField
                fullWidth
                size="small"
                label="Actual Cost"
                type="number"
                value={completeForm.actual_cost}
                onChange={(event) => setCompleteForm((current) => ({ ...current, actual_cost: event.target.value }))}
                inputProps={{ min: 0, step: 0.01 }}
                sx={{ mb: 1.2 }}
              />
              <TextField
                fullWidth
                size="small"
                label="Completion Notes"
                multiline
                minRows={3}
                value={completeForm.vendor_notes}
                onChange={(event) => setCompleteForm((current) => ({ ...current, vendor_notes: event.target.value }))}
              />
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={isBusy(completeTarget?.id)} sx={{ backgroundColor: "#16a34a" }} onClick={submitCompleteWork}>Mark Complete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={globalMessage.open}
        autoHideDuration={3500}
        onClose={() => setGlobalMessage((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={() => setGlobalMessage((current) => ({ ...current, open: false }))} severity={globalMessage.severity} sx={{ width: "100%" }}>
          {globalMessage.message}
        </Alert>
      </Snackbar>
      </>
    )}
    </Box>
  );
}

export default VendorPortal;
