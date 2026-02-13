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

const headerCellSx = {
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: "11px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

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
      <Box sx={{ mb: 0.8 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "#fff" }}>
          Tenants
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Manage tenant profiles and contacts
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.2 }}>
        <Button
          component={Link}
          to="/tenants/new"
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
          Add Tenant
        </Button>
      </Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      <TableContainer component={Paper} sx={{ borderRadius: 1, bgcolor: "#141414" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>Name</TableCell>
              <TableCell sx={headerCellSx}>Email</TableCell>
              <TableCell sx={headerCellSx}>Phone</TableCell>
              <TableCell align="right" sx={headerCellSx}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id} sx={{ "& td": { borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 } }}>
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
                      size="small"
                      sx={{ color: "#6b7280", "&:hover": { color: "primary.main", backgroundColor: "transparent" } }}
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(tenant.id)}
                      sx={{ color: "#6b7280", "&:hover": { color: "error.main", backgroundColor: "transparent" } }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
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
        {!loading && tenants.length < 6 ? (
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

export default TenantList;
