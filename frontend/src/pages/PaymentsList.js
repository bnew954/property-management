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
import { deletePayment, getPayments, getProperties } from "../services/api";

const statusStyles = {
  pending: { bgcolor: "#ffedd5", color: "#c2410c" },
  completed: { bgcolor: "#dcfce7", color: "#15803d" },
  failed: { bgcolor: "#fee2e2", color: "#b91c1c" },
  refunded: { bgcolor: "#dbeafe", color: "#1d4ed8" },
};

const toLabel = (value) => value.replaceAll("_", " ");

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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Payments
        </Typography>
        <Button component={Link} to="/payments/new" variant="contained">
          Add Payment
        </Button>
      </Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      <TableContainer component={Paper} sx={{ boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tenant</TableCell>
              <TableCell>Property/Unit</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id} hover>
                <TableCell>{tenantName(payment)}</TableCell>
                <TableCell>{propertyUnit(payment)}</TableCell>
                <TableCell>
                  {Number(payment.amount || 0).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </TableCell>
                <TableCell>{payment.payment_date}</TableCell>
                <TableCell sx={{ textTransform: "capitalize" }}>
                  {toLabel(payment.payment_method)}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={toLabel(payment.status)}
                    sx={{
                      ...(statusStyles[payment.status] || { bgcolor: "#e2e8f0", color: "#334155" }),
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <IconButton component={Link} to={`/payments/${payment.id}/edit`} color="primary" size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => handleDelete(payment.id)}>
                      <DeleteIcon fontSize="small" />
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
