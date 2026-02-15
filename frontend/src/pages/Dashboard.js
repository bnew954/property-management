import React, { useEffect, useState } from "react";
import ApartmentIcon from "@mui/icons-material/Apartment";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BuildIcon from "@mui/icons-material/Build";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import PaymentIcon from "@mui/icons-material/Payment";
import PeopleIcon from "@mui/icons-material/People";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ReceiptIcon from "@mui/icons-material/Receipt";
import RefreshIcon from "@mui/icons-material/Refresh";
import SendIcon from "@mui/icons-material/Send";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, IconButton, Paper, Snackbar, TextField, Typography } from "@mui/material";
import { useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link } from "react-router-dom";
import {
  Area,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getApplications,
  getBills,
  getLeases,
  getMaintenanceRequests,
  getAgentSkills,
  getScreenings,
  getPayments,
  getProperties,
  getTenants,
  getAgentTaskFeed,
  getAgentTaskSummary,
  previewAgentTask,
  executeAgentTask,
  dismissAgentTask,
  runAgentSkill,
  toggleAgentSkill,
  getUnits,
} from "../services/api";
import { useUser } from "../services/userContext";

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

const toDate = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateOnly = (value) => {
  const parsed = toDate(value);
  if (!parsed) {
    return null;
  }
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const parseMoney = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

export const getRelativeTime = (date) => {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getTenantName = (leaseOrRecord) => {
  const tenant = leaseOrRecord?.tenant_detail || leaseOrRecord?.tenant || {};
  const full = `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim();
  return full || tenant.name || "Unknown Tenant";
};

const getLeaseLocation = (lease) => {
  const unitNumber =
    lease?.unit_detail?.unit_number ||
    lease?.unit?.unit_number ||
    lease?.unit_number ||
    "";
  const propertyName =
    lease?.property_name ||
    lease?.property?.name ||
    lease?.unit_detail?.property_name ||
    lease?.unit_detail?.property?.name ||
    "";
  if (propertyName && unitNumber) {
    return `${propertyName} · ${unitNumber}`;
  }
  return propertyName || unitNumber || "";
};

const getDaysUntil = (value) => {
  const target = toDate(value);
  if (!target) {
    return null;
  }
  const today = toDateOnly(new Date());
  if (!today) {
    return null;
  }
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const billAmount = (bill) =>
  parseMoney(
    bill.total_amount ||
      bill.amount_total ||
      bill.total ||
      bill.amount ||
      bill.amount_due ||
      bill.balance_due ||
      0
  );

const billPaid = (bill) => parseMoney(bill.paid_amount || bill.amount_paid || bill.paid || 0);

const billBalance = (bill) => {
  if (bill.balance_due !== undefined && bill.balance_due !== null) {
    return Math.max(parseMoney(bill.balance_due), 0);
  }
  return Math.max(billAmount(bill) - billPaid(bill), 0);
};

const billDueDate = (bill) => toDate(bill.due_date || bill.dueDate || bill.due_on);

const isUnpaidBill = (bill) => {
  const status = String(bill.status || bill.payment_status || "").toLowerCase();
  if (["paid", "cancelled", "void", "completed"].includes(status)) {
    return false;
  }
  return billBalance(bill) > 0;
};

const getBillVendorName = (bill) => {
  const vendor = bill.vendor_detail || bill.vendor || {};
  return vendor.name || bill.vendor_name || bill.vendor?.name || "Unknown Vendor";
};

const getBillDescription = (bill) => bill.description || bill.note || bill.notes || bill.title || "-";

const isLeaseActive = (lease) => {
  if (Object.prototype.hasOwnProperty.call(lease, "is_active")) {
    return Boolean(lease.is_active);
  }
  return String(lease.status || lease.state || "").toLowerCase() === "active";
};

const getPaymentTenant = (payment) => {
  const tenant = payment?.lease_detail?.tenant_detail || payment?.tenant_detail || payment?.tenant || {};
  const full = `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim();
  return full || tenant.name || "Unknown Tenant";
};

const getPaymentAmount = (payment) => parseMoney(payment.amount || payment.total || payment.total_amount || 0);

const getPaymentDate = (payment) =>
  toDate(payment.payment_date || payment.created_at || payment.date);

const getMaintenanceIssue = (request) =>
  request.title || request.issue || request.description || request.subject || "Maintenance request";

const getMaintenanceUnit = (request) => {
  const unitNumber = request?.unit_detail?.unit_number || request?.unit_number || request?.unit || "";
  if (unitNumber) {
    return `Unit ${String(unitNumber).replace(/^unit\s+/i, "")}`;
  }
  return request.unit_detail?.unit_name || request.unit_label || "";
};

const getMaintenanceDate = (request) =>
  toDate(request.updated_at || request.created_at || request.submitted_at || request.date);

const getApplicationApplicant = (application) => {
  const full = `${application?.first_name || ""} ${application?.last_name || ""}`.trim();
  return (
    full ||
    application?.full_name ||
    application?.applicant_name ||
    application?.email ||
    `Applicant #${application?.id}`
  );
};

const getApplicationUnit = (application) => {
  const unitDetail = application?.unit_detail || application?.unit || {};
  const propertyName =
    unitDetail?.property_name ||
    unitDetail?.property?.name ||
    application?.property_name ||
    application?.property?.name ||
    application?.listing?.property_name ||
    "";
  const unitNumber =
    unitDetail?.unit_number ||
    unitDetail?.unit?.unit_number ||
    application?.unit_number ||
    application?.unit?.unit_number ||
    "";
  if (propertyName && unitNumber) {
    return `${propertyName} · Unit ${unitNumber}`;
  }
  if (unitNumber) {
    return `Unit ${unitNumber}`;
  }
  return propertyName || "";
};

const getApplicationDate = (application) => toDate(application.created_at || application.submitted_at || application.date);

const makeCardStyle = (overrides = {}) => ({
  backgroundColor: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "16px",
  ...overrides,
});

const AGENT_SKILL_CONFIG = {
  leasing: { icon: <PeopleOutlineIcon />, color: "#3b82f6", label: "Leasing" },
  collections: { icon: <AttachMoneyIcon />, color: "#ef4444", label: "Collections" },
  maintenance: { icon: <BuildIcon />, color: "#f97316", label: "Maintenance" },
  bookkeeping: { icon: <AccountBalanceIcon />, color: "#8b5cf6", label: "Bookkeeping" },
  compliance: { icon: <VerifiedUserIcon />, color: "#06b6d4", label: "Compliance" },
  rent_optimizer: { icon: <TrendingUpIcon />, color: "#27ca40", label: "Rent Optimizer" },
};

const AGENT_PRIORITY_COLORS = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#fbbf24",
  low: "#9ca3af",
};

const parseRecommendation = (task) => {
  if (!task?.recommended_action) {
    return null;
  }
  try {
    const parsed = typeof task.recommended_action === "object" ? task.recommended_action : JSON.parse(task.recommended_action);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
  } catch {
    // Not JSON, return as plain text
  }
  return { text: task.recommended_action };
};

const getAgentSkillInfo = (skillType) => AGENT_SKILL_CONFIG[skillType] || {
  icon: <AutoAwesomeIcon />,
  color: "#7C5CFC",
  label: skillType || "Agent",
};

const formatAgentTimestamp = (value) => {
  const parsed = toDate(value);
  if (!parsed) {
    return "Never";
  }
  return `${parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${parsed.toLocaleTimeString(
    "en-US",
    { hour: "numeric", minute: "2-digit" }
  )}`;
};

const AgentSkillCard = ({ skill, onToggle }) => {
  const skillConfig = getAgentSkillInfo(skill.skill_type);
  return (
    <Box
      sx={{
        minWidth: 160,
        p: 2,
        borderRadius: "12px",
        backgroundColor: skill.status === "active" ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
        border: `1px solid ${skill.status === "active" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)"}`,
        opacity: skill.status === "active" ? 1 : 0.5,
        cursor: "pointer",
        "&:hover": { border: `1px solid ${skillConfig.color}30` },
        transition: "all 0.2s",
      }}
      onClick={() => onToggle(skill.id)}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Box sx={{ color: skillConfig.color, display: "flex" }}>
          {React.cloneElement(skillConfig.icon, { fontSize: "small" })}
        </Box>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: skill.status === "active" ? "#27ca40" : "#9ca3af",
            boxShadow: skill.status === "active" ? "0 0 6px rgba(39,202,64,0.5)" : "none",
          }}
        />
      </Box>
      <Typography variant="caption" sx={{ fontWeight: 600, color: "#fff", display: "block" }}>
        {skillConfig.label}
      </Typography>
      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)", fontSize: "0.65rem" }}>
        {skill.tasks_pending > 0 ? `${skill.tasks_pending} pending` : "All clear"}
      </Typography>
    </Box>
  );
};

