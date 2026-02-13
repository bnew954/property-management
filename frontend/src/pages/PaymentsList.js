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
import { deletePayment, getPayments, getProperties } from "../services/api";

const statusStyles = {
  pending: { bgcolor: "rgba(245,158,11,0.1)", color: "#f59e0b" },
  completed: { bgcolor: "rgba(34,197,94,0.1)", color: "#22c55e" },
  failed: { bgcolor: "rgba(239,68,68,0.1)", color: "#ef4444" },
  refunded: { bgcolor: "rgba(59,130,246,0.1)", color: "#3b82f6" },
};

const toLabel = (value) => value.replaceAll("_", " ");
const headerCellSx = {
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
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

function PaymentsList() {
  const [payments, setPayments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const location = useLocation();
  const navigate = useNavigate();

  const loadPayments = async () => {
    try {
      const [paymentsRes, propertiesRes] = await Promise.all([getPayments(), getProperties()]);
      setPayments(paymentsRes.data || []);
      setProperties(propertiesRes.data || []);
    } catch (err) {
      setError("Unable to load payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
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

  const propertyMap = useMemo(() => {
    const map = {};
    properties.forEach((property) => {
      map[property.id] = property.name;
    });
    return map;
  }, [properties]);

  const tenantName = (payment) => {
    const tenant = payment.lease_detail?.tenant_detail;
    return tenant ? `${tenant.first_name} ${tenant.last_name}` : "N/A";
  };

  const propertyUnit = (payment) => {
    const unit = payment.lease_detail?.unit_detail;
    if (!unit) {
      return "N/A";
    }
    const propertyName = propertyMap[unit.property] || `Property #${unit.property}`;
    return `${propertyName} / Unit ${unit.unit_number}`;
  };

  const handleDelete = async (paymentId) => {
    try {
      await deletePayment(paymentId);
      setSnackbar({
        open: true,
        message: "Payment deleted successfully.",
        severity: "success",
      });
      loadPayments();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to delete payment.",
        severity: "error",
      });
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 0.8 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "#fff" }}>
          Payments
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Track payment activity and statuses
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.2 }}>
        <Button
          component={Link}
          to="/payments/new"
          variant="outlined"
          size="small"
          sx={{
            borderColor: "rgba(255,255,255,0.1)",
            color: "#e0e0e0",
            "&:hover": { borderColor: "primary.main", color: "primary.main", backgroundColor: "transparent" },
          }}
        >
          <AddRoundedIcon sx={{ mr: 0.6, fontSize: 16 }} />
          Add Payment
        </Button>
      </Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      <TableContainer component={Paper} sx={{ borderRadius: 1, bgcolor: "#141414" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>Tenant</TableCell>
              <TableCell sx={headerCellSx}>Property/Unit</TableCell>
              <TableCell sx={headerCellSx}>Amount</TableCell>
              <TableCell sx={headerCellSx}>Date</TableCell>
              <TableCell sx={headerCellSx}>Method</TableCell>
              <TableCell sx={headerCellSx}>Status</TableCell>
              <TableCell align="right" sx={headerCellSx}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id} sx={{ "& td": { borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 } }}>
                <TableCell>{tenantName(payment)}</TableCell>
                <TableCell>{propertyUnit(payment)}</TableCell>
                <TableCell>
                  {Number(payment.amount || 0).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </TableCell>
                <TableCell>{formatDate(payment.payment_date)}</TableCell>
                <TableCell sx={{ textTransform: "capitalize" }}>
                  {toLabel(payment.payment_method)}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={toLabel(payment.status)}
                    sx={{
                      ...(statusStyles[payment.status] || { bgcolor: "#e2e8f0", color: "#334155" }),
                      fontWeight: 500,
                      fontSize: 11,
                      height: 22,
                      textTransform: "capitalize",
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <IconButton
                      component={Link}
                      to={`/payments/${payment.id}/edit`}
                      size="small"
                      sx={{ color: "#6b7280", "&:hover": { color: "primary.main", backgroundColor: "transparent" } }}
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(payment.id)}
                      sx={{ color: "#6b7280", "&:hover": { color: "error.main", backgroundColor: "transparent" } }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!loading && payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>No payments found.</TableCell>
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

export default PaymentsList;
