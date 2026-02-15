import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
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
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BuildIcon from "@mui/icons-material/Build";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  deleteMaintenanceRequest,
  getMaintenanceRequests,
  getTenants,
  patchMaintenanceRequest,
} from "../services/api";
import { useUser } from "../services/userContext";

const priorityChipStyles = {
  emergency: {
    backgroundColor: "rgba(239,68,68,0.15)",
    color: "#ef4444",
  },
  high: {
    backgroundColor: "rgba(251,146,60,0.15)",
    color: "#fb923c",
  },
  medium: {
    backgroundColor: "rgba(251,191,36,0.15)",
    color: "#fbbf24",
  },
  low: {
    backgroundColor: "rgba(156,163,175,0.15)",
    color: "#9ca3af",
  },
};

const statusChipStyles = {
  submitted: {
    backgroundColor: "rgba(59,130,246,0.15)",
    color: "#3b82f6",
  },
  open: {
    backgroundColor: "rgba(59,130,246,0.15)",
    color: "#3b82f6",
  },
  in_progress: {
    backgroundColor: "rgba(251,191,36,0.15)",
    color: "#fbbf24",
  },
  completed: {
    backgroundColor: "rgba(39,202,64,0.15)",
    color: "#27ca40",
  },
  cancelled: {
    backgroundColor: "rgba(156,163,175,0.15)",
    color: "#9ca3af",
  },
};

const toTitle = (value = "") =>
  value
    .toString()
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");

const formatDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
};

