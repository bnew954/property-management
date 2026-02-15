import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  Menu,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Stack,
  Typography,
} from "@mui/material";
import Add from "@mui/icons-material/Add";
import AttachMoney from "@mui/icons-material/AttachMoney";
import Receipt from "@mui/icons-material/Receipt";
import ReceiptLong from "@mui/icons-material/ReceiptLong";
import CreditCard from "@mui/icons-material/CreditCard";
import AccountBalance from "@mui/icons-material/AccountBalance";
import Search from "@mui/icons-material/Search";
import MoreVert from "@mui/icons-material/MoreVert";
import Close from "@mui/icons-material/Close";
import ContentCopy from "@mui/icons-material/ContentCopy";
import FileDownload from "@mui/icons-material/FileDownload";
import {
  deletePayment,
  getPayments,
  getProperties,
  getTenants,
  getTransactions,
} from "../services/api";
import { useUser } from "../services/userContext";

const STATUS_STYLES = {
  completed: { backgroundColor: "rgba(39,202,64,0.15)", color: "#27ca40" },
  pending: { backgroundColor: "rgba(251,191,36,0.15)", color: "#fbbf24" },
  processing: { backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6" },
  failed: { backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" },
  refunded: { backgroundColor: "rgba(156,163,175,0.15)", color: "#9ca3af" },
};

const METHOD_OPTIONS = {
  bank_transfer: { label: "Bank Transfer", icon: <AccountBalance fontSize="small" /> },
  credit_card: { label: "Credit Card", icon: <CreditCard fontSize="small" /> },
  check: { label: "Check", icon: <ReceiptLong fontSize="small" /> },
  cash: { label: "Cash", icon: <AttachMoney fontSize="small" /> },
  other: { label: "Other", icon: <Receipt fontSize="small" /> },
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const METHOD_FILTERS = [
  { value: "all", label: "All Methods" },
  { value: "credit_card", label: "Credit Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
];

const DATE_PRESETS = [
  { value: "all", label: "All Time" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_90_days", label: "Last 90 Days" },
  { value: "this_year", label: "This Year" },
];

const AVATAR_COLORS = ["#7c5cfc", "#3b82f6", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

const parseList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.results)) {
    return payload.results;
  }
  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  return [];
};

const parseAmount = (value) => {
  const amount = Number(value);
  return Number.isNaN(amount) ? 0 : amount;
};

const formatMoney = (value) =>
  parseAmount(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

const parseDate = (value) => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parsePaymentDate = (payment) => {
  if (!payment) {
    return null;
  }
  if (payment.payment_date) {
    return parseDate(payment.payment_date);
  }
  return parseDate(payment.created_at || payment.date);
};

const formatDate = (value) =>
  value
    ? value.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";

const formatDateTime = (value) =>
  value
    ? value.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "-";

const relativeTime = (value) => {
  if (!value) {
    return "";
  }
  const diffMs = Date.now() - value.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) {
    return minutes + " min ago";
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours + " hr ago";
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return days + " day" + (days === 1 ? "" : "s") + " ago";
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return months + " month" + (months === 1 ? "" : "s") + " ago";
  }
  const years = Math.floor(months / 12);
  return years + " year" + (years === 1 ? "" : "s") + " ago";
};

const normalize = (value) => String(value || "").toLowerCase();

const statusLabel = (status) => {
  const normalized = normalize(status);
  return (
    {
      completed: "Completed",
      pending: "Pending",
      processing: "Processing",
      failed: "Failed",
      refunded: "Refunded",
    }[normalized] || "Unknown"
  );
};

const statusStyle = (status) => STATUS_STYLES[normalize(status)] || STATUS_STYLES.processing;

const getMethodMeta = (value) => METHOD_OPTIONS[normalize(value)] || { label: normalize(value).replace(/_/g, " "), icon: <Receipt fontSize="small" /> };

const initialsFrom = (text) => {
  const parts = String(text || "").split(" ");
  const first = parts[0] ? parts[0][0] : "";
  const second = parts[1] ? parts[1][0] : "";
  return (first + second).toUpperCase();
};

const avatarColorFor = (text) => {
  if (!text) {
    return AVATAR_COLORS[0];
  }
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getTenant = (payment) => {
  const tenant = payment?.lease_detail?.tenant_detail;
  if (!tenant) {
    return null;
  }
  return {
    id: tenant.id || payment.lease_detail?.tenant,
    name: ((tenant.first_name || "") + " " + (tenant.last_name || "")).trim() || "N/A",
    email: tenant.email || "",
  };
};

const getUnit = (payment) => payment?.lease_detail?.unit_detail || null;

const getPropertyName = (payment, propertyMap) => {
  const unit = getUnit(payment);
  if (!unit) {
    return "N/A";
  }
  if (unit.property_name) {
    return unit.property_name;
  }
  if (payment?.lease_detail?.property_name) {
    return payment.lease_detail.property_name;
  }
  const propertyId = unit.property;
  if (propertyId && propertyMap?.[propertyId]) {
    return propertyMap[propertyId];
  }
  if (propertyId) {
    return "Property #" + propertyId;
  }
  return "N/A";
};

const getUnitLabel = (payment) => {
  const unit = getUnit(payment);
  if (!unit) {
    return "-";
  }
  return unit.unit_number || unit.number || unit.unit || "-";
};

const computeMonthlyTotals = (items) => {
  const now = new Date();
  const totals = [];
  for (let i = 5; i >= 0; i -= 1) {
    const point = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const targetYear = point.getFullYear();
    const targetMonth = point.getMonth();
    const total = items
      .filter((payment) => {
        if (normalize(payment.status) !== "completed") {
          return false;
        }
        const date = parsePaymentDate(payment);
        return date && date.getFullYear() === targetYear && date.getMonth() === targetMonth;
      })
      .reduce((sum, payment) => sum + parseAmount(payment.amount), 0);
    totals.push({
      label: point.toLocaleDateString("en-US", { month: "short" }),
      total,
    });
  }
  return totals;
};

const dateRangeForPreset = (preset) => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (preset === "all") {
    return null;
  }

  if (preset === "this_month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (preset === "last_month") {
    start.setMonth(start.getMonth() - 1, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(end.getMonth(), 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (preset === "last_90_days") {
    start.setDate(start.getDate() - 89);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (preset === "this_year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  return null;
};

const toMonospace = (value) => String(value || "");

const resolveForeignId = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }
  if (typeof value === "object") {
    return resolveForeignId(value.id);
  }
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

function PaymentsList() {
  const { role } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const [payments, setPayments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("all");

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuPaymentId, setMenuPaymentId] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTransactions, setDrawerTransactions] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const requests =
        role === "tenant"
          ? [getPayments(), getProperties(), getTenants()]
          : [getPayments(), getProperties()];
      const [paymentsRes, propertiesRes, tenantsRes] = await Promise.all(requests);
      const rawPayments = parseList(paymentsRes?.data);
      const rawProperties = parseList(propertiesRes?.data);
      const tenantId =
        role === "tenant"
          ? resolveForeignId(tenantsRes?.data && parseList(tenantsRes?.data)[0]?.id)
          : null;

      const tenantFilteredPayments =
        role === "tenant" && tenantId
          ? rawPayments.filter((payment) => {
              const paymentTenantId = resolveForeignId(payment?.lease_detail?.tenant_detail?.id);
              if (paymentTenantId) {
                return paymentTenantId === tenantId;
              }
              return resolveForeignId(payment?.lease_detail?.tenant) === tenantId;
            })
          : rawPayments;

      setPayments(tenantFilteredPayments);
      setProperties(rawProperties);
      setError("");
    } catch (err) {
      setError("Unable to load payments.");
      showSnackbar("Unable to load payments.", "error");
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    if (location.state?.snackbar?.message) {
      setSnackbar({
        open: true,
        message: location.state.snackbar.message,
        severity: location.state.snackbar.severity || "success",
      });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const propertyMap = useMemo(() => {
    const map = {};
    properties.forEach((property) => {
      map[property.id] = property.name;
    });
    return map;
  }, [properties]);

  const now = useMemo(() => new Date(), []);

  const completedPayments = useMemo(() => payments.filter((payment) => normalize(payment.status) === "completed"), [payments]);
  const pendingCount = useMemo(
    () => payments.filter((payment) => ["pending", "processing"].includes(normalize(payment.status))).length,
    [payments]
  );
  const failedCount = useMemo(
    () => payments.filter((payment) => normalize(payment.status) === "failed").length,
    [payments]
  );
  const totalCollected = useMemo(
    () => completedPayments.reduce((sum, payment) => sum + parseAmount(payment.amount), 0),
    [completedPayments]
  );

  const thisMonthCollected = useMemo(() => {
    return completedPayments.reduce((sum, payment) => {
      const d = parsePaymentDate(payment);
      if (!d) {
        return sum;
      }
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        return sum + parseAmount(payment.amount);
      }
      return sum;
    }, 0);
  }, [completedPayments, now]);

  const avgPayment = useMemo(
    () =>
      completedPayments.length
        ? completedPayments.reduce((sum, payment) => sum + parseAmount(payment.amount), 0) /
          completedPayments.length
        : 0,
    [completedPayments]
  );

  const statCards = useMemo(
    () => [
      {
        label: "Total Collected",
        value: formatMoney(totalCollected),
        icon: <AttachMoney sx={{ color: "#27ca40" }} />,
        iconTint: "rgba(39,202,64,0.18)",
      },
      {
        label: "This Month",
        value: formatMoney(thisMonthCollected),
        icon: <AttachMoney sx={{ color: "#a78bfa" }} />,
        iconTint: "rgba(124,92,252,0.18)",
      },
      {
        label: "Pending",
        value: String(pendingCount),
        icon: <Search sx={{ color: "#eab308" }} />,
        iconTint: "rgba(234,179,8,0.18)",
      },
      {
        label: "Failed",
        value: String(failedCount),
        icon: <Search sx={{ color: "#ef4444" }} />,
        iconTint: "rgba(239,68,68,0.18)",
      },
      {
        label: "Avg Payment",
        value: formatMoney(avgPayment),
        icon: <AttachMoney sx={{ color: "#60a5fa" }} />,
        iconTint: "rgba(96,165,250,0.18)",
      },
    ],
    [totalCollected, thisMonthCollected, pendingCount, failedCount, avgPayment]
  );

  const filteredPayments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const range = dateRangeForPreset(datePreset);

    return payments.filter((payment) => {
      const tenant = getTenant(payment);
      const propertyName = getPropertyName(payment, propertyMap);
      const unit = getUnitLabel(payment);
      const method = normalize(payment.payment_method);
      const status = normalize(payment.status);
      const date = parsePaymentDate(payment);
      const searchAmount = parseAmount(payment.amount);

      if (statusFilter !== "all" && status !== statusFilter) {
        return false;
      }
      if (methodFilter !== "all" && method !== methodFilter) {
        return false;
      }

      if (range && date) {
        if (date < range.start || date > range.end) {
          return false;
        }
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        tenant?.name,
        tenant?.email,
        propertyName,
        unit,
        getMethodMeta(method).label,
        formatMoney(searchAmount),
      ]
        .join(" ")
        .toLowerCase();

      if (haystack.includes(normalizedSearch)) {
        return true;
      }

      return String(searchAmount).toLowerCase().includes(normalizedSearch);
    });
  }, [datePreset, methodFilter, methodFilter, payments, propertyMap, searchTerm, statusFilter]);

  const monthlyTotals = useMemo(() => computeMonthlyTotals(payments), [payments]);
  const maxMonthTotal = useMemo(() => {
    const max = monthlyTotals.map((item) => item.total);
    return Math.max(...max, 1);
  }, [monthlyTotals]);

  const menuPayment = useMemo(
    () => filteredPayments.find((payment) => payment.id === menuPaymentId) || null,
    [filteredPayments, menuPaymentId]
  );

  const handleCopy = async (value, message) => {
    if (!value) {
      return;
    }
    try {
      await navigator.clipboard.writeText(String(value));
      showSnackbar(message || "Copied to clipboard", "success");
    } catch (error) {
      showSnackbar("Unable to copy value", "error");
    }
  };

  const getAmountColor = (status) => {
    const normalized = normalize(status);
    if (normalized === "pending" || normalized === "processing") {
      return "#fbbf24";
    }
    if (normalized === "failed") {
      return "#ef4444";
    }
    if (normalized === "refunded") {
      return "#9ca3af";
    }
    return "#27ca40";
  };

  const loadDrawerTransactions = useCallback(async (payment) => {
    if (!payment) {
      setDrawerTransactions([]);
      setDrawerLoading(false);
      return;
    }

    try {
      const txRes = await getTransactions();
      const allTransactions = parseList(txRes?.data);
      const targetPaymentId = resolveForeignId(payment.id);
      const targetLeaseId = resolveForeignId(payment.lease || payment.lease_detail?.id);
      const matches = allTransactions.filter((transaction) => {
        const txPaymentId = resolveForeignId(transaction.payment);
        if (targetPaymentId !== null && txPaymentId !== null) {
          return txPaymentId === targetPaymentId;
        }
        const txLeaseId = resolveForeignId(transaction.lease);
        if (targetLeaseId !== null && txLeaseId !== null) {
          return txLeaseId === targetLeaseId;
        }
        return false;
      });
      setDrawerTransactions(matches);
    } catch (error) {
      setDrawerTransactions([]);
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const openDrawer = (payment) => {
    setSelectedPayment(payment);
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerTransactions([]);
    loadDrawerTransactions(payment);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedPayment(null);
    setDrawerTransactions([]);
  };

  const openMenu = (event, payment) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuPaymentId(payment.id);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuPaymentId(null);
  };

  const handleDelete = async () => {
    if (!menuPayment) {
      return;
    }
    if (!window.confirm("Delete this payment?")) {
      return;
    }
    try {
      await deletePayment(menuPayment.id);
      showSnackbar("Payment deleted successfully", "success");
      closeMenu();
      setDrawerOpen(false);
      setSelectedPayment(null);
      loadPayments();
    } catch (error) {
      showSnackbar("Unable to delete payment", "error");
    }
  };

  const handleMenuAction = (action) => {
    if (!menuPayment) {
      closeMenu();
      return;
    }

    const tenant = getTenant(menuPayment);
    const leaseId = menuPayment.lease || menuPayment.lease_detail?.id;
    const paymentId = menuPayment.id;

    if (action === "tenant") {
      closeMenu();
      if (tenant?.id) {
        navigate("/tenants/" + tenant.id);
      } else {
        showSnackbar("Tenant details are unavailable.", "error");
      }
      return;
    }

    if (action === "lease") {
      closeMenu();
      if (leaseId) {
        navigate("/leases/" + leaseId);
      } else {
        showSnackbar("Lease details are unavailable.", "error");
      }
      return;
    }

    if (action === "refund") {
      closeMenu();
      showSnackbar("Opening payment for refund update.", "info");
      navigate("/payments/" + paymentId + "/edit");
      return;
    }

    if (action === "retry") {
      closeMenu();
      showSnackbar("Retry flow started. If needed, create a matching payment manually.", "info");
      navigate("/payments/new", { state: { sourcePaymentId: paymentId, retry: true } });
      return;
    }

    if (action === "delete") {
      handleDelete();
      return;
    }
  };

  const selectedTenant = useMemo(() => {
    if (!selectedPayment) {
      return null;
    }
    return getTenant(selectedPayment);
  }, [selectedPayment]);

  const selectedLeaseId = useMemo(() => {
    if (!selectedPayment) {
      return "";
    }
    return selectedPayment.lease || selectedPayment.lease_detail?.id || "";
  }, [selectedPayment]);

  const selectedProperty = useMemo(() => {
    if (!selectedPayment) {
      return "N/A";
    }
    return getPropertyName(selectedPayment, propertyMap);
  }, [selectedPayment, propertyMap]);

  const selectedUnit = useMemo(() => {
    if (!selectedPayment) {
      return "-";
    }
    return getUnitLabel(selectedPayment);
  }, [selectedPayment]);

  const selectedMethod = useMemo(() => {
    if (!selectedPayment) {
      return METHOD_OPTIONS.other;
    }
    return getMethodMeta(selectedPayment.payment_method);
  }, [selectedPayment]);

  const selectedDate = useMemo(() => {
    if (!selectedPayment) {
      return null;
    }
    return parsePaymentDate(selectedPayment) || parseDate(selectedPayment.created_at);
  }, [selectedPayment]);

  const selectedStatus = useMemo(() => {
    if (!selectedPayment) {
      return "";
    }
    return statusLabel(selectedPayment.status);
  }, [selectedPayment]);

  const selectedTransactionId = useMemo(() => {
    if (!selectedPayment) {
      return "";
    }

    const directId = selectedPayment.transaction_id;
    if (directId) {
      return toMonospace(directId);
    }

    if (selectedPayment.transaction) {
      if (typeof selectedPayment.transaction === "object") {
        return toMonospace(selectedPayment.transaction.id || "");
      }
      return toMonospace(selectedPayment.transaction);
    }

    if (selectedPayment.transactions && selectedPayment.transactions.length > 0) {
      const firstTransaction = selectedPayment.transactions[0];
      return toMonospace(firstTransaction.id || firstTransaction.transaction_id || "");
    }

    if (drawerTransactions.length > 0) {
      return toMonospace(drawerTransactions[0].id || "");
    }

    return "";
  }, [drawerTransactions, selectedPayment]);

  const selectedStripeId = useMemo(() => {
    if (!selectedPayment) {
      return "";
    }
    return toMonospace(selectedPayment.stripe_payment_intent_id || "");
  }, [selectedPayment]);

  const selectedHasAccounting = useMemo(() => {
    if (!selectedPayment) {
      return false;
    }
    if (selectedPayment.journal_entry || selectedPayment.journal_entry_id || selectedPayment.transaction || selectedPayment.transaction_id) {
      return true;
    }
    return drawerTransactions.length > 0;
  }, [drawerTransactions.length, selectedPayment]);

  const drawerEntryTransaction = useMemo(() => {
    if (!selectedPayment) {
      return null;
    }
    if (selectedPayment.transactions && selectedPayment.transactions.length > 0) {
      return selectedPayment.transactions[0];
    }
    if (drawerTransactions.length > 0) {
      return drawerTransactions[0];
    }
    return null;
  }, [drawerTransactions, selectedPayment]);

  const drawerStatusColor = useMemo(() => {
    if (!selectedPayment) {
      return "#27ca40";
    }
    const normalized = normalize(selectedPayment.status);
    if (normalized === "pending" || normalized === "processing") {
      return "#fbbf24";
    }
    if (normalized === "failed") {
      return "#ef4444";
    }
    return "#27ca40";
  }, [selectedPayment]);

  const drawerStatusText = useMemo(() => {
    if (!selectedPayment) {
      return "";
    }
    const normalized = normalize(selectedPayment.status);
    if (normalized === "completed") {
      return "Payment completed";
    }
    if (normalized === "pending" || normalized === "processing") {
      return "Payment pending";
    }
    if (normalized === "failed") {
      return "Payment failed";
    }
    if (normalized === "refunded") {
      return "Payment refunded";
    }
    return "Payment status unknown";
  }, [selectedPayment]);

  const postedDate = useMemo(() => {
    if (!selectedPayment) {
      return null;
    }
    return parseDate(selectedPayment.updated_at) || parseDate(selectedPayment.created_at) || parseDate(selectedPayment.payment_date);
  }, [selectedPayment]);

  const debitLine = useMemo(() => {
    if (!selectedPayment) {
      return "";
    }
    const source = drawerEntryTransaction;
    const categoryCode =
      source?.category_detail?.account_code ||
      (selectedPayment.journal_entry && selectedPayment.journal_entry?.debit_account_code) ||
      "1020";
    const categoryName =
      source?.category_detail?.name ||
      selectedPayment.journal_entry?.debit_account_name ||
      "Cash";
    return "Debit: " + categoryName + " (" + categoryCode + ") — " + formatMoney(selectedPayment.amount);
  }, [selectedPayment, drawerEntryTransaction]);

  const creditLine = useMemo(() => {
    if (!selectedPayment) {
      return "";
    }
    const source = drawerEntryTransaction;
    const categoryCode =
      source?.category_detail?.account_code ||
      (selectedPayment.journal_entry && selectedPayment.journal_entry?.credit_account_code) ||
      "4100";
    const categoryName =
      source?.category_detail?.name ||
      selectedPayment.journal_entry?.credit_account_name ||
      "Rental Income";
    return "Credit: " + categoryName + " (" + categoryCode + ") — " + formatMoney(selectedPayment.amount);
  }, [selectedPayment, drawerEntryTransaction]);

  return (
    <Box sx={{ p: 3, color: "text.primary" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff" }}>
            Payments
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)" }}>
            Track payment activity and statuses
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          component={RouterLink}
          to="/payments/new"
          sx={{ backgroundColor: "#7c5cfc", textTransform: "none", px: 2 }}
        >
          Record Payment
        </Button>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {statCards.map((stat) => (
          <Paper
            key={stat.label}
            sx={{
              flex: "1 1 180px",
              p: 2,
              minWidth: 150,
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 3,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Box>
                <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700 }}>
                  {stat.value}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                  {stat.label}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: stat.iconTint,
                }}
              >
                {stat.icon}
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
        }}
      >
        <TextField
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by tenant, property, or unit..."
          size="small"
          sx={{ maxWidth: 300, width: "100%" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: "rgba(255,255,255,0.5)" }} />
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {STATUS_FILTERS.map((status) => {
            const active = statusFilter === status.value;
            return (
              <Chip
                key={status.value}
                label={status.label}
                onClick={() => setStatusFilter(status.value)}
                size="small"
                sx={{
                  borderRadius: 12,
                  backgroundColor: active ? "#7C5CFC" : "rgba(255,255,255,0.03)",
                  color: active ? "#fff" : "rgba(255,255,255,0.7)",
                  border: active ? "none" : "1px solid rgba(255,255,255,0.16)",
                  textTransform: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                  "&:hover": { backgroundColor: active ? "#6d4de8" : "rgba(255,255,255,0.06)" },
                }}
              />
            );
          })}
        </Box>

        <FormControl size="small" sx={{ minWidth: 170 }}>
          <Select
            native
            value={methodFilter}
            onChange={(event) => setMethodFilter(event.target.value)}
            sx={{ color: "#fff", backgroundColor: "rgba(255,255,255,0.03)" }}
          >
            {METHOD_FILTERS.map((method) => (
              <option style={{ color: "#111" }} key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 170 }}>
          <Select
            native
            value={datePreset}
            onChange={(event) => setDatePreset(event.target.value)}
            sx={{ color: "#fff", backgroundColor: "rgba(255,255,255,0.03)" }}
          >
            {DATE_PRESETS.map((preset) => (
              <option style={{ color: "#111" }} key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          border: "1px solid rgba(255,255,255,0.06)",
          backgroundColor: "rgba(255,255,255,0.01)",
        }}
      >
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", mb: 1.5, display: "block" }}>
          Collections (Last 6 months)
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-end",
            gap: 1,
            height: 120,
            mb: 0,
            px: 1,
          }}
        >
          {monthlyTotals.map((month, index) => (
            <Box
              key={index}
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "rgba(255,255,255,0.4)",
                  mb: 0.5,
                  fontSize: "0.6rem",
                }}
              >
                ${(month.total / 1000).toFixed(1)}k
              </Typography>
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 48,
                  height: Math.max((month.total / maxMonthTotal) * 80, 4),
                  minHeight: 4,
                  backgroundColor: index === monthlyTotals.length - 1 ? "#7C5CFC" : "rgba(124,92,252,0.3)",
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.3s",
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: "rgba(255,255,255,0.3)",
                  mt: 0.5,
                  fontSize: "0.6rem",
                }}
              >
                {month.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 12 }}>
          <CircularProgress sx={{ color: "#7c5cfc" }} />
        </Box>
      ) : filteredPayments.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 12 }}>
          <AttachMoney sx={{ fontSize: 64, color: "rgba(255,255,255,0.15)", mb: 1 }} />
          <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.3)", mb: 1 }}>
            No payments recorded
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.25)" }}>
            Payments will appear here when tenants pay rent or you record manual payments
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            component={RouterLink}
            to="/payments/new"
            sx={{ mt: 2, backgroundColor: "#7C5CFC" }}
          >
            + Record Payment
          </Button>
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 2,
            overflow: "hidden",
            backgroundColor: "rgba(255,255,255,0.01)",
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                <TableCell
                  sx={{
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  Tenant
                </TableCell>
                <TableCell
                  sx={{
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  Property · Unit
                </TableCell>
                <TableCell
                  sx={{
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  Amount
                </TableCell>
                <TableCell
                  sx={{
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  Date
                </TableCell>
                <TableCell
                  sx={{
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  Status
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPayments.map((payment) => {
                const tenant = getTenant(payment);
                const propertyName = getPropertyName(payment, propertyMap);
                const unitNumber = getUnitLabel(payment);
                const method = getMethodMeta(payment.payment_method);
                const paymentDate = parsePaymentDate(payment);
                const status = statusLabel(payment.status);
                const statusKey = normalize(payment.status);

                return (
                  <TableRow
                    key={payment.id}
                    onClick={() => openDrawer(payment)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { backgroundColor: "rgba(255,255,255,0.02)" },
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            backgroundColor: avatarColorFor(tenant?.name),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                          }}
                        >
                          {initialsFrom(tenant?.name)}
                        </Box>
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{ color: "#fff", fontWeight: 700, lineHeight: 1.2 }}
                          >
                            {tenant?.name || "N/A"}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                            {tenant?.email || "-"}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                        {propertyName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                        Unit {unitNumber}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700 }}>
                        {formatMoney(payment.amount)}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.4 }}>
                        <Box sx={{ color: "rgba(255,255,255,0.6)" }}>{method.icon}</Box>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                          {method.label}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                        {formatDate(paymentDate)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                        {relativeTime(paymentDate)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={status}
                        size="small"
                        sx={{
                          ...statusStyle(statusKey),
                          fontWeight: 600,
                          textTransform: "none",
                          borderRadius: "8px",
                        }}
                      />
                    </TableCell>

                    <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          onClick={() => openDrawer(payment)}
                          sx={{ color: "rgba(255,255,255,0.7)" }}
                        >
                          <Receipt />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(event) => openMenu(event, payment)}
                          sx={{ color: "rgba(255,255,255,0.7)" }}
                        >
                          <MoreVert />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: 500 },
            borderLeft: "1px solid rgba(255,255,255,0.12)",
            bgcolor: "background.paper",
            color: "text.primary",
          },
        }}
      >
        {selectedPayment ? (
          <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
            <Box
              sx={{
                p: 3,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 1,
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#fff" }}>
                  Payment Details
                </Typography>
                <Chip
                  label={selectedStatus}
                  size="small"
                  sx={{
                    mt: 1,
                    ...statusStyle(normalize(selectedPayment.status)),
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: "8px",
                  }}
                />
              </Box>
              <IconButton onClick={closeDrawer} sx={{ color: "rgba(255,255,255,0.7)" }}>
                <Close />
              </IconButton>
            </Box>

            <Box
              sx={{
                p: 3,
                py: 3,
                textAlign: "center",
                backgroundColor: "rgba(255,255,255,0.02)",
              }}
            >
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, color: drawerStatusColor, lineHeight: 1.2 }}
              >
                {formatMoney(selectedPayment.amount)}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "rgba(255,255,255,0.5)", mt: 1, textTransform: "none" }}
              >
                {drawerStatusText}
              </Typography>
            </Box>

            <Box sx={{ p: 3, flexGrow: 1 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                  Tenant
                </Typography>
                {selectedTenant?.id ? (
                  <MuiLink
                    component={RouterLink}
                    to={"/tenants/" + selectedTenant.id}
                    sx={{
                      display: "block",
                      color: "#fff",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    {selectedTenant.name}
                  </MuiLink>
                ) : (
                  <Typography variant="body2" sx={{ color: "#fff", fontWeight: 700 }}>
                    {selectedTenant?.name || "N/A"}
                  </Typography>
                )}
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                  Property
                </Typography>
                <Typography variant="body2" sx={{ color: "#fff", mb: 0.5 }}>
                  {selectedProperty}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                  Unit
                </Typography>
                <Typography variant="body2" sx={{ color: "#fff", mb: 0.5 }}>
                  {selectedUnit}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                  Amount
                </Typography>
                <Typography variant="body2" sx={{ color: "#fff", mb: 0.5, fontWeight: 700 }}>
                  {formatMoney(selectedPayment.amount)}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                  Method
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ color: "rgba(255,255,255,0.75)" }}>{selectedMethod.icon}</Box>
                  <Typography variant="body2" sx={{ color: "#fff", fontWeight: 700 }}>
                    {selectedMethod.label}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                  Date
                </Typography>
                <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                  {formatDateTime(selectedDate)}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                  Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={selectedStatus}
                    size="small"
                    sx={{
                      ...statusStyle(normalize(selectedPayment.status)),
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </Box>

              {selectedTransactionId ? (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                    Transaction ID
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography
                      variant="body2"
                      sx={{
                        color: "rgba(255,255,255,0.85)",
                        fontFamily: "monospace",
                        fontSize: "0.85rem",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {selectedTransactionId}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(selectedTransactionId, "Transaction ID copied")}
                      sx={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              ) : null}

              {selectedStripeId ? (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                    Stripe Payment ID
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography
                      variant="body2"
                      sx={{
                        color: "rgba(255,255,255,0.85)",
                        fontFamily: "monospace",
                        fontSize: "0.85rem",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {selectedStripeId}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(selectedStripeId, "Stripe Payment ID copied")}
                      sx={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              ) : null}

              <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", my: 2 }} />

              <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 600, mb: 1.2 }}>
                Accounting Entry
              </Typography>
              {selectedHasAccounting ? (
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 500, mb: 0.5 }}
                  >
                    {debitLine}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 500, mb: 1 }}
                  >
                    {creditLine}
                  </Typography>
                  <Chip
                    label={`Posted ${formatDate(postedDate)}`}
                    size="small"
                    sx={{
                      borderRadius: 8,
                      backgroundColor: "rgba(34,197,94,0.15)",
                      color: "#4ade80",
                    }}
                  />
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.45)" }}>
                  No journal entry linked
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                p: 3,
                mt: "auto",
                display: "flex",
                gap: 1,
                borderTop: "1px solid rgba(255,255,255,0.08)",
                position: "sticky",
                bottom: 0,
                backgroundColor: "background.paper",
              }}
            >
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  if (selectedTenant?.id) {
                    navigate("/tenants/" + selectedTenant.id);
                  } else {
                    showSnackbar("Tenant details unavailable.", "error");
                  }
                }}
              >
                View Tenant
              </Button>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  if (selectedLeaseId) {
                    navigate("/leases/" + selectedLeaseId);
                  } else {
                    showSnackbar("Lease details unavailable.", "error");
                  }
                }}
              >
                View Lease
              </Button>
              <Button
                fullWidth
                variant="contained"
                startIcon={<FileDownload />}
                onClick={() => {
                  showSnackbar("Receipt download coming soon", "info");
                }}
                sx={{ backgroundColor: "#7C5CFC" }}
              >
                Download Receipt
              </Button>
            </Box>
          </Box>
        ) : null}
      </Drawer>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={() => handleMenuAction("tenant")}>View Tenant</MenuItem>
        <MenuItem onClick={() => handleMenuAction("lease")}>View Lease</MenuItem>
        {menuPayment && normalize(menuPayment.status) === "completed" ? (
          <MenuItem onClick={() => handleMenuAction("refund")}>Record Refund</MenuItem>
        ) : null}
        {menuPayment && normalize(menuPayment.status) === "failed" ? (
          <MenuItem onClick={() => handleMenuAction("retry")}>Retry</MenuItem>
        ) : null}
        <MenuItem onClick={() => handleMenuAction("delete")}>Delete</MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2600}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{
            color: "#fff",
            backgroundColor:
              snackbar.severity === "error"
                ? "rgba(239,68,68,0.9)"
                : snackbar.severity === "info"
                ? "rgba(59,130,246,0.9)"
                : "rgba(39,202,64,0.9)",
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default PaymentsList;

