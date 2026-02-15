import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloseIcon from "@mui/icons-material/Close";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PendingIcon from "@mui/icons-material/Pending";
import SearchIcon from "@mui/icons-material/Search";
import TimelineIcon from "@mui/icons-material/Timeline";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import ViewAgendaIcon from "@mui/icons-material/ViewAgenda";
import ViewHeadlineIcon from "@mui/icons-material/ViewHeadline";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
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
  deleteScreening,
  getScreenings,
  runScreening,
  sendScreeningConsent,
  updateScreening,
} from "../services/api";
import { useUser } from "../services/userContext";

const ACCENT = "#7C5CFC";
const MUTED = "rgba(255,255,255,0.55)";

const tableHeaderSx = {
  backgroundColor: "rgba(255, 255, 255, 0.03)",
  color: MUTED,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fontSize: 11,
  fontWeight: 600,
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";

const scoreStyle = (score) => {
  if (score >= 750) {
    return { color: "#27ca40", label: "Excellent", bg: "rgba(39,202,64,0.15)" };
  }
  if (score >= 650) {
    return { color: "#f59e0b", label: "Good", bg: "rgba(245,158,11,0.15)" };
  }
  return { color: "#ef4444", label: "Fair", bg: "rgba(239,68,68,0.15)" };
};

const getTenantName = (screening) => {
  const tenant = screening?.tenant_detail || {};
  const fullName = `${tenant?.first_name || ""} ${tenant?.last_name || ""}`.trim();
  return fullName || `Tenant #${screening?.tenant || "-"}`;
};

const getTenantEmail = (screening) => {
  return screening?.tenant_detail?.email || screening?.tenant_email || "-";
};

const getPropertyAndUnit = (screening) => {
  const property = screening?.property_name || "-";
  const unit =
    screening?.unit_number ||
    screening?.unit_detail?.unit_number ||
    screening?.unit_detail?.number ||
    screening?.unit ||
    screening?.unit_name ||
    screening?.unit_identifier;
  if (property && unit) {
    return `${property} · Unit ${unit}`;
  }
  if (property) return property;
  if (unit) return `Unit ${unit}`;
  return "—";
};

const getConsentStatusMeta = (value) => {
  const normalized = `${value || ""}`.toLowerCase();
  if (normalized === "pending" || normalized === "awaiting") {
    return { label: "Awaiting", bg: "rgba(245,158,11,0.15)", color: "#f59e0b" };
  }
  if (normalized === "consented") {
    return { label: "Consented", bg: "rgba(39,202,64,0.15)", color: "#27ca40" };
  }
  if (normalized === "declined" || normalized === "expired") {
    return { label: "Expired", bg: "rgba(239,68,68,0.15)", color: "#ef4444" };
  }
  return { label: "Unknown", bg: "rgba(156,163,175,0.15)", color: "#9ca3af" };
};

const getReportMeta = (status) => {
  const normalized = `${status || ""}`.toLowerCase();
  if (normalized === "completed") {
    return { label: "Completed", bg: "rgba(39,202,64,0.15)", color: "#27ca40" };
  }
  if (normalized === "processing") {
    return { label: "In Progress", bg: "rgba(59,130,246,0.15)", color: "#3b82f6" };
  }
  return { label: "Pending", bg: "rgba(156,163,175,0.15)", color: "#9ca3af" };
};

const getRecommendationMeta = (recommendation) => {
  const normalized = `${recommendation || ""}`.toLowerCase();
  if (normalized === "approved") {
    return { label: "Approved", bg: "rgba(39,202,64,0.15)", color: "#27ca40" };
  }
  if (normalized === "conditional") {
    return { label: "Conditional", bg: "rgba(251,191,36,0.15)", color: "#fbbf24" };
  }
  if (normalized === "denied") {
    return { label: "Denied", bg: "rgba(239,68,68,0.15)", color: "#ef4444" };
  }
  return { label: "Pending", bg: "rgba(156,163,175,0.15)", color: "#9ca3af" };
};

const getBackgroundMeta = (value) => {
  const normalized = `${value || ""}`.toLowerCase();
  if (normalized === "clear") return { label: "Clear", color: "#27ca40", status: "clear" };
  if (normalized === "review_needed") return { label: "Review Needed", color: "#f59e0b", status: "review" };
  if (normalized === "flagged") return { label: "Flagged", color: "#ef4444", status: "flagged" };
  return { label: "-", color: "rgba(255,255,255,0.45)", status: "pending" };
};

const normalizeRecommendationFilter = (value) => `${value || "all"}`.toLowerCase();
const normalizeConsentFilter = (value) => `${value || "all"}`.toLowerCase();

const getApplication = (screening) => {
  const app = screening?.application || screening?.application_detail || screening?.rental_application;
  if (!app) return null;
  if (typeof app === "number" || typeof app === "string") {
    return { id: app };
  }
  return {
    id: app.id || app.application_id,
    unit: app.unit || app.unit_label || app.unit_number,
    property: app.property_name || app.property || app.property_detail?.name,
    status: app.status,
    income: app.monthly_income || app.income,
    applicant_name: app.applicant_name || `${app.first_name || ""} ${app.last_name || ""}`.trim(),
  };
};

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ mt: 2 }}>{children}</Box>;
}