const formatRelativeDate = (value) => {
  if (!value) return "";
  const now = new Date();
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "";
  const deltaSeconds = Math.round((target - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(deltaSeconds);
  const units = [
    { label: "year", seconds: 60 * 60 * 24 * 365 },
    { label: "month", seconds: 60 * 60 * 24 * 30 },
    { label: "day", seconds: 60 * 60 * 24 },
    { label: "hour", seconds: 60 * 60 },
    { label: "minute", seconds: 60 },
    { label: "second", seconds: 1 },
  ];

  for (const unit of units) {
    if (abs >= unit.seconds) {
      return rtf.format(Math.round(deltaSeconds / unit.seconds), unit.label);
    }
  }

  return "just now";
};

const getTenantName = (request) => {
  const tenant = request?.tenant_detail || {};
  const full = `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim();
  return full || tenant.username || tenant.email || tenant.name || "Unknown";
};

const getPropertyUnit = (request) => {
  const unitNumber = request?.unit_detail?.unit_number || request?.unit_number || request?.unit || "";
  const propertyName =
    request?.unit_detail?.property_name ||
    request?.property_name ||
    request?.property?.name ||
    request?.unit_detail?.property?.name ||
    "";

  if (propertyName && unitNumber) return `${propertyName} · ${unitNumber}`;
  if (propertyName) return propertyName;
  if (unitNumber) return unitNumber;
  return "—";
};

const getStatusLabel = (status = "") =>
  status === "submitted" ? "Open" : toTitle(status);

const getPriorityWeight = (priority = "") => {
  const normalized = priority.toLowerCase();
  if (normalized === "emergency") return 4;
  if (normalized === "high") return 3;
  if (normalized === "medium") return 2;
  if (normalized === "low") return 1;
  return 0;
};

const getStatusSuccessMessage = (status) => {
  if (status === "in_progress") return "Status changed to In Progress";
  if (status === "completed") return "Request completed";
  if (status === "cancelled") return "Request cancelled";
  return "Request updated";
};

const statusFilterOptions = ["All", "Open", "In Progress", "Completed", "Cancelled"];
const priorityFilterOptions = ["All Priorities", "Emergency", "High", "Medium", "Low"];
const sortOptions = ["Newest first", "Oldest first", "Priority (high to low)"];

const tableHeaderCellSx = {
  color: "text.secondary",
  textTransform: "uppercase",
  fontSize: "11px",
  letterSpacing: "0.06em",
  backgroundColor: "rgba(255,255,255,0.03)",
  borderBottom: "1px solid",
  borderColor: "rgba(255,255,255,0.08)",
};

function MaintenanceList() {
  const theme = useTheme();
  const { role } = useUser();
  const location = useLocation();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortValue, setSortValue] = useState("Newest first");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRequest, setMenuRequest] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (role === "tenant") {
        const [requestsRes, tenantsRes] = await Promise.all([
          getMaintenanceRequests(),
          getTenants(),
        ]);
        const tenantId = (tenantsRes.data || [])[0]?.id;
        return (requestsRes.data || []).filter((item) => {
          const requestTenantId = item.tenant_detail?.id ?? item.tenant;
          return !tenantId || requestTenantId === tenantId;
        });
      }

      return (await getMaintenanceRequests()).data || [];
    } catch (err) {
      setError("Unable to load maintenance requests.");
      return [];
    } finally {
      setLoading(false);
    }
  }, [role]);

  const openDrawer = (request) => {
    setSelectedRequest(request);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedRequest(null);
  };
  const loadAndSetRequests = useCallback(async () => {
    const data = await loadRequests();
    setRequests(data);
    return data;
  }, [loadRequests]);

  const handleDelete = async (requestId) => {
    try {
      await deleteMaintenanceRequest(requestId);
      setSnackbar({ open: true, message: "Maintenance request deleted successfully.", severity: "success" });
      const data = await loadRequests();
      setRequests(data);
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest(null);
        setDrawerOpen(false);
      }
    } catch {
      setSnackbar({ open: true, message: "Failed to delete maintenance request.", severity: "error" });
    }
  };

  const openStatusMenu = (event, request) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuRequest(request);
  };

  const closeStatusMenu = () => {
    setMenuAnchor(null);
    setMenuRequest(null);
  };

  const updateRequestStatus = async (request, nextStatus, message = "") => {
    if (!request?.id || isUpdating) return;
    setIsUpdating(true);
    try {
      await patchMaintenanceRequest(request.id, { status: nextStatus });
      const data = await loadRequests();
      setRequests(data);
      const refreshed = data.find((item) => item.id === request.id);
      if (selectedRequest?.id === request.id) {
        setSelectedRequest(refreshed || request);
      }
      setSnackbar({
        open: true,
        message: message || getStatusSuccessMessage(nextStatus),
        severity: "success",
      });
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to update request status.",
        severity: "error",
      });
    } finally {
      setIsUpdating(false);
      closeStatusMenu();
    }
  };

  const filteredRequests = useMemo(() => {
    const search = searchTerm.toLowerCase();
    const list = requests.filter((request) => {
      if (statusFilter !== "All") {
        if (statusFilter === "Open") {
          const isOpenStatus = ["submitted", "open", "pending"].includes(request.status);
          if (!isOpenStatus) return false;
        } else {
          const normalized = statusFilter.toLowerCase().replace(" ", "_");
          if (request.status !== normalized) return false;
        }
      }

      if (priorityFilter !== "All") {
        if ((request.priority || "").toLowerCase() !== priorityFilter.toLowerCase()) return false;
      }

      if (searchTerm) {
        const unitText = `${request.unit_detail?.unit_number || request.unit_number || request.unit || ""}`.toLowerCase();
        return (
          (request.title || "").toLowerCase().includes(search) ||
          unitText.includes(search) ||
          (request.description || "").toLowerCase().includes(search)
        );
      }

      return true;
    });

    if (sortValue === "Newest first") {
      return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    if (sortValue === "Oldest first") {
      return [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return [...list].sort((a, b) => {
      const right = getPriorityWeight(b.priority);
      const left = getPriorityWeight(a.priority);
      if (right === left) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return right - left;
    });
  }, [requests, searchTerm, statusFilter, priorityFilter, sortValue]);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      open: requests.filter((request) => ["submitted", "open", "pending"].includes(request.status)).length,
      inProgress: requests.filter((request) => request.status === "in_progress").length,
      completed: requests.filter((request) => request.status === "completed").length,
      emergency: requests.filter((request) => request.priority === "emergency").length,
    };
  }, [requests]);

  const menuActionItems = [
    {
      label: "Mark In Progress",
      status: "in_progress",
      disabled: (request) => request.status === "in_progress" || request.status === "completed" || request.status === "cancelled",
      message: "Status changed to In Progress",
    },
    {
      label: "Mark Completed",
      status: "completed",
      disabled: (request) => request.status === "completed" || request.status === "cancelled",
      message: "Request completed",
    },
    {
      label: "Cancel Request",
      status: "cancelled",
      disabled: (request) => request.status === "cancelled",
      message: "Request cancelled",
    },
  ];

  const getDescriptionPreview = (request) => {
    const text = request.description || "";
    return text.length > 60 ? `${text.slice(0, 60)}...` : text;
  };

  const selectedTimeline = useMemo(() => {
    if (!selectedRequest) {
      return { submittedDate: null, inProgressDate: null, completedDate: null };
    }

    return {
      submittedDate: selectedRequest.created_at || "",
      inProgressDate:
        selectedRequest.status === "in_progress" || selectedRequest.status === "completed"
          ? selectedRequest.updated_at
          : "",
      completedDate: selectedRequest.status === "completed" ? selectedRequest.updated_at : "",
    };
  }, [selectedRequest]);

  useEffect(() => {
    const load = async () => {
      const data = await loadAndSetRequests();
      setSelectedRequest((current) => {
        if (!current) return current;
        return data.find((item) => item.id === current.id) || current;
      });
    };
    load();
  }, [loadAndSetRequests]);

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
  return (
    <Box>
      <Box sx={{ mb: 2.3 }}>
        <Typography
          sx={{
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "text.primary",
          }}
        >
          Maintenance Requests
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Track issues, priorities, and completion status
        </Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button
          component={Link}
          to="/maintenance/new"
          variant="outlined"
          size="small"
          sx={{
            borderColor: "divider",
            color: "text.secondary",
            "&:hover": {
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main,
              backgroundColor: "action.hover",
            },
          }}
        >
          <AddRoundedIcon sx={{ mr: 0.6, fontSize: 16 }} />
          Add Request
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          {
            label: "Total Requests",
            value: stats.total,
            icon: <BuildIcon sx={{ color: "#cbd5e1" }} />,
            backgroundColor: "rgba(255,255,255,0.05)",
            borderColor: "rgba(255,255,255,0.12)",
          },
          {
            label: "Open",
            value: stats.open,
            icon: <BuildIcon sx={{ color: "#60a5fa" }} />,
            backgroundColor: "rgba(59,130,246,0.12)",
            borderColor: "rgba(59,130,246,0.3)",
          },
          {
            label: "In Progress",
            value: stats.inProgress,
            icon: <BuildIcon sx={{ color: "#fbbf24" }} />,
            backgroundColor: "rgba(251,191,36,0.12)",
            borderColor: "rgba(251,191,36,0.35)",
          },
          {
            label: "Completed",
            value: stats.completed,
            icon: <BuildIcon sx={{ color: "#27ca40" }} />,
            backgroundColor: "rgba(39,202,64,0.12)",
            borderColor: "rgba(39,202,64,0.3)",
          },
          {
            label: "Emergency",
            value: stats.emergency,
            icon: <BuildIcon sx={{ color: "#ef4444" }} />,
            backgroundColor: "rgba(239,68,68,0.12)",
            borderColor: "rgba(239,68,68,0.3)",
          },
        ].map((card) => (
          <Paper
            key={card.label}
            variant="outlined"
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              p: 2,
              borderRadius: "12px",
              minWidth: "140px",
              flex: "1 1 0",
              color: "#fff",
              backgroundColor: card.backgroundColor,
              borderColor: card.borderColor,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              {card.icon}
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {card.value}
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {card.label}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search requests..."
          sx={{ maxWidth: "300px" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "text.secondary", fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
        />

        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
          {statusFilterOptions.map((status) => (
            <Chip
              key={status}
              label={status}
              size="small"
              onClick={() => setStatusFilter(status)}
              sx={{
                cursor: "pointer",
                borderRadius: "999px",
                border: "1px solid",
                borderColor:
                  statusFilter === status ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.16)",
                color: statusFilter === status ? "#ddd6fe" : "text.secondary",
                backgroundColor: statusFilter === status ? "rgba(124,58,237,0.22)" : "transparent",
                "&:hover": {
                  backgroundColor:
                    statusFilter === status
                      ? "rgba(124,58,237,0.25)"
                      : "rgba(255,255,255,0.06)",
                },
              }}
            />
          ))}
        </Stack>

        <Select
          size="small"
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
          displayEmpty
          sx={{ minWidth: 170 }}
        >
          {priorityFilterOptions.map((priority) => (
            <MenuItem
              key={priority}
              value={priority === "All Priorities" ? "All" : priority}
            >
              {priority}
            </MenuItem>
          ))}
        </Select>

        <Select
          size="small"
          value={sortValue}
          onChange={(event) => setSortValue(event.target.value)}
          sx={{ minWidth: 190 }}
        >
          {sortOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {loading ? (
        <Box sx={{ minHeight: "38vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress size={30} />
        </Box>
      ) : null}

      {error ? (
        <Typography sx={{ mb: 2, color: "error.main" }}>{error}</Typography>
      ) : null}

      {!loading && !error && filteredRequests.length === 0 ? (
        <Paper
          sx={{
            p: 8,
            textAlign: "center",
            borderRadius: "12px",
            border: "1px dashed rgba(255,255,255,0.18)",
            bgcolor: "rgba(255,255,255,0.01)",
          }}
        >
          <BuildIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
          <Typography sx={{ fontSize: 18, color: "text.primary", fontWeight: 600, mb: 1 }}>
            {requests.length === 0 ? "No maintenance requests" : "No requests match your filters"}
          </Typography>
          <Typography sx={{ color: "text.secondary", mb: 3 }}>
            {requests.length === 0
              ? "Create a request to start tracking maintenance work."
              : "Try adjusting your search or filters."}
          </Typography>
          {requests.length === 0 ? (
            <Button component={Link} to="/maintenance/new" variant="contained" startIcon={<AddRoundedIcon />}>
              Add Request
            </Button>
          ) : null}
        </Paper>
      ) : null}

      {!loading && !error && filteredRequests.length > 0 ? (
        <TableContainer component={Paper} sx={{ borderRadius: "12px", overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeaderCellSx}>Request</TableCell>
                <TableCell sx={tableHeaderCellSx}>Property · Unit</TableCell>
                <TableCell sx={tableHeaderCellSx}>Priority</TableCell>
                <TableCell sx={tableHeaderCellSx}>Status</TableCell>
                <TableCell sx={tableHeaderCellSx}>Submitted</TableCell>
                <TableCell align="right" sx={tableHeaderCellSx}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.map((request) => {
                const statusLabel = getStatusLabel(request.status);
                const priorityStyles =
                  priorityChipStyles[request.priority] || {
                    backgroundColor: "rgba(148,163,184,0.16)",
                    color: "#9ca3af",
                  };
                const statusStyles =
                  statusChipStyles[request.status] || {
                    backgroundColor: "rgba(148,163,184,0.16)",
                    color: "#9ca3af",
                  };

                return (
                  <TableRow
                    key={request.id}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { backgroundColor: "rgba(255,255,255,0.02)" },
                      "& td": {
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        color: "text.primary",
                        verticalAlign: "top",
                      },
                    }}
                    onClick={() => openDrawer(request)}
                  >
                    <TableCell>
                      <Typography sx={{ color: "white", fontWeight: 700 }}>
                        {request.title || "Untitled"}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          mt: 0.4,
                          color: "text.secondary",
                          display: "-webkit-box",
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {getDescriptionPreview(request)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ color: "text.primary" }}>
                        {getPropertyUnit(request)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={toTitle(request.priority)}
                        sx={{
                          ...priorityStyles,
                          textTransform: "capitalize",
                          fontWeight: 500,
                          fontSize: "11px",
                          height: 22,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={statusLabel}
                        sx={{
                          ...statusStyles,
                          textTransform: "capitalize",
                          fontWeight: 500,
                          fontSize: "11px",
                          height: 22,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ color: "text.primary", fontWeight: 600 }}>
                        {formatDate(request.created_at)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {formatRelativeDate(request.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            openDrawer(request);
                          }}
                          sx={{
                            color: "text.secondary",
                            "&:hover": {
                              color: theme.palette.primary.main,
                              backgroundColor: "transparent",
                            },
                          }}
                        >
                          <VisibilityIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          component={Link}
                          to={`/maintenance/${request.id}/edit`}
                          onClick={(event) => event.stopPropagation()}
                          sx={{
                            color: "text.secondary",
                            "&:hover": {
                              color: theme.palette.primary.main,
                              backgroundColor: "transparent",
                            },
                          }}
                        >
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        {role !== "tenant" ? (
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              openStatusMenu(event, request);
                            }}
                            sx={{
                              color: "text.secondary",
                              "&:hover": {
                                color: theme.palette.text.primary,
                                backgroundColor: "transparent",
                              },
                            }}
                          >
                            <MoreVertIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        ) : null}
                        {role !== "tenant" ? (
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(request.id);
                            }}
                            sx={{
                              color: "text.secondary",
                              "&:hover": {
                                color: theme.palette.error.main,
                                backgroundColor: "transparent",
                              },
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        ) : null}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeStatusMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {menuActionItems.map((item) => (
          <MenuItem
            key={item.label}
            onClick={() => menuRequest && updateRequestStatus(menuRequest, item.status, item.message)}
            disabled={Boolean(menuRequest && item.disabled(menuRequest))}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: "500px" },
            bgcolor: "background.default",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
          },
        }}
      >
        {selectedRequest ? (
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Box
              sx={{
                p: 3,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                position: "relative",
              }}
            >
              <IconButton
                onClick={closeDrawer}
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  color: "text.secondary",
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
              <Typography variant="h6" sx={{ pr: 4, fontWeight: 700, color: "white" }}>
                {selectedRequest.title || "Maintenance Request"}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                <Chip
                  label={toTitle(selectedRequest.priority || "low")}
                  size="small"
                  sx={{
                    ...priorityChipStyles[selectedRequest.priority],
                    textTransform: "capitalize",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                />
                <Chip
                  label={getStatusLabel(selectedRequest.status)}
                  size="small"
                  sx={{
                    ...statusChipStyles[selectedRequest.status],
                    textTransform: "capitalize",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                />
              </Stack>
              <Typography variant="caption" sx={{ mt: 1.2, display: "block", color: "text.secondary" }}>
                Submitted {formatDate(selectedRequest.created_at)}
              </Typography>
            </Box>

            <Box sx={{ p: 3, flex: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.8 }}>
                Description
              </Typography>
              <Typography sx={{ mb: 2.2, color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>
                {selectedRequest.description || "No description provided."}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.8 }}>
                Property · Unit
              </Typography>
              <Typography sx={{ mb: 2.2, color: "text.primary" }}>
                {getPropertyUnit(selectedRequest)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.8 }}>
                Submitted by
              </Typography>
              <Typography sx={{ mb: 2.2, color: "text.primary" }}>
                {getTenantName(selectedRequest)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.8 }}>
                Date Submitted
              </Typography>
              <Typography sx={{ mb: 2.2, color: "text.primary" }}>
                {formatDate(selectedRequest.created_at)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.8 }}>
                Date Completed
              </Typography>
              <Typography sx={{ color: "text.primary" }}>
                {selectedRequest.status === "completed"
                  ? formatDate(selectedRequest.updated_at || selectedRequest.created_at)
                  : "Pending"}
              </Typography>
            </Box>

            <Box sx={{ p: 3, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <Typography sx={{ color: "text.primary", fontWeight: 600, mb: 2 }}>
                Status Timeline
              </Typography>
              <Box sx={{ position: "relative", pl: 2.8 }}>
                <Box
                  sx={{
                    position: "absolute",
                    left: 6,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    borderRadius: 2,
                    backgroundColor: "rgba(255,255,255,0.2)",
                  }}
                />
                {[
                  { label: "Request submitted", date: selectedTimeline.submittedDate },
                  {
                    label: "Marked in progress",
                    date: selectedTimeline.inProgressDate,
                  },
                  { label: "Completed", date: selectedTimeline.completedDate },
                ].map((entry, index) => {
                  const completed = Boolean(entry.date);
                  return (
                    <Box
                      key={entry.label}
                      sx={{ position: "relative", display: "flex", gap: 1.5, mb: index === 2 ? 0 : 2 }}
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          left: -2,
                          mt: 0.4,
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          backgroundColor: completed ? "#8b5cf6" : "rgba(255,255,255,0.2)",
                          border: "2px solid",
                          borderColor: "rgba(255,255,255,0.35)",
                          boxShadow: completed ? "0 0 0 2px rgba(139,92,246,0.2)" : "none",
                        }}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{ color: completed ? "text.primary" : "text.disabled", fontWeight: 600, mb: 0.3 }}
                        >
                          {entry.label}
                        </Typography>
                        {entry.date ? (
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {formatDate(entry.date)} · {formatRelativeDate(entry.date)}
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: "text.disabled" }}>
                            Pending
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Box
              sx={{
                position: "sticky",
                bottom: 0,
                p: 3,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                bgcolor: "background.default",
                display: "flex",
                flexWrap: "wrap",
                gap: 1.2,
                justifyContent: "flex-end",
              }}
            >
              {(() => {
                if (
                  selectedRequest.status === "submitted" ||
                  selectedRequest.status === "open" ||
                  selectedRequest.status === "pending"
                ) {
                  return (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() =>
                          updateRequestStatus(selectedRequest, "in_progress", "Status changed to In Progress")
                        }
                        disabled={isUpdating}
                        sx={{
                          backgroundColor: "#f59e0b",
                          color: "rgba(0,0,0,0.8)",
                          "&:hover": {
                            backgroundColor: "#d97706",
                          },
                        }}
                      >
                        Start Work
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          updateRequestStatus(selectedRequest, "cancelled", "Request cancelled")
                        }
                        disabled={isUpdating}
                        sx={{
                          borderColor: "rgba(255,255,255,0.3)",
                          color: "text.secondary",
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  );
                }
                if (selectedRequest.status === "in_progress") {
                  return (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => updateRequestStatus(selectedRequest, "completed", "Request completed")}
                        disabled={isUpdating}
                        sx={{
                          backgroundColor: "#22c55e",
                          "&:hover": {
                            backgroundColor: "#16a34a",
                          },
                        }}
                      >
                        Mark Completed
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          updateRequestStatus(selectedRequest, "cancelled", "Request cancelled")
                        }
                        disabled={isUpdating}
                        sx={{
                          borderColor: "rgba(255,255,255,0.3)",
                          color: "text.secondary",
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  );
                }
                if (selectedRequest.status === "completed") {
                  return (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        updateRequestStatus(selectedRequest, "submitted", "Request updated")
                      }
                      disabled={isUpdating}
                      sx={{
                        borderColor: theme.palette.primary.main,
                        color: theme.palette.primary.main,
                      }}
                    >
                      Reopen
                    </Button>
                  );
                }
                return null;
              })()}
            </Box>
          </Box>
        ) : null}
      </Drawer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4200}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default MaintenanceList;
