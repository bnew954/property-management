import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import Add from "@mui/icons-material/Add";
import CalendarMonth from "@mui/icons-material/CalendarMonth";
import Call from "@mui/icons-material/Call";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Close from "@mui/icons-material/Close";
import Email from "@mui/icons-material/Email";
import Edit from "@mui/icons-material/Edit";
import Info from "@mui/icons-material/Info";
import MoreVert from "@mui/icons-material/MoreVert";
import PeopleOutline from "@mui/icons-material/PeopleOutline";
import Search from "@mui/icons-material/Search";
import Save from "@mui/icons-material/Save";
import Visibility from "@mui/icons-material/Visibility";
import ViewKanban from "@mui/icons-material/ViewKanban";
import ViewList from "@mui/icons-material/ViewList";
import {
  addLeadActivity,
  completeTour,
  convertLeadToApplication,
  createLead,
  getLead,
  getLeadSummary,
  getLeads,
  getProperties,
  getUnits,
  markLeadLost,
  scheduleTour,
  updateLead,
} from "../services/api";

const ACCENT = "#7C5CFC";
const MUTED = "rgba(255,255,255,0.5)";
const PIPELINE_STEPS = [
  { key: "new", label: "New", color: "#3b82f6" },
  { key: "contacted", label: "Contacted", color: "#8b5cf6" },
  { key: "tour_scheduled", label: "Tour Scheduled", color: "#fbbf24" },
  { key: "tour_completed", label: "Tour Completed", color: "#f97316" },
  { key: "applied", label: "Applied", color: "#06b6d4" },
  { key: "leased", label: "Leased", color: "#27ca40" },
];
const PROGRESS_STEPS = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "tour", label: "Tour" },
  { key: "applied", label: "Applied" },
  { key: "leased", label: "Leased" },
];
const STAGE_ORDER = ["new", "contacted", "tour_scheduled", "tour_completed", "applied", "leased"];
const SOURCE_LABELS = {
  listing: "Listing",
  zillow: "Zillow",
  referral: "Referral",
  phone: "Phone",
  "walk-in": "Walk-In",
  website: "Website",
  social: "Social",
  other: "Other",
};
const PRIORITY_LABELS = { hot: "Hot", warm: "Warm", cold: "Cold" };
const DEFAULT_SOURCES = Object.keys(SOURCE_LABELS);
const REASONS = [
  "Found another apartment",
  "Budget too high",
  "Bad credit",
  "Changed plans",
  "Unresponsive",
  "Other",
];

const parseList = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const normalize = (value) => (typeof value === "string" ? value.toLowerCase().trim() : `${value || ""}`);
const titleCase = (value = "") =>
  normalize(value)
    .split(" ")
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
const toTitle = (value = "") =>
  normalize(value)
    .split("_")
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
const toId = (value) => (value === null || value === undefined ? "" : `${value}`);

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const formatRelative = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const delta = Math.max(0, Date.now() - parsed.getTime());
  const mins = Math.floor(delta / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
};

const toLocalDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const offset = parsed.getTimezoneOffset();
  return new Date(parsed.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const toLocalDateTime = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const offset = parsed.getTimezoneOffset();
  return new Date(parsed.getTime() - offset * 60000).toISOString().slice(0, 16);
};

const toIso = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
};

const currency = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    Math.max(0, Number(value || 0))
  );

const getLeadName = (lead = {}) => {
  const full = `${lead.first_name || ""} ${lead.last_name || ""}`.trim();
  if (full) return full;
  return lead.full_name || `Lead #${lead.id || ""}`;
};

const getLeadPropertyId = (lead = {}) => {
  if (lead.property_id) return toId(lead.property_id);
  if (lead.property?.id) return toId(lead.property.id);
  if (lead.property_detail?.id) return toId(lead.property_detail.id);
  return "";
};

const getLeadUnitId = (lead = {}) => {
  if (lead.unit_id) return toId(lead.unit_id);
  if (lead.unit?.id) return toId(lead.unit.id);
  if (lead.unit_detail?.id) return toId(lead.unit_detail.id);
  return "";
};

const getLeadPropertyName = (lead = {}) => {
  if (lead.property_name) return lead.property_name;
  if (lead.property?.name) return lead.property.name;
  if (lead.property_detail?.name) return lead.property_detail.name;
  return "";
};

const getLeadUnitName = (lead = {}) => {
  if (lead.unit_number) return `Unit ${lead.unit_number}`;
  if (lead.unit?.unit_number) return `Unit ${lead.unit.unit_number}`;
  if (lead.unit_detail?.unit_number) return `Unit ${lead.unit_detail.unit_number}`;
  return "";
};

const sourceLabel = (source = "") => {
  const normalized = normalize(source);
  if (!normalized) return "Other";
  return SOURCE_LABELS[normalized] || titleCase(normalized);
};

const getPriorityColor = (priority = "cold") => {
  const normalized = normalize(priority);
  if (normalized === "hot") return { backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" };
  if (normalized === "warm") return { backgroundColor: "rgba(251,191,36,0.15)", color: "#fbbf24" };
  return { backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6" };
};

const getStageColor = (stage = "new") => {
  const bucket = PIPELINE_STEPS.find((item) => item.key === normalize(stage));
  const color = bucket?.color || "#6b7280";
  return {
    backgroundColor: `${color}25`,
    color,
    border: `1px solid ${color}66`,
    textTransform: "capitalize",
    fontWeight: 700,
    fontSize: "0.65rem",
    height: 20,
  };
};

const stageChipStyles = (stage = "new") => getStageColor(stage);

const parseActivities = (lead = null) => {
  if (!lead) return [];
  const entries = Array.isArray(lead)
    ? lead
    : lead.activities || lead.activity_log || lead.lead_activities || [];
  if (!Array.isArray(entries)) return [];
  return parseList({ data: entries }).map((entry = {}, index) => {
    const type = normalize(entry.type || entry.activity_type || entry.action || "note");
    return {
      ...entry,
      id: entry.id || `activity-${index}`,
      type,
      description: entry.description || entry.note || entry.notes || entry.body || entry.subject || "",
      title: entry.title || "",
      label: titleCase(type),
      timestamp: entry.timestamp || entry.created_at || entry.occurred_at || entry.date,
    };
  }).sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
};

const getActivityColor = (type = "note") => {
  const map = {
    email: "#3b82f6",
    call: "#22c55e",
    tour: "#fbbf24",
    stage_change: "#8b5cf6",
  };
  return map[normalize(type)] || "#94a3b8";
};

const getUnitsByProperty = (propertyId, units = []) =>
  units.filter((unit) => {
    const candidate = unit.property?.id || unit.property_id || unit.property?.property_id || unit.property;
    return toId(candidate) === toId(propertyId);
  });

const getApplicationRef = (lead = {}) => {
  if (lead.application && typeof lead.application === "object") return lead.application;
  if (lead.application_id) return { id: lead.application_id };
  return null;
};

const getTenantRef = (lead = {}) => {
  if (lead.tenant && typeof lead.tenant === "object") return lead.tenant;
  if (lead.tenant_id) return { id: lead.tenant_id };
  return null;
};

const getConversionHistory = (lead = null) => {
  if (!lead) return [];
  const history = lead.stage_history || lead.timeline;
  if (!Array.isArray(history) || !history.length) {
    return [
      { label: "New", date: lead.created_at },
      { label: "Contacted", date: lead.contacted_at },
      { label: "Tour Scheduled", date: lead.tour_scheduled_at || lead.tour_date },
      { label: "Tour Completed", date: lead.tour_completed_at },
      { label: "Applied", date: lead.applied_at },
      { label: "Leased", date: lead.leased_at },
    ].filter((entry) => entry.date);
  }

  return history
    .map((entry) => ({
      label: toTitle(entry?.stage || entry?.status || ""),
      date: entry?.timestamp || entry?.changed_at || entry?.created_at || entry?.date,
    }))
    .filter((entry) => entry.label && entry.date);
};

const stageIndex = (stage = "new") => {
  const normalized = normalize(stage);
  if (normalized === "new") return 0;
  if (normalized === "contacted") return 1;
  if (normalized === "tour_scheduled" || normalized === "tour_completed") return 2;
  if (normalized === "applied") return 3;
  if (normalized === "leased") return 4;
  return -1;
};

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ mt: 1.5 }}>{children}</Box>;
}

