import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  approveApplication,
  createLeaseFromApplication,
  denyApplication,
  getApplications,
  runApplicationScreening,
} from "../services/api";

const ACCENT = "#7C5CFC";
const MUTED = "rgba(255, 255, 255, 0.55)";

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) {
    return "$0";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, amount));
}

function formatRelative(value) {
  if (!value) return "";
  const delta = Date.now() - new Date(value);
  const mins = Math.floor(delta / 60000);
  const hrs = Math.floor(delta / 3600000);
  const days = Math.floor(delta / 86400000);
  if (days > 0) return `${days} days ago`;
  if (hrs > 0) return `${hrs} hours ago`;
  if (mins > 0) return `${mins} minutes ago`;
  return "Just now";
}

function titleCase(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function trimSafe(value) {
  return typeof value === "string" ? value.trim() : value;
}

function getApplicantName(application) {
  const full = `${application?.first_name || ""} ${application?.last_name || ""}`.trim();
  return full || application?.full_name || `Applicant #${application?.id}`;
}

function getUnitMeta(application) {
  const unitDetail = application?.unit_detail || application?.unit || {};
  const propertyName = trimSafe(
    unitDetail?.property_name ||
      unitDetail?.property?.name ||
      application?.property_name ||
      application?.property?.name ||
      application?.listing?.property_name ||
      ""
  );
  const unitNumber = trimSafe(
    unitDetail?.unit_number ||
      unitDetail?.unit?.unit_number ||
      unitDetail?.number ||
      application?.unit_number ||
      application?.unit?.unit_number ||
      ""
  );
  const rentAmount =
    unitDetail?.rent_amount ||
    unitDetail?.rent ||
    unitDetail?.monthly_rent ||
    application?.rent_amount ||
    application?.rent;
  return { propertyName, unitNumber, rentAmount };
}

function unitLabel(application) {
  const { propertyName, unitNumber } = getUnitMeta(application);
  if (propertyName && unitNumber) return `${propertyName} · Unit ${unitNumber}`;
  if (propertyName) return propertyName;
  if (unitNumber) return `Unit ${unitNumber}`;
  return "-";
}

function statusChipStyle(status) {
  const map = {
    submitted: { backgroundColor: "rgba(251, 191, 36, 0.15)", color: "#fbbf24" },
    pending: { backgroundColor: "rgba(251, 191, 36, 0.15)", color: "#fbbf24" },
    under_review: { backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" },
    approved: { backgroundColor: "rgba(39, 202, 64, 0.15)", color: "#27ca40" },
    denied: { backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444" },
    lease_created: { backgroundColor: "rgba(124, 92, 252, 0.15)", color: ACCENT },
    withdrawn: { backgroundColor: "rgba(148, 163, 184, 0.15)", color: "#94a3b8" },
  };
  const base = map[status] || map.submitted;
  return {
    ...base,
    fontWeight: 600,
    fontSize: "0.7rem",
    height: 22,
    textTransform: "capitalize",
  };
}

function ratioMeta(monthlyIncome, rentAmount) {
  const income = Number(monthlyIncome || 0);
  const rent = Number(rentAmount || 0);
  if (!income || !rent) return { value: null, color: "rgba(255,255,255,0.45)", text: "0x rent" };
  const ratio = income / rent;
  if (ratio >= 3) return { value: ratio, color: "#27ca40", text: `${ratio.toFixed(1)}x rent ✓` };
  if (ratio >= 2) return { value: ratio, color: "#fbbf24", text: `${ratio.toFixed(1)}x rent` };
  return { value: ratio, color: "#ef4444", text: `${ratio.toFixed(1)}x rent ⚠` };
}

const tableHeaderSx = {
  backgroundColor: "rgba(255, 255, 255, 0.03)",
  color: MUTED,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fontSize: 11,
  fontWeight: 600,
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
};

function StatCard({ label, value, Icon, color }) {
  return (
    <Card
      sx={{
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: "12px",
        p: 2,
        minWidth: 140,
        color: "#fff",
        display: "inline-flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ color, mb: 1.2 }}>
        <Icon sx={{ fontSize: 20 }} />
      </Box>
      <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700, lineHeight: 1.1 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: MUTED }}>
        {label}
      </Typography>
    </Card>
  );
}

function DetailField({ label, value }) {
  const hasValue = value !== null && value !== undefined && `${value}`.trim() !== "";
  return (
    <Box>
      <Typography
        sx={{
          fontSize: 12,
          color: MUTED,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </Typography>
      {hasValue ? (
        <Typography sx={{ color: "#fff" }}>{value}</Typography>
      ) : (
        <Typography sx={{ color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>Not provided</Typography>
      )}
    </Box>
  );
}

function DetailGrid({ rows }) {
  return (
    <Card variant="outlined" sx={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          {rows.map((row) => (
            <DetailField key={row.label} label={row.label} value={row.value} />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

function SubtleCardList({ items, title }) {
  if (!items.length) {
    return <Typography sx={{ color: MUTED, fontStyle: "italic" }}>No {title} provided.</Typography>;
  }

  return (
    <Stack spacing={1.2}>
      {items.map((item, index) => (
        <Card key={`${item.title || index}`} variant="outlined" sx={{ p: 1.4, border: "1px solid rgba(255,255,255,0.08)" }}>
          <Typography sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>{item.title}</Typography>
          <Typography sx={{ color: MUTED, fontSize: "0.8rem" }}>{item.description}</Typography>
        </Card>
      ))}
    </Stack>
  );
}

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ mt: 1.5 }}>{children}</Box>;
}

function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const [actionLoading, setActionLoading] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getApplications();
      const payload = Array.isArray(response.data) ? response.data : response.data?.results || [];
      setApplications(payload || []);
      setError("");
    } catch {
      setApplications([]);
      setError("Unable to load rental applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const filteredRows = applications.filter((application) => {
      if (statusFilter !== "all" && application.status !== statusFilter) return false;
      if (!normalized) return true;

      const unit = getUnitMeta(application);
      const haystack = [
        getApplicantName(application),
        application.email,
        unit.propertyName,
        unit.unitNumber,
        unit.unitNumber ? `unit ${unit.unitNumber}` : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });

    filteredRows.sort((a, b) => {
      return sortOrder === "asc"
        ? new Date(a.created_at || 0) - new Date(b.created_at || 0)
        : new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return filteredRows;
  }, [applications, statusFilter, sortOrder, search]);

  const now = new Date();
  const thisMonthCount = applications.filter((application) => {
    if (!application.created_at) return false;
    const created = new Date(application.created_at);
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  const summaryStats = [
    { label: "Total Applications", value: applications.length, Icon: DescriptionIcon, color: "#7C5CFC" },
    {
      label: "Pending Review",
      value: applications.filter((application) => ["submitted", "pending", "under_review"].includes(application.status)).length,
      Icon: PendingActionsIcon,
      color: "#fbbf24",
    },
    {
      label: "Approved",
      value: applications.filter((application) => application.status === "approved").length,
      Icon: CheckCircleIcon,
      color: "#27ca40",
    },
    {
      label: "Denied",
      value: applications.filter((application) => application.status === "denied").length,
      Icon: CancelIcon,
      color: "#ef4444",
    },
    { label: "This Month", value: thisMonthCount, Icon: CalendarTodayIcon, color: "#a78bfa" },
  ];

  const canTakeAction = (status) => ["submitted", "pending", "under_review"].includes(String(status));
  const canRunScreening = (status) => ["submitted", "pending"].includes(String(status));
  const canCreateLease = (status) => String(status) === "approved";

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const openDrawer = (application) => {
    setSelectedApp(application);
    setActiveTab(0);
  };

  const closeDrawer = () => {
    setSelectedApp(null);
  };

  const runAction = async (application, action, options) => {
    const { loadingKey, successMessage, closeOnSuccess = false } = options;
    if (!application?.id) return;

    try {
      setActionLoading(`${loadingKey}-${application.id}`);
      await action(application.id);
      await loadApplications();
      showSnackbar(successMessage);
      if (closeOnSuccess) {
        setSelectedApp(null);
      }
    } catch {
      showSnackbar("Unable to complete action.", "error");
    } finally {
      setActionLoading("");
    }
  };

  const handleApprove = (application) =>
    runAction(application, () => approveApplication(application.id), {
      loadingKey: "approve",
      successMessage: "Application approved",
      closeOnSuccess: true,
    });

  const handleDeny = (application) =>
    runAction(application, () => denyApplication(application.id), {
      loadingKey: "deny",
      successMessage: "Application denied",
      closeOnSuccess: true,
    });

  const handleScreening = (application) =>
    runAction(application, () => runApplicationScreening(application.id), {
      loadingKey: "screening",
      successMessage: "Screening initiated",
    });

  const handleCreateLease = (application) =>
    runAction(application, () => createLeaseFromApplication(application.id), {
      loadingKey: "lease",
      successMessage: "Lease created",
      closeOnSuccess: true,
    });

  const openMenu = (event, application) => {
    setMenuAnchor(event.currentTarget);
    setMenuRow(application);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuRow(null);
  };

  const buildResidenceList = (application) => {
    const list = [];
    const history = application.previous_addresses || application.residence_history;
    if (Array.isArray(history)) {
      history.forEach((entry) => {
        if (!entry) return;
        const entryTitle = entry.address || entry.unit || entry.title || "Residence entry";
        const entryDesc = [
          entry.unit && `Unit ${entry.unit}`,
          entry.dates || entry.date_range,
          entry.landlord,
          entry.reason_for_leaving,
        ]
          .filter(Boolean)
          .join(" · ");
        list.push({ title: entryTitle, description: entryDesc || "Residence details provided." });
      });
    }

    if (application.current_landlord || application.current_landlord_name) {
      list.push({
        title: "Current Landlord",
        description: [
          application.current_landlord_name || application.current_landlord,
          application.current_landlord_phone,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    }

    if (application.reason_for_leaving) {
      list.push({
        title: "Reason for Leaving",
        description: application.reason_for_leaving,
      });
    }

    if (application.current_address || application.current_city || application.current_state || application.current_zip) {
      list.push({
        title: "Current Address",
        description: [
          application.current_address,
          application.current_city,
          application.current_state,
          application.current_zip,
        ]
          .filter(Boolean)
          .join(", "),
      });
    }

    return list;
  };

  const buildReferenceList = (application) => {
    const list = [];
    if (Array.isArray(application.references)) {
      application.references.forEach((reference, index) => {
        if (!reference) return;
        list.push({
          title: reference.name || reference.reference_name || `Reference ${index + 1}`,
          description: [reference.relationship || reference.reference_relationship, reference.phone || reference.reference_phone]
            .filter(Boolean)
            .join(" · "),
        });
      });
    } else if (application.reference_name || application.reference_phone || application.reference_relationship) {
      list.push({
        title: application.reference_name || "Reference",
        description: [application.reference_relationship, application.reference_phone].filter(Boolean).join(" · "),
      });
    }

    return list;
  };

  const personalRows = (application) => [
    { label: "Full Name", value: getApplicantName(application) },
    { label: "Email", value: application.email },
    { label: "Phone", value: application.phone || application.phone_number },
    { label: "Date of Birth", value: formatDate(application.date_of_birth) },
    {
      label: "Current Address",
      value: [
        application.current_address,
        application.current_city,
        application.current_state,
        application.current_zip,
      ]
        .filter(Boolean)
        .join(", "),
    },
  ];

  const employmentRows = (application) => [
    { label: "Employer Name", value: application.employer_name || application.employer },
    { label: "Job Title", value: application.job_title || application.position },
    { label: "Monthly Income", value: formatCurrency(application.monthly_income) },
    { label: "Annual Income", value: formatCurrency(application.annual_income) },
    { label: "Employment Length", value: application.employment_length || application.years_employed },
    { label: "Employer Phone", value: application.employer_phone },
  ];

  return (
    <Box sx={{ color: "#fff", p: 1 }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>Applications</Typography>
        <Typography sx={{ color: MUTED }}>Review rental applications, track status, and start approvals.</Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 1.4, mb: 2.2, overflowX: "auto", pb: 0.5 }}>
        {summaryStats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} Icon={stat.Icon} color={stat.color} />
        ))}
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 1,
          mb: 1.3,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search by name or unit..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: MUTED, fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 260 }}
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="submitted">Submitted</MenuItem>
              <MenuItem value="under_review">Under Review</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="denied">Denied</MenuItem>
              <MenuItem value="withdrawn">Withdrawn</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
              <MenuItem value="desc">Newest first</MenuItem>
              <MenuItem value="asc">Oldest first</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Coming soon">
            <span>
              <IconButton size="small" disabled>
                <ViewColumnIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <Button
          component={Link}
          to="/listings"
          startIcon={<AddRoundedIcon />}
          variant="outlined"
          size="small"
          sx={{
            borderColor: "rgba(255, 255, 255, 0.35)",
            color: MUTED,
            textTransform: "none",
            "&:hover": { borderColor: ACCENT, color: "#fff" },
          }}
        >
          Open Listings
        </Button>
      </Box>

      {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}

      <TableContainer component={Paper} sx={{ borderRadius: 2, border: "1px solid rgba(255,255,255,0.06)", bgcolor: "transparent" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={tableHeaderSx}>Applicant</TableCell>
              <TableCell sx={tableHeaderSx}>Unit</TableCell>
              <TableCell sx={tableHeaderSx}>Applied</TableCell>
              <TableCell sx={tableHeaderSx}>Income</TableCell>
              <TableCell sx={tableHeaderSx}>Status</TableCell>
              <TableCell sx={tableHeaderSx} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ borderBottom: "none", py: 8 }}>
                  <Box sx={{ display: "grid", placeItems: "center" }}>
                    <CircularProgress size={24} />
                  </Box>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ borderBottom: "none", py: 8 }}>
                  <Box sx={{ display: "grid", placeItems: "center" }}>
                    <DescriptionIcon sx={{ fontSize: 56, color: "rgba(255,255,255,0.2)", mb: 1.5 }} />
                    <Typography sx={{ color: MUTED }}>No applications yet</Typography>
                    <Typography sx={{ color: MUTED }}>Applications will appear here when tenants apply to your listings.</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : null}

            {!loading &&
              filtered.map((application) => {
                const ratio = ratioMeta(application.monthly_income, getUnitMeta(application).rentAmount);
                return (
                  <TableRow
                    key={application.id}
                    onClick={() => openDrawer(application)}
                    sx={{
                      cursor: "pointer",
                      "& td": {
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        fontSize: 13,
                        color: "#fff",
                      },
                      "&:hover": { backgroundColor: "rgba(255,255,255,0.02)" },
                    }}
                  >
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>{getApplicantName(application)}</Typography>
                      <Typography sx={{ color: MUTED, fontSize: "0.75rem" }}>{application.email || "-"}</Typography>
                    </TableCell>
                    <TableCell>{unitLabel(application)}</TableCell>
                    <TableCell>
                      <Typography>{formatDate(application.created_at)}</Typography>
                      <Typography sx={{ color: MUTED, fontSize: "0.75rem" }}>{formatRelative(application.created_at)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ color: "#fff" }}>{formatCurrency(application.monthly_income)}</Typography>
                      {ratio.value ? (
                        <Typography variant="caption" sx={{ color: ratio.color }}>{ratio.text}</Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={titleCase(application.status)} sx={statusChipStyle(application.status)} />
                    </TableCell>
                    <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.4 }}>
                        <Tooltip title="Review">
                          <IconButton
                            size="small"
                            onClick={() => openDrawer(application)}
                            sx={{ color: "rgba(255,255,255,0.75)" }}
                          >
                            <VisibilityIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        {canTakeAction(application.status) ? (
                          <>
                            <Tooltip title="Approve">
                              <IconButton
                                size="small"
                                onClick={() => handleApprove(application)}
                                disabled={actionLoading === `approve-${application.id}`}
                                sx={{ color: "#27ca40" }}
                              >
                                <CheckCircleIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Deny">
                              <IconButton
                                size="small"
                                onClick={() => handleDeny(application)}
                                disabled={actionLoading === `deny-${application.id}`}
                                sx={{ color: "#ef4444" }}
                              >
                                <CancelIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : null}
                        <Tooltip title="More">
                          <IconButton
                            size="small"
                            onClick={(event) => openMenu(event, application)}
                            sx={{ color: "rgba(255,255,255,0.75)" }}
                          >
                            <MoreVertIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        PaperProps={{
          sx: {
            backgroundColor: "#0d0d14",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff",
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuRow) handleScreening(menuRow);
            closeMenu();
          }}
          disabled={!menuRow || !canRunScreening(menuRow?.status)}
        >
          Run Screening
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuRow) openDrawer(menuRow);
            closeMenu();
          }}
        >
          View Detail
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuRow) handleCreateLease(menuRow);
            closeMenu();
          }}
          disabled={!menuRow || !canCreateLease(menuRow?.status)}
        >
          Create Lease
        </MenuItem>
        <MenuItem
          onClick={() => {
            window.alert("Message applicant feature coming soon.");
            closeMenu();
          }}
        >
          Message Applicant
        </MenuItem>
      </Menu>

      <Drawer
        anchor="right"
        open={Boolean(selectedApp)}
        onClose={closeDrawer}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: "550px" },
            backgroundColor: "#0d0d14",
            p: 0,
          },
        }}
      >
        {selectedApp ? (
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Box sx={{ p: 3, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{getApplicantName(selectedApp)}</Typography>
                  <Typography sx={{ mt: 0.5, color: MUTED }}>Applied for: {unitLabel(selectedApp)}</Typography>
                  <Typography sx={{ mt: 0.5, color: "rgba(255,255,255,0.45)" }}>Submitted {formatDate(selectedApp.created_at)}</Typography>
                  <Chip
                    size="small"
                    label={titleCase(selectedApp.status)}
                    sx={{ mt: 1.2, ...statusChipStyle(selectedApp.status) }}
                  />
                </Box>
                <IconButton onClick={closeDrawer} sx={{ color: "rgba(255,255,255,0.65)" }}>
                  <CloseIcon />
                </IconButton>
              </Box>

              {(() => {
                const ratio = ratioMeta(selectedApp.monthly_income, getUnitMeta(selectedApp).rentAmount);
                return (
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: "rgba(255,255,255,0.02)",
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography sx={{ color: MUTED, fontSize: 12 }}>Monthly Income</Typography>
                      <Typography sx={{ fontWeight: 700 }}>{formatCurrency(selectedApp.monthly_income)}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: MUTED, fontSize: 12 }}>Income Ratio</Typography>
                      <Typography sx={{ fontWeight: 700, color: ratio.color }}>{ratio.value ? `${ratio.value.toFixed(1)}x` : "-"}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: MUTED, fontSize: 12 }}>Credit Score</Typography>
                      <Typography sx={{ fontWeight: 700 }}>{selectedApp.credit_score || "-"}</Typography>
                    </Box>
                  </Box>
                );
              })()}
            </Box>

            <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <Tabs
                value={activeTab}
                onChange={(event, next) => setActiveTab(next)}
                sx={{
                  px: 1,
                  "& .MuiTab-root": { textTransform: "none", color: "rgba(255,255,255,0.6)" },
                  "& .Mui-selected": { color: "#fff" },
                }}
              >
                <Tab label="Personal Info" />
                <Tab label="Residence History" />
                <Tab label="Employment" />
                <Tab label="References" />
              </Tabs>
            </Box>

            <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
              <TabPanel value={activeTab} index={0}>
                <DetailGrid rows={personalRows(selectedApp)} />
              </TabPanel>
              <TabPanel value={activeTab} index={1}>
                {buildResidenceList(selectedApp).length ? (
                  <SubtleCardList title="residence history" items={buildResidenceList(selectedApp)} />
                ) : (
                  <Typography sx={{ color: MUTED }}>Residence history not available for this application.</Typography>
                )}
              </TabPanel>
              <TabPanel value={activeTab} index={2}>
                <DetailGrid rows={employmentRows(selectedApp)} />
              </TabPanel>
              <TabPanel value={activeTab} index={3}>
                {buildReferenceList(selectedApp).length ? (
                  <SubtleCardList title="references" items={buildReferenceList(selectedApp)} />
                ) : (
                  <Typography sx={{ color: MUTED }}>No references provided.</Typography>
                )}
              </TabPanel>
            </Box>

            <Box
              sx={{
                position: "sticky",
                bottom: 0,
                p: 2.2,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
                backgroundColor: "#0d0d14",
              }}
            >
              {canTakeAction(selectedApp.status) ? (
                <>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleApprove(selectedApp)}
                    disabled={actionLoading === `approve-${selectedApp.id}`}
                    sx={{ backgroundColor: "#27ca40", textTransform: "none", "&:hover": { backgroundColor: "#22a13a" } }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleDeny(selectedApp)}
                    disabled={actionLoading === `deny-${selectedApp.id}`}
                    sx={{
                      color: "#ef4444",
                      borderColor: "rgba(239,68,68,0.4)",
                      textTransform: "none",
                      "&:hover": { borderColor: "rgba(239,68,68,0.7)" },
                    }}
                  >
                    Deny
                  </Button>
                </>
              ) : null}

              {canRunScreening(selectedApp.status) ? (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleScreening(selectedApp)}
                  disabled={actionLoading === `screening-${selectedApp.id}`}
                  sx={{ borderColor: "#7C5CFC", color: "#7C5CFC", textTransform: "none" }}
                >
                  Run Screening
                </Button>
              ) : null}

              {canCreateLease(selectedApp.status) ? (
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleCreateLease(selectedApp)}
                  disabled={actionLoading === `lease-${selectedApp.id}`}
                  sx={{ backgroundColor: "#7C5CFC", textTransform: "none" }}
                >
                  Create Lease
                </Button>
              ) : null}
            </Box>
          </Box>
        ) : null}
      </Drawer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Applications;