const AgentTaskCard = ({ task, onApproveAndExecute, onDismiss }) => {
  const priority = task.priority || "low";
  const priorityColor = AGENT_PRIORITY_COLORS[priority] || AGENT_PRIORITY_COLORS.low;
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const recommendation = parseRecommendation(task);
  const configIcons = {
    leasing: <PeopleOutlineIcon sx={{ fontSize: 16 }} />,
    collections: <AttachMoneyIcon sx={{ fontSize: 16 }} />,
    maintenance: <BuildIcon sx={{ fontSize: 16 }} />,
    bookkeeping: <AccountBalanceIcon sx={{ fontSize: 16 }} />,
    compliance: <VerifiedUserIcon sx={{ fontSize: 16 }} />,
    rent_optimizer: <TrendingUpIcon sx={{ fontSize: 16 }} />,
  };

  const handlePreview = async () => {
    if (previewLoading) {
      return;
    }

    if (previewData) {
      setShowPreview((prev) => !prev);
      return;
    }

    setPreviewLoading(true);
    try {
      const res = await previewAgentTask(task.id);
      setPreviewData(res.data?.preview || res.data || null);
      setShowPreview(true);
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        mb: 1.5,
        borderRadius: "12px",
        backgroundColor: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.04)",
        "&:hover": { border: "1px solid rgba(255,255,255,0.08)" },
        transition: "all 0.15s",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1 }}>
        <Box sx={{ color: priorityColor, mt: 0.3 }}>
          {configIcons[task.skill_type] || <AutoAwesomeIcon sx={{ fontSize: 16 }} />}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "#fff", lineHeight: 1.3 }}>
            {task.title || "Untitled task"}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", mt: 0.5, display: "block" }}>
            {task.description || "No description provided."}
          </Typography>
        </Box>
        <Chip
          label={priority}
          size="small"
          sx={{
            height: 18,
            fontSize: "0.6rem",
            fontWeight: 700,
            backgroundColor: `${priorityColor}20`,
            color: priorityColor,
          }}
        />
      </Box>

      {recommendation ? (
        <Box
          sx={{
            mt: 1.5,
            p: 1.5,
            borderRadius: "8px",
            backgroundColor: "rgba(124,92,252,0.06)",
            border: "1px solid rgba(124,92,252,0.1)",
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: "#7C5CFC", fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 12 }} /> Agent Recommendation
          </Typography>
          {recommendation.text ? (
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.5)", mt: 0.5, display: "block", lineHeight: 1.5 }}
            >
              {recommendation.text}
            </Typography>
          ) : (
            <Box>
              {recommendation.subject ? (
                <Typography variant="caption" sx={{ color: "#fff", fontWeight: 600, display: "block" }}>
                  📧 {recommendation.subject}
                </Typography>
              ) : null}
              {recommendation.recommended_vendor_name ? (
                <Typography variant="caption" sx={{ color: "#fff", display: "block" }}>
                  🔧 Vendor: {recommendation.recommended_vendor_name}
                </Typography>
              ) : null}
              {recommendation.suggested_new_rent ? (
                <Typography variant="caption" sx={{ color: "#27ca40", display: "block" }}>
                  💰 Suggested: ${recommendation.suggested_new_rent}/mo
                </Typography>
              ) : null}
              {recommendation.suggested_account_name ? (
                <Typography variant="caption" sx={{ color: "#fff", display: "block" }}>
                  📂 Category: {recommendation.suggested_account_name}
                </Typography>
              ) : null}
              {recommendation.reasoning ? (
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic", display: "block" }}>
                  {recommendation.reasoning}
                </Typography>
              ) : null}
            </Box>
          )}
        </Box>
      ) : null}

      {showPreview && previewData ? (
        <Box
          sx={{
            mt: 1.5,
            p: 2,
            borderRadius: "8px",
            backgroundColor: "rgba(39,202,64,0.04)",
            border: "1px solid rgba(39,202,64,0.1)",
          }}
        >
          <Typography variant="caption" sx={{ color: "#27ca40", fontWeight: 600, mb: 1, display: "block" }}>
            📋 Preview: What the agent will do
          </Typography>
          {previewData.subject ? (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                Subject:
              </Typography>
              <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                {previewData.subject}
              </Typography>
            </Box>
          ) : null}
          {previewData.body ? (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                Message:
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {previewData.body}
              </Typography>
            </Box>
          ) : null}
          {previewData.suggested_new_rent ? (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                Suggested Rent:
              </Typography>
              <Typography variant="body2" sx={{ color: "#27ca40", fontWeight: 700 }}>
                ${previewData.suggested_new_rent}/mo ({previewData.rent_increase_pct}% increase)
              </Typography>
            </Box>
          ) : null}
          {previewData.recommended_vendor_name ? (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                Recommended Vendor:
              </Typography>
              <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                {previewData.recommended_vendor_name}
              </Typography>
              {previewData.estimated_cost_low ? (
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                  Est. ${previewData.estimated_cost_low} - ${previewData.estimated_cost_high} · {previewData.timeline}
                </Typography>
              ) : null}
            </Box>
          ) : null}
          {previewData.suggested_account_name ? (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                Categorize as:
              </Typography>
              <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                {previewData.suggested_account_name}
              </Typography>
            </Box>
          ) : null}
          {previewData.reasoning ? (
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic", mt: 1, display: "block" }}
            >
              💡 {previewData.reasoning}
            </Typography>
          ) : null}
        </Box>
      ) : null}

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography sx={{ color: "rgba(255,255,255,0.25)", fontSize: "0.75rem" }}>
            {Math.round((task.confidence || 0) * 100)}% confidence
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.25)", fontSize: "0.75rem" }}>
            {task.created_at ? getRelativeTime(task.created_at) : "Recent"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={handlePreview}
            disabled={previewLoading}
            sx={{
              textTransform: "none",
              fontSize: "0.7rem",
              borderRadius: "6px",
              px: 1.5,
              py: 0.3,
              borderColor: "rgba(124,92,252,0.3)",
              color: "#7C5CFC",
              minWidth: 0,
            }}
          >
            {previewLoading ? <CircularProgress size={12} /> : showPreview ? "Hide Preview" : "Preview"}
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => onApproveAndExecute(task.id)}
            sx={{
              textTransform: "none",
              fontSize: "0.7rem",
              borderRadius: "6px",
              px: 1.5,
              py: 0.3,
              backgroundColor: "#27ca40",
              "&:hover": { backgroundColor: "#1fa834" },
              minWidth: 0,
            }}
          >
            Approve & Execute
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => onDismiss(task.id)}
            sx={{
              textTransform: "none",
              fontSize: "0.7rem",
              borderRadius: "6px",
              px: 1.5,
              py: 0.3,
              borderColor: "rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.4)",
              minWidth: 0,
            }}
          >
            Dismiss
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

