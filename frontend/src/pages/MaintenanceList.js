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
  submitted: { bgcolor: "#3b82f6", color: "#dbeafe" },
  in_progress: { bgcolor: "#f59e0b", color: "#1f2937" },
  completed: { bgcolor: "#22c55e", color: "#052e16" },
  cancelled: { bgcolor: "#ef4444", color: "#fef2f2" },
};

const priorityStyles = {
  low: { bgcolor: "#6b7280", color: "#f3f4f6" },
  medium: { bgcolor: "#3b82f6", color: "#dbeafe" },
  high: { bgcolor: "#f59e0b", color: "#1f2937" },
  emergency: { bgcolor: "#ef4444", color: "#fef2f2" },
};

const toLabel = (value) => value.replaceAll("_", " ");

const chipSx = (stylesMap, value) => ({
  ...(stylesMap[value] || { bgcolor: "#e2e8f0", color: "#334155" }),
  fontWeight: 600,
  textTransform: "capitalize",
});

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
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Maintenance Requests
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Track issues, priorities, and completion status
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button component={Link} to="/maintenance/new" variant="contained">
          <AddRoundedIcon sx={{ mr: 0.8 }} fontSize="small" />
          Add Request
        </Button>
      </Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      <TableContainer component={Paper} sx={{ borderRadius: 2.5, bgcolor: "#111827" }}>
        <Table>
          <TableHead sx={{ bgcolor: "#1e2538" }}>
            <TableRow>
              <TableCell sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.74rem" }}>Title</TableCell>
              <TableCell sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.74rem" }}>Unit</TableCell>
              <TableCell sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.74rem" }}>Priority</TableCell>
              <TableCell sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.74rem" }}>Status</TableCell>
              <TableCell align="right" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.74rem" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id} hover sx={{ "&:hover": { bgcolor: "#1a1f35" } }}>
                <TableCell>{request.title}</TableCell>
                <TableCell>{request.unit_detail?.unit_number || request.unit}</TableCell>
                <TableCell>
                  <Chip size="small" variant="filled" label={toLabel(request.priority)} sx={chipSx(priorityStyles, request.priority)} />
                </TableCell>
                <TableCell>
                  <Chip size="small" variant="filled" label={toLabel(request.status)} sx={chipSx(statusStyles, request.status)} />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <IconButton component={Link} to={`/maintenance/${request.id}/edit`} color="primary" size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => handleDelete(request.id)}>
                      <DeleteIcon fontSize="small" />
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
