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
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { deleteLease, getLeases, getProperties, getTenants, getUnits } from "../services/api";

const headerCellSx = {
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: "11px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const formatDate = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";

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
      <Box sx={{ mb: 0.8 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "#fff" }}>
          Leases
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Monitor active and inactive agreements
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.2 }}>
        <Button
          component={Link}
          to="/leases/new"
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
          Add Lease
        </Button>
      </Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      <TableContainer component={Paper} sx={{ borderRadius: 1, bgcolor: "#141414" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>Property</TableCell>
              <TableCell sx={headerCellSx}>Unit</TableCell>
              <TableCell sx={headerCellSx}>Tenant Name</TableCell>
              <TableCell sx={headerCellSx}>Start Date</TableCell>
              <TableCell sx={headerCellSx}>End Date</TableCell>
              <TableCell sx={headerCellSx}>Monthly Rent</TableCell>
              <TableCell sx={headerCellSx}>Status</TableCell>
              <TableCell align="right" sx={headerCellSx}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leases.map((lease) => {
              const unit = unitMap[lease.unit];
              const property = unit ? propertyMap[unit.property] : null;
              const tenant = tenantMap[lease.tenant];
              return (
                <TableRow key={lease.id} sx={{ "& td": { borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 } }}>
                  <TableCell>{property?.name || "N/A"}</TableCell>
                  <TableCell>{unit?.unit_number || lease.unit}</TableCell>
                  <TableCell>
                    {tenant ? `${tenant.first_name} ${tenant.last_name}` : `Tenant #${lease.tenant}`}
                  </TableCell>
                  <TableCell>{formatDate(lease.start_date)}</TableCell>
                  <TableCell>{formatDate(lease.end_date)}</TableCell>
                  <TableCell>${Number(lease.monthly_rent || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={lease.is_active ? "Active" : "Inactive"}
                      sx={{
                        bgcolor: lease.is_active ? "rgba(34,197,94,0.1)" : "rgba(107,114,128,0.15)",
                        color: lease.is_active ? "#22c55e" : "#6b7280",
                        fontWeight: 500,
                        fontSize: 11,
                        height: 22,
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton
                        component={Link}
                        to={`/leases/${lease.id}/edit`}
                        size="small"
                        sx={{ color: "#6b7280", "&:hover": { color: "primary.main", backgroundColor: "transparent" } }}
                      >
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(lease.id)}
                        sx={{ color: "#6b7280", "&:hover": { color: "error.main", backgroundColor: "transparent" } }}
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
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
        {!loading && leases.length < 6 ? (
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

export default LeaseList;
