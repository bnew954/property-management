import { useCallback, useEffect, useMemo, useState } from "react";
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
import { deletePayment, getPayments, getProperties, getTenants } from "../services/api";
import { useUser } from "../services/userContext";

const toLabel = (value) => value.replaceAll("_", " ");
const headerCellSx = {
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: "11px",
  borderBottom: "1px solid",
  borderColor: "divider",
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
  const theme = useTheme();
  const { role } = useUser();
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

  const loadPayments = useCallback(async () => {
    try {
      const requests =
        role === "tenant"
          ? [getPayments(), getProperties(), getTenants()]
          : [getPayments(), getProperties()];
      const [paymentsRes, propertiesRes, tenantsRes] = await Promise.all(requests);
      const nextTenantId = role === "tenant" ? (tenantsRes?.data || [])[0]?.id || null : null;
      const allPayments = paymentsRes.data || [];
      const filteredPayments =
        role === "tenant"
          ? allPayments.filter((item) => {
              const nestedId = item.lease_detail?.tenant_detail?.id ?? item.lease_detail?.tenant;
              return !nextTenantId || nestedId === nextTenantId;
            })
          : allPayments;
      setPayments(filteredPayments);
      setProperties(propertiesRes.data || []);
    } catch (err) {
      setError("Unable to load payments.");
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments, role]);

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
        <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "text.primary" }}>
          Payments
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Track payment activity and statuses
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.2 }}>
        {role !== "tenant" ? (
          <Button
            component={Link}
            to="/payments/new"
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
            Add Payment
          </Button>
        ) : null}
      </Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      <TableContainer component={Paper} sx={{ borderRadius: 1, bgcolor: "background.paper" }}>
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
              <TableRow key={payment.id} sx={{ "& td": { borderBottom: "1px solid", borderColor: "divider", fontSize: 13 } }}>
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
                        fontWeight: 500,
                        fontSize: 11,
                        height: 22,
                        textTransform: "capitalize",
                        ...(payment.status === "pending"
                          ? {
                              bgcolor: `${theme.palette.warning.main}22`,
                              color: theme.palette.warning.main,
                            }
                          : payment.status === "completed"
                            ? { bgcolor: `${theme.palette.success.main}22`, color: theme.palette.success.main }
                            : payment.status === "failed"
                              ? { bgcolor: `${theme.palette.error.main}22`, color: theme.palette.error.main }
                              : {
                                  bgcolor: `${theme.palette.info.main}22`,
                                  color: theme.palette.info.main,
                                }),
                      }}
                    />
                </TableCell>
                <TableCell align="right">
                  {role !== "tenant" ? (
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton
                        component={Link}
                        to={`/payments/${payment.id}/edit`}
                        size="small"
                        sx={{
                          color: "text.secondary",
                          "&:hover": { color: "primary.main", backgroundColor: "transparent" },
                        }}
                      >
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(payment.id)}
                        sx={{
                          color: "text.secondary",
                          "&:hover": { color: "error.main", backgroundColor: "transparent" },
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Stack>
                  ) : null}
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
        {!loading && payments.length < 6 ? (
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

export default PaymentsList;
