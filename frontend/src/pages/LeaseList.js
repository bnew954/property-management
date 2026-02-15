import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Avatar,
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  Divider,
  Drawer,
  Menu,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Step,
  StepConnector,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { CheckCircle, Search as SearchIcon, VerifiedUser } from "@mui/icons-material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createLease,
  deleteLease,
  downloadDocument,
  generateLeaseDocument,
  getLeases,
  getPayments,
  getProperties,
  getTenants,
  getUnits,
  landlordSignLease,
  sendLeaseForSigning,
  updateLease,
} from "../services/api";

const ACCENT = "#7C5CFC";
const MUTED = "rgba(255,255,255,0.55)";
const STEP_LABELS = [
  "Created",
  "Document Generated",
  "Sent for Signing",
  "Tenant Signed",
  "Landlord Signed",
  "Lease Active",
];
const STATUS_OPTIONS = ["all", "active", "pending", "expired", "terminated"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "rent_high", label: "Rent (high to low)" },
  { value: "rent_low", label: "Rent (low to high)" },
  { value: "expiring", label: "Expiring soonest" },
];

const tableHeaderSx = {
  backgroundColor: "rgba(255, 255, 255, 0.03)",
  color: MUTED,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fontSize: 11,
  fontWeight: 600,
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatMonthYear = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

function monthDiff(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) return "";
  const diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return `${Math.max(diff, 1)} months`;
}

function parseDaysUntil(date) {
  if (!date) return null;
  const target = parseDate(date);
  if (!target) return null;
  const today = new Date();
  const normalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = target.getTime() - normalized.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function leaseStatusMeta(status) {
  const map = {
    active: {
      label: "Active",
      bg: "rgba(39,202,64,0.15)",
      color: "#27ca40",
      border: "rgba(39,202,64,0.35)",
    },
    pending_signature: {
      label: "Pending Signature",
      bg: "rgba(59,130,246,0.15)",
      color: "#3b82f6",
      border: "rgba(59,130,246,0.35)",
    },
    draft: {
      label: "Draft",
      bg: "rgba(156,163,175,0.15)",
      color: "#9ca3af",
      border: "rgba(156,163,175,0.35)",
    },
    expired: {
      label: "Expired",
      bg: "rgba(239,68,68,0.15)",
      color: "#ef4444",
      border: "rgba(239,68,68,0.35)",
    },
    terminated: {
      label: "Terminated",
      bg: "rgba(239,68,68,0.15)",
      color: "#ef4444",
      border: "rgba(239,68,68,0.35)",
    },
  };
  return map[status] || map.draft;
}

function resolveLeaseStatus(lease) {
  const endDate = parseDate(lease.end_date);
  const active = Boolean(lease.is_active);
  const signatureStatus = `${lease.signature_status || ""}`.toLowerCase();
  const hasDocument = Boolean(lease.lease_document);
  const tenantSigned = Boolean(lease.tenant_signature);
  const landlordSigned = Boolean(lease.landlord_signature);
  const isExpired = endDate ? endDate < new Date(new Date().toDateString()) : false;

  if (!active) {
    if (isExpired) return "expired";
    return "terminated";
  }

  if (signatureStatus === "signed" && tenantSigned && landlordSigned) return "active";
  if (signatureStatus === "sent" || signatureStatus === "viewed") return "pending_signature";
  if (signatureStatus === "draft" && !hasDocument) return "draft";
  if (tenantSigned && !landlordSigned) return "pending_signature";
  if (isExpired) return "expired";
  return "pending_signature";
}

function expirationMeta(lease) {
  const status = resolveLeaseStatus(lease);
  const endDate = parseDate(lease.end_date);
  if (!endDate || !["active", "pending_signature", "draft"].includes(status)) {
    return { label: status === "active" ? "—" : "—", color: MUTED };
  }

  const days = parseDaysUntil(lease.end_date);
  if (days < 0) {
    return { label: `Expired ${formatDate(endDate)}`, color: "#ef4444", urgent: true, icon: <WarningAmberRoundedIcon sx={{ fontSize: 14 }} /> };
  }
  if (days <= 30) {
    return {
      label: `Expires in ${days} days`,
      color: "#f59e0b",
      icon: <WarningAmberRoundedIcon sx={{ fontSize: 14, color: "#f59e0b" }} />,
      urgent: true,
    };
  }
  if (days <= 60) {
    return { label: `Expires in ${days} days`, color: "#f59e0b" };
  }
  return { label: `Ends ${formatDate(endDate)}`, color: "rgba(255,255,255,0.55)" };
}

function isExpiringSoon(lease, maxDays = 60) {
  const status = resolveLeaseStatus(lease);
  const days = parseDaysUntil(lease.end_date);
  return status === "active" && Number.isFinite(days) && days >= 0 && days <= maxDays;
}

function workflowMeta(lease) {
  const hasDocument = Boolean(lease.lease_document);
  const status = `${lease.signature_status || ""}`.toLowerCase();
  const tenantSigned = Boolean(lease.tenant_signature);
  const landlordSigned = Boolean(lease.landlord_signature);
  const sent = ["sent", "viewed", "signed"].includes(status);
  const steps = [
    true,
    hasDocument,
    sent,
    tenantSigned,
    landlordSigned,
    tenantSigned && landlordSigned,
  ];
  const activeStep = steps.findIndex((value) => !value);
  const current = activeStep === -1 ? steps.length - 1 : activeStep;
  return { steps, activeStep: current };
}

const StepIcon = ({ active, completed }) => {
  if (completed) {
    return <CheckCircleIcon sx={{ color: "#27ca40", fontSize: 18 }} />;
  }
  if (active) {
    return <CompareArrowsIcon sx={{ color: ACCENT, fontSize: 18, animation: "pulseDot 1.5s ease-in-out infinite" }} />;
  }
  return <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.35)" }} />;
};

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ mt: 2.5 }}>{children}</Box>;
}

