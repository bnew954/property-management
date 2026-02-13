import { useEffect, useMemo, useState } from "react";
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
import { deleteLease, getLeases, getProperties, getTenants, getUnits } from "../services/api";

function LeaseList() {
  const [leases, setLeases] = useState([]);
  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);
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

  const loadLeases = async () => {
    try {
      const [leasesRes, unitsRes, propertiesRes, tenantsRes] = await Promise.all([
        getLeases(),
        getUnits(),
        getProperties(),
        getTenants(),
      ]);
      setLeases(leasesRes.data || []);
      setUnits(unitsRes.data || []);
      setProperties(propertiesRes.data || []);
      setTenants(tenantsRes.data || []);
    } catch (err) {
      setError("Unable to load leases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeases();
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

  const unitMap = useMemo(() => {
    const map = {};
    units.forEach((unit) => {
      map[unit.id] = unit;
    });
    return map;
  }, [units]);

  const propertyMap = useMemo(() => {
    const map = {};
    properties.forEach((property) => {
      map[property.id] = property;
    });
    return map;
  }, [properties]);

  const tenantMap = useMemo(() => {
    const map = {};
    tenants.forEach((tenant) => {
      map[tenant.id] = tenant;
    });
    return map;
  }, [tenants]);

  const handleDelete = async (leaseId) => {
    try {
      await deleteLease(leaseId);
      setSnackbar({
        open: true,
        message: "Lease deleted successfully.",
        severity: "success",
      });
      loadLeases();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to delete lease.",
        severity: "error",
      });
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Leases
        </Typography>
        <Button component={Link} to="/leases/new" variant="contained">
          Add Lease
        </Button>
      </Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      <TableContainer component={Paper} sx={{ boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Property</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Tenant Name</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Monthly Rent</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leases.map((lease) => {
              const unit = unitMap[lease.unit];
              const property = unit ? propertyMap[unit.property] : null;
              const tenant = tenantMap[lease.tenant];
              return (
                <TableRow key={lease.id} hover>
                  <TableCell>{property?.name || "N/A"}</TableCell>
                  <TableCell>{unit?.unit_number || lease.unit}</TableCell>
                  <TableCell>
                    {tenant ? `${tenant.first_name} ${tenant.last_name}` : `Tenant #${lease.tenant}`}
                  </TableCell>
                  <TableCell>{lease.start_date}</TableCell>
                  <TableCell>{lease.end_date}</TableCell>
                  <TableCell>${Number(lease.monthly_rent || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={lease.is_active ? "Active" : "Inactive"}
                      sx={{
                        bgcolor: lease.is_active ? "#dcfce7" : "#e5e7eb",
                        color: lease.is_active ? "#15803d" : "#475569",
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton component={Link} to={`/leases/${lease.id}/edit`} color="primary" size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton color="error" size="small" onClick={() => handleDelete(lease.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && leases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>No leases found.</TableCell>
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

export default LeaseList;
