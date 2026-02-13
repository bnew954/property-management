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
import { deleteMaintenanceRequest, getMaintenanceRequests } from "../services/api";

const statusStyles = {
  submitted: { bgcolor: "#dbeafe", color: "#1d4ed8" },
  in_progress: { bgcolor: "#ffedd5", color: "#c2410c" },
  completed: { bgcolor: "#dcfce7", color: "#15803d" },
  cancelled: { bgcolor: "#fee2e2", color: "#b91c1c" },
};

const priorityStyles = {
  low: { bgcolor: "#f1f5f9", color: "#334155" },
  medium: { bgcolor: "#dbeafe", color: "#1d4ed8" },
  high: { bgcolor: "#ffedd5", color: "#c2410c" },
  emergency: { bgcolor: "#fee2e2", color: "#b91c1c" },
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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Maintenance Requests
        </Typography>
        <Button component={Link} to="/maintenance/new" variant="contained">
          Add Request
        </Button>
      </Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      <TableContainer component={Paper} sx={{ boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id} hover>
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
