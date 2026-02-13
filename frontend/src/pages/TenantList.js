import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
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
import { deleteTenant, getTenants } from "../services/api";

function TenantList() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const location = useLocation();
  const navigate = useNavigate();

  const loadTenants = async () => {
    try {
      const response = await getTenants();
      setTenants(response.data || []);
    } catch (err) {
      setError("Unable to load tenants.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
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

  const handleDelete = async (tenantId) => {
    try {
      await deleteTenant(tenantId);
      setSnackbar({
        open: true,
        message: "Tenant deleted successfully.",
        severity: "success",
      });
      loadTenants();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to delete tenant.",
        severity: "error",
      });
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Tenants
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Manage tenant profiles and contacts
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button component={Link} to="/tenants/new" variant="contained">
          <AddRoundedIcon sx={{ mr: 0.8 }} fontSize="small" />
          Add Tenant
        </Button>
      </Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      <TableContainer component={Paper} sx={{ borderRadius: 2.5, bgcolor: "#111827" }}>
        <Table>
          <TableHead sx={{ bgcolor: "#1e2538" }}>
            <TableRow>
              <TableCell sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.74rem" }}>Name</TableCell>
              <TableCell sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.74rem" }}>Email</TableCell>
              <TableCell sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.74rem" }}>Phone</TableCell>
              <TableCell align="right" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.74rem" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id} hover sx={{ "&:hover": { bgcolor: "#1a1f35" } }}>
                <TableCell>
                  {tenant.first_name} {tenant.last_name}
                </TableCell>
                <TableCell>{tenant.email}</TableCell>
                <TableCell>{tenant.phone}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <IconButton
                      component={Link}
                      to={`/tenants/${tenant.id}/edit`}
                      color="primary"
                      size="small"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => handleDelete(tenant.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!loading && tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>No tenants found.</TableCell>
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

export default TenantList;