function LeaseList() {
  const navigate = useNavigate();
  const [leases, setLeases] = useState([]);
  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [drawerTab, setDrawerTab] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuLease, setMenuLease] = useState(null);
  const [actionLoading, setActionLoading] = useState("");

  const [renewOpen, setRenewOpen] = useState(false);
  const [renewValues, setRenewValues] = useState({ startDate: "", endDate: "", monthlyRent: "" });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [leaseRes, propertyRes, unitRes, tenantRes, paymentRes] = await Promise.all([
        getLeases(),
        getProperties(),
        getUnits(),
        getTenants(),
        getPayments(),
      ]);
      setLeases(leaseRes.data || []);
      setProperties(propertyRes.data || []);
      setUnits(unitRes.data || []);
      setTenants(tenantRes.data || []);
      setPayments(paymentRes.data || []);
      setError("");
    } catch (err) {
      setError("Unable to load lease data.");
      setLeases([]);
      setProperties([]);
      setUnits([]);
      setTenants([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const propertyMap = useMemo(() => {
    const map = {};
    properties.forEach((property) => {
      map[property.id] = property;
    });
    return map;
  }, [properties]);

  const unitMap = useMemo(() => {
    const map = {};
    units.forEach((unit) => {
      map[unit.id] = unit;
    });
    return map;
  }, [units]);

  const enriched = useMemo(() => {
    return leases.map((lease) => {
      const unit = lease.unit_detail || unitMap[lease.unit] || {};
      const property = propertyMap[unit.property] || {};
      const propertyName = property.name || property.property_name || "Unknown Property";
      const tenant = lease.tenant_detail || {};
      const status = resolveLeaseStatus(lease);
      const meta = leaseStatusMeta(status);
      return {
        ...lease,
        _unit: unit,
        _propertyName: propertyName,
        _unitNumber: unit.unit_number || "",
        _tenantDisplayName: `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim() || `Tenant #${tenant.id || lease.tenant || "-"}`,
        _tenantEmail: tenant.email || "-",
        _status: status,
        _statusMeta: meta,
        _statusChip: meta,
        _expiration: expirationMeta(lease),
        _workflow: workflowMeta(lease),
        _expiring60: isExpiringSoon(lease, 60),
      };
    });
  }, [leases, propertyMap, unitMap]);

  const propertyOptions = useMemo(() => {
    const set = new Set(["all"]);
    enriched.forEach((lease) => set.add(lease._propertyName));
    return Array.from(set);
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = [...enriched];

    if (statusFilter !== "all") {
      result = result.filter((lease) => {
        if (statusFilter === "pending") return ["pending_signature", "draft"].includes(lease._status);
        return lease._status === statusFilter;
      });
    }

    if (propertyFilter !== "all") {
      result = result.filter((lease) => lease._propertyName === propertyFilter);
    }

    if (showExpiringOnly) {
      result = result.filter((lease) => {
        const days = parseDaysUntil(lease.end_date);
        return lease._status === "active" && Number.isFinite(days) && days <= 30;
      });
    }

    if (q) {
      result = result.filter((lease) => {
        const propertyText = `${lease._propertyName || ""}`.toLowerCase();
        const unitText = `${lease._unitNumber || ""}`.toLowerCase();
        const tenantText = `${lease._tenantDisplayName || ""}`.toLowerCase();
        return propertyText.includes(q) || unitText.includes(q) || tenantText.includes(q);
      });
    }

    if (sortOption === "newest") {
      result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
    if (sortOption === "oldest") {
      result.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    }
    if (sortOption === "rent_high") {
      result.sort((a, b) => Number(b.monthly_rent || 0) - Number(a.monthly_rent || 0));
    }
    if (sortOption === "rent_low") {
      result.sort((a, b) => Number(a.monthly_rent || 0) - Number(b.monthly_rent || 0));
    }
    if (sortOption === "expiring") {
      result.sort((a, b) => {
        const aDate = parseDate(a.end_date)?.getTime() || Number.MAX_SAFE_INTEGER;
        const bDate = parseDate(b.end_date)?.getTime() || Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      });
    }

    return result;
  }, [enriched, statusFilter, propertyFilter, showExpiringOnly, search, sortOption]);

  const statCards = useMemo(() => {
    const total = enriched.length;
    const active = enriched.filter((lease) => lease._status === "active").length;
    const expiring60 = enriched.filter((lease) => lease._expiring60).length;
    const pending = enriched.filter((lease) => ["pending_signature", "draft"].includes(lease._status)).length;
    const expired = enriched.filter((lease) => lease._status === "expired").length;
    const monthlyRevenue = enriched
      .filter((lease) => lease._status === "active")
      .reduce((sum, lease) => sum + Number(lease.monthly_rent || 0), 0);

    return [
      { label: "Total Leases", value: total, icon: DescriptionRoundedIcon, color: "#60a5fa" },
      { label: "Active", value: active, icon: CheckCircleIcon, color: "#27ca40" },
      { label: "Expiring in 60 Days", value: expiring60, icon: WarningAmberRoundedIcon, color: "#f59e0b" },
      { label: "Pending Signature", value: pending, icon: SearchIcon, color: "#3b82f6" },
      { label: "Monthly Revenue", value: formatCurrency(monthlyRevenue), icon: AutorenewRoundedIcon, color: ACCENT },
    ];
  }, [enriched]);

  const expiringCount = useMemo(() => {
    return enriched.filter((lease) => {
      const days = parseDaysUntil(lease.end_date);
      return lease._status === "active" && Number.isFinite(days) && days <= 30 && days >= 0;
    }).length;
  }, [enriched]);

  const selectedLease = useMemo(() => {
    return enriched.find((lease) => lease.id === selectedId) || null;
  }, [enriched, selectedId]);

  const showSnackbar = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  const statusChip = (lease) => {
    return (
      <Chip
        size="small"
        label={lease._statusMeta.label}
        sx={{
          fontSize: "0.72rem",
          fontWeight: 600,
          backgroundColor: lease._statusMeta.bg,
          color: lease._statusMeta.color,
          border: `1px solid ${lease._statusMeta.border}`,
          height: 24,
        }}
      />
    );
  };

  const selectedLeasePayments = useMemo(() => {
    if (!selectedLease) return [];
    return payments
      .filter((payment) => {
        const paymentLease = payment.lease || payment.lease_detail?.id || payment.lease_id;
        return paymentLease === selectedLease.id;
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [payments, selectedLease]);

  const paymentSummary = useMemo(() => {
    if (!selectedLease) {
      return { paidCount: 0, paidTotal: 0, expectedAnnual: 0, outstanding: 0, onTimeRate: 0, totalCount: 0 };
    }
    const paidItems = selectedLeasePayments.filter((payment) => `${payment.status}`.toLowerCase() === "completed");
    const paidTotal = paidItems.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const expectedAnnual = Number(selectedLease.monthly_rent || 0) * 12;
    return {
      paidCount: paidItems.length,
      paidTotal,
      expectedAnnual,
      outstanding: Math.max(expectedAnnual - paidTotal, 0),
      onTimeRate: paidItems.length && selectedLeasePayments.length ? Math.round((paidItems.length / selectedLeasePayments.length) * 100) : 0,
      totalCount: selectedLeasePayments.length,
    };
  }, [selectedLeasePayments, selectedLease]);

  const tenantById = useMemo(() => {
    const map = {};
    tenants.forEach((tenant) => {
      map[tenant.id] = tenant;
    });
    return map;
  }, [tenants]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedId(null);
    setDrawerTab(0);
  };

  const openDrawer = (lease) => {
    setSelectedId(lease.id);
    setDrawerTab(0);
    setDrawerOpen(true);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuLease(null);
  };

  const tenantLink = (lease) => {
    const tenant = tenantById[lease.tenant] || lease.tenant_detail;
    if (tenant?.id) {
      return `/tenants/${tenant.id}/edit`;
    }
    return "/tenants";
  };

  const workflowMessage = (lease) => {
    if (!lease) return "";
    if (lease.tenant_signature && lease.landlord_signature) {
      return "Lease is active and in good standing.";
    }
    if (lease.tenant_signature) return "Awaiting landlord signature.";
    if (lease.signature_status === "sent" || lease.signature_status === "viewed") {
      return `Awaiting tenant signature — sent ${formatDate(lease.updated_at)}`;
    }
    if (lease.lease_document) return "Lease document generated; awaiting tenant signing.";
    return "Draft lease not yet generated.";
  };

  const ensureLeasePayload = (lease) => ({
    unit: lease.unit,
    tenant: lease.tenant,
    start_date: lease.start_date || "",
    end_date: lease.end_date || "",
    monthly_rent: lease.monthly_rent || 0,
    security_deposit: lease.security_deposit || 0,
    is_active: lease.is_active,
    signature_status: lease.signature_status || "draft",
  });

  const submitRenewal = async () => {
    if (!selectedLease) return;
    try {
      setActionLoading("renewal");
      await createLease({
        unit: selectedLease.unit,
        tenant: selectedLease.tenant,
        start_date: renewValues.startDate,
        end_date: renewValues.endDate,
        monthly_rent: Number(renewValues.monthlyRent || 0),
        security_deposit: Number(selectedLease.security_deposit || 0),
        is_active: true,
      });
      showSnackbar("Lease renewed successfully");
      setRenewOpen(false);
      await loadData();
    } catch {
      showSnackbar("Unable to create renewal lease", "error");
    } finally {
      setActionLoading("");
    }
  };

  const openRenew = (lease) => {
    const startDate = lease.end_date || lease.start_date || "";
    const start = parseDate(startDate);
    const nextEnd = start
      ? new Date(start.getFullYear(), start.getMonth() + 12, start.getDate()).toISOString().slice(0, 10)
      : "";
    setRenewValues({ startDate, endDate: nextEnd, monthlyRent: String(lease.monthly_rent || "") });
    setRenewOpen(true);
  };

  const actionGenerate = async (lease) => {
    try {
      setActionLoading(`generate-${lease.id}`);
      await generateLeaseDocument(lease.id);
      await loadData();
      showSnackbar("Document generated successfully");
    } catch {
      showSnackbar("Document generation failed", "error");
    } finally {
      setActionLoading("");
    }
  };

  const actionSendSigning = async (lease) => {
    try {
      setActionLoading(`send-${lease.id}`);
      await sendLeaseForSigning(lease.id);
      await loadData();
      showSnackbar("Signing link sent to tenant");
    } catch {
      showSnackbar("Unable to send signing link", "error");
    } finally {
      setActionLoading("");
    }
  };

  const actionLandlordSign = async (lease) => {
    const signature = window.prompt("Enter landlord signature");
    if (!signature) return;
    try {
      setActionLoading(`sign-${lease.id}`);
      await landlordSignLease(lease.id, { signature });
      await loadData();
      showSnackbar("Lease signed by landlord — now active");
    } catch {
      showSnackbar("Unable to sign lease as landlord", "error");
    } finally {
      setActionLoading("");
    }
  };

  const actionDownload = async (lease) => {
    if (!lease.lease_document) {
      showSnackbar("No lease document available", "error");
      return;
    }
    try {
      setActionLoading(`download-${lease.id}`);
      const response = await downloadDocument(lease.lease_document);
      const file = new Blob([response.data]);
      const url = window.URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `lease-${lease.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      showSnackbar("Unable to download document", "error");
    } finally {
      setActionLoading("");
    }
  };

  const actionDelete = async (lease) => {
    if (!window.confirm("Delete this lease?")) return;
    try {
      setActionLoading(`delete-${lease.id}`);
      await deleteLease(lease.id);
      await loadData();
      showSnackbar("Lease deleted");
      if (selectedId === lease.id) closeDrawer();
    } catch {
      showSnackbar("Unable to delete lease", "error");
    } finally {
      setActionLoading("");
    }
  };

  const actionTerminate = async (lease) => {
    if (!window.confirm("Terminate this lease?")) return;
    try {
      setActionLoading(`terminate-${lease.id}`);
      const payload = ensureLeasePayload(lease);
      payload.is_active = false;
      await updateLease(lease.id, payload);
      await loadData();
      showSnackbar("Lease terminated");
      if (selectedId === lease.id) closeDrawer();
    } catch {
      showSnackbar("Unable to terminate lease", "error");
    } finally {
      setActionLoading("");
    }
  };

  const copySigningLink = (lease) => {
    if (!lease.signing_token) {
      showSnackbar("No signing link available");
      return;
    }
    navigator.clipboard.writeText(`${window.location.origin}/lease/sign/${lease.signing_token}`);
    showSnackbar("Signing link copied");
  };

  const menuItemsForLease = (lease) => {
    const menu = [
      { action: "view_tenant", label: "View Tenant" },
      { action: "download", label: "Download Lease" },
    ];

    if (!lease.lease_document) {
      menu.push({ action: "generate", label: "Generate Document" });
    }
    if (lease.lease_document && !["sent", "viewed", "signed"].includes(`${lease.signature_status || ""}`.toLowerCase())) {
      menu.push({ action: "send_signing", label: "Send for Signing" });
    }
    if (["sent", "viewed", "signed"].includes(`${lease.signature_status || ""}`.toLowerCase()) && !lease.tenant_signature) {
      menu.push({ action: "resend", label: "Send Reminder" });
    }
    if (lease.tenant_signature && !lease.landlord_signature) {
      menu.push({ action: "landlord_sign", label: "Landlord Sign" });
    }
    if (lease._status === "active") {
      menu.push({ action: "renew", label: "Renew Lease" });
      menu.push({ action: "terminate", label: "Terminate Lease" });
    }
    menu.push({ action: "delete", label: "Delete" });
    return menu;
  };

  const runMenuAction = async (action, lease) => {
    closeMenu();
    if (!lease) return;
    if (action === "view_tenant") {
      navigate(tenantLink(lease));
      return;
    }
    if (action === "download") {
      await actionDownload(lease);
      return;
    }
    if (action === "generate") {
      await actionGenerate(lease);
      return;
    }
    if (action === "send_signing") {
      await actionSendSigning(lease);
      return;
    }
    if (action === "resend") {
      await actionSendSigning(lease);
      return;
    }
    if (action === "landlord_sign") {
      await actionLandlordSign(lease);
      return;
    }
    if (action === "renew") {
      openRenew(lease);
      return;
    }
    if (action === "terminate") {
      await actionTerminate(lease);
      return;
    }
    if (action === "delete") {
      await actionDelete(lease);
    }
  };

  const quickActionButtons = (lease) => {
    const status = lease._status;
    const buttons = [];

    if (status === "draft") {
      buttons.push(
        <Button key="draft_generate" size="small" variant="outlined" onClick={() => actionGenerate(lease)}>
          Generate Document
        </Button>,
        <Button key="draft_edit" size="small" variant="outlined" onClick={() => navigate(`/leases/${lease.id}/edit`)}>
          Edit
        </Button>,
      );
    }

    if (status !== "draft" && !lease.lease_document) {
      buttons.push(
        <Button key="doc_generate" size="small" variant="contained" onClick={() => actionGenerate(lease)} sx={{ backgroundColor: ACCENT }}>
          Generate Document
        </Button>,
      );
    }

    if (["sent", "viewed", "signed"].includes(`${lease.signature_status || ""}`.toLowerCase()) && !lease.tenant_signature) {
      buttons.push(
        <Button key="send" size="small" variant="contained" onClick={() => actionSendSigning(lease)} sx={{ backgroundColor: ACCENT }}>
          Send for Signing
        </Button>,
      );
    }

    if (lease.tenant_signature && !lease.landlord_signature) {
      buttons.push(
        <Button key="resend" size="small" variant="outlined" onClick={() => actionSendSigning(lease)}>
          Resend Signing Link
        </Button>,
        <Button
          key="sign"
          size="small"
          variant="contained"
          onClick={() => actionLandlordSign(lease)}
          sx={{ backgroundColor: ACCENT }}
        >
          Landlord Sign
        </Button>,
      );
    }

    if (lease._status === "active") {
      buttons.push(
        <Button key="tenant" size="small" variant="outlined" onClick={() => navigate(tenantLink(lease))}>
          View Tenant
        </Button>,
      );
      if (isExpiringSoon(lease, 60)) {
        buttons.push(
          <Button
            key="renew"
            size="small"
            variant="contained"
            onClick={() => openRenew(lease)}
            sx={{ backgroundColor: ACCENT }}
          >
            Renew Lease
          </Button>,
        );
      }
      buttons.push(
        <Button key="terminate" size="small" variant="outlined" color="error" onClick={() => actionTerminate(lease)}>
          Terminate
        </Button>,
      );
    }

    buttons.push(
      <Button
        key="delete"
        size="small"
        variant="outlined"
        color="error"
        onClick={() => actionDelete(lease)}
        startIcon={<DeleteOutlineIcon />}
      >
        Delete
      </Button>,
    );

    return buttons;
  };

  const historyRows = useMemo(() => {
    if (!selectedLease) return [];
    const events = [
      { text: "Lease created", date: selectedLease.created_at },
      selectedLease.lease_document ? { text: "Lease document generated", date: selectedLease.updated_at } : null,
      ["sent", "viewed", "signed"].includes(`${selectedLease.signature_status || ""}`.toLowerCase())
        ? { text: "Sent for tenant signing", date: selectedLease.updated_at }
        : null,
      selectedLease.tenant_signature ? { text: "Tenant signed", date: selectedLease.tenant_signed_date } : null,
      selectedLease.landlord_signature ? { text: "Landlord signed — lease active", date: selectedLease.landlord_signed_date } : null,
      ...selectedLeasePayments.slice(0, 2).map((payment) => ({
        text: `Payment received — ${formatCurrency(payment.amount)}`,
        date: payment.payment_date,
      })),
      selectedLease._status === "active" && isExpiringSoon(selectedLease, 30)
        ? { text: `Lease expiring in ${parseDaysUntil(selectedLease.end_date)} days`, date: selectedLease.end_date }
        : null,
    ].filter(Boolean);

    return events.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  }, [selectedLease, selectedLeasePayments]);

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", backgroundColor: "#0a0a0f", color: "#fff", display: "grid", placeItems: "center" }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#0a0a0f", color: "#fff" }}>
      <Box sx={{ maxWidth: 1320, mx: "auto", px: { xs: 2, md: 3 }, pt: 6 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#fff" }}>
            Leases
          </Typography>
          <Typography variant="body2" sx={{ color: MUTED, mt: 1 }}>
            Manage contracts, renewals, and signature workflows.
          </Typography>
        </Box>

        {error ? (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        ) : null}

        <Box
          sx={{
            mt: 3,
            display: "grid",
            gridTemplateColumns: { xs: "repeat(1, 1fr)", sm: "repeat(2, 1fr)", lg: "repeat(5, 1fr)" },
            gap: 2,
          }}
        >
          {statCards.map((item) => {
            const Icon = item.icon;
            return (
              <Paper
                key={item.label}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
                elevation={0}
              >
                <Avatar
                  variant="rounded"
                  sx={{ width: 36, height: 36, backgroundColor: "rgba(255,255,255,0.05)", color: item.color }}
                >
                  <Icon sx={{ fontSize: 18 }} />
                </Avatar>
                <Typography variant="body2" sx={{ color: MUTED }}>
                  {item.label}
                </Typography>
                <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700 }}>
                  {item.value}
                </Typography>
              </Paper>
            );
          })}
        </Box>

        {expiringCount > 0 && (
          <Box
            sx={{
              mt: 3,
              borderRadius: 2,
              border: "1px solid rgba(251,191,36,0.2)",
              backgroundColor: "rgba(251,191,36,0.08)",
              color: "#fbbf24",
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <WarningAmberRoundedIcon sx={{ color: "#fbbf24" }} />
              <Typography variant="body2" sx={{ color: "#fbbf24" }}>
                {expiringCount} lease(s) expiring within 30 days. Review and renew to avoid vacancies.
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              sx={{ borderColor: "#fbbf24", color: "#fbbf24" }}
              onClick={() => setShowExpiringOnly((value) => !value)}
            >
              View Expiring
            </Button>
          </Box>
        )}

        <Paper
          sx={{ mt: 3, border: "1px solid rgba(255,255,255,0.08)", p: 2, backgroundColor: "rgba(255,255,255,0.03)" }}
          elevation={0}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", lg: "row" },
              gap: 2,
              alignItems: { xs: "stretch", lg: "center" },
            }}
          >
            <TextField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              size="small"
              placeholder="Search by tenant, property, or unit..."
              fullWidth
              InputProps={{
                startAdornment: (
                  <Box component="span" sx={{ display: "inline-flex", mr: 1, color: MUTED }}>
                    <SearchIcon fontSize="small" />
                  </Box>
                ),
              }}
            />
            <ToggleButtonGroup
              size="small"
              value={statusFilter}
              exclusive
              onChange={(event, value) => value && setStatusFilter(value)}
              sx={{ display: "flex", flexWrap: "wrap" }}
            >
              {STATUS_OPTIONS.map((status) => (
                <ToggleButton
                  key={status}
                  value={status}
                  sx={{
                    textTransform: "none",
                    color: MUTED,
                    minWidth: 80,
                    "&.Mui-selected": {
                      color: status === "active" ? "#27ca40" : status === "pending" ? "#3b82f6" : status === "expired" ? "#ef4444" : status === "terminated" ? "#ef4444" : "#fff",
                      backgroundColor: "rgba(124,92,252,0.12)",
                    },
                  }}
                >
                  {status === "all"
                    ? "All"
                    : status === "active"
                      ? "Active"
                      : status === "pending"
                        ? "Pending"
                        : status === "expired"
                          ? "Expired"
                          : "Terminated"}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Select
              size="small"
              value={propertyFilter}
              onChange={(event) => setPropertyFilter(event.target.value)}
              sx={{ minWidth: 240 }}
            >
              <MenuItem value="all">All Properties</MenuItem>
              {propertyOptions
                .filter((name) => name !== "all")
                .map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
            </Select>

            <Select
              size="small"
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value)}
              sx={{ minWidth: 220 }}
            >
              {SORT_OPTIONS.map((option) => (
                <MenuItem value={option.value} key={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Paper>
      </Box>

      <Box sx={{ maxWidth: 1320, mx: "auto", px: { xs: 2, md: 3 }, py: 3 }}>
        {filtered.length === 0 ? (
          <Paper
            sx={{
              py: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.02)",
              textAlign: "center",
            }}
            elevation={0}
          >
            <VerifiedUser sx={{ fontSize: 64, color: "rgba(255,255,255,0.3)" }} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              No leases yet
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: MUTED, maxWidth: 500, mx: "auto" }}>
              Create your first lease from an approved application or add one manually.
            </Typography>
            <Button
              variant="contained"
              sx={{ mt: 3, backgroundColor: ACCENT }}
              onClick={() => navigate("/leases/new")}
            >
              + Add Lease
            </Button>
          </Paper>
        ) : (
          <TableContainer
            component={Paper}
            sx={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2, backgroundColor: "rgba(255,255,255,0.02)" }}
            elevation={0}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderSx}>Property · Unit</TableCell>
                  <TableCell sx={tableHeaderSx}>Tenant</TableCell>
                  <TableCell sx={tableHeaderSx}>Term</TableCell>
                  <TableCell sx={tableHeaderSx}>Rent</TableCell>
                  <TableCell sx={tableHeaderSx}>Status</TableCell>
                  <TableCell sx={tableHeaderSx}>Expiration</TableCell>
                  <TableCell sx={{ ...tableHeaderSx, textAlign: "right" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((lease) => {
                  const expiration = lease._expiration;
                  const term = monthDiff(lease.start_date, lease.end_date);
                  return (
                    <TableRow
                      key={lease.id}
                      sx={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        cursor: "pointer",
                        "&:hover": { backgroundColor: "rgba(255,255,255,0.02)" },
                      }}
                      onClick={() => openDrawer(lease)}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#fff" }}>
                          {lease._propertyName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: MUTED }}>
                          Unit {lease._unitNumber || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#fff" }}>
                          {lease._tenantDisplayName || "Unassigned"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: MUTED, fontStyle: lease._tenantDisplayName ? "normal" : "italic" }}>
                          {lease._tenantDisplayName ? lease._tenantEmail : "Unassigned"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                          {formatMonthYear(lease.start_date)}  —  {formatMonthYear(lease.end_date)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: MUTED }}>
                          {term || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                          {formatCurrency(lease.monthly_rent)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: MUTED }}>
                          (~{formatCurrency(Number(lease.monthly_rent || 0) * 12)}/yr)
                        </Typography>
                      </TableCell>
                      <TableCell>{statusChip(lease)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.7, color: expiration.color }}>
                          {expiration.icon}
                          <Typography variant="body2" sx={{ color: expiration.color, lineHeight: 1.4 }}>
                            {expiration.label}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "inline-flex", gap: 0.5 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDrawer(lease);
                            }}
                            sx={{ borderColor: "rgba(255,255,255,0.3)", color: "#fff" }}
                          >
                            <VisibilityRoundedIcon fontSize="small" />
                            &nbsp;View
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/leases/${lease.id}/edit`);
                            }}
                            sx={{ borderColor: "rgba(255,255,255,0.3)", color: "#fff" }}
                          >
                            <EditRoundedIcon fontSize="small" />
                            &nbsp;Edit
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(event) => {
                              event.stopPropagation();
                              setMenuAnchor(event.currentTarget);
                              setMenuLease(lease);
                            }}
                            sx={{ borderColor: "rgba(255,255,255,0.3)", color: "#fff" }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor && menuLease)}
        onClose={closeMenu}
        PaperProps={{
          sx: {
            backgroundColor: "#13131a",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#fff",
          },
        }}
      >
        {(menuLease ? menuItemsForLease(menuLease) : []).map((entry) => (
          <MenuItem
            key={entry.action}
            onClick={() => runMenuAction(entry.action, menuLease)}
            sx={{ color: "#fff" }}
          >
            {entry.label}
          </MenuItem>
        ))}
      </Menu>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: 640 },
            backgroundColor: "#0f0f14",
            color: "#fff",
            borderLeft: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {selectedLease ? (
          <>
            <Box sx={{ px: 3, py: 2.5, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "flex-start" }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {selectedLease._propertyName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: MUTED, mt: 0.5 }}>
                    Unit {selectedLease._unitNumber || "-"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: MUTED }}>
                    {selectedLease._tenantDisplayName || "Unassigned"}
                  </Typography>
                </Box>
                <Button size="small" onClick={closeDrawer}>
                  Close
                </Button>
              </Box>

              <Box sx={{ mt: 1.5, display: "inline-flex", alignItems: "center", gap: 1 }}>
                {statusChip(selectedLease)}
                <Typography variant="caption" sx={{ color: MUTED }}>
                  {workflowMessage(selectedLease)}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                px: 3,
                py: 2,
                backgroundColor: "rgba(255,255,255,0.02)",
              }}
            >
              {(() => {
                const { activeStep } = selectedLease._workflow;
                return (
                  <Stepper
                    nonLinear
                    activeStep={Math.min(activeStep, STEP_LABELS.length - 1)}
                    alternativeLabel
                    connector={<StepConnector sx={{ "& .MuiStepConnector-line": { borderColor: "rgba(255,255,255,0.15)" } }} />}
                  >
                    {STEP_LABELS.map((label) => (
                      <Step key={label}>
                        <StepLabel StepIconComponent={StepIcon}>
                          <Typography variant="caption" sx={{ color: MUTED }}>
                            {label}
                          </Typography>
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                );
              })()}
            </Box>

            <Box sx={{ px: 2.5, pb: 2, flex: 1, overflow: "auto" }}>
              <Tabs
                value={drawerTab}
                onChange={(event, newTab) => setDrawerTab(newTab)}
                variant="fullWidth"
                sx={{
                  minHeight: "auto",
                  "& .MuiTab-root": { textTransform: "none", color: MUTED },
                  "& .Mui-selected": { color: "#fff" },
                }}
                TabIndicatorProps={{ sx: { backgroundColor: ACCENT } }}
              >
                <Tab label="Details" />
                <Tab label="Documents" />
                <Tab label="Financials" />
                <Tab label="History" />
              </Tabs>

              <TabPanel value={drawerTab} index={0}>
                <Box
                  sx={{
                    mt: 2,
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  {[
                    { label: "Property", value: selectedLease._propertyName },
                    { label: "Unit", value: selectedLease._unitNumber || "-" },
                    {
                      label: "Tenant",
                      value: selectedLease._tenantDisplayName || "Unassigned",
                      sub: selectedLease._tenantEmail,
                    },
                    { label: "Monthly Rent", value: formatCurrency(selectedLease.monthly_rent) },
                    { label: "Security Deposit", value: formatCurrency(selectedLease.security_deposit || 0) },
                    { label: "Start Date", value: formatDate(selectedLease.start_date) },
                    { label: "End Date", value: formatDate(selectedLease.end_date) },
                    {
                      label: "Lease Term",
                      value: monthDiff(selectedLease.start_date, selectedLease.end_date) || "â€”",
                    },
                    { label: "Created", value: formatDate(selectedLease.created_at) },
                    { label: "Status", value: selectedLease._statusMeta.label },
                  ].map((entry) => (
                    <Box key={entry.label}>
                      <Typography variant="caption" sx={{ color: MUTED }}>
                        {entry.label}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#fff", mt: 0.3, fontWeight: 600 }}>
                        {entry.value}
                      </Typography>
                      {entry.sub ? (
                        <Typography variant="caption" sx={{ color: MUTED }}>
                          {entry.sub}
                        </Typography>
                      ) : null}
                    </Box>
                  ))}
                </Box>
              </TabPanel>

              <TabPanel value={drawerTab} index={1}>
                <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box
                    sx={{
                      borderRadius: 2,
                      border: "1px solid rgba(255,255,255,0.08)",
                      p: 2,
                      backgroundColor: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: 700 }}>
                      Lease Document
                    </Typography>
                    {selectedLease.lease_document ? (
                      <>
                        <Typography variant="caption" sx={{ color: MUTED, display: "block", mt: 0.5 }}>
                          Generated on {formatDate(selectedLease.updated_at)}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{ mt: 1.5, borderColor: ACCENT, color: ACCENT }}
                          onClick={() => actionDownload(selectedLease)}
                        >
                          <DownloadRoundedIcon fontSize="small" />
                          &nbsp;Download
                        </Button>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" sx={{ color: MUTED, mt: 1 }}>
                          No document generated.
                        </Typography>
                        <Button
                          size="small"
                          variant="contained"
                          sx={{ mt: 1.5, backgroundColor: ACCENT }}
                          onClick={() => actionGenerate(selectedLease)}
                        >
                          <DescriptionRoundedIcon fontSize="small" />
                          &nbsp;Generate Document
                        </Button>
                      </>
                    )}
                  </Box>

                  <Box
                    sx={{
                      borderRadius: 2,
                      border: "1px solid rgba(255,255,255,0.08)",
                      p: 2,
                      backgroundColor: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: 700 }}>
                      Signing Status
                    </Typography>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.5 }}>
                      <Typography variant="body2" sx={{ color: MUTED }}>
                        Tenant
                      </Typography>
                      <Chip
                        size="small"
                        label={selectedLease.tenant_signature ? "Signed" : "Not yet signed"}
                        sx={{
                          height: 20,
                          backgroundColor: selectedLease.tenant_signature
                            ? "rgba(39,202,64,0.15)"
                            : "rgba(156,163,175,0.15)",
                          color: selectedLease.tenant_signature ? "#27ca40" : "#9ca3af",
                        }}
                      />
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                      <Typography variant="body2" sx={{ color: MUTED }}>
                        Landlord
                      </Typography>
                      <Chip
                        size="small"
                        label={selectedLease.landlord_signature ? "Signed" : "Not yet signed"}
                        sx={{
                          height: 20,
                          backgroundColor: selectedLease.landlord_signature
                            ? "rgba(39,202,64,0.15)"
                            : "rgba(156,163,175,0.15)",
                          color: selectedLease.landlord_signature ? "#27ca40" : "#9ca3af",
                        }}
                      />
                    </Box>
                  </Box>

                  {selectedLease.signing_token && selectedLease.signature_status && (
                    <Box
                      sx={{
                        borderRadius: 2,
                        border: "1px solid rgba(255,255,255,0.08)",
                        p: 2,
                        backgroundColor: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: 700 }}>
                        Signing Link
                      </Typography>
                      <Typography variant="caption" sx={{ color: MUTED, display: "block", mt: 0.5 }}>
                        {`${window.location.origin}/lease/sign/${selectedLease.signing_token}`}
                      </Typography>
                      <Stack direction="row" spacing={1} mt={1.5}>
                        <Button size="small" variant="outlined" onClick={() => copySigningLink(selectedLease)}>
                          <ContentCopyIcon fontSize="small" />
                          &nbsp;Copy
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => actionSendSigning(selectedLease)}>
                          Resend Link
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </Box>
              </TabPanel>

              <TabPanel value={drawerTab} index={2}>
                <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 2,
                        p: 2,
                        backgroundColor: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: MUTED }}>
                        Payments received
                      </Typography>
                      <Typography variant="h6" sx={{ color: "#fff", mt: 1 }}>
                        {paymentSummary.paidCount} / {selectedLeasePayments.length}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 2,
                        p: 2,
                        backgroundColor: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: MUTED }}>
                        Outstanding
                      </Typography>
                      <Typography variant="h6" sx={{ color: "#fff", mt: 1 }}>
                        {formatCurrency(paymentSummary.outstanding)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 2,
                      p: 2,
                      backgroundColor: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: 700 }}>
                      Recent Payments
                    </Typography>
                    {selectedLeasePayments.length === 0 ? (
                      <Typography variant="body2" sx={{ color: MUTED, mt: 1.5 }}>
                        No payment records found.
                      </Typography>
                    ) : (
                      <Stack spacing={1.2} sx={{ mt: 1.5 }}>
                        {selectedLeasePayments.slice(0, 6).map((payment) => (
                          <Box key={payment.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Box>
                              <Typography variant="body2" sx={{ color: "#fff" }}>
                                {formatDate(payment.payment_date)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: MUTED }}>
                                {payment.method || "-"}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                              <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                                {formatCurrency(payment.amount)}
                              </Typography>
                              <Chip
                                size="small"
                                label={payment.status || "pending"}
                                sx={{
                                  mt: 0.5,
                                  backgroundColor:
                                    `${
                                      `${String(payment.status || "")}`.toLowerCase() === "completed"
                                        ? "rgba(39,202,64,0.15)"
                                        : `${String(payment.status || "")}`.toLowerCase() === "failed"
                                          ? "rgba(239,68,68,0.15)"
                                          : "rgba(156,163,175,0.15)"
                                    }`,
                                  color:
                                    `${
                                      `${String(payment.status || "")}`.toLowerCase() === "completed"
                                        ? "#27ca40"
                                        : `${String(payment.status || "")}`.toLowerCase() === "failed"
                                          ? "#ef4444"
                                          : "#9ca3af"
                                    }`,
                                  height: 20,
                                }}
                              />
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    )}
                    <Button size="small" sx={{ mt: 1.5 }} component={Link} to="/accounting">
                      View all payments
                    </Button>
                  </Box>
                </Box>
              </TabPanel>

              <TabPanel value={drawerTab} index={3}>
                <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                  {historyRows.map((event, index) => (
                    <Box key={`${event.text}-${index}`} sx={{ display: "flex", gap: 1.5 }}>
                      <Box sx={{ width: 18, position: "relative", display: "flex", justifyContent: "center" }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            mt: 0.7,
                            backgroundColor: ACCENT,
                          }}
                        />
                        {index < historyRows.length - 1 && (
                          <Box
                            sx={{
                              position: "absolute",
                              left: "50%",
                              top: 16,
                              width: 1,
                              borderLeft: "1px solid rgba(124,92,252,0.35)",
                              height: "calc(100% - 8px)",
                              transform: "translateX(-50%)",
                            }}
                          />
                        )}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ color: "#fff" }}>
                          {event.text}
                        </Typography>
                        <Typography variant="caption" sx={{ color: MUTED }}>
                          {formatDate(event.date)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                  {historyRows.length === 0 && (
                    <Typography variant="body2" sx={{ color: MUTED }}>
                      No activity yet.
                    </Typography>
                  )}
                </Box>
              </TabPanel>
            </Box>

            <Box
              sx={{
                mt: "auto",
                p: 2,
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              {selectedLease._status === "draft" ? (
                <>
                  <Button size="small" variant="contained" sx={{ backgroundColor: ACCENT }} onClick={() => actionGenerate(selectedLease)}>
                    Generate Document
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => navigate(`/leases/${selectedLease.id}/edit`)}>
                    Edit
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => actionDelete(selectedLease)}
                  >
                    Delete
                  </Button>
                </>
              ) : null}

              {selectedLease.lease_document && !selectedLease.tenant_signature &&
              ["draft", "pending_signature", "terminated"].includes(selectedLease._status) ? (
                <Button size="small" variant="contained" sx={{ backgroundColor: ACCENT }} onClick={() => actionSendSigning(selectedLease)}>
                  Send for Signing
                </Button>
              ) : null}

              {selectedLease.tenant_signature && !selectedLease.landlord_signature ? (
                <Button size="small" variant="outlined" onClick={() => actionLandlordSign(selectedLease)}>
                  Landlord Sign
                </Button>
              ) : null}

              {selectedLease._status === "active" && isExpiringSoon(selectedLease, 60) ? (
                <Button size="small" variant="contained" sx={{ backgroundColor: ACCENT }} onClick={() => openRenew(selectedLease)}>
                  Renew Lease
                </Button>
              ) : null}

              {selectedLease._status === "active" ? (
                <>
                  <Button size="small" variant="outlined" onClick={() => navigate(tenantLink(selectedLease))}>
                    View Tenant
                  </Button>
                  <Button size="small" variant="outlined" color="error" onClick={() => actionTerminate(selectedLease)}>
                    Terminate
                  </Button>
                </>
              ) : null}
            </Box>
          </>
        ) : null}
      </Drawer>

      <Dialog open={renewOpen} onClose={() => setRenewOpen(false)} PaperProps={{ sx: { backgroundColor: "#0a0a0f", color: "#fff" } }}>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700 }}>
            Renew Lease
          </Typography>
          <Stack spacing={2} sx={{ mt: 1.5 }}>
            <TextField
              type="date"
              label="Start date"
              value={renewValues.startDate}
              onChange={(event) => setRenewValues((previous) => ({ ...previous, startDate: event.target.value }))}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="date"
              label="End date"
              value={renewValues.endDate}
              onChange={(event) => setRenewValues((previous) => ({ ...previous, endDate: event.target.value }))}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Monthly Rent"
              type="number"
              value={renewValues.monthlyRent}
              onChange={(event) => setRenewValues((previous) => ({ ...previous, monthlyRent: event.target.value }))}
              fullWidth
              size="small"
            />
          </Stack>
          <Box sx={{ mt: 2.5, display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button onClick={() => setRenewOpen(false)}>Cancel</Button>
            <Button variant="contained" sx={{ backgroundColor: ACCENT }} onClick={submitRenewal}>
              Create Renewal
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4200}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default LeaseList;



