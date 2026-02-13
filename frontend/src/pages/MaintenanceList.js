import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
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
import { deleteMaintenanceRequest, getMaintenanceRequests } from "../services/api";

const statusStyles = {
  submitted: { bgcolor: "rgba(59,130,246,0.1)", color: "#3b82f6" },
  in_progress: { bgcolor: "rgba(245,158,11,0.1)", color: "#f59e0b" },
  completed: { bgcolor: "rgba(34,197,94,0.1)", color: "#22c55e" },
  cancelled: { bgcolor: "rgba(239,68,68,0.1)", color: "#ef4444" },
};

const priorityStyles = {
  low: { bgcolor: "rgba(107,114,128,0.1)", color: "#6b7280" },
  medium: { bgcolor: "rgba(59,130,246,0.1)", color: "#3b82f6" },
  high: { bgcolor: "rgba(245,158,11,0.1)", color: "#f59e0b" },
  emergency: { bgcolor: "rgba(239,68,68,0.1)", color: "#ef4444" },
};

const toLabel = (value) => value.replaceAll("_", " ");

const chipSx = (stylesMap, value) => ({
  ...(stylesMap[value] || { bgcolor: "#e2e8f0", color: "#334155" }),
  fontWeight: 500,
  fontSize: 11,
  height: 22,
  textTransform: "capitalize",
});

const headerCellSx = {
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: "11px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

function MaintenanceList() {
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

  const loadRequests = async () => {
    try {
      const response = await getMaintenanceRequests();
      setRequests(response.data || []);
    } catch (err) {
      setError("Unable to load maintenance requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

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
        <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "#fff" }}>
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
            borderColor: "rgba(255,255,255,0.1)",
            color: "#e0e0e0",
            "&:hover": {
              borderColor: "primary.main",
              color: "primary.main",
              backgroundColor: "rgba(124,92,252,0.08)",
            },
          }}
        >
          <AddRoundedIcon sx={{ mr: 0.6, fontSize: 16 }} />
          Add Request
        </Button>
      </Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      <TableContainer component={Paper} sx={{ borderRadius: 1, bgcolor: "#141414" }}>
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
              <TableRow key={request.id} sx={{ "& td": { borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 } }}>
                <TableCell>{request.title}</TableCell>
                <TableCell>{request.unit_detail?.unit_number || request.unit}</TableCell>
                <TableCell>
                  <Chip size="small" label={toLabel(request.priority)} sx={chipSx(priorityStyles, request.priority)} />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={toLabel(request.status)} sx={chipSx(statusStyles, request.status)} />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <IconButton
                      component={Link}
                      to={`/maintenance/${request.id}/edit`}
                      size="small"
                      sx={{ color: "#6b7280", "&:hover": { color: "primary.main", backgroundColor: "transparent" } }}
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(request.id)}
                      sx={{ color: "#6b7280", "&:hover": { color: "error.main", backgroundColor: "transparent" } }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
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
              border: "1px dashed rgba(255,255,255,0.12)",
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