function Dashboard() {
  const { role, user } = useUser();
  const theme = useTheme();
  const [counts, setCounts] = useState({
    properties: 0,
    units: 0,
    tenants: 0,
    activeLeases: 0,
    openMaintenance: 0,
    myPayments: 0,
    myMaintenance: 0,
    myLeaseInfo: 0,
    pendingConsentScreening: null,
  });
  const [revenueData, setRevenueData] = useState([]);
  const [occupancyData, setOccupancyData] = useState([
    { name: "Occupied", value: 0 },
    { name: "Vacant", value: 0 },
  ]);
  const [maintenanceStatusData, setMaintenanceStatusData] = useState([]);
  const [tenantAmountDue, setTenantAmountDue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upcomingExpirations, setUpcomingExpirations] = useState([]);
  const [outstandingBills, setOutstandingBills] = useState([]);
  const [isBillsAvailable, setIsBillsAvailable] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [agentSkills, setAgentSkills] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [taskSummary, setTaskSummary] = useState({});
  const [isAgentAvailable, setIsAgentAvailable] = useState(true);
  const [agentsRunning, setAgentsRunning] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [agentFilter, setAgentFilter] = useState("All");
  const [agentInput, setAgentInput] = useState("");

  const fetchAgentData = async () => {
    try {
      const [skillsRes, feedRes, summaryRes] = await Promise.all([
        getAgentSkills(),
        getAgentTaskFeed(),
        getAgentTaskSummary(),
      ]);
      const normalizedSkills = parseList(skillsRes?.data);
      const normalizedTasks = parseList(feedRes?.data);
      setAgentSkills(normalizedSkills);
      setPendingTasks(normalizedTasks);
      setTaskSummary(summaryRes?.data || {});
      setIsAgentAvailable(true);
    } catch (err) {
      if (err?.response?.status === 404) {
        setIsAgentAvailable(false);
        setAgentSkills([]);
        setPendingTasks([]);
        setTaskSummary({});
      } else {
        console.error("Agent data fetch error:", err);
      }
    }
  };

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      setUpcomingExpirations([]);
      setOutstandingBills([]);
      setRecentActivity([]);
      setIsBillsAvailable(true);

      let leaseItems = [];
      let paymentItems = [];
      let maintenanceItems = [];
      let applicationItems = [];

      try {
        if (role === "tenant") {
          const tenantId = user?.tenant_id;
          const [paymentsRes, maintenanceRes, leasesRes, screeningsRes] = await Promise.all([
            getPayments(),
            getMaintenanceRequests(),
            getLeases(),
            getScreenings(),
          ]);

          paymentItems = parseList(paymentsRes.data).filter(
            (item) =>
              !tenantId ||
              item.lease_detail?.tenant === tenantId ||
              item.lease_detail?.tenant_detail?.id === tenantId
          );
          maintenanceItems = parseList(maintenanceRes.data).filter(
            (item) =>
              !tenantId ||
              item.tenant_detail?.id === tenantId ||
              item.tenant === tenantId
          );
          leaseItems = parseList(leasesRes.data).filter(
            (item) =>
              !tenantId ||
              item.tenant_detail?.id === tenantId ||
              item.tenant === tenantId
          );

          const activeLease = leaseItems
            .filter((item) => item.is_active)
            .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0];
          const pendingConsentScreening = parseList(screeningsRes.data).find(
            (screening) => screening.consent_status === "pending"
          );

          setCounts((prev) => ({
            ...prev,
            myPayments: paymentItems.length,
            myMaintenance: maintenanceItems.length,
            myLeaseInfo: leaseItems.filter((item) => item.is_active).length,
            pendingConsentScreening,
          }));
          setTenantAmountDue(activeLease ? Number(activeLease.monthly_rent || 0) : null);
        } else {
          const [propertiesRes, unitsRes, leasesRes, maintenanceRes, paymentsRes, tenantsRes] = await Promise.all([
            getProperties(),
            getUnits(),
            getLeases(),
            getMaintenanceRequests(),
            getPayments(),
            getTenants(),
          ]);
          leaseItems = parseList(leasesRes.data);
          maintenanceItems = parseList(maintenanceRes.data);
          paymentItems = parseList(paymentsRes.data);
          const units = parseList(unitsRes.data);
          const openMaintenance = maintenanceItems.filter(
            (item) => item.status !== "completed" && item.status !== "cancelled"
          ).length;
          const activeLeases = leaseItems.filter((item) => item.is_active).length;

          setCounts({
            properties: parseList(propertiesRes.data).length,
            units: units.length,
            tenants: parseList(tenantsRes.data).length,
            activeLeases,
            openMaintenance,
            myPayments: 0,
            myMaintenance: 0,
            myLeaseInfo: 0,
          });

          const occupiedUnits = units.filter((item) => !item.is_available).length;
          const vacantUnits = Math.max(units.length - occupiedUnits, 0);
          setOccupancyData([
            { name: "Occupied", value: occupiedUnits },
            { name: "Vacant", value: vacantUnits },
          ]);

          const statusCounts = {
            submitted: 0,
            in_progress: 0,
            completed: 0,
            cancelled: 0,
          };
          maintenanceItems.forEach((item) => {
            if (statusCounts[item.status] !== undefined) {
              statusCounts[item.status] += 1;
            }
          });
          setMaintenanceStatusData([
            { status: "Submitted", count: statusCounts.submitted },
            { status: "In Progress", count: statusCounts.in_progress },
            { status: "Completed", count: statusCounts.completed },
            { status: "Cancelled", count: statusCounts.cancelled },
          ]);

          const monthBuckets = new Map();
          const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
          const fullMonthFormatter = new Intl.DateTimeFormat("en-US", {
            month: "short",
            year: "numeric",
          });
          const now = new Date();
          const months = [];
          for (let i = 11; i >= 0; i -= 1) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            months.push({
              key,
              label: monthFormatter.format(d),
              fullLabel: fullMonthFormatter.format(d),
            });
            monthBuckets.set(key, 0);
          }

          paymentItems.forEach((payment) => {
            if (!payment.payment_date) {
              return;
            }
            const d = new Date(`${payment.payment_date}T00:00:00`);
            if (Number.isNaN(d.getTime())) {
              return;
            }
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            if (!monthBuckets.has(key)) {
              return;
            }
            const next = Number(monthBuckets.get(key) || 0) + Number(payment.amount || 0);
            monthBuckets.set(key, next);
          });

          setRevenueData(
            months.map((month) => ({
              month: month.label,
              fullMonth: month.fullLabel,
              total: Number(monthBuckets.get(month.key) || 0),
            }))
          );
          setTenantAmountDue(null);
        }
      } catch (err) {
        setError("Unable to load dashboard data.");
      }

      try {
        const applicationsRes = await getApplications();
        applicationItems = parseList(applicationsRes.data);
      } catch {
        applicationItems = [];
      }

      const nextSixtyDays = new Date();
      nextSixtyDays.setHours(0, 0, 0, 0);
      nextSixtyDays.setDate(nextSixtyDays.getDate() + 60);
      const expirations = leaseItems
        .filter((lease) => {
          if (!isLeaseActive(lease)) {
            return false;
          }
          const endDate = toDate(lease.end_date);
          const today = toDateOnly(new Date());
          if (!endDate || !today) {
            return false;
          }
          return endDate >= today && endDate <= nextSixtyDays;
        })
        .map((lease) => ({
          id: lease.id,
          tenantName: getTenantName(lease),
          location: getLeaseLocation(lease),
          daysRemaining: getDaysUntil(lease.end_date),
        }))
        .filter((entry) => entry.daysRemaining !== null)
        .sort((a, b) => a.daysRemaining - b.daysRemaining)
        .slice(0, 5);
      setUpcomingExpirations(expirations);

      try {
        const billsRes = await getBills();
        const bills = parseList(billsRes.data)
          .filter(isUnpaidBill)
          .map((bill) => {
            const dueDate = billDueDate(bill);
            return {
              id: bill.id,
              vendorName: getBillVendorName(bill),
              description: getBillDescription(bill),
              amountDue: billBalance(bill),
              dueDateText: dueDate
                ? dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "-",
              isOverdue: dueDate && dueDate.getTime() < Date.now(),
              dueDateValue: dueDate ? dueDate.getTime() : Number.MAX_SAFE_INTEGER,
            };
          })
          .filter((bill) => bill.amountDue > 0)
          .sort((a, b) => {
            if (a.dueDateValue === Number.MAX_SAFE_INTEGER && b.dueDateValue === Number.MAX_SAFE_INTEGER) {
              return 0;
            }
            if (a.dueDateValue === Number.MAX_SAFE_INTEGER) return 1;
            if (b.dueDateValue === Number.MAX_SAFE_INTEGER) return -1;
            return a.dueDateValue - b.dueDateValue;
          });
        setOutstandingBills(bills.slice(0, 5));
        setIsBillsAvailable(true);
      } catch (billError) {
        setOutstandingBills([]);
        setIsBillsAvailable(false);
      }

      const paymentActivity = parseList(paymentItems)
        .map((payment) => {
          const date = getPaymentDate(payment);
          if (!date) {
            return null;
          }
          return {
            id: `payment-${payment.id}`,
            date,
            dotColor: "#22c55e",
            text: `Payment of ${getPaymentAmount(payment).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })} received from ${getPaymentTenant(payment)}`,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.date - a.date)
        .slice(0, 4);

      const maintenanceActivity = parseList(maintenanceItems)
        .map((request) => {
          const date = getMaintenanceDate(request);
          if (!date) {
            return null;
          }
          const issue = getMaintenanceIssue(request);
          const unit = getMaintenanceUnit(request);
          return {
            id: `maintenance-${request.id}`,
            date,
            dotColor: "#f59e0b",
            text: `Maintenance request: ${issue}${unit ? ` (${unit})` : ""}`,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.date - a.date)
        .slice(0, 3);

      const applicationActivity = parseList(applicationItems)
        .map((application) => {
          const date = getApplicationDate(application);
          if (!date) {
            return null;
          }
          const unit = getApplicationUnit(application);
          return {
            id: `application-${application.id}`,
            date,
            dotColor: "#3b82f6",
            text: `New application from ${getApplicationApplicant(application)}${unit ? ` for ${unit}` : ""}`,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.date - a.date)
        .slice(0, 3);

      setRecentActivity(
        [...paymentActivity, ...maintenanceActivity, ...applicationActivity]
          .sort((a, b) => b.date - a.date)
          .slice(0, 8)
      );

      setLoading(false);
    };

    loadDashboard();
    fetchAgentData();
  }, [role, user?.tenant_id, user?.id]);

  const totalUnits = occupancyData.reduce((sum, item) => sum + item.value, 0);
  const occupiedUnits = occupancyData.find((item) => item.name === "Occupied")?.value || 0;
  const occupancyRate = totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const occupancySeries = occupancyData.map((entry) => ({
    ...entry,
    color:
      entry.name === "Occupied"
        ? theme.palette.primary.main
        : alpha(theme.palette.text.secondary, theme.palette.mode === "light" ? 0.22 : 0.2),
  }));
  const statusColorByLabel = {
    Submitted: theme.palette.info.main,
    "In Progress": theme.palette.warning.main,
    Completed: theme.palette.success.main,
    Cancelled: theme.palette.error.main,
  };
  const maintenanceSeries = maintenanceStatusData.map((entry) => ({
    ...entry,
    color: statusColorByLabel[entry.status] || theme.palette.text.secondary,
  }));

  const cards =
    role === "tenant"
      ? [
          {
            title: "My Payments",
            value: counts.myPayments,
            path: "/payments",
            icon: <PaymentIcon sx={{ color: theme.palette.primary.main, opacity: 0.7, fontSize: 18 }} />,
          },
          {
            title: "My Maintenance Requests",
            value: counts.myMaintenance,
            path: "/maintenance",
            icon: <BuildIcon sx={{ color: theme.palette.warning.main, opacity: 0.7, fontSize: 18 }} />,
          },
          {
            title: "My Lease Info",
            value: counts.myLeaseInfo,
            path: "/my-lease",
            icon: <AssignmentTurnedInIcon sx={{ color: theme.palette.success.main, opacity: 0.7, fontSize: 18 }} />,
          },
        ]
      : [
          {
            title: "Total Properties",
            value: counts.properties,
            icon: (
              <ApartmentIcon
                sx={{ color: theme.palette.primary.main, opacity: 0.7, fontSize: 18 }}
              />
            ),
          },
          {
            title: "Total Units",
            value: counts.units,
            icon: (
              <HomeWorkIcon sx={{ color: theme.palette.info.main, opacity: 0.7, fontSize: 18 }} />
            ),
          },
          {
            title: "Total Tenants",
            value: counts.tenants,
            icon: <PeopleIcon sx={{ color: theme.palette.primary.light, opacity: 0.7, fontSize: 18 }} />,
          },
          {
            title: "Active Leases",
            value: counts.activeLeases,
            icon: <AssignmentTurnedInIcon sx={{ color: theme.palette.success.main, opacity: 0.7, fontSize: 18 }} />,
          },
          {
            title: "Open Requests",
            value: counts.openMaintenance,
            icon: <BuildIcon sx={{ color: theme.palette.warning.main, opacity: 0.7, fontSize: 18 }} />,
          },
        ];
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const pendingCount = taskSummary?.pending_count ?? pendingTasks.length;
  const lastScanSource = taskSummary?.last_scan_at || taskSummary?.last_scanned_at || taskSummary?.last_run_at;
  const lastScanTime = lastScanSource ? formatAgentTimestamp(lastScanSource) : "Never";
  const filteredTasks = pendingTasks.filter((task) => {
    if (agentFilter === "All") return true;
    return (task.skill_type || "").toLowerCase() === agentFilter.toLowerCase();
  });

  const AgentMessage = ({ task, isLast }) => {
    const [expanded, setExpanded] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [executing, setExecuting] = useState(false);

    const skillConfig = {
      leasing: {
        icon: <PeopleOutlineIcon sx={{ fontSize: 18 }} />,
        color: "#3b82f6",
        name: "Leasing Agent",
        gradient: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
      },
      collections: {
        icon: <AttachMoneyIcon sx={{ fontSize: 18 }} />,
        color: "#ef4444",
        name: "Collections Agent",
        gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      },
      maintenance: {
        icon: <BuildIcon sx={{ fontSize: 18 }} />,
        color: "#f97316",
        name: "Maintenance Agent",
        gradient: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
      },
      bookkeeping: {
        icon: <AccountBalanceIcon sx={{ fontSize: 18 }} />,
        color: "#8b5cf6",
        name: "Bookkeeping Agent",
        gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
      },
      compliance: {
        icon: <VerifiedUserIcon sx={{ fontSize: 18 }} />,
        color: "#06b6d4",
        name: "Compliance Agent",
        gradient: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
      },
      rent_optimizer: {
        icon: <TrendingUpIcon sx={{ fontSize: 18 }} />,
        color: "#27ca40",
        name: "Rent Optimizer",
        gradient: "linear-gradient(135deg, #27ca40 0%, #16a34a 100%)",
      },
    };

    const config = skillConfig[task.skill_type] || {
      icon: <AutoAwesomeIcon sx={{ fontSize: 18 }} />,
      color: "#7C5CFC",
      name: "Agent",
      gradient: "linear-gradient(135deg, #7C5CFC 0%, #6B4FD8 100%)",
    };
    const priorityColors = { urgent: "#ef4444", high: "#f97316", medium: "#fbbf24", low: "#9ca3af" };

    const recommendation = (() => {
      if (!task.recommended_action) {
        return null;
      }
      try {
        return typeof task.recommended_action === "object" ? task.recommended_action : JSON.parse(task.recommended_action);
      } catch {
        return { text: task.recommended_action };
      }
    })();

    const handlePreview = async () => {
      if (previewData) {
        setExpanded((prev) => !prev);
        return;
      }
      setPreviewLoading(true);
      try {
        const res = await previewAgentTask(task.id);
        setPreviewData(res.data?.preview || res.data);
        setExpanded(true);
      } catch (err) {
        console.error(err);
      } finally {
        setPreviewLoading(false);
      }
    };

    const handleExecute = async () => {
      setExecuting(true);
      try {
        const res = await executeAgentTask(task.id);
        if (res.data?.success) {
          setSnackbar({ open: true, message: `Done: ${res.data.message}`, severity: "success" });
        } else {
          setSnackbar({
            open: true,
            message: `Warning: ${res.data?.message || "Execution failed"}`,
            severity: "warning",
          });
        }
        await fetchAgentData();
      } catch (err) {
        setSnackbar({ open: true, message: "Failed to execute", severity: "error" });
      } finally {
        setExecuting(false);
      }
    };

    const handleDismissMessage = async () => {
      try {
        await dismissAgentTask(task.id, {});
        await fetchAgentData();
      } catch (err) {
        console.error(err);
      }
    };

    return (
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: isLast ? 0 : 0,
          pb: isLast ? 0 : 2.5,
          borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            flexShrink: 0,
            background: config.gradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mt: 0.5,
          }}
        >
          {React.cloneElement(config.icon, { sx: { fontSize: 18, color: "#fff" } })}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: config.color }}>
              {config.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.2)", fontSize: "0.65rem" }}>
              {getRelativeTime(task.created_at)}
            </Typography>
            <Chip
              label={task.priority}
              size="small"
              sx={{
                height: 16,
                fontSize: "0.55rem",
                fontWeight: 700,
                backgroundColor: `${priorityColors[task.priority] || priorityColors.low}15`,
                color: priorityColors[task.priority] || priorityColors.low,
              }}
            />
          </Box>

          <Typography variant="body2" sx={{ color: "#fff", lineHeight: 1.5, mb: 0.5 }}>
            {task.title}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "rgba(255,255,255,0.4)", lineHeight: 1.5, display: "block", mb: 1 }}
          >
            {task.description}
          </Typography>

          {recommendation ? (
            <Box
              sx={{
                p: 1.5,
                borderRadius: "8px",
                mb: 1.5,
                backgroundColor: "rgba(124,92,252,0.05)",
                borderLeft: "3px solid rgba(124,92,252,0.3)",
              }}
            >
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                {recommendation.text ||
                  recommendation.reasoning ||
                  (recommendation.subject ? `ðŸ“§ Draft: "${recommendation.subject}"` : "") ||
                  (recommendation.recommended_vendor_name
                    ? `ðŸ”§ Suggested vendor: ${recommendation.recommended_vendor_name}`
                    : "") ||
                  (recommendation.suggested_new_rent
                    ? `ðŸ’° Suggested rent: $${recommendation.suggested_new_rent}/mo`
                    : "") ||
                  (recommendation.suggested_account_name
                    ? `ðŸ“‚ Categorize as: ${recommendation.suggested_account_name}`
                    : "")}
              </Typography>
            </Box>
          ) : null}

          {expanded && previewData ? (
            <Box
              sx={{
                p: 2,
                borderRadius: "10px",
                mb: 1.5,
                backgroundColor: "rgba(39,202,64,0.04)",
                border: "1px solid rgba(39,202,64,0.1)",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "#27ca40",
                  fontWeight: 700,
                  mb: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 14 }} /> Here's what I'll do:
              </Typography>

              {previewData.subject ? (
                <Box sx={{ mb: 1.5 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: "8px",
                      backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)", display: "block", mb: 0.5 }}>
                      Subject: <span style={{ color: "rgba(255,255,255,0.7)" }}>{previewData.subject}</span>
                    </Typography>
                    <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.04)", pt: 1, mt: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "rgba(255,255,255,0.6)",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.7,
                          fontSize: "0.8rem",
                        }}
                      >
                        {previewData.body}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : null}

              {previewData.recommended_vendor_name ? (
                <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
                  <Box sx={{ flex: 1, p: 1.5, borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.03)" }}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)" }}>
                      Vendor
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                      {previewData.recommended_vendor_name}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: 1.5, borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.03)" }}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)" }}>
                      Est. Cost
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                      ${previewData.estimated_cost_low} - ${previewData.estimated_cost_high}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: 1.5, borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.03)" }}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)" }}>
                      Timeline
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                      {previewData.timeline}
                    </Typography>
                  </Box>
                </Box>
              ) : null}

              {previewData.suggested_new_rent ? (
                <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
                  <Box sx={{ flex: 1, p: 1.5, borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.03)" }}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)" }}>
                      New Rent
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#27ca40", fontWeight: 700 }}>
                      ${previewData.suggested_new_rent}/mo
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: 1.5, borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.03)" }}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)" }}>
                      Increase
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                      {previewData.rent_increase_pct}%
                    </Typography>
                  </Box>
                </Box>
              ) : null}

              {previewData.suggested_account_name ? (
                <Box sx={{ p: 1.5, borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.03)", mb: 1 }}>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)" }}>
                    Categorize as
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                    {previewData.suggested_account_name}
                  </Typography>
                </Box>
              ) : null}

              {previewData.reasoning ? (
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic", display: "block", mt: 1 }}
                >
                  {previewData.reasoning}
                </Typography>
              ) : null}
            </Box>
          ) : null}

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={handlePreview}
              disabled={previewLoading}
              sx={{
                textTransform: "none",
                fontSize: "0.7rem",
                borderRadius: "6px",
                py: 0.3,
                px: 1.5,
                borderColor: "rgba(124,92,252,0.2)",
                color: "#7C5CFC",
                "&:hover": { borderColor: "rgba(124,92,252,0.4)", backgroundColor: "rgba(124,92,252,0.05)" },
              }}
            >
              {previewLoading ? "..." : expanded ? "Hide Details" : "Show Me"}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleExecute}
              disabled={executing}
              sx={{
                textTransform: "none",
                fontSize: "0.7rem",
                borderRadius: "6px",
                py: 0.3,
                px: 1.5,
                backgroundColor: "#27ca40",
                "&:hover": { backgroundColor: "#1fa834" },
              }}
            >
              {executing ? "Executing..." : "Approve & Run"}
            </Button>
            <Button
              size="small"
              onClick={handleDismissMessage}
              sx={{
                textTransform: "none",
                fontSize: "0.7rem",
                py: 0.3,
                px: 1.5,
                color: "rgba(255,255,255,0.25)",
                "&:hover": { color: "rgba(255,255,255,0.5)" },
              }}
            >
              Skip
            </Button>
          </Box>
        </Box>
      </Box>
    );
  };

  const handleAgentCommand = async () => {
    const command = agentInput.trim().toLowerCase();
    if (!command) {
      return;
    }
    setAgentInput("");

    if (command.includes("approve all") || command.includes("run all")) {
      setSnackbar({ open: true, message: "Executing all pending tasks...", severity: "info" });
      for (const task of pendingTasks) {
        try {
          await executeAgentTask(task.id);
        } catch (err) {
          console.error(err);
        }
      }
      await fetchAgentData();
      setSnackbar({ open: true, message: "All tasks executed", severity: "success" });
    } else if (command.includes("dismiss all") || command.includes("clear")) {
      for (const task of pendingTasks) {
        try {
          await dismissAgentTask(task.id, {});
        } catch (err) {
          console.error(err);
        }
      }
      await fetchAgentData();
      setSnackbar({ open: true, message: "All tasks dismissed", severity: "success" });
    } else if (command.includes("scan") || command.includes("run") || command.includes("check")) {
      let skillsToRun = agentSkills.filter((s) => s.status === "active");
      if (command.includes("collection") || command.includes("overdue") || command.includes("rent")) {
        skillsToRun = agentSkills.filter((s) => s.skill_type === "collections");
      } else if (command.includes("leas") || command.includes("expir") || command.includes("renew")) {
        skillsToRun = agentSkills.filter((s) => s.skill_type === "compliance");
      } else if (command.includes("maintenance") || command.includes("repair") || command.includes("vendor")) {
        skillsToRun = agentSkills.filter((s) => s.skill_type === "maintenance");
      } else if (command.includes("lead") || command.includes("follow") || command.includes("prospect")) {
        skillsToRun = agentSkills.filter((s) => s.skill_type === "leasing");
      } else if (command.includes("book") || command.includes("categoriz") || command.includes("bill")) {
        skillsToRun = agentSkills.filter((s) => s.skill_type === "bookkeeping");
      }

      setSnackbar({ open: true, message: `Running ${skillsToRun.length} agent(s)...`, severity: "info" });
      for (const skill of skillsToRun) {
        try {
          await runAgentSkill(skill.id);
        } catch (err) {
          console.error(err);
        }
      }
      await fetchAgentData();
      setSnackbar({ open: true, message: "Scan complete - check results above", severity: "success" });
    } else {
      setSnackbar({
        open: true,
        message: 'Try: "scan for overdue rent", "check expiring leases", "run all agents", "approve all"',
        severity: "info",
      });
    }
  };


  const handleApproveAndExecute = async (taskId) => {
    try {
      const res = await executeAgentTask(taskId);
      const result = res.data;
      setSnackbar({
        open: true,
        message: result?.success ? `✅ ${result?.message}` : `⚠️ ${result?.message}`,
        severity: result?.success ? "success" : "warning",
      });
      await fetchAgentData();
    } catch (err) {
      if (err?.response?.status === 404) {
        setIsAgentAvailable(false);
        setAgentSkills([]);
        setPendingTasks([]);
        setTaskSummary({});
        setSnackbar({ open: true, message: "Error running agents", severity: "error" });
      } else {
        console.error(err);
        setSnackbar({ open: true, message: "Failed to execute task", severity: "error" });
      }
    }
  };

  const handleDismiss = async (taskId) => {
    try {
      await dismissAgentTask(taskId, {});
      await fetchAgentData();
    } catch (err) {
      if (err?.response?.status === 404) {
        setIsAgentAvailable(false);
        setAgentSkills([]);
        setPendingTasks([]);
        setTaskSummary({});
      } else {
        console.error(err);
      }
    }
  };

  const handleToggleSkill = async (skillId) => {
    try {
      await toggleAgentSkill(skillId);
      await fetchAgentData();
    } catch (err) {
      if (err?.response?.status === 404) {
        setIsAgentAvailable(false);
        setAgentSkills([]);
        setPendingTasks([]);
        setTaskSummary({});
      } else {
        console.error(err);
      }
    }
  };

  const handleRunAllAgents = async () => {
    if (agentsRunning) {
      return;
    }
    setAgentsRunning(true);
    try {
      for (const skill of agentSkills.filter((s) => s.status === "active")) {
        await runAgentSkill(skill.id);
      }
      await fetchAgentData();
      setSnackbar({ open: true, message: "All agents scanned — new tasks generated", severity: "success" });
    } catch (err) {
      if (err?.response?.status === 404) {
        setIsAgentAvailable(false);
        setAgentSkills([]);
        setPendingTasks([]);
        setTaskSummary({});
        setSnackbar({ open: true, message: "Error running agents", severity: "error" });
      } else {
        console.error(err);
        setSnackbar({ open: true, message: "Error running agents", severity: "error" });
      }
    } finally {
      setAgentsRunning(false);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box
      sx={{
        "@keyframes dashboardFadeIn": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        animation: "dashboardFadeIn 0.35s ease",
      }}
    >
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} onClose={handleCloseSnackbar} variant="filled" sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: "text.primary", letterSpacing: "-0.01em" }}>
        Welcome back, {user?.first_name || user?.username || "User"}
      </Typography>
      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
        {user?.organization?.name || "No workspace"}
      </Typography>
      <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 2 }}>
        {today}
      </Typography>
      {role === "tenant" && counts.pendingConsentScreening?.id ? (
        <Paper
          sx={{
            mb: 1.5,
            p: 1.1,
            border: `1px solid ${theme.palette.warning.main}`,
            backgroundColor: `${theme.palette.warning.main}12`,
          }}
        >
          <Typography sx={{ fontSize: 13, color: "text.primary", mb: 0.2 }}>
            You have a pending screening request.
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            <Link to={`/screening/consent/${counts.pendingConsentScreening.consent_token}`}>
              Review and authorize
            </Link>
          </Typography>
        </Paper>
      ) : null}
      {isAgentAvailable ? (
        <Box
          sx={{
            backgroundColor: "rgba(124,92,252,0.04)",
            border: "1px solid rgba(124,92,252,0.12)",
            borderRadius: "20px",
            p: 3,
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #7C5CFC 0%, #6B4FD8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AutoAwesomeIcon sx={{ color: "#fff", fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#fff" }}>
                  AI Agent Command Center
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                  {pendingCount} items awaiting your review · Last scan: {lastScanTime}
                </Typography>
              </Box>
            </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={agentsRunning ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />}
                onClick={handleRunAllAgents}
                disabled={agentsRunning || !agentSkills.length}
                sx={{
                  textTransform: "none",
                  borderColor: "rgba(124,92,252,0.3)",
                  color: "#7C5CFC",
                  borderRadius: "8px",
                }}
              >
                {agentsRunning ? "Scanning..." : "Run All Agents"}
              </Button>
            </Box>

          <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 1 }}>
            {agentSkills.map((skill) => (
              <AgentSkillCard key={skill.id} skill={skill} onToggle={handleToggleSkill} />
            ))}
          </Box>
        </Box>
      ) : null}
      {loading ? <Typography sx={{ mb: 2 }}>Loading...</Typography> : null}
      {error ? (
        <Typography sx={{ mb: 2, color: "error.main" }}>{error}</Typography>
      ) : null}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 1.5,
        }}
      >
        {role === "tenant" ? (
          <Card
            component={Link}
            to="/pay-rent"
            sx={{
              gridColumn: { xs: "1 / -1", md: "1 / -1" },
              bgcolor: alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.05 : 0.07),
              borderColor: alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.28 : 0.33),
              textDecoration: "none",
              "&:hover": {
                borderColor: alpha(theme.palette.success.main, 0.55),
                backgroundColor: alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.1 : 0.12),
              },
            }}
          >
            <CardContent sx={{ p: 1.8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Pay Rent
                </Typography>
                <Typography sx={{ fontSize: 20, lineHeight: 1.2, fontWeight: 600, color: "text.primary" }}>
                  {tenantAmountDue !== null
                    ? Number(tenantAmountDue).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })
                    : "No amount due"}
                </Typography>
                <Typography sx={{ mt: 0.2, fontSize: 12, color: "text.secondary" }}>
                  Pay securely online with card
                </Typography>
              </Box>
              <CreditCardIcon sx={{ color: theme.palette.success.main, fontSize: 22 }} />
            </CardContent>
          </Card>
        ) : null}
        {cards.map((card) => (
          <Card
            key={card.title}
            component={card.path ? Link : "div"}
            to={card.path || undefined}
            sx={{
              bgcolor: "background.paper",
              textDecoration: "none",
              cursor: card.path ? "pointer" : "default",
              "&:hover": card.path
                ? { borderColor: "primary.main", backgroundColor: "action.hover" }
                : undefined,
            }}
          >
            <CardContent sx={{ p: 1.8 }}>
              <Box sx={{ mb: 1 }}>{card.icon}</Box>
              <Typography sx={{ fontSize: 24, lineHeight: 1.1, fontWeight: 600, color: "text.primary" }}>
                {card.value}
              </Typography>
              <Typography sx={{ mt: 0.6, fontSize: 12, color: "text.secondary" }}>
                {card.title}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      {role === "landlord" ? (
        <>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
            <Button
              component={Link}
              to="/payments"
              size="small"
              variant="outlined"
              startIcon={<AttachMoneyIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                borderColor: "rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
                "&:hover": {
                  borderColor: "rgba(124,92,252,0.3)",
                  color: "#7C5CFC",
                },
              }}
            >
              Record Payment
            </Button>
            <Button
              component={Link}
              to="/bills"
              size="small"
              variant="outlined"
              startIcon={<ReceiptIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                borderColor: "rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
                "&:hover": {
                  borderColor: "rgba(124,92,252,0.3)",
                  color: "#7C5CFC",
                },
              }}
            >
              New Bill
            </Button>
            <Button
              component={Link}
              to="/tenants"
              size="small"
              variant="outlined"
              startIcon={<PersonAddIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                borderColor: "rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
                "&:hover": {
                  borderColor: "rgba(124,92,252,0.3)",
                  color: "#7C5CFC",
                },
              }}
            >
              Add Tenant
            </Button>
            <Button
              component={Link}
              to="/maintenance"
              size="small"
              variant="outlined"
              startIcon={<BuildIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                borderColor: "rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
                "&:hover": {
                  borderColor: "rgba(124,92,252,0.3)",
                  color: "#7C5CFC",
                },
              }}
            >
              New Maintenance Request
            </Button>
            <Button
              component={Link}
              to="/accounting"
              size="small"
              variant="outlined"
              startIcon={<AssessmentIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                borderColor: "rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
                "&:hover": {
                  borderColor: "rgba(124,92,252,0.3)",
                  color: "#7C5CFC",
                },
              }}
            >
              View Reports
            </Button>
          </Box>
          {isAgentAvailable ? (
            <Box
              sx={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "16px",
                overflow: "hidden",
                mb: 3,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  px: 3,
                  py: 2,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#fff" }}>
                    Agent Feed
                  </Typography>
                  {pendingTasks.length > 0 && (
                    <Chip
                      label={`${pendingTasks.length} awaiting review`}
                      size="small"
                      sx={{
                        backgroundColor: "rgba(124,92,252,0.15)",
                        color: "#7C5CFC",
                        fontWeight: 600,
                        height: 22,
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {["All", "Collections", "Leasing", "Maintenance", "Bookkeeping", "Compliance"].map((filter) => (
                    <Chip
                      key={filter}
                      label={filter}
                      size="small"
                      onClick={() => setAgentFilter(filter)}
                      sx={{
                        backgroundColor: agentFilter === filter ? "rgba(124,92,252,0.15)" : "transparent",
                        color: agentFilter === filter ? "#7C5CFC" : "rgba(255,255,255,0.3)",
                        border: `1px solid ${agentFilter === filter ? "rgba(124,92,252,0.3)" : "rgba(255,255,255,0.06)"}`,
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.7rem",
                        height: 24,
                        "&:hover": { backgroundColor: "rgba(124,92,252,0.1)" },
                      }}
                    />
                  ))}
                </Box>
              </Box>
              <Box sx={{ maxHeight: 500, overflowY: "auto", px: 3, py: 2 }}>
                {filteredTasks.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 6 }}>
                    <AutoAwesomeIcon sx={{ fontSize: 40, color: "rgba(255,255,255,0.06)", mb: 1 }} />
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.2)" }}>
                      All clear - no items need your attention
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.1)" }}>
                      Agents will post here when they find something
                    </Typography>
                  </Box>
                ) : (
                  filteredTasks.map((task, index) => (
                    <AgentMessage key={task.id || index} task={task} isLast={index === filteredTasks.length - 1} />
                  ))
                )}
              </Box>
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  gap: 1.5,
                  alignItems: "center",
                }}
              >
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Ask your agents anything... (e.g. 'scan for overdue rent', 'check expiring leases')"
                  value={agentInput}
                  onChange={(e) => setAgentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAgentCommand();
                    }
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      backgroundColor: "rgba(255,255,255,0.03)",
                      "& fieldset": { borderColor: "rgba(255,255,255,0.06)" },
                      "&:hover fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                      "&.Mui-focused fieldset": { borderColor: "rgba(124,92,252,0.3)" },
                    },
                    "& .MuiInputBase-input": { color: "#fff", fontSize: "0.85rem" },
                    "& .MuiInputBase-input::placeholder": { color: "rgba(255,255,255,0.2)" },
                  }}
                  InputProps={{
                    startAdornment: <AutoAwesomeIcon sx={{ color: "rgba(124,92,252,0.4)", fontSize: 18, mr: 1 }} />,
                  }}
                />
                <IconButton
                  onClick={handleAgentCommand}
                  disabled={!agentInput.trim()}
                  sx={{
                    backgroundColor: agentInput.trim() ? "#7C5CFC" : "rgba(255,255,255,0.05)",
                    color: agentInput.trim() ? "#fff" : "rgba(255,255,255,0.2)",
                    borderRadius: "10px",
                    width: 40,
                    height: 40,
                    "&:hover": { backgroundColor: agentInput.trim() ? "#6B4FD8" : "rgba(255,255,255,0.08)" },
                  }}
                >
                  <SendIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>
          ) : null}
          <Paper sx={makeCardStyle({ p: 2 })}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary", mb: 0.3 }}>
              Revenue Overview
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.5 }}>
              Monthly payment totals for the last 12 months
            </Typography>
            {revenueData.some((item) => item.total > 0) ? (
              <Box sx={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <LineChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                      axisLine={{ stroke: theme.palette.divider }}
                      tickLine={false}
                    />
                    <CartesianGrid
                      stroke={theme.palette.divider}
                      strokeOpacity={theme.palette.mode === "light" ? 0.5 : 0.25}
                      vertical={false}
                    />
                    <YAxis
                      tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                      axisLine={{ stroke: theme.palette.divider }}
                      tickLine={false}
                      width={60}
                      tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                        color: "text.primary",
                        fontSize: 12,
                      }}
                      formatter={(value) => [
                        Number(value || 0).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        }),
                        "Revenue",
                      ]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullMonth || ""}
                    />
                    <Area type="monotone" dataKey="total" stroke="none" fill="url(#revenueFill)" />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke={theme.palette.primary.main}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Typography sx={{ fontSize: 12, color: "text.secondary", py: 4 }}>
                No payment data available yet.
              </Typography>
            )}
          </Paper>

          <Box sx={{ display: "flex", gap: 3, mb: 3, flexDirection: { xs: "column", md: "row" } }}>
            <Box sx={makeCardStyle({ p: 3, flex: 1 })}>
              <Typography sx={{ fontSize: "1.05rem", color: "#fff", fontWeight: 600 }}>
                Upcoming Expirations
              </Typography>
              <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.6)", mt: 0.6, mb: 1.5 }}>
                Leases expiring in the next 60 days
              </Typography>
              {upcomingExpirations.length ? (
                <>
                  {upcomingExpirations.map((lease) => (
                    <Box
                      key={lease.id}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        py: 1.5,
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 600, color: "#fff" }}>{lease.tenantName}</Typography>
                        <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                          {lease.location}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          color: lease.daysRemaining < 30 ? "#ef4444" : "#f59e0b",
                          fontSize: 12,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Expires in {lease.daysRemaining} days
                      </Typography>
                    </Box>
                  ))}
                </>
              ) : (
                <Typography
                  sx={{ display: "flex", alignItems: "center", gap: 1, color: "rgba(255,255,255,0.6)" }}
                >
                  <CheckCircleIcon sx={{ color: "#22c55e", fontSize: 18 }} />
                  No leases expiring soon
                </Typography>
              )}
              <Typography
                component={Link}
                to="/leases"
                variant="caption"
                sx={{ mt: 1.5, display: "inline-flex", color: "#7C5CFC", textDecoration: "none" }}
              >
                View All Leases →
              </Typography>
            </Box>

            <Box sx={makeCardStyle({ p: 3, flex: 1 })}>
              <Typography sx={{ fontSize: "1.05rem", color: "#fff", fontWeight: 600 }}>
                Outstanding Bills
              </Typography>
              <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.6)", mt: 0.6, mb: 1.5 }}>
                Unpaid vendor bills
              </Typography>
              {isBillsAvailable ? (
                <>
                  {outstandingBills.length ? (
                    <>
                      {outstandingBills.map((bill) => (
                        <Box
                          key={bill.id}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            py: 1.5,
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 600, color: "#fff" }}>{bill.vendorName}</Typography>
                            <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                              {bill.description}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography sx={{ fontSize: 13, color: "#ef4444", fontWeight: 600 }}>
                              {bill.amountDue.toLocaleString("en-US", {
                                style: "currency",
                                currency: "USD",
                              })}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.6)", mt: 0.2 }}>
                              Due {bill.dueDateText}
                            </Typography>
                            {bill.isOverdue ? (
                              <Chip
                                size="small"
                                label="Overdue"
                                sx={{
                                  mt: 0.6,
                                  backgroundColor: "rgba(239,68,68,0.16)",
                                  color: "#ef4444",
                                  border: "1px solid rgba(239,68,68,0.38)",
                                  height: 20,
                                }}
                              />
                            ) : null}
                          </Box>
                        </Box>
                      ))}
                    </>
                  ) : (
                    <Typography
                      sx={{ display: "flex", alignItems: "center", gap: 1, color: "rgba(255,255,255,0.6)" }}
                    >
                      <CheckCircleIcon sx={{ color: "#22c55e", fontSize: 18 }} />
                      All bills paid
                    </Typography>
                  )}
                </>
              ) : (
                <Typography sx={{ color: "rgba(255,255,255,0.6)" }}>Bills module coming soon</Typography>
              )}
              <Typography
                component={Link}
                to="/bills"
                variant="caption"
                sx={{ mt: 1.5, display: "inline-flex", color: "#7C5CFC", textDecoration: "none" }}
              >
                View All Bills → 
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", md: "row" } }}>
            <Paper sx={makeCardStyle({ p: 2, flex: 1 })}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary", mb: 0.3 }}>
                Occupancy Rate
              </Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.5 }}>
                Occupied vs vacant units
              </Typography>
              <Box sx={{ width: "100%", height: 240, position: "relative" }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={occupancySeries}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={88}
                      stroke="none"
                      paddingAngle={2}
                    >
                      {occupancySeries.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                        color: "text.primary",
                        fontSize: 12,
                      }}
                      formatter={(value) => [value, "Units"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    pointerEvents: "none",
                  }}
                >
                  <Typography sx={{ fontSize: 24, fontWeight: 600, color: "text.primary" }}>
                    {occupancyRate}%
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                    Occupied
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Paper sx={makeCardStyle({ p: 2, flex: 1 })}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary", mb: 0.3 }}>
                Maintenance Overview
              </Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.5 }}>
                Request volume by status
              </Typography>
              <Box sx={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={maintenanceStatusData} layout="vertical">
                    <XAxis
                      type="number"
                      tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                      axisLine={{ stroke: theme.palette.divider }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="status"
                      tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={80}
                    />
                    <CartesianGrid
                      stroke={theme.palette.divider}
                      strokeOpacity={theme.palette.mode === "light" ? 0.4 : 0.25}
                      horizontal={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                        color: "text.primary",
                        fontSize: 12,
                      }}
                      formatter={(value) => [value, "Requests"]}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {maintenanceSeries.map((entry) => (
                        <Cell key={entry.status} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Box>
        </>
      ) : null}

      <Paper sx={makeCardStyle({ p: 3, mt: 3 })}>
        <Typography sx={{ fontSize: 17, fontWeight: 600, mb: 1.2 }} variant="subtitle1">
          Recent Activity
        </Typography>
        {recentActivity.length ? (
          <>
            {recentActivity.map((activity) => (
              <Box
                key={activity.id}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                  py: 1.5,
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                  <Box
                    sx={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      backgroundColor: activity.dotColor,
                      flexShrink: 0,
                    }}
                  />
                  <Typography sx={{ color: "#fff", fontSize: 13 }}>{activity.text}</Typography>
                </Box>
                <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: 12, whiteSpace: "nowrap" }}>
                  {getRelativeTime(activity.date)}
                </Typography>
              </Box>
            ))}
          </>
        ) : (
          <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
            No recent activity
          </Typography>
        )}
      </Paper>
    </Box>
  );
}

export default Dashboard;













