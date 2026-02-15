import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Typography,
  Checkbox,
} from "@mui/material";
import Add from "@mui/icons-material/Add";
import ContentCopy from "@mui/icons-material/ContentCopy";
import CalendarMonth from "@mui/icons-material/CalendarMonth";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import Edit from "@mui/icons-material/Edit";
import MoreVert from "@mui/icons-material/MoreVert";
import Paid from "@mui/icons-material/Paid";
import Receipt from "@mui/icons-material/Receipt";
import Search from "@mui/icons-material/Search";
import Visibility from "@mui/icons-material/Visibility";
import {
  cancelBill,
  createBill,
  createVendor,
  deleteBill,
  deleteVendor,
  getAccountingCategories,
  getBill,
  getBillAging,
  getBillPayments,
  getBillSummary,
  getBills,
  getProperties,
  getUnits,
  getVendor,
  getVendorBills,
  getVendorSummary,
  getVendors,
  inviteVendor,
  payBill,
  updateBill,
  updateVendor,
} from "../services/api";

const parseList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};

const formatMoney = (value) =>
  toNumber(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const toInputDate = (value) => {
  const date = parseDate(value) || new Date();
  return date.toISOString().slice(0, 10);
};

const formatDate = (value) => {
  const date = parseDate(value);
  if (!date) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const normalize = (value) => String(value || "").toLowerCase().trim();

const resolveId = (value) => {
  if (!value && value !== 0) return "";
  if (value && typeof value === "object") {
    if (value.id !== undefined && value.id !== null) return String(value.id);
  }
  return String(value);
};

const daysUntil = (value) => {
  const due = parseDate(value);
  if (!due) return null;
  const now = new Date();
  const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
};

const BILL_STATUS_STYLES = {
  pending: { backgroundColor: "rgba(59,130,246,0.16)", color: "#3b82f6", borderColor: "rgba(59,130,246,0.28)" },
  overdue: { backgroundColor: "rgba(239,68,68,0.16)", color: "#ef4444", borderColor: "rgba(239,68,68,0.28)" },
  partial: { backgroundColor: "rgba(251,191,36,0.16)", color: "#fbbf24", borderColor: "rgba(251,191,36,0.28)" },
  paid: { backgroundColor: "rgba(39,202,64,0.16)", color: "#27ca40", borderColor: "rgba(39,202,64,0.28)" },
  cancelled: { backgroundColor: "rgba(107,114,128,0.2)", color: "#9ca3af", borderColor: "rgba(107,114,128,0.28)" },
  draft: { backgroundColor: "rgba(107,114,128,0.2)", color: "#9ca3af", borderColor: "rgba(107,114,128,0.28)" },
};

const BILL_STATUS_LABELS = {
  pending: "Pending",
  overdue: "Overdue",
  partial: "Partial",
  paid: "Paid",
  cancelled: "Cancelled",
  draft: "Draft",
};

const BILL_FILTER_OPTIONS = ["all", "pending", "overdue", "partial", "paid", "cancelled"];

const AGING_LABELS = [
  "Current",
  "1-30 Days",
  "31-60 Days",
  "61-90 Days",
  "90+ Days",
];

const AGING_THEMES = [
  { bg: "rgba(39,202,64,0.08)", borderColor: "rgba(39,202,64,0.15)", color: "#27ca40" },
  { bg: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.15)", color: "#fbbf24" },
  { bg: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.15)", color: "#fbbf24" },
  { bg: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.15)", color: "#ef4444" },
  { bg: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.15)", color: "#ef4444" },
];

const CATEGORY_PALETTE = [
  "rgba(124,92,252,0.24)",
  "rgba(59,130,246,0.24)",
  "rgba(16,185,129,0.24)",
  "rgba(245,158,11,0.24)",
  "rgba(239,68,68,0.24)",
  "rgba(14,165,233,0.24)",
  "rgba(236,72,153,0.24)",
  "rgba(34,197,94,0.24)",
];

const categoryStyle = (label) => {
  const text = normalize(label);
  if (!text) {
    return { backgroundColor: "rgba(148,163,184,0.2)", color: "#9ca3af", border: "rgba(148,163,184,0.25)" };
  }
  const idx = text.split("").reduce((acc, char) => (acc + char.charCodeAt(0)) % CATEGORY_PALETTE.length, 0);
  const bg = CATEGORY_PALETTE[idx];
  return { backgroundColor: bg, color: "#e5e7eb", border: bg };
};

const billAmount = (bill) =>
  toNumber(
    bill.total_amount,
    bill.amount_total,
    bill.amount,
    bill.total,
    bill.amount_due,
    bill.total_amount_cents ? bill.total_amount_cents / 100 : 0,
    0
  );

const billPaid = (bill) => toNumber(bill.paid_amount, bill.amount_paid, bill.paid, 0);

const billBalance = (bill) => {
  if (bill.balance_due !== undefined && bill.balance_due !== null) {
    return Math.max(toNumber(bill.balance_due), 0);
  }
  return Math.max(billAmount(bill) - billPaid(bill), 0);
};

const billStatusFromData = (bill) => {
  const status = normalize(bill.status || bill.payment_status);
  if (["pending", "partial", "paid", "overdue", "cancelled", "draft"].includes(status)) {
    if (status === "overdue") {
      return "overdue";
    }
    return status;
  }
  const balance = billBalance(bill);
  const due = daysUntil(bill.due_date || bill.dueDate || bill.due_on);
  if (due !== null && due < 0 && balance > 0) return "overdue";
  if (balance > 0 && balance < billAmount(bill)) return "partial";
  if (balance <= 0 && billAmount(bill) > 0) return "paid";
  return "pending";
};

const dueMeta = (bill) => {
  const status = billStatusFromData(bill);
  const due = daysUntil(bill.due_date || bill.dueDate || bill.due_on);
  if (["paid", "cancelled", "draft"].includes(status) || due === null) {
    return { text: "", color: "rgba(255,255,255,0.5)" };
  }
  if (due < 0) return { text: `${Math.abs(due)} days overdue`, color: "#ef4444" };
  if (due <= 7) return { text: `Due in ${due} days`, color: "#fbbf24" };
  return { text: "", color: "rgba(255,255,255,0.5)" };
};

const BILL_SUMMARY_FALLBACK = {
  totalOutstanding: 0,
  dueThisWeek: 0,
  overdue: 0,
  paidThisMonth: 0,
  totalBills: 0,
};

const normalizeBillSummary = (payload, bills) => {
  const data = payload || {};
  const base = {
    totalOutstanding: toNumber(data.total_outstanding || data.outstanding || data.unpaid_total),
    dueThisWeek: Number(data.due_this_week || data.dueThisWeek || data.due_within_7_days || 0),
    overdue: Number(data.overdue || data.overdue_count || 0),
    paidThisMonth: toNumber(data.paid_this_month || data.paidThisMonth || 0),
    totalBills: Number(data.total_bills || data.count || data.totalBills || bills.length || 0),
  };
  if (Object.keys(data).length > 0) {
    return base;
  }
  if (!bills.length) return BILL_SUMMARY_FALLBACK;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return bills.reduce(
    (acc, bill) => {
      const status = billStatusFromData(bill);
      const total = billAmount(bill);
      const paid = billPaid(bill);
      const balance = billBalance(bill);
      const due = daysUntil(bill.due_date || bill.dueDate || bill.due_on);
      if (["pending", "partial", "overdue"].includes(status)) {
        acc.totalOutstanding += balance;
      }
      if (due !== null && due >= 0 && due <= 7) {
        acc.dueThisWeek += 1;
      }
      if (status === "overdue") {
        acc.overdue += 1;
      }
      const paidDate = parseDate(bill.updated_at || bill.paid_at);
      if (status === "paid" && paidDate && paidDate >= monthStart) {
        acc.paidThisMonth += paid;
      }
      acc.totalBills += 1;
      return acc;
    },
    { ...BILL_SUMMARY_FALLBACK }
  );
};

const AGING_FALLBACK = AGING_LABELS.map((label) => ({ label, amount: 0, count: 0 }));

const normalizeAging = (payload) => {
  if (!payload) return AGING_FALLBACK;
  if (Array.isArray(payload)) {
    const list = payload.map((entry) => ({
      label: entry.label || "",
      amount: toNumber(entry.amount || entry.total || entry.balance || entry.value || 0),
      count: Number(entry.count || 0),
    }));
    return AGING_LABELS.map((label, index) => {
      const found = list.find((entry) => normalize(entry.label) === normalize(label));
      return found || AGING_FALLBACK[index];
    });
  }
  const source = payload || {};
  const keys = ["current", "one_to_thirty", "thirty_one_to_sixty", "sixty_one_to_ninety", "ninety_plus"];
  return AGING_LABELS.map((label, index) => {
    const value = source[keys[index]] || source[label] || 0;
    if (typeof value === "number") {
      return { label, amount: toNumber(value), count: 0 };
    }
    if (typeof value === "object") {
      return {
        label,
        amount: toNumber(value.amount, value.total || 0),
        count: Number(value.count || value.bills_count || 0),
      };
    }
    return AGING_FALLBACK[index];
  });
};

const VENDOR_SUMMARY_FALLBACK = {
  totalVendors: 0,
  activeVendors: 0,
  vendors1099: 0,
  outstanding: 0,
};

const normalizeVendorSummary = (payload, vendors, bills) => {
  const data = payload || {};
  if (Object.keys(data).length) {
    return {
      totalVendors: Number(data.total_vendors || data.totalVendors || vendors.length || 0),
      activeVendors: Number(data.active_vendors || data.activeVendors || 0),
      vendors1099: Number(data.vendors_1099 || data.vendors1099 || 0),
      outstanding: toNumber(data.outstanding || data.total_outstanding || data.outstanding_balance || 0),
    };
  }
  const activeCount = vendors.reduce(
    (acc, vendor) => acc + (normalize(vendor.is_active ?? vendor.active ?? true) !== "false" ? 1 : 0),
    0
  );
  const eligible = vendors.reduce((acc, vendor) => acc + (normalize(vendor.is_1099_eligible) === "true" ? 1 : 0), 0);
  const outstanding = bills.reduce((acc, bill) => acc + billBalance(bill), 0);
  return {
    totalVendors: vendors.length,
    activeVendors: activeCount,
    vendors1099: eligible,
    outstanding,
  };
};

const initialBillForm = {
  vendor_id: "",
  property_id: "",
  unit_id: "",
  bill_number: "",
  description: "",
  category_id: "",
  amount: "",
  tax_amount: "",
  bill_date: toInputDate(new Date()),
  due_date: toInputDate(new Date()),
  is_recurring: false,
  recurring_frequency: "",
  notes: "",
};

const initialVendorForm = {
  name: "",
  contact_name: "",
  email: "",
  phone: "",
  address: "",
  category_id: "",
  tax_id: "",
  is_1099_eligible: false,
  notes: "",
};

const initialPayForm = {
  amount: "",
  payment_date: toInputDate(new Date()),
  payment_method: "check",
  check_number: "",
  reference: "",
  notes: "",
};

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
];

const RECURRENCE = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

function BillsAndVendors() {
  const [activeTab, setActiveTab] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingBills, setLoadingBills] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);

  const [bills, setBills] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [billSummary, setBillSummary] = useState(BILL_SUMMARY_FALLBACK);
  const [agingBuckets, setAgingBuckets] = useState(AGING_FALLBACK);
  const [vendorSummary, setVendorSummary] = useState(VENDOR_SUMMARY_FALLBACK);

  const [billFilters, setBillFilters] = useState({
    search: "",
    status: "all",
    vendorId: "",
    propertyId: "",
  });
  const [vendorSearch, setVendorSearch] = useState("");

  const [billMenuAnchor, setBillMenuAnchor] = useState(null);
  const [billMenuId, setBillMenuId] = useState("");
  const [vendorMenuAnchor, setVendorMenuAnchor] = useState(null);
  const [vendorMenuId, setVendorMenuId] = useState("");

  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [billDialogMode, setBillDialogMode] = useState("create");
  const [billForm, setBillForm] = useState(initialBillForm);
  const [editingBillId, setEditingBillId] = useState("");

  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [vendorDialogMode, setVendorDialogMode] = useState("create");
  const [vendorForm, setVendorForm] = useState(initialVendorForm);
  const [editingVendorId, setEditingVendorId] = useState("");

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payingBill, setPayingBill] = useState(null);
  const [payForm, setPayForm] = useState(initialPayForm);

  const [billDrawerOpen, setBillDrawerOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billDetailPayments, setBillDetailPayments] = useState([]);

  const [vendorDrawerOpen, setVendorDrawerOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorDrawerBills, setVendorDrawerBills] = useState([]);
  const [vendorDrawerPayments, setVendorDrawerPayments] = useState([]);
  const [vendorDrawerTab, setVendorDrawerTab] = useState(0);
  const [vendorDrawerLoading, setVendorDrawerLoading] = useState(false);

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteVendorName, setInviteVendorName] = useState("");
  const [inviteVendorId, setInviteVendorId] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const showMessage = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));
  const closeInviteDialog = () => {
    setInviteDialogOpen(false);
    setInviteVendorName("");
    setInviteVendorId("");
    setGeneratedInviteLink("");
    setInviteLoading(false);
  };

  const openInviteDialog = useCallback(
    async (vendor) => {
      const resolvedId = resolveId(vendor?.id);
      if (!resolvedId) {
        showMessage("Invalid vendor selected", "error");
        return;
      }
      const vendorName = vendor?.name || "Vendor";
      setInviteVendorId(resolvedId);
      setInviteVendorName(vendorName);
      setGeneratedInviteLink("");
      setInviteDialogOpen(true);
      setInviteLoading(true);
      try {
        const inviteRes = await inviteVendor(resolvedId);
        const inviteUrl = inviteRes?.data?.invite_url || "";
        if (!inviteUrl) {
          showMessage("Invite URL was not returned", "error");
          return;
        }
        const normalized = inviteUrl.startsWith("http")
          ? inviteUrl
          : `${window.location.origin}${inviteUrl.startsWith("/") ? inviteUrl : `/${inviteUrl}`}`;
        setGeneratedInviteLink(normalized);
      } catch (error) {
        showMessage(
          error?.response?.data?.detail || "Unable to generate a portal invite link. Please try again.",
          "error"
        );
      } finally {
        setInviteLoading(false);
      }
    },
    [showMessage]
  );

  const copyInviteLink = useCallback(async () => {
    if (!generatedInviteLink) {
      return;
    }
    try {
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(generatedInviteLink);
        showMessage("Invite link copied");
      } else {
        showMessage("Clipboard access is not available in this browser", "warning");
      }
    } catch {
      showMessage("Could not copy invite link", "error");
    }
  }, [generatedInviteLink, showMessage]);

  const vendorLookup = useMemo(() => {
    const map = new Map();
    vendors.forEach((vendor) => {
      map.set(resolveId(vendor.id), vendor);
    });
    return map;
  }, [vendors]);

  const propertyLookup = useMemo(() => {
    const map = new Map();
    properties.forEach((property) => {
      map.set(resolveId(property.id), property);
    });
    return map;
  }, [properties]);

  const unitLookup = useMemo(() => {
    const map = new Map();
    units.forEach((unit) => {
      map.set(resolveId(unit.id), unit);
    });
    return map;
  }, [units]);

  const categoryLookup = useMemo(() => {
    const map = new Map();
    categories.forEach((category) => {
      map.set(resolveId(category.id), category);
    });
    return map;
  }, [categories]);
  const vendorBillStats = useMemo(() => {
    const map = new Map();
    bills.forEach((bill) => {
      const vendorId = resolveId(bill.vendor_id || bill.vendor?.id || bill.vendor);
      if (!vendorId) {
        return;
      }
      const existing = map.get(vendorId) || { billCount: 0, outstanding: 0 };
      existing.billCount += 1;
      existing.outstanding += billBalance(bill);
      map.set(vendorId, existing);
    });
    return map;
  }, [bills]);

  const filteredUnits = useMemo(() => {
    if (!billForm.property_id) {
      return units;
    }
    return units.filter(
      (unit) =>
        resolveId(unit.property_id || unit.property?.id) === String(billForm.property_id)
    );
  }, [billForm.property_id, units]);

  const enrichBill = useCallback(
    (bill) => {
      const vendorId = resolveId(bill.vendor_id || bill.vendor?.id || bill.vendor);
      const propertyId = resolveId(bill.property_id || bill.property?.id || bill.property);
      const unitId = resolveId(bill.unit_id || bill.unit?.id || bill.unit);
      const categoryId = resolveId(bill.category_id || bill.category?.id || bill.category);
      const vendor = vendorLookup.get(vendorId);
      const property = propertyLookup.get(propertyId);
      const unit = unitLookup.get(unitId);
      const category = categoryLookup.get(categoryId);
      const status = billStatusFromData(bill);
      return {
        ...bill,
        __vendorId: vendorId,
        __propertyId: propertyId,
        __unitId: unitId,
        __status: status,
        __total: billAmount(bill),
        __paid: billPaid(bill),
        __balance: billBalance(bill),
        __dueMeta: dueMeta(bill),
        __vendor_name: vendor?.name || bill.vendor_name || bill.vendor?.name || "Unknown",
        __vendor_category: vendor?.category?.name || vendor?.category_name || bill.vendor_category || "",
        __property_name: property?.name || bill.property_name || bill.property?.name || "",
        __unit_name: unit?.unit_number || unit?.number || unit?.name || bill.unit_name || "",
        __category_name: category?.name || bill.category_name || bill.category || "",
      };
    },
    [vendorLookup, propertyLookup, unitLookup, categoryLookup]
  );

  const visibleBills = useMemo(() => {
    const query = normalize(billFilters.search);
    return bills
      .map(enrichBill)
      .filter((bill) => {
        const matchesText = !query ||
          normalize(`${bill.__vendor_name} ${bill.description} ${bill.__property_name} ${bill.__category_name} ${bill.bill_number}`).includes(query);
        const matchesStatus = billFilters.status === "all" || bill.__status === billFilters.status;
        const matchesVendor = !billFilters.vendorId || bill.__vendorId === String(billFilters.vendorId);
        const matchesProperty = !billFilters.propertyId || bill.__propertyId === String(billFilters.propertyId);
        return matchesText && matchesStatus && matchesVendor && matchesProperty;
      });
  }, [bills, billFilters, enrichBill]);

  const visibleVendors = useMemo(() => {
    const query = normalize(vendorSearch);
    return vendors
      .map((vendor) => {
        const id = resolveId(vendor.id);
        const stats = vendorBillStats.get(id) || { billCount: 0, outstanding: 0 };
        const category = vendor.category?.name || vendor.category_name || vendor.category || "";
        return {
          ...vendor,
          __billCount: stats.billCount,
          __outstanding: stats.outstanding,
          __category: category,
          __isActive: normalize(vendor.is_active ?? vendor.active ?? true) !== "false",
          __categoryStyle: categoryStyle(category),
        };
      })
      .filter((vendor) => {
        if (!query) {
          return true;
        }
        return (
          normalize(vendor.name).includes(query) ||
          normalize(vendor.contact_name).includes(query) ||
          normalize(vendor.email).includes(query) ||
          normalize(vendor.phone).includes(query) ||
          normalize(vendor.__category).includes(query)
        );
      });
  }, [vendors, vendorSearch, vendorBillStats]);

  const vendorSummaryFromLoaded = useMemo(
    () => normalizeVendorSummary(vendorSummary, vendors, bills),
    [vendorSummary, vendors, bills]
  );

  const selectedVendorSummary = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (!selectedVendor) {
      return { totalPaid: 0, totalPaidYtd: 0 };
    }
    const totalPaid = vendorDrawerPayments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    const totalPaidYtd = vendorDrawerPayments
      .filter((payment) => {
        const paidDate = parseDate(payment.payment_date || payment.created_at || payment.date);
        return paidDate && paidDate >= monthStart;
      })
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    const stats = vendorBillStats.get(resolveId(selectedVendor.id)) || { outstanding: 0 };
    return { totalPaid, totalPaidYtd, outstanding: stats.outstanding };
  }, [selectedVendor, vendorDrawerPayments, vendorBillStats]);

  const loadLookups = async () => {
    setLoading(true);
    const [
      billSummaryRes,
      agingRes,
      vendorSummaryRes,
      billsRes,
      vendorsRes,
      propertiesRes,
      unitsRes,
      categoriesRes,
    ] = await Promise.allSettled([
      getBillSummary(),
      getBillAging(),
      getVendorSummary(),
      getBills(),
      getVendors(),
      getProperties(),
      getUnits(),
      getAccountingCategories(),
    ]);

    const billsData = parseList(billsRes.status === "fulfilled" ? billsRes.value?.data : []);
    const vendorsData = parseList(vendorsRes.status === "fulfilled" ? vendorsRes.value?.data : []);
    setBills(billsData);
    setBillSummary(normalizeBillSummary(billSummaryRes.status === "fulfilled" ? billSummaryRes.value?.data : null, billsData));
    setAgingBuckets(normalizeAging(agingRes.status === "fulfilled" ? agingRes.value?.data : null));
    setVendorSummary(normalizeVendorSummary(vendorSummaryRes.status === "fulfilled" ? vendorSummaryRes.value?.data : null, vendorsData, billsData));
    setVendors(vendorsData);
    setProperties(parseList(propertiesRes.status === "fulfilled" ? propertiesRes.value?.data : []));
    setUnits(parseList(unitsRes.status === "fulfilled" ? unitsRes.value?.data : []));
    setCategories(parseList(categoriesRes.status === "fulfilled" ? categoriesRes.value?.data : []));
    setLoading(false);

    if (billsRes.status === "rejected") {
      showMessage("Could not load bills", "error");
    }
    if (vendorsRes.status === "rejected") {
      showMessage("Could not load vendors", "error");
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  const refreshBills = async () => {
    setLoadingBills(true);
    try {
      const [summaryRes, agingRes, billsRes] = await Promise.allSettled([
        getBillSummary(),
        getBillAging(),
        getBills(),
      ]);
      const billsData = parseList(billsRes.status === "fulfilled" ? billsRes.value?.data : []);
      if (billsRes.status === "fulfilled") {
        setBills(billsData);
      }
      if (summaryRes.status === "fulfilled") {
        setBillSummary(normalizeBillSummary(summaryRes.value?.data, billsData));
      }
      if (agingRes.status === "fulfilled") {
        setAgingBuckets(normalizeAging(agingRes.value?.data));
      }
      if (summaryRes.status === "rejected" || agingRes.status === "rejected") {
        showMessage("Could not refresh bill data", "warning");
      }
    } finally {
      setLoadingBills(false);
    }
  };

  const refreshVendors = async () => {
    setLoadingVendors(true);
    try {
      const [vendorSummaryRes, vendorsRes] = await Promise.allSettled([
        getVendorSummary(),
        getVendors(),
      ]);
      const vendorsData = parseList(vendorsRes.status === "fulfilled" ? vendorsRes.value?.data : []);
      if (vendorsRes.status === "fulfilled") {
        setVendors(vendorsData);
        setVendorSummary(
          normalizeVendorSummary(
            vendorSummaryRes.status === "fulfilled" ? vendorSummaryRes.value?.data : null,
            vendorsData,
            bills
          )
        );
      }
      if (vendorSummaryRes.status === "rejected") {
        showMessage("Could not refresh vendor data", "warning");
      }
    } finally {
      setLoadingVendors(false);
    }
  };

  const openBillMenu = (event, billId) => {
    setBillMenuAnchor(event.currentTarget);
    setBillMenuId(String(billId));
  };

  const closeBillMenu = () => {
    setBillMenuAnchor(null);
    setBillMenuId("");
  };

  const openVendorMenu = (event, vendorId) => {
    setVendorMenuAnchor(event.currentTarget);
    setVendorMenuId(String(vendorId));
  };

  const closeVendorMenu = () => {
    setVendorMenuAnchor(null);
    setVendorMenuId("");
  };

  const openBillDialog = (mode = "create", bill = null) => {
    setBillDialogMode(mode);
    if (mode === "edit" && bill) {
      setBillForm({
        vendor_id: resolveId(bill.vendor_id || bill.vendor?.id || bill.vendor),
        property_id: resolveId(bill.property_id || bill.property?.id || bill.property),
        unit_id: resolveId(bill.unit_id || bill.unit?.id || bill.unit),
        bill_number: bill.bill_number || bill.number || "",
        description: bill.description || "",
        category_id: resolveId(bill.category_id || bill.category?.id || bill.category),
        amount: String(toNumber(bill.amount || bill.amount_total || bill.total_amount || bill.total || 0)),
        tax_amount: String(toNumber(bill.tax_amount || bill.tax || 0)),
        bill_date: toInputDate(bill.bill_date || bill.date || new Date()),
        due_date: toInputDate(bill.due_date || bill.dueDate || bill.due_on || new Date()),
        is_recurring: normalize(bill.is_recurring || bill.recurring) === "true",
        recurring_frequency: bill.recurring_frequency || bill.frequency || "",
        notes: bill.notes || "",
      });
      setEditingBillId(resolveId(bill.id));
    } else {
      setBillForm({
        ...initialBillForm,
        bill_date: toInputDate(new Date()),
        due_date: toInputDate(new Date()),
      });
      setEditingBillId("");
    }
    setBillDialogOpen(true);
  };

  const closeBillDialog = () => {
    setBillDialogOpen(false);
    setBillForm(initialBillForm);
    setEditingBillId("");
  };

  const openVendorDialog = (mode = "create", vendor = null) => {
    setVendorDialogMode(mode);
    if (mode === "edit" && vendor) {
      setVendorForm({
        name: vendor.name || "",
        contact_name: vendor.contact_name || "",
        email: vendor.email || "",
        phone: vendor.phone || "",
        address: vendor.address || "",
        category_id: resolveId(vendor.category_id || vendor.category?.id || vendor.category),
        tax_id: vendor.tax_id || "",
        is_1099_eligible: normalize(vendor.is_1099_eligible) === "true",
        notes: vendor.notes || "",
      });
      setEditingVendorId(resolveId(vendor.id));
    } else {
      setVendorForm(initialVendorForm);
      setEditingVendorId("");
    }
    setVendorDialogOpen(true);
  };

  const closeVendorDialog = () => {
    setVendorDialogOpen(false);
    setVendorForm(initialVendorForm);
    setEditingVendorId("");
  };

  const openPayDialog = (bill) => {
    const enriched = enrichBill(bill);
    setPayingBill(enriched);
    setPayForm({
      amount: String(enriched.__balance || 0),
      payment_date: toInputDate(new Date()),
      payment_method: "check",
      check_number: "",
      reference: "",
      notes: "",
    });
    setPayDialogOpen(true);
  };

  const closePayDialog = () => {
    setPayDialogOpen(false);
    setPayingBill(null);
    setPayForm(initialPayForm);
  };

  const openBillDrawer = async (bill) => {
    setSelectedBill(enrichBill(bill));
    setBillDrawerOpen(true);
    const billId = resolveId(bill.id);
    if (!billId) {
      return;
    }
    try {
      const [billRes, paymentRes] = await Promise.allSettled([
        getBill(billId),
        getBillPayments({ bill_id: billId }),
      ]);
      if (billRes.status === "fulfilled") {
        setSelectedBill(enrichBill(billRes.value?.data || bill));
      }
      setBillDetailPayments(parseList(paymentRes.status === "fulfilled" ? paymentRes.value?.data : []));
    } catch {
      setBillDetailPayments([]);
    }
  };

  const closeBillDrawer = () => {
    setBillDrawerOpen(false);
    setSelectedBill(null);
    setBillDetailPayments([]);
  };

  const openVendorDrawer = async (vendor) => {
    const id = resolveId(vendor.id);
    setSelectedVendor(vendor);
    setVendorDrawerOpen(true);
    setVendorDrawerTab(0);
    setVendorDrawerLoading(true);
    try {
      const [vendorRes, billsRes, paymentsRes] = await Promise.allSettled([
        getVendor(id),
        getVendorBills(id),
        getBillPayments({ vendor_id: id }),
      ]);
      if (vendorRes.status === "fulfilled") {
        setSelectedVendor(vendorRes.value?.data || vendor);
      }
      setVendorDrawerBills(parseList(billsRes.status === "fulfilled" ? billsRes.value?.data : []));
      setVendorDrawerPayments(parseList(paymentsRes.status === "fulfilled" ? paymentsRes.value?.data : []));
    } finally {
      setVendorDrawerLoading(false);
    }
  };

  const closeVendorDrawer = () => {
    setVendorDrawerOpen(false);
    setSelectedVendor(null);
    setVendorDrawerBills([]);
    setVendorDrawerPayments([]);
    setVendorDrawerTab(0);
  };

  const submitBill = async () => {
    if (!billForm.vendor_id) {
      showMessage("Vendor is required", "warning");
      return;
    }
    const amount = toNumber(billForm.amount);
    if (!amount || amount <= 0) {
      showMessage("Amount is required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        vendor_id: billForm.vendor_id,
        property_id: billForm.property_id || null,
        unit_id: billForm.unit_id || null,
        bill_number: billForm.bill_number,
        description: billForm.description,
        category_id: billForm.category_id || null,
        amount,
        tax_amount: toNumber(billForm.tax_amount),
        bill_date: billForm.bill_date,
        due_date: billForm.due_date,
        is_recurring: !!billForm.is_recurring,
        recurring_frequency: billForm.is_recurring ? billForm.recurring_frequency : null,
        notes: billForm.notes,
      };
      if (billDialogMode === "edit" && editingBillId) {
        await updateBill(editingBillId, payload);
        showMessage("Bill updated");
      } else {
        await createBill(payload);
        showMessage("Bill created");
      }
      await refreshBills();
      closeBillDialog();
    } catch {
      showMessage("Could not save bill", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const submitVendor = async () => {
    if (!vendorForm.name) {
      showMessage("Vendor name is required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: vendorForm.name,
        contact_name: vendorForm.contact_name,
        email: vendorForm.email,
        phone: vendorForm.phone,
        address: vendorForm.address,
        category_id: vendorForm.category_id || null,
        tax_id: vendorForm.tax_id,
        is_1099_eligible: !!vendorForm.is_1099_eligible,
        notes: vendorForm.notes,
      };
      if (vendorDialogMode === "edit" && editingVendorId) {
        await updateVendor(editingVendorId, payload);
        showMessage("Vendor updated");
      } else {
        await createVendor(payload);
        showMessage("Vendor created");
      }
      await refreshVendors();
      closeVendorDialog();
    } catch {
      showMessage("Could not save vendor", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const submitPayment = async () => {
    if (!payingBill?.id) {
      return;
    }
    const amount = toNumber(payForm.amount);
    if (!amount || amount <= 0) {
      showMessage("Amount is required", "warning");
      return;
    }
    if (amount > toNumber(payingBill.__balance)) {
      showMessage("Amount exceeds balance due", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await payBill(payingBill.id, {
        amount,
        payment_date: payForm.payment_date,
        method: payForm.payment_method,
        payment_method: payForm.payment_method,
        check_number: payForm.payment_method === "check" ? payForm.check_number : "",
        reference: payForm.reference,
        notes: payForm.notes,
      });
      showMessage("Payment recorded");
      await refreshBills();
      await refreshVendors();
      if (selectedBill && resolveId(selectedBill.id) === resolveId(payingBill.id)) {
        await openBillDrawer(selectedBill);
      }
      if (vendorDrawerOpen && selectedVendor) {
        await openVendorDrawer(selectedVendor);
      }
      closePayDialog();
    } catch {
      showMessage("Could not record payment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const doBillAction = async (action) => {
    const bill = bills.find((item) => resolveId(item.id) === billMenuId);
    if (!bill) {
      closeBillMenu();
      return;
    }
    if (action === "view") {
      openBillDrawer(bill);
    }
    if (action === "edit") {
      openBillDialog("edit", bill);
    }
    if (action === "cancel") {
      if (window.confirm("Cancel this bill?")) {
        try {
          await cancelBill(billMenuId, {});
          showMessage("Bill cancelled");
          await refreshBills();
        } catch {
          showMessage("Could not cancel bill", "error");
        }
      }
    }
    if (action === "delete") {
      if (window.confirm("Delete this bill?")) {
        try {
          await deleteBill(billMenuId);
          showMessage("Bill deleted");
          await refreshBills();
        } catch {
          showMessage("Could not delete bill", "error");
        }
      }
    }
    closeBillMenu();
  };

  const doVendorAction = async (action) => {
    const vendor = vendors.find((item) => resolveId(item.id) === vendorMenuId);
    if (!vendor) {
      closeVendorMenu();
      return;
    }
    if (action === "view_bills") {
      openVendorDrawer(vendor);
    }
    if (action === "deactivate") {
      const active = normalize(vendor.is_active ?? vendor.active ?? true) !== "false";
      try {
        await updateVendor(vendorMenuId, { is_active: !active, active: !active });
        showMessage(active ? "Vendor deactivated" : "Vendor activated");
        await refreshVendors();
      } catch {
        showMessage("Could not update vendor", "error");
      }
    }
    if (action === "delete") {
      if (window.confirm("Delete this vendor?")) {
        try {
          await deleteVendor(vendorMenuId);
          showMessage("Vendor deleted");
          await refreshVendors();
          if (selectedVendor && resolveId(selectedVendor.id) === vendorMenuId) {
            closeVendorDrawer();
          }
        } catch {
          showMessage("Could not delete vendor", "error");
        }
      }
    }
    closeVendorMenu();
  };


  const billStatCards = [
    {
      title: "Total Outstanding",
      value: billSummary.totalOutstanding,
      icon: <Receipt />,
      tint: "rgba(239,68,68,0.12)",
      borderColor: "rgba(239,68,68,0.35)",
      valueColor: "#ef4444",
    },
    {
      title: "Due This Week",
      value: billSummary.dueThisWeek,
      icon: <CalendarMonth />,
      tint: "rgba(251,191,36,0.12)",
      borderColor: "rgba(251,191,36,0.35)",
      valueColor: "#fbbf24",
    },
    {
      title: "Overdue",
      value: billSummary.overdue,
      icon: <CancelIcon />,
      tint: "rgba(239,68,68,0.12)",
      borderColor: "rgba(239,68,68,0.35)",
      valueColor: "#ef4444",
    },
    {
      title: "Paid This Month",
      value: billSummary.paidThisMonth,
      icon: <CheckCircleOutline />,
      tint: "rgba(39,202,64,0.12)",
      borderColor: "rgba(39,202,64,0.35)",
      valueColor: "#22c55e",
    },
    {
      title: "Total Bills",
      value: billSummary.totalBills,
      icon: <Paid />,
      tint: "rgba(59,130,246,0.12)",
      borderColor: "rgba(59,130,246,0.35)",
      valueColor: "#60a5fa",
    },
  ];

  const vendorStatCards = [
    { title: "Total Vendors", value: vendorSummaryFromLoaded.totalVendors, tint: "rgba(148,163,184,0.12)", borderColor: "rgba(148,163,184,0.35)", valueColor: "#9ca3af" },
    { title: "Active", value: vendorSummaryFromLoaded.activeVendors, tint: "rgba(39,202,64,0.12)", borderColor: "rgba(39,202,64,0.35)", valueColor: "#22c55e" },
    { title: "Total Outstanding", value: vendorSummaryFromLoaded.outstanding, tint: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)", valueColor: "#ef4444" },
    { title: "1099 Vendors", value: vendorSummaryFromLoaded.vendors1099, tint: "rgba(124,92,252,0.12)", borderColor: "rgba(124,92,252,0.35)", valueColor: "#a78bfa" },
  ];

  const billStatusLabel = (status) => BILL_STATUS_LABELS[status] || "Pending";

  const billStatusChip = (status, size = "small") => {
    const style = BILL_STATUS_STYLES[status] || BILL_STATUS_STYLES.pending;
    return (
      <Chip
        size={size}
        label={billStatusLabel(status)}
        sx={{
          height: size === "small" ? 24 : 28,
          color: style.color,
          backgroundColor: style.backgroundColor,
          border: `1px solid ${style.borderColor}`,
          fontWeight: 700,
          borderRadius: "999px",
          "& .MuiChip-label": { px: 1.2 },
        }}
      />
    );
  };

  const maskedTaxId = (value) => {
    if (!value) return "-";
    const text = String(value);
    if (text.length <= 4) return "****";
    return `${"*".repeat(Math.max(0, text.length - 4))}${text.slice(-4)}`;
  };

  const vendorCategoryChip = (vendor) => (
    <Chip
      size="small"
      label={vendor.__category || "Uncategorized"}
      sx={{
        height: 22,
        border: `1px solid ${vendor.__categoryStyle?.border || "rgba(148,163,184,0.35)"}`,
        color: vendor.__categoryStyle?.color || "#9ca3af",
        backgroundColor: vendor.__categoryStyle?.backgroundColor || "rgba(148,163,184,0.1)",
      }}
    />
  );

  const vendorGridBills = useMemo(() => vendorDrawerBills.map((bill) => enrichBill(bill)), [vendorDrawerBills, enrichBill]);
  const vendorGridPayments = vendorDrawerPayments;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "55vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  const selectedVendorIsActive = (vendor) => normalize(vendor?.is_active ?? vendor?.active ?? true) !== "false";

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h5" sx={{ fontFamily: "\"Inter\", sans-serif", fontWeight: 700 }}>
          Bills & Vendors
        </Typography>
        {activeTab === 0 ? (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => openBillDialog("create", null)}
            sx={{ backgroundColor: "#7c5cfc" }}
          >
            + New Bill
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => openVendorDialog("create", null)}
            sx={{ backgroundColor: "#7c5cfc" }}
          >
            + New Vendor
          </Button>
        )}
      </Box>

      <Tabs value={activeTab} onChange={(event, value) => setActiveTab(value)} sx={{ mb: 2 }} textColor="primary" indicatorColor="primary">
        <Tab label="Bills" sx={{ color: "rgba(255,255,255,0.7)" }} />
        <Tab label="Vendors" sx={{ color: "rgba(255,255,255,0.7)" }} />
      </Tabs>

      <Box sx={{ display: activeTab === 0 ? "block" : "none" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
          {billStatCards.map((card) => (
            <Card
              key={card.title}
              sx={{
                flex: 1,
                p: 2,
                borderRadius: "16px",
                border: `1px solid ${card.borderColor}`,
                backgroundColor: card.tint,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                  {card.title}
                </Typography>
                <Box sx={{ color: card.valueColor, display: "flex" }}>{card.icon}</Box>
              </Box>
              <Typography variant="h5" sx={{ color: card.valueColor, fontWeight: 700 }}>
                {card.title === "Total Bills" ? `${toNumber(card.value).toFixed(0)}` : formatMoney(card.value)}
              </Typography>
            </Card>
          ))}
        </Stack>

        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          {AGING_LABELS.map((label, i) => {
            const bucket = agingBuckets[i] || AGING_FALLBACK[i];
            const style = AGING_THEMES[i];
            return (
              <Box
                key={label}
                sx={{
                  flex: 1,
                  p: 2,
                  borderRadius: "12px",
                  textAlign: "center",
                  backgroundColor: style.bg,
                  border: "1px solid",
                  borderColor: style.borderColor,
                  minWidth: 120,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#fff" }}>
                  {formatMoney(bucket.amount)}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                  {label}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)", display: "block" }}>
                  {bucket.count} bills
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Paper
          sx={{
            mb: 2,
            p: 2,
            borderRadius: "14px",
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search bills..."
              value={billFilters.search}
              onChange={(event) => setBillFilters((prev) => ({ ...prev, search: event.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              size="small"
              label="Vendor"
              value={billFilters.vendorId}
              onChange={(event) => setBillFilters((prev) => ({ ...prev, vendorId: event.target.value }))}
              select
              SelectProps={{ native: true }}
              sx={{ minWidth: 200 }}
            >
              <option value="">All Vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </TextField>
            <TextField
              fullWidth
              size="small"
              label="Property"
              value={billFilters.propertyId}
              onChange={(event) => setBillFilters((prev) => ({ ...prev, propertyId: event.target.value }))}
              select
              SelectProps={{ native: true }}
              sx={{ minWidth: 200 }}
            >
              <option value="">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </TextField>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
            {BILL_FILTER_OPTIONS.map((status) => (
              <Chip
                key={status}
                size="small"
                label={status === "all" ? "All" : billStatusLabel(status)}
                clickable
                onClick={() => setBillFilters((prev) => ({ ...prev, status }))}
                sx={{
                  backgroundColor: billFilters.status === status ? "rgba(124,92,252,0.18)" : "rgba(148,163,184,0.15)",
                  color: billFilters.status === status ? "#fff" : "rgba(255,255,255,0.75)",
                }}
              />
            ))}
          </Stack>
        </Paper>

        <TableContainer component={Paper} sx={{ borderRadius: "14px", overflow: "hidden" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: "rgba(255,255,255,0.65)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                  Vendor
                </TableCell>
                <TableCell sx={{ color: "rgba(255,255,255,0.65)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                  Description
                </TableCell>
                <TableCell sx={{ color: "rgba(255,255,255,0.65)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                  Property
                </TableCell>
                <TableCell sx={{ color: "rgba(255,255,255,0.65)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                  Amount
                </TableCell>
                <TableCell sx={{ color: "rgba(255,255,255,0.65)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                  Due Date
                </TableCell>
                <TableCell sx={{ color: "rgba(255,255,255,0.65)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                  Status
                </TableCell>
                <TableCell sx={{ color: "rgba(255,255,255,0.65)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingBills ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 6, textAlign: "center" }}>
                    <CircularProgress size={20} />
                  </TableCell>
                </TableRow>
              ) : visibleBills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Alert severity="info" sx={{ borderRadius: "12px", mt: 1 }}>
                      No bills found.
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : (
                visibleBills.map((bill) => {
                  const row = enrichBill(bill);
                  const dueInfo = row.__dueMeta;
                  return (
                    <TableRow key={row.id || row.bill_number} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, color: "#fff" }}>{row.__vendor_name}</Typography>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", display: "block" }}>
                          {row.__vendor_category || "Vendor"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, color: "#fff", maxWidth: 240 }} noWrap>
                          {row.bill_number ? `#${row.bill_number}` : "Bill"}
                          {row.description ? ` � ${row.description}` : ""}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: "rgba(255,255,255,0.85)" }}>{row.__property_name || "-"}</Typography>
                        {row.__unit_name ? (
                          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", display: "block" }}>
                            Unit {row.__unit_name}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, color: "#fff" }}>{formatMoney(row.__total)}</Typography>
                        {row.__paid > 0 ? (
                          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", display: "block" }}>
                            {formatMoney(row.__paid)} paid / {formatMoney(row.__total)}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: dueInfo.color || "rgba(255,255,255,0.72)" }}>
                          {formatDate(row.due_date || row.dueDate || row.due_on)}
                        </Typography>
                        {dueInfo.text ? (
                          <Typography variant="caption" sx={{ color: dueInfo.color, display: "block" }}>
                            {dueInfo.text}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>{billStatusChip(row.__status)}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {row.__balance > 0 ? (
                            <Button
                              size="small"
                              variant="contained"
                              sx={{ backgroundColor: "#16a34a" }}
                              onClick={() => openPayDialog(row)}
                            >
                              Pay
                            </Button>
                          ) : null}
                          <IconButton size="small" onClick={() => openBillDrawer(row)}>
                            <Visibility />
                          </IconButton>
                          <IconButton size="small" onClick={(event) => openBillMenu(event, row.id)}>
                            <MoreVert />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box sx={{ display: activeTab === 1 ? "block" : "none" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
          {vendorStatCards.map((card) => (
            <Card
              key={card.title}
              sx={{
                flex: 1,
                p: 2,
                borderRadius: "16px",
                border: `1px solid ${card.borderColor}`,
                backgroundColor: card.tint,
              }}
            >
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                {card.title}
              </Typography>
              <Typography variant="h5" sx={{ color: card.valueColor, fontWeight: 700 }}>
                {card.title === "Total Outstanding" ? formatMoney(card.value) : card.value}
              </Typography>
            </Card>
          ))}
        </Stack>

        <TextField
          fullWidth
          size="small"
          value={vendorSearch}
          onChange={(event) => setVendorSearch(event.target.value)}
          placeholder="Search vendors..."
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        {loadingVendors ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : visibleVendors.length === 0 ? (
          <Alert severity="info">No vendors found.</Alert>
        ) : (
          <Grid container spacing={2}>
            {visibleVendors.map((vendor) => (
              <Grid item xs={12} md={6} lg={4} key={vendor.id}>
                <Box
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "16px",
                    p: 3,
                    cursor: "pointer",
                    '&:hover': { border: "1px solid rgba(124,92,252,0.2)", transform: "translateY(-2px)" },
                    transition: "all 0.2s",
                  }}
                  onClick={() => openVendorDrawer(vendor)}
                >
                  <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="start" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#fff" }}>
                      {vendor.name}
                    </Typography>
                    {vendorCategoryChip(vendor)}
                  </Stack>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", display: "block" }}>
                    {vendor.email || "-"} � {vendor.phone || "-"}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1.2, color: "rgba(255,255,255,0.7)" }}>
                    {vendor.__billCount} bills � {formatMoney(vendor.__outstanding)} outstanding
                  </Typography>
                  {vendor.is_1099_eligible ? (
                    <Chip
                      size="small"
                      label="1099"
                      sx={{
                        mt: 1.3,
                        color: "#c4b5fd",
                        backgroundColor: "rgba(124,92,252,0.16)",
                        border: "1px solid rgba(124,92,252,0.3)",
                      }}
                    />
                  ) : null}
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ mt: 2 }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button size="small" startIcon={<Edit />} onClick={() => openVendorDialog("edit", vendor)} variant="outlined">
                      Edit
                    </Button>
                    {(() => {
                      const isPortalEnabled =
                        vendor?.portal_enabled === true ||
                        String(vendor?.portal_enabled).toLowerCase() === "true" ||
                        vendor?.portalEnabled === true ||
                        String(vendor?.portalEnabled).toLowerCase() === "true";
                      return isPortalEnabled ? (
                        <Chip
                          size="small"
                          label="Portal Active"
                          sx={{
                            mt: 0.3,
                            color: "#22c55e",
                            backgroundColor: "rgba(34,197,94,0.16)",
                            border: "1px solid rgba(34,197,94,0.32)",
                          }}
                        />
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(event) => {
                            event.stopPropagation();
                            openInviteDialog(vendor);
                          }}
                          sx={{ borderColor: "#22c55e", color: "#22c55e" }}
                        >
                          Invite to Portal
                        </Button>
                      );
                    })()}
                    <IconButton size="small" onClick={() => openVendorDrawer(vendor)}>
                      <Visibility />
                    </IconButton>
                    <IconButton size="small" onClick={(event) => openVendorMenu(event, vendor.id)}>
                      <MoreVert />
                    </IconButton>
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Menu
        anchorEl={billMenuAnchor}
        open={Boolean(billMenuAnchor)}
        onClose={closeBillMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <MenuItem onClick={() => doBillAction("view")}>View</MenuItem>
        {selectedBill && billStatusFromData(selectedBill) !== "paid" ? <MenuItem onClick={() => doBillAction("cancel")}>Cancel</MenuItem> : null}
        <MenuItem onClick={() => doBillAction("edit")}>Edit</MenuItem>
        <MenuItem onClick={() => doBillAction("delete")}>Delete</MenuItem>
      </Menu>

      <Menu
        anchorEl={vendorMenuAnchor}
        open={Boolean(vendorMenuAnchor)}
        onClose={closeVendorMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <MenuItem onClick={() => doVendorAction("view_bills")}>View Bills</MenuItem>
        <MenuItem onClick={() => doVendorAction("deactivate")}>Deactivate</MenuItem>
        <MenuItem onClick={() => doVendorAction("delete")}>Delete</MenuItem>
      </Menu>

      <Dialog open={inviteDialogOpen} onClose={closeInviteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Vendor Portal Invite</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 1.5, color: "rgba(255,255,255,0.8)" }}>
            {inviteVendorName}
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.72)", mb: 1 }} variant="body2">
            {inviteLoading
              ? "Generating invite link..."
              : generatedInviteLink
                ? "Copy this link and share with the vendor."
                : "No invite link was returned. Try again."}
          </Typography>
          {generatedInviteLink ? (
            <TextField
              fullWidth
              size="small"
              value={generatedInviteLink}
              onClick={(event) => event.target.select()}
              InputProps={{ readOnly: true }}
            />
          ) : (
            <Alert severity="info" sx={{ mt: 0.6 }}>
              Invite link is being prepared.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={copyInviteLink} variant="contained" disabled={!generatedInviteLink || inviteLoading}>
            Copy Invite Link
          </Button>
          <Button onClick={closeInviteDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={billDrawerOpen}
        onClose={closeBillDrawer}
        PaperProps={{ sx: { width: 550, backgroundColor: "background.paper" } }}
      >
        {selectedBill ? (
          <Box sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#fff" }}>
                    {selectedBill.__vendor_name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                    {selectedBill.bill_number ? `#${selectedBill.bill_number}` : "Bill"}
                  </Typography>
                </Box>
                {billStatusChip(selectedBill.__status, "small")}
              </Stack>
              <Typography variant="body2" sx={{ color: selectedBill.__dueMeta.color || "rgba(255,255,255,0.65)" }}>
                Due {formatDate(selectedBill.due_date || selectedBill.dueDate || selectedBill.due_on)}
              </Typography>
            </Box>

            <Paper sx={{ p: 2, borderRadius: "12px", mb: 2, backgroundColor: "rgba(124,92,252,0.08)" }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {formatMoney(selectedBill.__total)}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", display: "block" }}>
                Paid: {formatMoney(selectedBill.__paid)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: selectedBill.__balance > 0 ? "#ef4444" : "#22c55e", mt: 0.5 }}>
                Remaining: {formatMoney(selectedBill.__balance)}
              </Typography>
            </Paper>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 1.5 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Details
            </Typography>
            <Stack spacing={0.8} sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                Vendor: {selectedBill.__vendor_name}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                Property: {selectedBill.__property_name || "-"} {selectedBill.__unit_name ? `(Unit ${selectedBill.__unit_name})` : ""}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                Category: {selectedBill.__category_name || "-"}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                Bill Date: {formatDate(selectedBill.bill_date)}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                Description: {selectedBill.description || "-"}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                Notes: {selectedBill.notes || "-"}
              </Typography>
            </Stack>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 1.5 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Payment history
            </Typography>
            <Box sx={{ flex: 1, overflowY: "auto" }}>
              {billDetailPayments.length ? (
                <Stack spacing={1}>
                  {billDetailPayments.map((payment) => (
                    <Paper key={payment.id || `${payment.reference}-${payment.payment_date}`} sx={{ p: 1.5, borderRadius: "10px", backgroundColor: "rgba(255,255,255,0.03)" }}>
                      <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                        {formatMoney(payment.amount)} � {payment.method || payment.payment_method || "Payment"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)" }}>
                        {formatDate(payment.payment_date || payment.created_at)} � Ref: {payment.reference || "-"} � {payment.method || payment.payment_method || "-"}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                  No payments yet.
                </Typography>
              )}
            </Box>

            <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
              {selectedBill.__balance > 0 ? (
                <Button
                  fullWidth
                  variant="contained"
                  sx={{ backgroundColor: "#16a34a" }}
                  onClick={() => openPayDialog(selectedBill)}
                >
                  Record Payment
                </Button>
              ) : null}
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  closeBillDrawer();
                  openBillDialog("edit", selectedBill);
                }}
              >
                Edit
              </Button>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                disabled={selectedBill.__balance <= 0}
                onClick={async () => {
                  try {
                    await cancelBill(selectedBill.id, {});
                    showMessage("Bill cancelled");
                    await refreshBills();
                    await refreshVendors();
                    closeBillDrawer();
                  } catch {
                    showMessage("Could not cancel bill", "error");
                  }
                }}
              >
                Cancel Bill
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box sx={{ p: 3 }}>
            <CircularProgress />
          </Box>
        )}
      </Drawer>

      <Drawer
        anchor="right"
        open={vendorDrawerOpen}
        onClose={closeVendorDrawer}
        PaperProps={{ sx: { width: 550, backgroundColor: "background.paper" } }}
      >
        {selectedVendor ? (
          <Box sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#fff" }}>
                  {selectedVendor.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)" }}>
                  {selectedVendor.__category || "Vendor"}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={selectedVendorIsActive(selectedVendor) ? "Active" : "Inactive"}
                sx={{
                  color: selectedVendorIsActive(selectedVendor) ? "#22c55e" : "#9ca3af",
                  backgroundColor: selectedVendorIsActive(selectedVendor) ? "rgba(39,202,64,0.16)" : "rgba(107,114,128,0.16)",
                }}
              />
            </Stack>

            <Paper sx={{ p: 2, mb: 2, borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.03)" }}>
              <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: 700, mb: 1 }}>
                Contact info
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                Contact: {selectedVendor.contact_name || "-"} � {selectedVendor.email || "-"} � {selectedVendor.phone || "-"}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", mt: 0.5 }}>
                Address: {selectedVendor.address || "-"}
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, mb: 2, borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.03)" }}>
              <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: 700, mb: 1 }}>
                Tax info
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                Tax ID: {maskedTaxId(selectedVendor.tax_id)}
              </Typography>
              {selectedVendor.is_1099_eligible ? (
                <Chip
                  size="small"
                  label="1099 Eligible"
                  sx={{ mt: 1, color: "#ddd6fe", backgroundColor: "rgba(124,92,252,0.2)" }}
                />
              ) : null}
            </Paper>

            <Tabs value={vendorDrawerTab} onChange={(event, value) => setVendorDrawerTab(value)} sx={{ mb: 1 }}>
              <Tab label="Bills" />
              <Tab label="Payments" />
            </Tabs>

            <Box sx={{ flex: 1, overflowY: "auto", backgroundColor: "transparent" }}>
              {vendorDrawerLoading ? (
                <CircularProgress />
              ) : vendorDrawerTab === 0 ? (
                vendorGridBills.length ? (
                  <Stack spacing={1}>
                    {vendorGridBills.map((bill) => (
                      <Paper
                        key={bill.id}
                        sx={{ p: 1.5, borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.03)" }}
                      >
                        <Typography sx={{ color: "#fff", fontWeight: 700 }}>
                          {bill.bill_number || `Bill #${bill.id}`} � {bill.__vendor_name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                          {bill.__property_name || "-"} � Due {formatDate(bill.due_date || bill.dueDate || bill.due_on)}
                        </Typography>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography sx={{ color: "#22c55e", fontWeight: 700 }}>{formatMoney(bill.__total)}</Typography>
                          {billStatusChip(bill.__status)}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.62)" }}>
                    No bills on file for this vendor.
                  </Typography>
                )
              ) : vendorGridPayments.length ? (
                <Stack spacing={1}>
                  {vendorGridPayments.map((payment) => (
                    <Paper
                      key={payment.id || `${payment.reference}-${payment.payment_date}`}
                      sx={{ p: 1.5, borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.03)" }}
                    >
                      <Typography sx={{ color: "#fff", fontWeight: 700 }}>
                        {formatMoney(payment.amount)} � {payment.method || payment.payment_method || "Payment"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)" }}>
                        {formatDate(payment.payment_date || payment.created_at)} � Ref: {payment.reference || "-"}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.62)" }}>
                  No payments found for this vendor.
                </Typography>
              )}
            </Box>

            <Paper sx={{ p: 2, mt: 2, borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.02)" }}>
              <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>
                Summary
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                Total paid all-time: {formatMoney(selectedVendorSummary.totalPaid)}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                Total paid YTD: {formatMoney(selectedVendorSummary.totalPaidYtd)}
              </Typography>
              <Typography variant="body2" sx={{ color: selectedVendorSummary.outstanding > 0 ? "#ef4444" : "#22c55e", fontWeight: 700 }}>
                Outstanding: {formatMoney(selectedVendorSummary.outstanding)}
              </Typography>
            </Paper>

            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: "#7c5cfc" }}
                onClick={() => {
                  openBillDialog("create", null);
                  setBillForm((prev) => ({ ...prev, vendor_id: resolveId(selectedVendor.id) }));
                }}
              >
                New Bill
              </Button>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  closeVendorDrawer();
                  openVendorDialog("edit", selectedVendor);
                }}
              >
                Edit Vendor
              </Button>
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                onClick={async () => {
                  const current = selectedVendorIsActive(selectedVendor);
                  try {
                    await updateVendor(resolveId(selectedVendor.id), { is_active: !current, active: !current });
                    showMessage(current ? "Vendor deactivated" : "Vendor activated");
                    await refreshVendors();
                    setSelectedVendor((prev) => (prev ? { ...prev, is_active: !current, active: !current } : prev));
                  } catch {
                    showMessage("Could not update vendor", "error");
                  }
                }}
              >
                Deactivate
              </Button>
            </Stack>
          </Box>
        ) : null}
      </Drawer>

      <Dialog open={payDialogOpen} onClose={closePayDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          {payingBill ? (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                {payingBill.__vendor_name} � {formatMoney(payingBill.__balance)} due
              </Alert>
              <Stack spacing={2}>
                <TextField
                  size="small"
                  fullWidth
                  label="Amount"
                  type="number"
                  value={payForm.amount}
                  onChange={(event) => setPayForm((prev) => ({ ...prev, amount: event.target.value }))}
                  inputProps={{ min: 0.01, step: 0.01 }}
                />
                <TextField
                  size="small"
                  fullWidth
                  label="Payment Date"
                  type="date"
                  value={payForm.payment_date}
                  onChange={(event) => setPayForm((prev) => ({ ...prev, payment_date: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  select
                  size="small"
                  fullWidth
                  label="Payment Method"
                  value={payForm.payment_method}
                  onChange={(event) => setPayForm((prev) => ({ ...prev, payment_method: event.target.value }))}
                  SelectProps={{ native: true }}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </TextField>
                {payForm.payment_method === "check" ? (
                  <TextField
                    size="small"
                    fullWidth
                    label="Check Number"
                    value={payForm.check_number}
                    onChange={(event) => setPayForm((prev) => ({ ...prev, check_number: event.target.value }))}
                  />
                ) : null}
                <TextField
                  size="small"
                  fullWidth
                  label="Reference"
                  value={payForm.reference}
                  onChange={(event) => setPayForm((prev) => ({ ...prev, reference: event.target.value }))}
                />
                <TextField
                  size="small"
                  fullWidth
                  label="Notes"
                  multiline
                  minRows={2}
                  value={payForm.notes}
                  onChange={(event) => setPayForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </Stack>
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closePayDialog}>Cancel</Button>
          <Button
            variant="contained"
            disabled={submitting}
            sx={{ backgroundColor: "#16a34a" }}
            onClick={submitPayment}
          >
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={billDialogOpen} onClose={closeBillDialog} maxWidth="md" fullWidth>
        <DialogTitle>{billDialogMode === "edit" ? "Edit Bill" : "Create Bill"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", mb: 0.5 }}>
                Vendor
              </Typography>
              <Select
                value={billForm.vendor_id}
                onChange={(event) => setBillForm((prev) => ({ ...prev, vendor_id: event.target.value }))}
                displayEmpty
              >
                <MenuItem value="">Select vendor</MenuItem>
                {vendors.map((vendor) => (
                  <MenuItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={2}>
              <FormControl fullWidth size="small">
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", mb: 0.5 }}>
                  Property
                </Typography>
                <Select
                  value={billForm.property_id}
                  onChange={(event) =>
                    setBillForm((prev) => ({ ...prev, property_id: event.target.value, unit_id: "" }))}
                  displayEmpty
                >
                  <MenuItem value="">No property</MenuItem>
                  {properties.map((property) => (
                    <MenuItem key={property.id} value={property.id}>
                      {property.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", mb: 0.5 }}>
                  Unit
                </Typography>
                <Select
                  value={billForm.unit_id}
                  onChange={(event) => setBillForm((prev) => ({ ...prev, unit_id: event.target.value }))}
                  displayEmpty
                >
                  <MenuItem value="">No unit</MenuItem>
                  {filteredUnits.map((unit) => (
                    <MenuItem key={unit.id} value={unit.id}>
                      {unit.unit_number || unit.number || unit.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <TextField
              fullWidth
              size="small"
              label="Bill Number"
              value={billForm.bill_number}
              onChange={(event) => setBillForm((prev) => ({ ...prev, bill_number: event.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="Description"
              value={billForm.description}
              onChange={(event) => setBillForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <FormControl fullWidth size="small">
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", mb: 0.5 }}>
                Category
              </Typography>
              <Select
                value={billForm.category_id}
                onChange={(event) => setBillForm((prev) => ({ ...prev, category_id: event.target.value }))}
                displayEmpty
              >
                <MenuItem value="">No category</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                size="small"
                label="Amount"
                type="number"
                value={billForm.amount}
                onChange={(event) => setBillForm((prev) => ({ ...prev, amount: event.target.value }))}
              />
              <TextField
                fullWidth
                size="small"
                label="Tax Amount"
                type="number"
                value={billForm.tax_amount}
                onChange={(event) => setBillForm((prev) => ({ ...prev, tax_amount: event.target.value }))}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                size="small"
                label="Bill Date"
                type="date"
                value={billForm.bill_date}
                onChange={(event) => setBillForm((prev) => ({ ...prev, bill_date: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                size="small"
                label="Due Date"
                type="date"
                value={billForm.due_date}
                onChange={(event) => setBillForm((prev) => ({ ...prev, due_date: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <FormGroup row>
              <FormControlLabel
                control={<Checkbox checked={billForm.is_recurring} onChange={(event) => setBillForm((prev) => ({ ...prev, is_recurring: event.target.checked }))} />}
                label="Is Recurring"
              />
            </FormGroup>

            {billForm.is_recurring ? (
              <FormControl fullWidth size="small">
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", mb: 0.5 }}>
                  Recurring Frequency
                </Typography>
                <Select
                  value={billForm.recurring_frequency}
                  onChange={(event) => setBillForm((prev) => ({ ...prev, recurring_frequency: event.target.value }))}
                  displayEmpty
                >
                  <MenuItem value="">Select frequency</MenuItem>
                  {RECURRENCE.map((rec) => (
                    <MenuItem key={rec.value} value={rec.value}>
                      {rec.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : null}

            <TextField
              fullWidth
              size="small"
              label="Notes"
              multiline
              minRows={2}
              value={billForm.notes}
              onChange={(event) => setBillForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBillDialog}>Cancel</Button>
          <Button onClick={submitBill} variant="contained" disabled={submitting} sx={{ backgroundColor: "#7c5cfc" }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={vendorDialogOpen} onClose={closeVendorDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{vendorDialogMode === "edit" ? "Edit Vendor" : "Create Vendor"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              size="small"
              fullWidth
              label="Name"
              value={vendorForm.name}
              onChange={(event) => setVendorForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <TextField
              size="small"
              fullWidth
              label="Contact Name"
              value={vendorForm.contact_name}
              onChange={(event) => setVendorForm((prev) => ({ ...prev, contact_name: event.target.value }))}
            />
            <TextField
              size="small"
              fullWidth
              label="Email"
              value={vendorForm.email}
              onChange={(event) => setVendorForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <TextField
              size="small"
              fullWidth
              label="Phone"
              value={vendorForm.phone}
              onChange={(event) => setVendorForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <TextField
              size="small"
              fullWidth
              label="Address"
              value={vendorForm.address}
              onChange={(event) => setVendorForm((prev) => ({ ...prev, address: event.target.value }))}
            />
            <FormControl fullWidth size="small">
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", mb: 0.5 }}>
                Category
              </Typography>
              <Select
                value={vendorForm.category_id}
                onChange={(event) => setVendorForm((prev) => ({ ...prev, category_id: event.target.value }))}
                displayEmpty
              >
                <MenuItem value="">No category</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              fullWidth
              label="Tax ID"
              value={vendorForm.tax_id}
              onChange={(event) => setVendorForm((prev) => ({ ...prev, tax_id: event.target.value }))}
            />
            <FormGroup row>
              <FormControlLabel
                control={<Checkbox checked={vendorForm.is_1099_eligible} onChange={(event) => setVendorForm((prev) => ({ ...prev, is_1099_eligible: event.target.checked }))} />}
                label="Is 1099 Eligible"
              />
            </FormGroup>
            <TextField
              size="small"
              fullWidth
              label="Notes"
              multiline
              minRows={2}
              value={vendorForm.notes}
              onChange={(event) => setVendorForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeVendorDialog}>Cancel</Button>
          <Button onClick={submitVendor} variant="contained" disabled={submitting} sx={{ backgroundColor: "#7c5cfc" }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2600}
        onClose={closeSnackbar}
        message={snackbar.message}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      />
    </Box>
  );
}

export default BillsAndVendors;