function StatTile({ label, value, Icon, color }) {
  return (
    <Card
      sx={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 1.5,
        p: 2,
        color: "#fff",
        flex: 1,
        minWidth: 180,
      }}
    >
      <Box sx={{ color, mb: 1 }}>
        <Icon sx={{ fontSize: 21 }} />
      </Box>
      <Typography sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }} color="#fff">
        {value}
      </Typography>
      <Typography sx={{ color: MUTED, mt: 0.7, fontSize: 12 }}>{label}</Typography>
    </Card>
  );
}

function ScreeningList() {
  const navigate = useNavigate();
  const { role } = useUser();

  const [screenings, setScreenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [consentFilter, setConsentFilter] = useState("all");
  const [reportFilter, setReportFilter] = useState("all");
  const [recommendationFilter, setRecommendationFilter] = useState("all");
  const [activeTab, setActiveTab] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuScreening, setMenuScreening] = useState(null);
  const [actionLoading, setActionLoading] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const loadScreenings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getScreenings();
      setScreenings(Array.isArray(response.data) ? response.data : response.data?.results || []);
      setError("");
    } catch {
      setScreenings([]);
      setError("Unable to load screening requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === "landlord") {
      loadScreenings();
    } else {
      setLoading(false);
    }
  }, [role, loadScreenings]);

  const showSnackbar = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

    const stats = useMemo(() => {
    const total = screenings.length;
    const awaitingConsent = screenings.filter(
      (screening) => {
        const consentValue = `${screening?.consent_status || ""}`.toLowerCase();
        return consentValue === "pending" || consentValue === "awaiting";
      }
    ).length;
    const inProgress = screenings.filter(
      (screening) => {
        const status = `${screening?.status || ""}`.toLowerCase();
        return status === "processing" || status === "pending";
      }
    ).length;
    const completed = screenings.filter(
      (screening) => `${screening?.status || ""}`.toLowerCase() === "completed"
    ).length;
    const eligible = screenings.filter(
      (screening) => `${screening?.status || ""}`.toLowerCase() === "completed"
    );
    const approved = eligible.filter(
      (screening) => `${screening?.recommendation || ""}`.toLowerCase() === "approved"
    ).length;
    const approvalRate = eligible.length ? Math.round((approved / eligible.length) * 100) : 0;

    return [
      { label: "Total Screenings", value: total, Icon: VerifiedUserIcon, color: ACCENT },
      { label: "Awaiting Consent", value: awaitingConsent, Icon: PendingIcon, color: "#f59e0b" },
      { label: "In Progress", value: inProgress, Icon: ViewHeadlineIcon, color: "#3b82f6" },
      { label: "Completed", value: completed, Icon: CheckCircleIcon, color: "#27ca40" },
      { label: "Approval Rate", value: `${approvalRate}%`, Icon: ViewAgendaIcon, color: "#27ca40" },
    ];
  }, [screenings]);

    const filteredScreenings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return screenings.filter((screening) => {
      const consentValue = `${screening?.consent_status || "all"}`.toLowerCase();
      const statusValue = `${screening?.status || ""}`.toLowerCase();
      const recommendationValue = `${screening?.recommendation || ""}`.toLowerCase() || "pending";
      const tenantName = getTenantName(screening).toLowerCase();
      const tenantEmail = `${getTenantEmail(screening) || ""}`.toLowerCase();

      if (normalizeConsentFilter(consentFilter) !== "all") {
        if (normalizeConsentFilter(consentFilter) === "awaiting" && !["pending", "awaiting"].includes(consentValue)) return false;
        if (normalizeConsentFilter(consentFilter) === "consented" && consentValue !== "consented") return false;
      }

      if (normalizeRecommendationFilter(recommendationFilter) !== "all") {
        if (normalizeRecommendationFilter(recommendationFilter) === "pending") {
          if (recommendationValue !== "pending") return false;
        } else if (recommendationValue !== normalizeRecommendationFilter(recommendationFilter)) {
          return false;
        }
      }

      if (reportFilter !== "all") {
        if (reportFilter === "pending") {
          if (!["pending", "processing", "failed"].includes(statusValue)) return false;
        } else if (reportFilter === "completed") {
          if (statusValue !== "completed") return false;
        }
      }

      if (!normalizedSearch) return true;
      return tenantName.includes(normalizedSearch) || tenantEmail.includes(normalizedSearch);
    });
  }, [screenings, consentFilter, reportFilter, recommendationFilter, search]);

  const handleOpenDrawer = useCallback((screening) => {
    setSelected(screening);
    setActiveTab(0);
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelected(null);
  };

  const doAction = async ({ key, action, successMessage }) => {
    try {
      setActionLoading(key);
      await action();
      await loadScreenings();
      if (selected?.id) {
        const refreshed = screenings.find((item) => item.id === selected.id) || null;
        setSelected(refreshed);
      }
      if (key.includes("delete")) {
        handleCloseDrawer();
      }
      showSnackbar(successMessage, "success");
    } catch {
      showSnackbar("Action failed. Please try again.", "error");
    } finally {
      setActionLoading("");
    }
  };

  const handleResendConsent = (screening) =>
    doAction({
      key: `resend-${screening.id}`,
      action: () => sendScreeningConsent(screening.id),
      successMessage: "Consent link resent",
    });

  const handleRunScreening = (screening) =>
    doAction({
      key: `run-${screening.id}`,
      action: () => runScreening(screening.id),
      successMessage: "Screening initiated",
    });

  const handleApproveApplicant = (screening) =>
    doAction({
      key: `approve-${screening.id}`,
      action: () =>
        updateScreening(screening.id, {
          recommendation: "approved",
          status: screening.status || "completed",
        }),
      successMessage: "Recommendation saved as Approved",
    });

  const handleDenyApplicant = (screening) =>
    doAction({
      key: `deny-${screening.id}`,
      action: () =>
        updateScreening(screening.id, {
          recommendation: "denied",
          status: screening.status || "completed",
        }),
      successMessage: "Recommendation saved as Denied",
    });

  const handleDeleteScreening = (screening) =>
    doAction({
      key: `delete-${screening.id}`,
      action: () => deleteScreening(screening.id),
      successMessage: "Screening removed",
    });

  const showMenu = (event, screening) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuScreening(screening);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuScreening(null);
  };

  const openApplicationFromMenu = () => {
    if (!menuScreening) return;
    const app = getApplication(menuScreening);
    if (!app?.id) {
      showSnackbar("This screening is not linked to an application.", "error");
      return;
    }
    navigate(`/applications/${app.id}`);
    closeMenu();
  };

  const sendReminderFromMenu = () => {
    if (!menuScreening) return;
    handleResendConsent(menuScreening);
    closeMenu();
  };

  const deleteFromMenu = () => {
    if (!menuScreening) return;
    handleDeleteScreening(menuScreening);
    closeMenu();
  };

  const copyConsentLink = async () => {
    if (!selected?.consent_token) return;
    const link = `${window.location.origin}/screening/consent/${selected.consent_token}`;
    try {
      await navigator.clipboard.writeText(link);
      showSnackbar("Consent link copied");
    } catch {
      showSnackbar("Unable to copy consent link.", "error");
    }
  };

  if (role !== "landlord") {
    return (
      <Paper sx={{ p: 2, bgcolor: "background.paper" }}>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Screening tools are available to landlord accounts only.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ p: 1, color: "#fff" }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>Screenings</Typography>
        <Typography sx={{ color: MUTED }}>Review tenant background checks and manage screening workflow.</Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 1.4, mb: 2.2, overflowX: "auto", pb: 0.3, alignItems: "stretch" }}>
        {stats.map((stat) => (
          <StatTile key={stat.label} label={stat.label} value={stat.value} Icon={stat.Icon} color={stat.color} />
        ))}
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.2, mb: 1.6 }}>
        <TextField
          size="small"
          placeholder="Search by tenant name..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: MUTED, fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 240 }}
        />
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <Select value={consentFilter} onChange={(event) => setConsentFilter(event.target.value)} displayEmpty>
            <MenuItem value="all">Consent Status: All</MenuItem>
            <MenuItem value="awaiting">Awaiting Consent</MenuItem>
            <MenuItem value="consented">Consented</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <Select value={reportFilter} onChange={(event) => setReportFilter(event.target.value)} displayEmpty>
            <MenuItem value="all">Report Status: All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <Select
            value={recommendationFilter}
            onChange={(event) => setRecommendationFilter(event.target.value)}
            displayEmpty
          >
            <MenuItem value="all">Recommendation: All</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="conditional">Conditional</MenuItem>
            <MenuItem value="denied">Denied</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error ? <Alert severity="error" sx={{ mb: 1.2 }}>{error}</Alert> : null}

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          border: "1px solid rgba(255,255,255,0.06)",
          bgcolor: "transparent",
          overflowX: "auto",
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={tableHeaderSx}>Tenant</TableCell>
              <TableCell sx={tableHeaderSx}>Property · Unit</TableCell>
              <TableCell sx={tableHeaderSx}>Date Requested</TableCell>
              <TableCell sx={tableHeaderSx}>Consent</TableCell>
              <TableCell sx={tableHeaderSx}>Report</TableCell>
              <TableCell sx={tableHeaderSx}>Credit Score</TableCell>
              <TableCell sx={tableHeaderSx}>Background</TableCell>
              <TableCell sx={tableHeaderSx}>Recommendation</TableCell>
              <TableCell sx={tableHeaderSx} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} sx={{ borderBottom: "none", py: 7.5 }}>
                  <Box sx={{ display: "grid", placeItems: "center" }}>
                    <CircularProgress size={23} />
                  </Box>
                </TableCell>
              </TableRow>
            ) : filteredScreenings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} sx={{ borderBottom: "none", py: 6 }}>
                  <Box sx={{ display: "grid", placeItems: "center", textAlign: "center" }}>
                    <VerifiedUserIcon sx={{ fontSize: 56, color: "rgba(255,255,255,0.2)", mb: 1.2 }} />
                    {search || consentFilter !== "all" || reportFilter !== "all" || recommendationFilter !== "all" ? (
                      <>
                        <Typography sx={{ color: MUTED, fontWeight: 600 }}>No screenings match your filters.</Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.5)", mt: 0.5 }}>Try adjusting the search or filters.</Typography>
                      </>
                    ) : (
                      <>
                        <Typography sx={{ color: MUTED, fontWeight: 600 }}>No screenings yet</Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.5)", mt: 0.5 }}>
                          Screenings will appear here when you initiate them from the Applications page or create them manually.
                        </Typography>
                      </>
                    )}
                    <Button
                      variant="contained"
                      size="small"
                      component={Link}
                      to="/screenings/new"
                      sx={{ mt: 1.5, backgroundColor: ACCENT }}
                    >
                      + New Screening
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ) : null}

            {!loading &&
              filteredScreenings.map((screening) => {
                const tenantName = getTenantName(screening);
                const tenantEmail = getTenantEmail(screening);
                const score = Number(screening?.credit_score || 0);
                const scoreMeta = scoreStyle(score || 0);
                const backgroundMeta = getBackgroundMeta(screening.background_check);
                const consentMeta = getConsentStatusMeta(screening.consent_status);
                const reportMeta = getReportMeta(screening.status);
                const recommendationMeta = getRecommendationMeta(screening.recommendation);

                const canResend =
                  `${screening?.consent_status || ""}`.toLowerCase() === "pending" ||
                  `${screening?.consent_status || ""}`.toLowerCase() === "awaiting";
                const canRun =
                  `${screening?.consent_status || ""}`.toLowerCase() === "consented" &&
                  ["pending", "processing", "failed"].includes(`${screening?.status || ""}`.toLowerCase());
                const canViewReport = `${screening?.status || ""}`.toLowerCase() === "completed";

                return (
                  <TableRow
                    key={screening.id}
                    onClick={() => handleOpenDrawer(screening)}
                    sx={{
                      cursor: "pointer",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      "&:hover": {
                        backgroundColor: "rgba(255,255,255,0.02)",
                      },
                    }}
                  >
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, color: "#fff" }}>{tenantName}</Typography>
                      <Typography sx={{ color: MUTED, fontSize: "0.75rem" }}>{tenantEmail}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: "0.75rem" }}>{getPropertyAndUnit(screening)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography>{formatDate(screening.created_at)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={consentMeta.label}
                        sx={{
                          bgcolor: consentMeta.bg,
                          color: consentMeta.color,
                          fontSize: "0.7rem",
                          height: 22,
                          textTransform: "capitalize",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={reportMeta.label}
                        sx={{
                          bgcolor: reportMeta.bg,
                          color: reportMeta.color,
                          fontSize: "0.7rem",
                          height: 22,
                          textTransform: "capitalize",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {screening.credit_score ? (
                        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.6 }}>
                          <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: scoreMeta.color }} />
                          <Typography sx={{ color: scoreMeta.color, fontWeight: 700, fontSize: "0.9rem" }}>
                            {screening.credit_score}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ color: "rgba(255,255,255,0.45)" }}>-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ color: backgroundMeta.color, fontSize: "0.75rem", textTransform: "capitalize" }}>
                        {backgroundMeta.label}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={recommendationMeta.label}
                        sx={{
                          bgcolor: recommendationMeta.bg,
                          color: recommendationMeta.color,
                          fontSize: "0.7rem",
                          height: 22,
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.6 }}>
                        {canResend ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleResendConsent(screening)}
                            disabled={actionLoading === `resend-${screening.id}`}
                            sx={{ borderColor: "rgba(255,255,255,0.35)", color: MUTED, minWidth: 0, px: 1 }}
                          >
                            Resend Consent
                          </Button>
                        ) : null}
                        {canRun ? (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleRunScreening(screening)}
                            disabled={actionLoading === `run-${screening.id}`}
                            sx={{
                              minWidth: 0,
                              px: 1.2,
                              backgroundColor: ACCENT,
                              color: "#fff",
                            }}
                          >
                            Run Screening
                          </Button>
                        ) : null}
                        {canViewReport ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenDrawer(screening)}
                            sx={{ borderColor: ACCENT, color: ACCENT, minWidth: 0, px: 1.2 }}
                          >
                            View Report
                          </Button>
                        ) : null}
                        <Tooltip title="More actions">
                          <IconButton size="small" onClick={(event) => showMenu(event, screening)} sx={{ color: "rgba(255,255,255,0.7)" }}>
                            <MoreVertIcon sx={{ fontSize: 18 }} />
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

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: 550 },
            backgroundColor: "#0d0d14",
            borderLeft: "1px solid rgba(255,255,255,0.12)",
          },
        }}
      >
        {selected ? (
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Box sx={{ p: 3, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1.3 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff" }}>
                    {getTenantName(selected)}
                  </Typography>
                  <Typography sx={{ color: MUTED, mt: 0.5 }}>
                    Screening requested {formatDate(selected.created_at)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 0.8, alignItems: "center" }}>
                  <Chip
                    size="small"
                    label={getRecommendationMeta(selected.recommendation).label}
                    sx={{
                      bgcolor: getRecommendationMeta(selected.recommendation).bg,
                      color: getRecommendationMeta(selected.recommendation).color,
                      fontWeight: 600,
                    }}
                  />
                  <IconButton onClick={handleCloseDrawer} sx={{ color: "rgba(255,255,255,0.65)" }}>
                    <CloseIcon />
                  </IconButton>
                </Box>
              </Box>

              <Box sx={{ mt: 2, display: "flex", gap: 1.5 }}>
                {(() => {
                  const scoreValue = Number(selected?.credit_score || 0);
                  const scoreMeta = scoreValue ? scoreStyle(scoreValue) : { color: MUTED, label: "-", bg: "rgba(255,255,255,0.06)" };
                  const backgroundMeta = getBackgroundMeta(selected.background_check);
                  const recommendationMeta = getRecommendationMeta(selected.recommendation);

                  return (
                    <>
                      <Card
                        sx={{
                          flex: 1,
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <Typography sx={{ color: MUTED, fontSize: 11, mb: 0.5 }}>Credit Score</Typography>
                        <Typography sx={{ color: scoreMeta.color, fontWeight: 700, fontSize: 23 }}>
                          {selected.credit_score || "-"}
                        </Typography>
                        {scoreMeta.label ? <Typography sx={{ color: scoreMeta.color, fontSize: 11 }}>{scoreMeta.label}</Typography> : null}
                      </Card>
                      <Card
                        sx={{
                          flex: 1,
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <Typography sx={{ color: MUTED, fontSize: 11, mb: 0.5 }}>Background</Typography>
                        <Typography sx={{ color: backgroundMeta.color, fontWeight: 700 }}>{backgroundMeta.label}</Typography>
                      </Card>
                      <Card
                        sx={{
                          flex: 1,
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <Typography sx={{ color: MUTED, fontSize: 11, mb: 0.5 }}>Recommendation</Typography>
                        <Chip
                          size="small"
                          label={recommendationMeta.label}
                          sx={{
                            bgcolor: recommendationMeta.bg,
                            color: recommendationMeta.color,
                            fontWeight: 600,
                          }}
                        />
                      </Card>
                    </>
                  );
                })()}
              </Box>
            </Box>

            <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <Tabs
                value={activeTab}
                onChange={(event, next) => setActiveTab(next)}
                sx={{
                  px: 1,
                  "& .MuiTab-root": { textTransform: "none", color: "rgba(255,255,255,0.6)", minHeight: 40 },
                  "& .Mui-selected": { color: "#fff" },
                }}
              >
                <Tab label="Credit Report" />
                <Tab label="Background Check" />
                <Tab label="Consent & Timeline" />
                <Tab label="Application Link" />
              </Tabs>
            </Box>

            <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
              <TabPanel value={activeTab} index={0}>
                <Paper sx={{ p: 2, borderRadius: 2, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Typography sx={{ color: MUTED, mb: 1 }}>Credit Report</Typography>
                  <Box
                    sx={{
                      display: "grid",
                      placeItems: "center",
                      height: 130,
                      borderRadius: 2,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background:
                        selected?.credit_score
                          ? `conic-gradient(from 0deg, ${scoreStyle(selected.credit_score).color} 0deg, ${scoreStyle(selected.credit_score).color} ${(Number(selected.credit_score || 0) / 850) * 100}%, rgba(255,255,255,0.08) ${(Number(selected.credit_score || 0) / 850) * 100}%, rgba(255,255,255,0.08) 360deg)`
                          : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, fontSize: 28, color: "#fff" }}>
                      {selected.credit_score || "-"}
                    </Typography>
                  </Box>
                  <Typography sx={{ mt: 1.2, color: MUTED }}>Poor | Fair | Good | Excellent</Typography>
                  <Box sx={{ display: "flex", gap: 1.5, mt: 0.6 }}>
                    {[
                      { key: "Payment History" },
                      { key: "Credit Utilization" },
                      { key: "Account Age" },
                    ].map((factor, i) => {
                      const detail = Array.isArray(selected?.report_data?.key_factors)
                        ? selected.report_data.key_factors[i]
                        : null;
                      return (
                        <Box key={factor.key} sx={{ flex: 1 }}>
                          <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>{factor.key}</Typography>
                          <Typography sx={{ color: "#fff", fontWeight: 600 }}>{detail || "No details"}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                  {!selected?.credit_score ? (
                    <Typography sx={{ color: MUTED, mt: 1.5 }}>
                      Full credit report details are available in the screening provider&apos;s portal.
                    </Typography>
                  ) : null}
                </Paper>
              </TabPanel>
              <TabPanel value={activeTab} index={1}>
                <Paper sx={{ p: 2, borderRadius: 2, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                    <Typography sx={{ color: MUTED }}>Status</Typography>
                    <Typography sx={{ color: getBackgroundMeta(selected.background_check).color, fontWeight: 700 }}>
                      {getBackgroundMeta(selected.background_check).label}
                    </Typography>
                  </Box>
                  <Typography sx={{ mt: 1.1 }}>
                    Criminal records: <Typography component="span" sx={{ color: selected?.report_data?.criminal_records?.length ? "#ef4444" : "#27ca40" }}>
                      {selected?.report_data?.criminal_records?.length ? "Review findings" : "No records found"}
                    </Typography>
                  </Typography>
                  <Typography sx={{ mt: 0.8 }}>
                    Eviction history: <Typography component="span" sx={{ color: selected?.eviction_history === "records_found" ? "#ef4444" : "#27ca40" }}>
                      {selected?.eviction_history === "records_found" ? "Records found" : "No evictions found"}
                    </Typography>
                  </Typography>
                  <Typography sx={{ mt: 0.8 }}>
                    Sex offender registry: <Typography component="span" sx={{ color: "#27ca40" }}>
                      {selected?.report_data?.sex_offender_clear === false ? "Flagged" : "Clear"}
                    </Typography>
                  </Typography>
                </Paper>
              </TabPanel>

              <TabPanel value={activeTab} index={2}>
                <Paper sx={{ p: 2, borderRadius: 2, border: "1px solid rgba(255,255,255,0.06)" }}>
                  {[
                    { label: "Screening requested", value: selected.created_at },
                    { label: "Consent link sent", value: selected.updated_at },
                    { label: "Consent received", value: selected.consent_status === "consented" ? selected.consent_date : null },
                    { label: "Screening initiated", value: ["processing", "completed"].includes(`${selected.status}`) ? selected.updated_at : null },
                    { label: "Results received", value: selected.status === "completed" ? selected.updated_at : null },
                  ].map((event, index, arr) => {
                    const isLast = index === arr.length - 1;
                    return (
                      <Box key={event.label} sx={{ display: "flex", alignItems: "flex-start", gap: 1.2, mb: isLast ? 0 : 1.2 }}>
                        <Box sx={{ position: "relative", display: "flex", justifyContent: "center", width: 12, mt: 0.4 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: ACCENT }} />
                          {!isLast ? <Box sx={{ width: 1.2, backgroundColor: "rgba(255,255,255,0.3)", mt: 0.4, flex: 1 }} /> : null}
                        </Box>
                        <Box>
                          <Typography sx={{ color: "#fff", fontWeight: 600 }}>{event.label}</Typography>
                          <Typography sx={{ color: MUTED, fontSize: "0.75rem" }}>
                            {event.value ? formatDate(event.value) : "Awaiting"}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}

                  {selected?.consent_token ? (
                    <Box sx={{ mt: 2 }}>
                      <Typography sx={{ color: MUTED, mb: 0.6, fontSize: 12 }}>Consent link</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                        <Avatar
                          sx={{
                            width: 30,
                            height: 30,
                            bgcolor: "rgba(255,255,255,0.08)",
                            fontSize: 12,
                            color: "rgba(255,255,255,0.55)",
                          }}
                        >
                          <TimelineIcon sx={{ fontSize: 14 }} />
                        </Avatar>
                        <Typography
                          sx={{
                            color: "rgba(255,255,255,0.5)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            flex: 1,
                          }}
                        >
                          {`${window.location.origin}/screening/consent/${selected.consent_token}`}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          endIcon={<ContentCopyIcon />}
                          onClick={copyConsentLink}
                          sx={{ borderColor: "rgba(255,255,255,0.25)", color: MUTED }}
                        >
                          Copy
                        </Button>
                      </Box>
                    </Box>
                  ) : null}
                </Paper>
              </TabPanel>

              <TabPanel value={activeTab} index={3}>
                {getApplication(selected) ? (
                  <Paper sx={{ p: 2, borderRadius: 2, border: "1px solid rgba(255,255,255,0.06)" }}>
                    {(() => {
                      const app = getApplication(selected);
                      return (
                        <>
                          <Typography sx={{ fontWeight: 700, color: "#fff" }}>{app.applicant_name || getTenantName(selected)}</Typography>
                          <Typography sx={{ color: MUTED, mt: 0.6 }}>Unit: {app.unit || "-"}</Typography>
                          <Typography sx={{ color: MUTED, mt: 0.4 }}>Income: {app.income || "-"}</Typography>
                          <Typography sx={{ color: MUTED, mt: 0.4 }}>Status: {app.status || "-"}</Typography>
                          <Button
                            component={Link}
                            to={`/applications/${app.id}`}
                            size="small"
                            variant="outlined"
                            endIcon={<ArrowForwardIosIcon sx={{ fontSize: 12 }} />}
                            sx={{ mt: 1.6, borderColor: "rgba(124,92,252,0.4)", color: ACCENT }}
                          >
                            View Full Application
                          </Button>
                        </>
                      );
                    })()}
                  </Paper>
                ) : (
                  <Paper sx={{ p: 2, borderRadius: 2, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Typography sx={{ color: MUTED }}>This screening is not linked to an application.</Typography>
                  </Paper>
                )}
              </TabPanel>
            </Box>

            <Box
              sx={{
                position: "sticky",
                bottom: 0,
                px: 2,
                py: 2,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
                backgroundColor: "#0d0d14",
              }}
            >
              {selected?.status === "completed" && !["approved", "denied"].includes((selected?.recommendation || "").toLowerCase()) ? (
                <>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleApproveApplicant(selected)}
                    disabled={actionLoading === `approve-${selected.id}`}
                    sx={{ backgroundColor: "#27ca40", textTransform: "none", "&:hover": { backgroundColor: "#22a13a" } }}
                  >
                    Approve Applicant
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleDenyApplicant(selected)}
                    disabled={actionLoading === `deny-${selected.id}`}
                    sx={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.45)", textTransform: "none" }}
                  >
                    Deny Applicant
                  </Button>
                </>
              ) : null}

              {(selected?.recommendation || "").toLowerCase() !== "approved" &&
              (selected?.recommendation || "").toLowerCase() !== "denied" &&
              ["pending", "awaiting"].includes((selected?.consent_status || "").toLowerCase()) ? (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleResendConsent(selected)}
                  disabled={actionLoading === `resend-${selected.id}`}
                  sx={{ borderColor: "rgba(255,255,255,0.35)", color: MUTED, textTransform: "none" }}
                >
                  Resend Consent
                </Button>
              ) : null}

              {selected?.consent_status?.toLowerCase() === "consented" && selected?.status?.toLowerCase() !== "completed" ? (
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleRunScreening(selected)}
                  disabled={actionLoading === `run-${selected.id}`}
                  sx={{ backgroundColor: ACCENT, textTransform: "none" }}
                >
                  Run Screening
                </Button>
              ) : null}
            </Box>
          </Box>
        ) : null}
      </Drawer>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={openApplicationFromMenu}>View Application</MenuItem>
        <MenuItem onClick={sendReminderFromMenu}>Send Reminder</MenuItem>
        <MenuItem onClick={deleteFromMenu} sx={{ color: "#ef4444" }}>
          Delete
        </MenuItem>
      </Menu>

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

export default ScreeningList;