function StatCard({ label, value, Icon, color, children }) {
  return (
    <Card
      sx={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 3,
        p: 2,
        minWidth: 150,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        color: "#fff",
      }}
    >
      <Box sx={{ color, mb: 1 }}>{Icon ? <Icon sx={{ fontSize: 20 }} /> : null}</Box>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: MUTED }}>
        {label}
      </Typography>
      {children}
    </Card>
  );
}

function LeadCard({ lead, onClick }) {
  const source = normalize(lead.source || lead.source_name || "other");
  return (
    <Box
      onClick={() => onClick(lead)}
      sx={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "12px",
        p: 2,
        cursor: "pointer",
        "&:hover": { border: "1px solid rgba(124,92,252,0.2)" },
        transition: "all 0.15s",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#fff" }}>
          {getLeadName(lead)}
        </Typography>
        <Chip
          label={titleCase(lead.priority || "cold")}
          size="small"
          sx={{
            height: 18,
            fontSize: "0.6rem",
            fontWeight: 700,
            ...getPriorityColor(lead.priority),
          }}
        />
      </Box>
      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
        {getLeadPropertyName(lead) || "General inquiry"}
        {getLeadUnitName(lead) ? ` · ${getLeadUnitName(lead)}` : ""}
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1.5 }}>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)" }}>
          {sourceLabel(source)}
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)" }}>
          {lead.days_in_pipeline || 0}d ago
        </Typography>
      </Box>
      {lead.tour_date && normalize(lead.stage) === "tour_scheduled" ? (
        <Box sx={{ mt: 1, p: 1, borderRadius: 1, backgroundColor: "rgba(251,191,36,0.08)" }}>
          <Typography variant="caption" sx={{ color: "#fbbf24", fontWeight: 600 }}>
            🗓 Tour: {formatDateTime(lead.tour_date)}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}

function Leads() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("pipeline");
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState({});
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuLead, setMenuLead] = useState(null);
  const [activityMode, setActivityMode] = useState("");
  const [activityExpanded, setActivityExpanded] = useState({});
  const [activitySubject, setActivitySubject] = useState("");
  const [activityBody, setActivityBody] = useState("");
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [leadForm, setLeadForm] = useState({});
  const [leadSaving, setLeadSaving] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [openSchedule, setOpenSchedule] = useState(false);
  const [openLost, setOpenLost] = useState(false);
  const [addForm, setAddForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    source: "listing",
    priority: "cold",
    property: "",
    unit: "",
    desired_move_in_date: "",
    budget_min: "",
    budget_max: "",
    bedrooms_needed: "",
    notes: "",
  });
  const [scheduleForm, setScheduleForm] = useState({
    leadId: "",
    tourDate: "",
    notes: "",
    propertyId: "",
    unitId: "",
  });
  const [lostForm, setLostForm] = useState({
    leadId: "",
    reason: "",
    notes: "",
  });
  const [inFlight, setInFlight] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const sourceFilterOptions = useMemo(() => {
    if (!leads) return [];
    const values = new Set(DEFAULT_SOURCES);
    leads.forEach((lead) => {
      const value = normalize(lead.source || lead.source_name);
      if (value) values.add(value);
    });
    return ["all", ...Array.from(values)].map((value) => ({ value, label: value === "all" ? "All Sources" : sourceLabel(value) }));
  }, [leads]);

  const propertyFilterOptions = useMemo(
    () => {
      if (!properties) return [];
      return [
      { value: "all", label: "All Properties" },
      ...properties.map((property) => ({ value: toId(property.id), label: property.name })),
      ];
    },
    [properties]
  );

  const loadSummary = useCallback(async () => {
    const response = await getLeadSummary();
    setSummary(response?.data || {});
  }, []);

  const loadBase = useCallback(async () => {
    const [leadResponse, propertyResponse, unitResponse] = await Promise.all([
      getLeads(),
      getProperties(),
      getUnits(),
    ]);
    setLeads(parseList(leadResponse));
    setProperties(parseList(propertyResponse));
    setUnits(parseList(unitResponse));
    await loadSummary();
  }, [loadSummary]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingSummary(true);
      await loadBase();
      setError("");
    } catch {
      setLeads([]);
      setProperties([]);
      setUnits([]);
      setSummary({});
      setError("Unable to load leads.");
    } finally {
      setLoading(false);
      setLoadingSummary(false);
    }
  }, [loadBase]);

  const refreshLeads = useCallback(async () => {
    try {
      const response = await getLeads();
      setLeads(parseList(response));
      await loadSummary();
    } catch {
      setError("Unable to refresh leads.");
    }
  }, [loadSummary]);

  const showSnackbar = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeLead = () => {
    setSelectedLead(null);
    setIsEditingLead(false);
    setActivityMode("");
    setLeadForm({});
  };

  const openLead = useCallback(async (lead) => {
    setSelectedLead(lead);
    setActiveTab(0);
    setIsEditingLead(false);
    setActionLoading("");
    setActivityMode("");
    setActivitySubject("");
    setActivityBody("");
    setActivityExpanded({});
    const safeLead = lead || {};
    setSelectedLoading(true);
    try {
      const leadResponse = safeLead?.id ? await getLead(safeLead.id) : null;
      const payload = leadResponse?.data || safeLead;
      setSelectedLead(payload);
      setLeadForm({
        first_name: payload.first_name || "",
        last_name: payload.last_name || "",
        email: payload.email || "",
        phone: payload.phone || payload.phone_number || "",
        source: normalize(payload.source || "listing") || "listing",
        priority: normalize(payload.priority || "cold"),
        property: toId(getLeadPropertyId(payload)),
        unit: toId(getLeadUnitId(payload)),
        bedrooms_needed: payload.bedrooms_needed || "",
        budget_min: payload.budget_min || "",
        budget_max: payload.budget_max || "",
        desired_move_in_date: toLocalDate(payload.desired_move_in_date || payload.move_in_date),
        notes: payload.notes || "",
        stage: normalize(payload.stage || "new"),
        assigned_to: payload.assigned_to || "",
        lost_reason: payload.lost_reason || "",
      });
    } catch {
      showSnackbar("Unable to load lead details.", "error");
      closeLead();
    } finally {
      setSelectedLoading(false);
    }
  }, [closeLead, showSnackbar]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filtered = useMemo(() => {
    if (!leads) return [];
    const normalizedSearch = searchTerm.toLowerCase().trim();
    return leads.filter((lead) => {
      const stage = normalize(lead.stage || "new");
      const source = normalize(lead.source || lead.source_name || "other");
      const priority = normalize(lead.priority || "cold");
      const propertyId = toId(getLeadPropertyId(lead));
      const name = getLeadName(lead).toLowerCase();
      const email = normalize(lead.email || "").toLowerCase();
      const phone = normalize(lead.phone || lead.phone_number || "").toLowerCase();
      const property = getLeadPropertyName(lead).toLowerCase();
      const unit = getLeadUnitName(lead).toLowerCase();
      if (sourceFilter !== "all" && source !== sourceFilter) return false;
      if (priorityFilter !== "all" && priority !== priorityFilter) return false;
      if (propertyFilter !== "all" && propertyId !== propertyFilter) return false;
      if (normalizedSearch) {
        const haystack = `${name} ${email} ${phone} ${property} ${unit} ${source} ${stage}`;
        if (!haystack.includes(normalizedSearch)) return false;
      }
      return true;
    });
  }, [leads, searchTerm, sourceFilter, priorityFilter, propertyFilter]);

  const grouped = useMemo(() => {
    if (!filtered) return {};
    const buckets = PIPELINE_STEPS.reduce((acc, step) => {
      acc[step.key] = [];
      return acc;
    }, {});
    filtered.forEach((lead) => {
      const stage = normalize(lead.stage || "new");
      if (buckets[stage]) buckets[stage].push(lead);
      else buckets.new.push(lead);
    });
    return buckets;
  }, [filtered]);

  const summaryCards = useMemo(() => {
    if (!filtered) return {};
    const newCount = filtered.filter((lead) => normalize(lead.stage) === "new").length;
    const now = Date.now();
    const weekStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
    const tours = filtered.filter((lead) => {
      if (!lead.tour_date) return false;
      const tour = new Date(lead.tour_date).getTime();
      return tour >= weekStart && tour <= weekEnd;
    }).length;
    const converted = filtered.filter((lead) => {
      const stage = normalize(lead.stage);
      return stage === "applied" || stage === "leased";
    }).length;
    const conversionRate = filtered.length ? Math.round((converted / filtered.length) * 100) : 0;
    const conversionDays = filtered
      .map((lead) => Number(lead.days_to_convert || lead.days_in_pipeline))
      .filter((value) => Number.isFinite(value));
    const avgDays = conversionDays.length
      ? (conversionDays.reduce((sum, value) => sum + value, 0) / conversionDays.length).toFixed(1)
      : "0.0";

    return {
      total: summary.total_leads || summary.total || filtered.length,
      newCount: summary.new_leads || summary.new || newCount,
      toursThisWeek: summary.tours_this_week || summary.tours || tours,
      conversionRate: `${summary.conversion_rate || conversionRate}%`,
      avgDaysToConvert: summary.avg_days_to_convert || avgDays,
    };
  }, [filtered, summary]);

  const progressIndex = useCallback((lead) => {
    const stage = normalize(lead.stage);
    return stageIndex(stage);
  }, []);

  const runAction = useCallback(
    async (key, fn, successMessage, failMessage = "Action failed") => {
      try {
        setActionLoading(key);
        await fn();
        await refreshLeads();
        if (selectedLead?.id) {
          const refreshed = await getLead(selectedLead?.id);
          if (refreshed?.data) {
            setSelectedLead(refreshed.data);
            setLeadForm((current) => ({ ...current }));
          }
        }
        showSnackbar(successMessage, "success");
      } catch {
        showSnackbar(failMessage, "error");
      } finally {
        setActionLoading("");
      }
    },
    [refreshLeads, selectedLead]
  );

  const closeSnackbar = () => setSnackbar((state) => ({ ...state, open: false }));

  const openAddLead = () => setOpenAdd(true);
  const closeAddLead = () => setOpenAdd(false);

  const openScheduleDialog = (lead) => {
    setScheduleForm({
      leadId: lead.id,
      tourDate: toLocalDateTime(lead.tour_date),
      notes: "",
      propertyId: getLeadPropertyId(lead),
      unitId: getLeadUnitId(lead),
    });
    setOpenSchedule(true);
  };

  const closeScheduleDialog = () => setOpenSchedule(false);

  const openLostDialog = (lead) => {
    setLostForm({ leadId: lead.id, reason: "", notes: "" });
    setOpenLost(true);
  };
  const closeLostDialog = () => setOpenLost(false);

  const openMenu = (event, lead) => {
    setMenuAnchor(event.currentTarget);
    setMenuLead(lead);
  };
  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuLead(null);
  };

  const submitAddLead = async () => {
    try {
      setInFlight(true);
      await createLead({
        first_name: addForm.first_name,
        last_name: addForm.last_name,
        email: addForm.email,
        phone: addForm.phone,
        source: addForm.source,
        priority: addForm.priority,
        property: addForm.property || null,
        unit: addForm.unit || null,
        desired_move_in_date: addForm.desired_move_in_date ? toIso(`${addForm.desired_move_in_date}T00:00:00`) : null,
        budget_min: addForm.budget_min || null,
        budget_max: addForm.budget_max || null,
        bedrooms_needed: addForm.bedrooms_needed || null,
        notes: addForm.notes,
      });
      await refreshLeads();
      setOpenAdd(false);
      showSnackbar("Lead added.");
    } catch {
      showSnackbar("Unable to add lead.", "error");
    } finally {
      setInFlight(false);
    }
  };

  const submitScheduleTour = async () => {
    try {
      setInFlight(true);
      await scheduleTour(scheduleForm.leadId, {
        tour_date: scheduleForm.tourDate ? toIso(scheduleForm.tourDate) : null,
        notes: scheduleForm.notes,
        property: scheduleForm.propertyId || null,
        unit: scheduleForm.unitId || null,
      });
      closeScheduleDialog();
      showSnackbar("Tour scheduled.");
      await refreshLeads();
      if (selectedLead?.id) {
        const refreshed = await getLead(selectedLead?.id);
        setSelectedLead(refreshed.data || selectedLead);
      }
    } catch {
      showSnackbar("Unable to schedule tour.", "error");
    } finally {
      setInFlight(false);
    }
  };

  const submitLost = async () => {
    if (!lostForm.leadId || !lostForm.reason) return;
    try {
      setInFlight(true);
      await markLeadLost(lostForm.leadId, {
        reason: lostForm.reason,
        notes: lostForm.notes,
      });
      closeLostDialog();
      showSnackbar("Lead marked as lost.");
      await refreshLeads();
      closeLead();
    } catch {
      showSnackbar("Unable to mark lead lost.", "error");
    } finally {
      setInFlight(false);
    }
  };

  const submitActivity = async () => {
    if (!selectedLead?.id || !activityMode) return;
    if (!activityBody.trim() && !activitySubject.trim()) return;
    try {
      setActionLoading(`activity-${selectedLead?.id || ""}`);
      const payload =
        activityMode === "email"
          ? {
              type: "email",
              subject: activitySubject,
              body: activityBody,
              notes: activityBody,
            }
          : {
              type: activityMode,
              notes: activityBody,
              body: activityBody,
            };
      await addLeadActivity(selectedLead?.id, payload);
      const refreshed = await getLead(selectedLead?.id);
      setSelectedLead(refreshed?.data || selectedLead);
      await refreshLeads();
      setActivityMode("");
      setActivityBody("");
      setActivitySubject("");
      showSnackbar("Activity added.");
    } catch {
      showSnackbar("Unable to add activity.", "error");
    } finally {
      setActionLoading("");
    }
  };

  const saveLead = async () => {
    try {
      setLeadSaving(true);
      if (!selectedLead?.id) return;
      await updateLead(selectedLead?.id, {
        first_name: leadForm.first_name,
        last_name: leadForm.last_name,
        email: leadForm.email,
        phone: leadForm.phone,
        source: leadForm.source,
        priority: leadForm.priority,
        property: leadForm.property || null,
        unit: leadForm.unit || null,
        bedrooms_needed: leadForm.bedrooms_needed || null,
        budget_min: leadForm.budget_min || null,
        budget_max: leadForm.budget_max || null,
        desired_move_in_date: leadForm.desired_move_in_date ? toIso(`${leadForm.desired_move_in_date}T00:00:00`) : null,
        notes: leadForm.notes,
        stage: leadForm.stage,
        assigned_to: leadForm.assigned_to,
        lost_reason: leadForm.lost_reason,
      });
      const refreshed = await getLead(selectedLead?.id);
      setSelectedLead(refreshed?.data || selectedLead);
      setIsEditingLead(false);
      await refreshLeads();
      showSnackbar("Lead details updated.");
    } catch {
      showSnackbar("Unable to save lead details.", "error");
    } finally {
      setLeadSaving(false);
    }
  };

  const footerActions = useMemo(() => {
    if (!selectedLead) return [];
    const stage = normalize(selectedLead?.stage);
    const application = getApplicationRef(selectedLead);
    const list = [];

    if (stage === "new") {
      list.push({
        key: "contacted",
        label: "Mark Contacted",
        onClick: () => runAction("contacted", () => updateLead(selectedLead?.id, { stage: "contacted" }), "Marked contacted."),
        sx: { backgroundColor: "#3b82f6", textTransform: "none", "&:hover": { backgroundColor: "#2563eb" } },
      });
      list.push({
        key: "schedule",
        label: "Schedule Tour",
        onClick: () => openScheduleDialog(selectedLead),
        sx: { backgroundColor: "#fbbf24", color: "#000", textTransform: "none", "&:hover": { backgroundColor: "#d97706" } },
      });
    } else if (stage === "contacted") {
      list.push({
        key: "schedule",
        label: "Schedule Tour",
        onClick: () => openScheduleDialog(selectedLead),
        sx: { backgroundColor: "#fbbf24", color: "#000", textTransform: "none", "&:hover": { backgroundColor: "#d97706" } },
      });
    } else if (stage === "tour_scheduled") {
      list.push({
        key: "complete-tour",
        label: "Complete Tour",
        onClick: () =>
          runAction(
            "complete-tour",
            () => completeTour(selectedLead?.id, {}),
            "Tour marked completed."
          ),
        sx: { backgroundColor: "#27ca40", textTransform: "none", "&:hover": { backgroundColor: "#22c55e" } },
      });
      list.push({
        key: "reschedule",
        label: "Reschedule",
        onClick: () => openScheduleDialog(selectedLead),
        variant: "outlined",
        sx: { borderColor: ACCENT, color: ACCENT, textTransform: "none" },
      });
    } else if (stage === "tour_completed") {
      list.push({
        key: "convert",
        label: "Convert to Applicant",
        onClick: () =>
          runAction(
            "convert",
            () => convertLeadToApplication(selectedLead?.id),
            "Lead converted to application."
          ),
        sx: { backgroundColor: ACCENT, textTransform: "none" },
      });
    } else if (stage === "applied") {
      if (application?.id) {
        list.push({
          key: "view-application",
          label: "View Application",
          onClick: () => navigate(`/applications/${application.id}`),
          variant: "outlined",
          sx: { borderColor: ACCENT, color: ACCENT, textTransform: "none" },
        });
      }
    } else if (stage === "leased") {
      list.push({
        key: "noop",
        label: "View Application",
        onClick: () => application?.id && navigate(`/applications/${application.id}`),
        variant: "outlined",
        sx: { borderColor: "rgba(124,92,252,0.5)", color: "#c4b5fd", textTransform: "none" },
      });
    } else if (stage === "lost") {
      list.push({
        key: "reopen",
        label: "Reopen",
        onClick: () =>
          runAction(
            "reopen",
            () => updateLead(selectedLead?.id, { stage: "new", lost_reason: "" }),
            "Lead reopened."
          ),
        variant: "outlined",
        sx: { borderColor: "#60a5fa", color: "#60a5fa", textTransform: "none" },
      });
    }

    if (stage !== "lost") {
      list.push({
        key: "mark-lost",
        label: "Mark Lost",
        onClick: () => openLostDialog(selectedLead),
        variant: "outlined",
        sx: {
          borderColor: "rgba(239,68,68,0.4)",
          color: "#ef4444",
          textTransform: "none",
          "&:hover": { borderColor: "rgba(239,68,68,0.7)" },
        },
      });
    }

    return list;
  }, [navigate, runAction, selectedLead]);

  const addUnits = useMemo(() => {
    if (!units) return [];
    return getUnitsByProperty(addForm.property, units);
  }, [addForm.property, units]);
  const detailUnits = useMemo(() => {
    if (!units) return [];
    return getUnitsByProperty(leadForm.property, units);
  }, [leadForm.property, units]);
  const scheduleUnits = useMemo(() => {
    if (!units) return [];
    return getUnitsByProperty(scheduleForm.propertyId, units);
  }, [scheduleForm.propertyId, units]);
  const timelineEntries = useMemo(() => {
    if (!selectedLead) return [];
    return parseActivities(selectedLead);
  }, [selectedLead]);
  const conversionHistory = useMemo(() => {
    if (!selectedLead) return [];
    return getConversionHistory(selectedLead);
  }, [selectedLead]);
  const canConvert = useMemo(() => {
    if (!selectedLead) return false;
    const idx = progressIndex(selectedLead);
    return idx >= 0 && idx < 3;
  }, [progressIndex, selectedLead]);

  return (
    <Box sx={{ color: "#fff" }}>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff" }}>
            Leads
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)" }}>
            Track inquiries, schedule tours, and convert prospects to tenants
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              overflow: "hidden",
            }}
          >
            <IconButton
              onClick={() => setViewMode("pipeline")}
              sx={{
                borderRadius: 0,
                px: 1.5,
                backgroundColor: viewMode === "pipeline" ? "rgba(124,92,252,0.15)" : "transparent",
                color: viewMode === "pipeline" ? "#7C5CFC" : "rgba(255,255,255,0.4)",
              }}
            >
              <ViewKanban />
            </IconButton>
            <IconButton
              onClick={() => setViewMode("list")}
              sx={{
                borderRadius: 0,
                px: 1.5,
                backgroundColor: viewMode === "list" ? "rgba(124,92,252,0.15)" : "transparent",
                color: viewMode === "list" ? "#7C5CFC" : "rgba(255,255,255,0.4)",
              }}
            >
              <ViewList />
            </IconButton>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openAddLead}
            sx={{
              backgroundColor: "#7C5CFC",
              textTransform: "none",
              "&:hover": { backgroundColor: "#6B4FD8" },
            }}
          >
            Add Lead
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "45vh" }}>
          <CircularProgress sx={{ color: "#7C5CFC" }} />
        </Box>
      ) : (
        <>
          <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
            <StatCard
              label="Total Leads"
              value={summaryCards.total}
              Icon={PeopleOutline}
              color="#7C5CFC"
            />
            <StatCard
              label="New"
              value={summaryCards.newCount}
              Icon={Add}
              color="#3b82f6"
            />
            <StatCard
              label="Tours This Week"
              value={summaryCards.toursThisWeek}
              Icon={CalendarMonth}
              color="#fbbf24"
            />
            <StatCard
              label="Conversion Rate"
              value={summaryCards.conversionRate}
              Icon={CheckCircle}
              color="#22c55e"
            />
            <StatCard
              label="Avg Days to Convert"
              value={summaryCards.avgDaysToConvert}
              Icon={Info}
              color="#a855f7"
            />
          </Box>

          <Paper
            sx={{
              p: 2,
              mb: 2,
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
              <TextField
                size="small"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search leads..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: "rgba(255,255,255,0.4)" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 220, maxWidth: 320, color: "#fff" }}
              />
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <Select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                  sx={{ color: "#fff", ".MuiSelect-icon": { color: "#fff" } }}
                >
                  {sourceFilterOptions.map((source) => (
                    <MenuItem key={source.value} value={source.value}>
                      {source.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 190 }}>
                <Select
                  value={propertyFilter}
                  onChange={(event) => setPropertyFilter(event.target.value)}
                  sx={{ color: "#fff", ".MuiSelect-icon": { color: "#fff" } }}
                >
                  {propertyFilterOptions.map((property) => (
                    <MenuItem key={property.value} value={property.value}>
                      {property.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {["all", "hot", "warm", "cold"].map((priority) => {
                  const isActive = priorityFilter === priority;
                  return (
                    <Chip
                      key={priority}
                      label={priority === "all" ? "All" : PRIORITY_LABELS[priority]}
                      onClick={() => setPriorityFilter(priority)}
                      sx={{
                        backgroundColor: isActive ? "rgba(124,92,252,0.2)" : "rgba(255,255,255,0.06)",
                        color: isActive ? "#fff" : getPriorityColor(priority).color,
                        border:
                          priority === "hot"
                            ? "1px solid rgba(239,68,68,0.35)"
                            : priority === "warm"
                              ? "1px solid rgba(251,191,36,0.35)"
                              : priority === "cold"
                                ? "1px solid rgba(59,130,246,0.35)"
                                : "1px solid rgba(255,255,255,0.15)",
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          </Paper>

          {filtered.length === 0 ? (
            <Box
              sx={{
                p: 5,
                borderRadius: 2,
                textAlign: "center",
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Typography variant="h6" sx={{ color: "#fff", mb: 1 }}>
                No leads yet
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.6)", mb: 2 }}>
                Leads will appear here as prospects inquire about your listings
              </Typography>
              <Button variant="contained" onClick={openAddLead} startIcon={<Add />} sx={{ backgroundColor: ACCENT }}>
                Add Lead
              </Button>
            </Box>
          ) : viewMode === "pipeline" ? (
            <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 2 }}>
              {PIPELINE_STEPS.map((stage) => {
                const stageLeads = grouped[stage.key] || [];
                return (
                  <Box
                    key={stage.key}
                    sx={{
                      minWidth: 280,
                      maxWidth: 280,
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, px: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: stage.color }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#fff" }}>
                          {stage.label}
                        </Typography>
                      </Box>
                      <Chip
                        label={stageLeads.length}
                        size="small"
                        sx={{
                          backgroundColor: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.5)",
                          height: 20,
                          fontSize: "0.7rem",
                        }}
                      />
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      {stageLeads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} onClick={openLead} />
                      ))}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <TableContainer
              component={Paper}
              sx={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: "rgba(255,255,255,0.7)" }}>Lead</TableCell>
                    <TableCell sx={{ color: "rgba(255,255,255,0.7)" }}>Source</TableCell>
                    <TableCell sx={{ color: "rgba(255,255,255,0.7)" }}>Interested In</TableCell>
                    <TableCell sx={{ color: "rgba(255,255,255,0.7)" }}>Stage</TableCell>
                    <TableCell sx={{ color: "rgba(255,255,255,0.7)" }}>Priority</TableCell>
                    <TableCell sx={{ color: "rgba(255,255,255,0.7)" }}>Tour Date</TableCell>
                    <TableCell sx={{ color: "rgba(255,255,255,0.7)" }}>Days</TableCell>
                    <TableCell sx={{ color: "rgba(255,255,255,0.7)" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((lead) => {
                    const initials = getLeadName(lead)
                      .split(" ")
                      .map((part) => part.charAt(0))
                      .join("")
                      .substring(0, 2)
                      .toUpperCase();
                    const propertyLabel = getLeadPropertyName(lead) || "General inquiry";
                    const unitLabel = getLeadUnitName(lead);
                    return (
                      <TableRow
                        hover
                        key={lead.id}
                        sx={{ cursor: "pointer" }}
                        onClick={() => openLead(lead)}
                      >
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                            <Avatar
                              sx={{ width: 34, height: 34, fontSize: 12, backgroundColor: ACCENT }}
                            >
                              {initials}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: "#fff" }}>
                                {getLeadName(lead)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                                {lead.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={sourceLabel(lead.source || "other")}
                            size="small"
                            sx={{
                              backgroundColor: "rgba(255,255,255,0.06)",
                              color: "rgba(255,255,255,0.75)",
                              border: "1px solid rgba(255,255,255,0.14)",
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: "#fff" }}>
                            {propertyLabel}
                            {unitLabel ? ` · ${unitLabel}` : ""}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={toTitle(lead.stage || "new")}
                            sx={stageChipStyles(lead.stage)}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={titleCase(lead.priority || "cold")}
                            sx={{
                              height: 18,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              ...getPriorityColor(lead.priority),
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                            {lead.tour_date ? formatDateTime(lead.tour_date) : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                            {lead.days_in_pipeline || 0}
                          </Typography>
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <IconButton size="small" onClick={() => openLead(lead)} sx={{ color: "#fff" }}>
                            <Visibility />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => openScheduleDialog(lead)}
                            sx={{ color: "#fbbf24" }}
                          >
                            <CalendarMonth />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(event) => openMenu(event, lead)}
                            sx={{ color: "rgba(255,255,255,0.7)" }}
                          >
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            openLead(menuLead);
            closeMenu();
          }}
        >
          View
        </MenuItem>
        <MenuItem
          onClick={() => {
            openScheduleDialog(menuLead || {});
            closeMenu();
          }}
        >
          Schedule Tour
        </MenuItem>
        <MenuItem
          onClick={() => {
            openLostDialog(menuLead || {});
            closeMenu();
          }}
        >
          Mark Lost
        </MenuItem>
      </Menu>

      <Drawer
        anchor="right"
        open={Boolean(selectedLead)}
        onClose={closeLead}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: "600px" },
            backgroundColor: "rgba(18,24,33,0.97)",
            color: "#fff",
            borderLeft: "1px solid rgba(255,255,255,0.1)",
          },
        }}
      >
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {selectedLoading ? (
            <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
              <CircularProgress sx={{ color: ACCENT }} />
            </Box>
          ) : selectedLead ? (
            <>
              <Box sx={{ p: 3, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        backgroundColor: ACCENT,
                        fontWeight: 700,
                      }}
                    >
                      {getLeadName(selectedLead)
                        .split(" ")
                        .map((part) => part.charAt(0))
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1, color: "#fff" }}>
                        {getLeadName(selectedLead)}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, mt: 1, alignItems: "center" }}>
                        <Chip
                          label={toTitle(selectedLead?.stage || "new")}
                          size="small"
                          sx={stageChipStyles(selectedLead?.stage || "")}
                        />
                        <Chip
                          size="small"
                          label={titleCase(selectedLead?.priority || "cold")}
                          sx={{
                            height: 20,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            ...getPriorityColor(selectedLead?.priority || "cold"),
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={closeLead} sx={{ color: "#fff" }}>
                    <Close />
                  </IconButton>
                </Box>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", mt: 1.5 }}>
                  {selectedLead?.email || ""}
                </Typography>
                {selectedLead?.phone ? (
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                    {selectedLead?.phone || ""}
                  </Typography>
                ) : null}
                <Chip
                  label={sourceLabel(selectedLead?.source || "other")}
                  size="small"
                  sx={{ mt: 1.5, backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.9)" }}
                />

                <Box sx={{ mt: 2 }}>
                  {(() => {
                    const stepIndex = progressIndex(selectedLead || {});
                    return (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {PROGRESS_STEPS.map((step, index) => {
                          const reached = index <= stepIndex;
                          return (
                            <Box key={step.key} sx={{ display: "flex", alignItems: "center", minWidth: 0, flex: 1 }}>
                              <Box
                                sx={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: "50%",
                                  backgroundColor: reached ? "#22c55e" : "rgba(255,255,255,0.22)",
                                }}
                              />
                              <Typography
                                variant="caption"
                                sx={{
                                  ml: 0.8,
                                  color: reached ? "#fff" : "rgba(255,255,255,0.5)",
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {step.label}
                              </Typography>
                              {index < PROGRESS_STEPS.length - 1 ? (
                                <Divider
                                  sx={{
                                    flex: 1,
                                    ml: 0.7,
                                    borderColor: index < stepIndex ? "#22c55e" : "rgba(255,255,255,0.18)",
                                  }}
                                />
                              ) : null}
                            </Box>
                          );
                        })}
                      </Box>
                    );
                  })()}
                </Box>

                <Box sx={{ display: "flex", mt: 2, gap: 1, flexWrap: "wrap" }}>
                  <Paper sx={{ flex: 1, backgroundColor: "rgba(255,255,255,0.02)", p: 1.2 }}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                      Days in Pipeline
                    </Typography>
                    <Typography variant="h6" sx={{ color: "#fff" }}>
                      {selectedLead?.days_in_pipeline || 0}
                    </Typography>
                  </Paper>
                  <Paper sx={{ flex: 1, backgroundColor: "rgba(255,255,255,0.02)", p: 1.2 }}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                      Interested In
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#fff", mt: 0.5 }}>
                      {getLeadPropertyName(selectedLead) || "General"}
                      {getLeadUnitName(selectedLead) ? ` · ${getLeadUnitName(selectedLead)}` : ""}
                    </Typography>
                  </Paper>
                  <Paper sx={{ flex: 1, backgroundColor: "rgba(255,255,255,0.02)", p: 1.2 }}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                      Budget
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#fff", mt: 0.5 }}>
                      {selectedLead?.budget_min || selectedLead?.budget_max
                        ? `${currency(selectedLead?.budget_min || 0)} - ${currency(selectedLead?.budget_max || 0)}`
                        : "—"}
                    </Typography>
                  </Paper>
                  <Paper sx={{ flex: 1, backgroundColor: "rgba(255,255,255,0.02)", p: 1.2 }}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                      Move-in
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#fff", mt: 0.5 }}>
                      {formatDate(selectedLead?.desired_move_in_date || selectedLead?.move_in_date || "")}
                    </Typography>
                  </Paper>
                </Box>
              </Box>

              <Box sx={{ px: 3, pt: 1 }}>
                <Tabs
                  value={activeTab}
                  onChange={(_event, value) => setActiveTab(value)}
                  textColor="inherit"
                  TabIndicatorProps={{ style: { backgroundColor: ACCENT } }}
                >
                  <Tab label="Activity" sx={{ textTransform: "none", color: "rgba(255,255,255,0.7)" }} />
                  <Tab label="Details" sx={{ textTransform: "none", color: "rgba(255,255,255,0.7)" }} />
                  <Tab label="Conversion" sx={{ textTransform: "none", color: "rgba(255,255,255,0.7)" }} />
                </Tabs>
              </Box>
              <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 1.5 }}>
                <TabPanel value={activeTab} index={0}>
                  <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
                    <Button
                      size="small"
                      onClick={() => setActivityMode("note")}
                      sx={{ textTransform: "none", color: "#fff", borderColor: "rgba(255,255,255,0.2)" }}
                      variant={activityMode === "note" ? "contained" : "outlined"}
                    >
                      Add Note
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setActivityMode("call")}
                      sx={{ textTransform: "none", color: "#fff", borderColor: "rgba(255,255,255,0.2)" }}
                      variant={activityMode === "call" ? "contained" : "outlined"}
                    >
                      Log Call
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setActivityMode("email")}
                      sx={{ textTransform: "none", color: "#fff", borderColor: "rgba(255,255,255,0.2)" }}
                      variant={activityMode === "email" ? "contained" : "outlined"}
                    >
                      Log Email
                    </Button>
                  </Box>

                  {activityMode ? (
                    <Paper sx={{ p: 2, mb: 2, backgroundColor: "rgba(255,255,255,0.03)" }}>
                      <Typography variant="body2" sx={{ color: "#fff", mb: 1 }}>
                        {activityMode === "note"
                          ? "Add Note"
                          : activityMode === "call"
                            ? "Log Call"
                            : "Log Email"}
                      </Typography>
                      {activityMode === "email" ? (
                        <TextField
                          fullWidth
                          size="small"
                          label="Subject"
                          value={activitySubject}
                          onChange={(event) => setActivitySubject(event.target.value)}
                          sx={{ mb: 1.2 }}
                        />
                      ) : null}
                      <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        label="Body"
                        value={activityBody}
                        onChange={(event) => setActivityBody(event.target.value)}
                        sx={{ mb: 1.5 }}
                      />
                      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                        <Button
                          size="small"
                          onClick={() => setActivityMode("")}
                          sx={{ color: "rgba(255,255,255,0.7)", textTransform: "none" }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={submitActivity}
                          disabled={
                            actionLoading === `activity-${selectedLead?.id || ""}` ||
                            (!activityBody.trim() && !activitySubject.trim())
                          }
                          sx={{ backgroundColor: ACCENT, textTransform: "none" }}
                        >
                          Save
                        </Button>
                      </Box>
                    </Paper>
                  ) : null}

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {timelineEntries.map((activity, index) => {
                      const dotColor = getActivityColor(activity.type);
                      const isEmail = normalize(activity.type) === "email";
                      const expanded = Boolean(activityExpanded[activity.id]);
                      return (
                        <Box key={activity.id} sx={{ display: "flex", gap: 2, position: "relative" }}>
                          <Box sx={{ display: "flex", justifyContent: "center", position: "relative", width: 24 }}>
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                mt: 0.5,
                                position: "relative",
                                backgroundColor: dotColor,
                                zIndex: 2,
                              }}
                            />
                            {index < timelineEntries.length - 1 ? (
                              <Box
                                sx={{
                                  position: "absolute",
                                  top: 14,
                                  bottom: -20,
                                  width: 1.5,
                                  backgroundColor: "rgba(255,255,255,0.12)",
                                  zIndex: 1,
                                }}
                              />
                            ) : null}
                          </Box>
                          <Paper
                            sx={{
                              flex: 1,
                              p: 1.5,
                              backgroundColor: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.06)",
                              borderRadius: 2,
                            }}
                          >
                            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: "#fff" }}>
                                {activity.label}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                                {formatRelative(activity.timestamp)}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.84)", mt: 0.5 }}>
                              {activity.description}
                            </Typography>
                            {isEmail ? (
                              <>
                                {activity.subject ? (
                                  <Typography
                                    variant="caption"
                                    sx={{ color: "rgba(255,255,255,0.6)", display: "block", mt: 0.5 }}
                                  >
                                    Subject: {activity.subject}
                                  </Typography>
                                ) : null}
                                {activity.body ? (
                                  <>
                                    <Button
                                      size="small"
                                      onClick={() =>
                                        setActivityExpanded((current) => ({
                                          ...current,
                                          [activity.id]: !current[activity.id],
                                        }))
                                      }
                                      sx={{ mt: 0.7, textTransform: "none", color: "#fff" }}
                                    >
                                      {expanded ? "Hide email body" : "Show email body"}
                                    </Button>
                                    {expanded ? (
                                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mt: 0.6 }}>
                                        {activity.body}
                                      </Typography>
                                    ) : null}
                                  </>
                                ) : null}
                              </>
                            ) : null}
                          </Paper>
                        </Box>
                      );
                    })}
                    {timelineEntries.length === 0 ? (
                      <Typography sx={{ color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
                        No activity yet.
                      </Typography>
                    ) : null}
                  </Box>
                </TabPanel>

                <TabPanel value={activeTab} index={1}>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="h6" sx={{ color: "#fff" }}>
                        Contact
                      </Typography>
                      {!isEditingLead ? (
                        <Button
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => setIsEditingLead(true)}
                          sx={{ textTransform: "none", color: ACCENT }}
                        >
                          Edit
                        </Button>
                      ) : (
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button
                            size="small"
                            onClick={() => setIsEditingLead(false)}
                            sx={{ color: "rgba(255,255,255,0.7)", textTransform: "none" }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={saveLead}
                            disabled={leadSaving}
                            startIcon={<Save />}
                            sx={{ backgroundColor: ACCENT, textTransform: "none" }}
                          >
                            Save
                          </Button>
                        </Box>
                      )}
                    </Box>
                    {isEditingLead ? (
                      <>
                        <Box sx={{ display: "flex", gap: 1.5 }}>
                          <TextField
                            size="small"
                            label="First Name"
                            value={leadForm.first_name || ""}
                            onChange={(event) => setLeadForm((current) => ({ ...current, first_name: event.target.value }))}
                          />
                          <TextField
                            size="small"
                            label="Last Name"
                            value={leadForm.last_name || ""}
                            onChange={(event) => setLeadForm((current) => ({ ...current, last_name: event.target.value }))}
                          />
                        </Box>
                        <TextField
                          size="small"
                          label="Email"
                          value={leadForm.email || ""}
                          onChange={(event) => setLeadForm((current) => ({ ...current, email: event.target.value }))}
                        />
                        <TextField
                          size="small"
                          label="Phone"
                          value={leadForm.phone || ""}
                          onChange={(event) => setLeadForm((current) => ({ ...current, phone: event.target.value }))}
                        />
                        <Typography variant="h6" sx={{ color: "#fff", mt: 1.5 }}>
                          Interest
                        </Typography>
                        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                          <FormControl fullWidth size="small">
                            <Select
                              value={leadForm.property}
                              onChange={(event) =>
                                setLeadForm((current) => ({ ...current, property: event.target.value, unit: "" }))
                              }
                              displayEmpty
                            >
                              <MenuItem value="">No property</MenuItem>
                              {properties.map((property) => (
                                <MenuItem key={property.id} value={toId(property.id)}>
                                  {property.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl fullWidth size="small">
                            <Select
                              value={leadForm.unit}
                              onChange={(event) => setLeadForm((current) => ({ ...current, unit: event.target.value }))}
                              displayEmpty
                              disabled={!leadForm.property}
                            >
                              <MenuItem value="">No unit</MenuItem>
                              {detailUnits.map((unit) => (
                                <MenuItem key={unit.id} value={toId(unit.id)}>
                                  Unit {unit.unit_number}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <TextField
                            size="small"
                            type="number"
                            label="Bedrooms Needed"
                            value={leadForm.bedrooms_needed || ""}
                            onChange={(event) => setLeadForm((current) => ({ ...current, bedrooms_needed: event.target.value }))}
                          />
                          <TextField
                            size="small"
                            type="number"
                            label="Budget Min"
                            value={leadForm.budget_min || ""}
                            onChange={(event) => setLeadForm((current) => ({ ...current, budget_min: event.target.value }))}
                          />
                          <TextField
                            size="small"
                            type="number"
                            label="Budget Max"
                            value={leadForm.budget_max || ""}
                            onChange={(event) => setLeadForm((current) => ({ ...current, budget_max: event.target.value }))}
                          />
                          <TextField
                            size="small"
                            label="Desired Move-in"
                            type="date"
                            value={leadForm.desired_move_in_date || ""}
                            onChange={(event) =>
                              setLeadForm((current) => ({ ...current, desired_move_in_date: event.target.value }))
                            }
                            InputLabelProps={{ shrink: true }}
                          />
                        </Box>
                        <Typography variant="h6" sx={{ color: "#fff", mt: 1.5 }}>
                          Pipeline
                        </Typography>
                        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                          <FormControl fullWidth size="small">
                            <Select
                              value={leadForm.source || "listing"}
                              onChange={(event) => setLeadForm((current) => ({ ...current, source: event.target.value }))}
                            >
                              {DEFAULT_SOURCES.map((source) => (
                                <MenuItem key={source} value={source}>
                                  {sourceLabel(source)}
                                </MenuItem>
                              ))}
                              <MenuItem value="website">Website</MenuItem>
                              <MenuItem value="social">Social</MenuItem>
                              <MenuItem value="other">Other</MenuItem>
                            </Select>
                          </FormControl>
                          <FormControl fullWidth size="small">
                            <Select
                              value={leadForm.stage || "new"}
                              onChange={(event) => setLeadForm((current) => ({ ...current, stage: event.target.value }))}
                            >
                              {PIPELINE_STEPS.map((step) => (
                                <MenuItem key={step.key} value={step.key}>
                                  {step.label}
                                </MenuItem>
                              ))}
                              <MenuItem value="lost">Lost</MenuItem>
                            </Select>
                          </FormControl>
                          <FormControl fullWidth size="small">
                            <Select
                              value={leadForm.priority || "cold"}
                              onChange={(event) => setLeadForm((current) => ({ ...current, priority: event.target.value }))}
                            >
                              <MenuItem value="hot">Hot</MenuItem>
                              <MenuItem value="warm">Warm</MenuItem>
                              <MenuItem value="cold">Cold</MenuItem>
                            </Select>
                          </FormControl>
                          <TextField
                            size="small"
                            label="Assigned To"
                            value={leadForm.assigned_to || ""}
                            onChange={(event) => setLeadForm((current) => ({ ...current, assigned_to: event.target.value }))}
                          />
                        </Box>
                        <TextField
                          size="small"
                          label="Notes"
                          multiline
                          minRows={2}
                          value={leadForm.notes || ""}
                          onChange={(event) => setLeadForm((current) => ({ ...current, notes: event.target.value }))}
                        />
                        {normalize(leadForm.stage) === "lost" ? (
                          <TextField
                            size="small"
                            label="Lost Reason"
                            value={leadForm.lost_reason || ""}
                            onChange={(event) => setLeadForm((current) => ({ ...current, lost_reason: event.target.value }))}
                          />
                        ) : null}
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                          {selectedLead?.email || ""}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                          {selectedLead?.phone || "No phone"}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", mt: 1 }}>
                          Source: {sourceLabel(selectedLead?.source || "other")}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                          Property: {getLeadPropertyName(selectedLead) || "General"}{" "}
                          {getLeadUnitName(selectedLead) ? `· ${getLeadUnitName(selectedLead)}` : ""}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                          Bedrooms needed: {selectedLead?.bedrooms_needed || "—"}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                          Budget: {selectedLead?.budget_min || selectedLead?.budget_max
                            ? `${currency(selectedLead?.budget_min || 0)} - ${currency(selectedLead?.budget_max || 0)}`
                            : "Not set"}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                          Move-in: {formatDate(selectedLead?.desired_move_in_date || selectedLead?.move_in_date || "")}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                          Stage: {toTitle(selectedLead?.stage || "new")}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                          Notes: {selectedLead?.notes || "—"}
                        </Typography>
                        {selectedLead?.lost_reason ? (
                          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                            Lost reason: {selectedLead?.lost_reason || ""}
                          </Typography>
                        ) : null}
                      </>
                    )}
                  </Stack>
                </TabPanel>

                <TabPanel value={activeTab} index={2}>
                  <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {canConvert ? (
                      <Button
                        variant="contained"
                        onClick={() =>
                          runAction(
                            "convert-inline",
                            () => convertLeadToApplication(selectedLead?.id),
                            "Lead converted to applicant."
                          )
                        }
                        sx={{ alignSelf: "flex-start", backgroundColor: ACCENT, textTransform: "none" }}
                      >
                        Convert to Applicant
                      </Button>
                    ) : null}
                    <Alert severity="info" sx={{ backgroundColor: "rgba(255,255,255,0.02)", color: "#fff" }}>
                      This will mark the lead as &apos;Applied&apos;. Create the full application from the Applications page.
                    </Alert>
                    {getApplicationRef(selectedLead)?.id ? (
                      <Button
                        variant="outlined"
                        component={Link}
                        to={`/applications/${getApplicationRef(selectedLead).id}`}
                        sx={{ alignSelf: "flex-start", borderColor: ACCENT, color: ACCENT, textTransform: "none" }}
                      >
                        View Application
                      </Button>
                    ) : null}
                    {getTenantRef(selectedLead)?.id ? (
                      <Button
                        variant="outlined"
                        component={Link}
                        to={`/tenants/${getTenantRef(selectedLead).id}`}
                        sx={{
                          alignSelf: "flex-start",
                          borderColor: "rgba(255,255,255,0.45)",
                          color: "#fff",
                          textTransform: "none",
                        }}
                      >
                        View Tenant
                      </Button>
                    ) : null}

                    <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.8)", mt: 1 }}>
                      Conversion timeline
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {conversionHistory.map((entry) => (
                        <Box key={`${entry.label}-${entry.date}`} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CheckCircle sx={{ fontSize: 14, color: "#22c55e" }} />
                          <Typography variant="body2" sx={{ color: "#fff" }}>
                            {entry.label}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)" }}>
                            {formatDateTime(entry.date)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </TabPanel>
              </Box>

              <Box
                sx={{
                  mt: "auto",
                  px: 2.5,
                  py: 2,
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {footerActions.map((action) => (
                  <Button
                    key={action.key}
                    size="small"
                    variant={action.variant || "contained"}
                    onClick={action.onClick}
                    disabled={actionLoading === action.key}
                    sx={{
                      textTransform: "none",
                      ...(action.sx || {}),
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </Box>
            </>
          ) : null}
        </Box>
      </Drawer>
      <Dialog open={openAdd} onClose={closeAddLead} fullWidth maxWidth="sm">
        <DialogTitle sx={{ color: "#fff" }}>Add Lead</DialogTitle>
        <DialogContent sx={{ bgcolor: "rgba(10,16,23,1)", color: "#fff" }}>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <TextField
                size="small"
                label="First Name"
                value={addForm.first_name}
                onChange={(event) => setAddForm((current) => ({ ...current, first_name: event.target.value }))}
              />
              <TextField
                size="small"
                label="Last Name"
                value={addForm.last_name}
                onChange={(event) => setAddForm((current) => ({ ...current, last_name: event.target.value }))}
              />
            </Box>
            <TextField
              size="small"
              label="Email"
              value={addForm.email}
              onChange={(event) => setAddForm((current) => ({ ...current, email: event.target.value }))}
            />
            <TextField
              size="small"
              label="Phone"
              value={addForm.phone}
              onChange={(event) => setAddForm((current) => ({ ...current, phone: event.target.value }))}
            />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <FormControl size="small" fullWidth>
                <Select
                  value={addForm.source}
                  onChange={(event) => setAddForm((current) => ({ ...current, source: event.target.value }))}
                >
                  {sourceFilterOptions.slice(1).map((source) => (
                    <MenuItem key={source.value} value={source.value}>
                      {source.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <Select
                  value={addForm.priority}
                  onChange={(event) => setAddForm((current) => ({ ...current, priority: event.target.value }))}
                >
                  <MenuItem value="hot">Hot</MenuItem>
                  <MenuItem value="warm">Warm</MenuItem>
                  <MenuItem value="cold">Cold</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <FormControl size="small" fullWidth>
                <Select
                  value={addForm.property}
                  onChange={(event) =>
                    setAddForm((current) => ({
                      ...current,
                      property: event.target.value,
                      unit: "",
                    }))
                  }
                  displayEmpty
                >
                  <MenuItem value="">No Property</MenuItem>
                  {properties.map((property) => (
                    <MenuItem key={property.id} value={toId(property.id)}>
                      {property.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <Select
                  value={addForm.unit}
                  onChange={(event) => setAddForm((current) => ({ ...current, unit: event.target.value }))}
                  displayEmpty
                  disabled={!addForm.property}
                >
                  <MenuItem value="">No Unit</MenuItem>
                  {addUnits.map((unit) => (
                    <MenuItem key={unit.id} value={toId(unit.id)}>
                      Unit {unit.unit_number}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1.5 }}>
              <TextField
                size="small"
                label="Desired Move-in"
                type="date"
                value={addForm.desired_move_in_date}
                onChange={(event) => setAddForm((current) => ({ ...current, desired_move_in_date: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                size="small"
                type="number"
                label="Bedrooms Needed"
                value={addForm.bedrooms_needed}
                onChange={(event) => setAddForm((current) => ({ ...current, bedrooms_needed: event.target.value }))}
              />
              <TextField
                size="small"
                type="number"
                label="Budget Min"
                value={addForm.budget_min}
                onChange={(event) => setAddForm((current) => ({ ...current, budget_min: event.target.value }))}
              />
            </Box>
            <TextField
              size="small"
              type="number"
              label="Budget Max"
              value={addForm.budget_max}
              onChange={(event) => setAddForm((current) => ({ ...current, budget_max: event.target.value }))}
            />
            <TextField
              size="small"
              multiline
              minRows={2}
              label="Notes"
              value={addForm.notes}
              onChange={(event) => setAddForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: "rgba(10,16,23,1)" }}>
          <Button onClick={closeAddLead} sx={{ textTransform: "none", color: "rgba(255,255,255,0.8)" }}>
            Cancel
          </Button>
          <Button
            onClick={submitAddLead}
            variant="contained"
            sx={{ backgroundColor: ACCENT, textTransform: "none" }}
            disabled={inFlight}
          >
            Add Lead
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openSchedule} onClose={closeScheduleDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ color: "#fff" }}>Schedule Tour</DialogTitle>
        <DialogContent sx={{ bgcolor: "rgba(10,16,23,1)", color: "#fff" }}>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <TextField
              type="datetime-local"
              size="small"
              label="Tour Date"
              value={scheduleForm.tourDate}
              onChange={(event) => setScheduleForm((current) => ({ ...current, tourDate: event.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              multiline
              minRows={3}
              label="Notes"
              value={scheduleForm.notes}
              onChange={(event) => setScheduleForm((current) => ({ ...current, notes: event.target.value }))}
            />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <FormControl size="small" fullWidth>
                <Select
                  value={scheduleForm.propertyId}
                  onChange={(event) =>
                    setScheduleForm((current) => ({ ...current, propertyId: event.target.value, unitId: "" }))
                  }
                  displayEmpty
                >
                  <MenuItem value="">No Property</MenuItem>
                  {properties.map((property) => (
                    <MenuItem key={property.id} value={toId(property.id)}>
                      {property.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <Select
                  value={scheduleForm.unitId}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, unitId: event.target.value }))}
                  displayEmpty
                  disabled={!scheduleForm.propertyId}
                >
                  <MenuItem value="">No Unit</MenuItem>
                  {scheduleUnits.map((unit) => (
                    <MenuItem key={unit.id} value={toId(unit.id)}>
                      Unit {unit.unit_number}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: "rgba(10,16,23,1)" }}>
          <Button onClick={closeScheduleDialog} sx={{ textTransform: "none", color: "rgba(255,255,255,0.8)" }}>
            Cancel
          </Button>
          <Button
            onClick={submitScheduleTour}
            variant="contained"
            sx={{ backgroundColor: ACCENT, textTransform: "none" }}
            disabled={inFlight}
          >
            Schedule
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openLost} onClose={closeLostDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ color: "#fff" }}>Mark Lead Lost</DialogTitle>
        <DialogContent sx={{ bgcolor: "rgba(10,16,23,1)", color: "#fff" }}>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <FormControl size="small" fullWidth>
              <Select
                value={lostForm.reason}
                onChange={(event) => setLostForm((current) => ({ ...current, reason: event.target.value }))}
                displayEmpty
              >
                <MenuItem value="">Select reason</MenuItem>
                {REASONS.map((reason) => (
                  <MenuItem key={reason} value={reason}>
                    {reason}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              multiline
              minRows={3}
              label="Notes"
              value={lostForm.notes}
              onChange={(event) => setLostForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: "rgba(10,16,23,1)" }}>
          <Button onClick={closeLostDialog} sx={{ textTransform: "none", color: "rgba(255,255,255,0.8)" }}>
            Cancel
          </Button>
          <Button
            onClick={submitLost}
            variant="contained"
            sx={{ backgroundColor: "#ef4444", textTransform: "none" }}
            disabled={inFlight || !lostForm.reason}
          >
            Mark Lost
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2200}
        onClose={closeSnackbar}
        message={snackbar.message}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{
          "& .MuiSnackbarContent-root": {
            backgroundColor: snackbar.severity === "error" ? "#7f1d1d" : "#14532d",
          },
        }}
      />
    </Box>
  );
}

export default Leads;
