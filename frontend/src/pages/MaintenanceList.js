import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  useTheme,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { deleteMaintenanceRequest, getMaintenanceRequests, getTenants } from "../services/api";
import { useUser } from "../services/userContext";

const toLabel = (value) => value.replaceAll("_", " ");

const chipSx = (theme, type, value) => {
  const styles =
    type === "status"
      ? {
          submitted: { color: theme.palette.info.main },
          in_progress: { color: theme.palette.warning.main },
          completed: { color: theme.palette.success.main },
          cancelled: { color: theme.palette.error.main },
        }[value] || { color: theme.palette.text.secondary }
      : {
          low: { color: theme.palette.text.secondary },
          medium: { color: theme.palette.info.main },
          high: { color: theme.palette.warning.main },
          emergency: { color: theme.palette.error.main },
        }[value] || { color: theme.palette.text.secondary };

  return {
    bgcolor: `${styles.color}22`,
    ...styles,
    fontWeight: 500,
    fontSize: 11,
    height: 22,
    textTransform: "capitalize",
  };
};

const headerCellSx = {
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: "11px",
  borderBottom: "1px solid",
  borderColor: "divider",
};

function MaintenanceList() {
  const theme = useTheme();
  const { role } = useUser();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const location = useLocation();
  const navigate = useNavigate();

  const loadRequests = useCallback(async () => {
    try {
      if (role === "tenant") {
        const [requestsRes, tenantsRes] = await Promise.all([
          getMaintenanceRequests(),
          getTenants(),
        ]);
        const tenantId = (tenantsRes.data || [])[0]?.id;
        const filtered = (requestsRes.data || []).filter((item) => {
          const nestedId = item.tenant_detail?.id ?? item.tenant;
          return !tenantId || nestedId === tenantId;
        });
        setRequests(filtered);
      } else {
        const response = await getMaintenanceRequests();
        setRequests(response.data || []);
      }
    } catch (err) {
      setError("Unable to load maintenance requests.");
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests, role]);

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

  const handleDelete = async (requestId) => {
    try {
      await deleteMaintenanceRequest(requestId);
      setSnackbar({
        open: true,
        message: "Maintenance request deleted successfully.",
        severity: "success",
      });
      loadRequests();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to delete maintenance request.",
        severity: "error",
      });
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 0.8 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "text.primary" }}>
          Maintenance Requests
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Track issues, priorities, and completion status
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.2 }}>
        <Button
          component={Link}
          to="/maintenance/new"
          variant="outlined"
          size="small"
          sx={{
            borderColor: "divider",
            color: "text.secondary",
            "&:hover": {
              borderColor: "primary.main",
              color: "primary.main",
              backgroundColor: "action.hover",
            },
          }}
        >
          <AddRoundedIcon sx={{ mr: 0.6, fontSize: 16 }} />
          Add Request
        </Button>
      </Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      <TableContainer component={Paper} sx={{ borderRadius: 1, bgcolor: "background.paper" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>Title</TableCell>
              <TableCell sx={headerCellSx}>Unit</TableCell>
              <TableCell sx={headerCellSx}>Priority</TableCell>
              <TableCell sx={headerCellSx}>Status</TableCell>
              <TableCell align="right" sx={headerCellSx}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => (
              <TableRow
                key={request.id}
                sx={{ "& td": { borderBottom: "1px solid", borderColor: "divider", fontSize: 13 } }}
              >
                <TableCell>{request.title}</TableCell>
                <TableCell>{request.unit_detail?.unit_number || request.unit}</TableCell>
                <TableCell>
                  <Chip size="small" label={toLabel(request.priority)} sx={chipSx(theme, "priority", request.priority)} />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={toLabel(request.status)} sx={chipSx(theme, "status", request.status)} />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <IconButton
                      component={Link}
                      to={`/maintenance/${request.id}/edit`}
                      size="small"
                      sx={{ color: "text.secondary", "&:hover": { color: "primary.main", backgroundColor: "transparent" } }}
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    {role !== "tenant" ? (
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(request.id)}
                        sx={{ color: "text.secondary", "&:hover": { color: "error.main", backgroundColor: "transparent" } }}
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    ) : null}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!loading && requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>No maintenance requests found.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        {!loading && requests.length < 6 ? (
          <Box
            sx={{
              mx: 1.2,
              mb: 1.2,
              mt: 0.4,
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 1,
              py: 1,
              textAlign: "center",
              color: "text.secondary",
              fontSize: 12,
            }}
          >
            No more records
          </Box>
        ) : null}
      </TableContainer>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default MaintenanceList;
