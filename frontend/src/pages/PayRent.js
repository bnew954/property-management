import { useCallback, useEffect, useMemo, useState } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Navigate } from "react-router-dom";
import {
  confirmStripePayment,
  createPaymentIntent,
  getLeases,
  getPaymentHistory,
  getProperties,
  getTenants,
  getUnits,
} from "../services/api";
import { useUser } from "../services/userContext";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder"
);

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

const formatDate = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";

const headerCellSx = {
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: "11px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

function RentCheckoutForm({
  lease,
  user,
  onPaymentSuccess,
  onPaymentError,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!lease) {
      return;
    }
    if (!stripe || !elements) {
      onPaymentError("Stripe is still loading. Please try again.");
      return;
    }
    const card = elements.getElement(CardElement);
    if (!card) {
      onPaymentError("Card input is missing.");
      return;
    }

    setProcessing(true);
    onPaymentError("");
    try {
      const intentRes = await createPaymentIntent(lease.id);
      const { client_secret: clientSecret } = intentRes.data || {};
      if (!clientSecret) {
        throw new Error("Payment initialization failed.");
      }

      const confirmation = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card,
          billing_details: {
            name: `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.username,
            email: user?.email || undefined,
          },
        },
      });

      if (confirmation.error) {
        throw new Error(confirmation.error.message || "Payment failed.");
      }

      if (confirmation.paymentIntent?.status !== "succeeded") {
        throw new Error("Payment did not complete successfully.");
      }

      const confirmRes = await confirmStripePayment({
        lease_id: lease.id,
        payment_intent_id: confirmation.paymentIntent.id,
      });
      onPaymentSuccess(confirmRes.data);
    } catch (error) {
      onPaymentError(error?.response?.data?.detail || error.message || "Unable to process payment.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Box
        sx={{
          p: 1.3,
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 1,
          mb: 1.4,
          backgroundColor: "rgba(255,255,255,0.01)",
        }}
      >
        <CardElement
          options={{
            style: {
              base: {
                color: "#e0e0e0",
                fontSize: "13px",
                "::placeholder": { color: "#6b7280" },
                iconColor: "#878C9E",
              },
              invalid: { color: "#ef4444" },
            },
          }}
        />
      </Box>
      <Button type="submit" variant="contained" disabled={processing || !lease || !stripe} sx={{ minWidth: 160 }}>
        {processing ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : `Pay ${formatCurrency(lease.monthly_rent)}`}
      </Button>
    </Box>
  );
}

function PayRent() {
  const { role, user } = useUser();
  const [lease, setLease] = useState(null);
  const [unit, setUnit] = useState(null);
  const [property, setProperty] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successPayment, setSuccessPayment] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const tenantIdFromContext = user?.tenant_id || null;
      const requests = tenantIdFromContext
        ? [getLeases(), getUnits(), getProperties(), getPaymentHistory()]
        : [getLeases(), getUnits(), getProperties(), getPaymentHistory(), getTenants()];
      const [leasesRes, unitsRes, propertiesRes, historyRes, tenantsRes] = await Promise.all(requests);
      const tenantId = tenantIdFromContext || (tenantsRes?.data || [])[0]?.id || null;

      const allLeases = leasesRes.data || [];
      const activeLease =
        allLeases
          .filter((item) => {
            const nestedId = item.tenant_detail?.id ?? item.tenant;
            return nestedId === tenantId && item.is_active;
          })
          .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0] || null;
      setLease(activeLease);

      const units = unitsRes.data || [];
      const properties = propertiesRes.data || [];
      const selectedUnit =
        activeLease?.unit_detail ||
        units.find((item) => item.id === activeLease?.unit) ||
        null;
      setUnit(selectedUnit);

      const selectedProperty = selectedUnit
        ? properties.find((item) => item.id === selectedUnit.property) || null
        : null;
      setProperty(selectedProperty);

      setPayments(historyRes.data || []);
    } catch (requestError) {
      setError("Unable to load rent payment details.");
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id]);

  useEffect(() => {
    if (role === "tenant") {
      loadData();
    }
  }, [loadData, role]);

  const statusChip = (status) => (
    <Chip
      label={String(status || "").replaceAll("_", " ")}
      size="small"
      sx={{
        bgcolor:
          status === "completed"
            ? "rgba(34,197,94,0.1)"
            : status === "pending"
              ? "rgba(245,158,11,0.1)"
              : status === "failed"
                ? "rgba(239,68,68,0.1)"
                : "rgba(107,114,128,0.15)",
        color:
          status === "completed"
            ? "#22c55e"
            : status === "pending"
              ? "#f59e0b"
              : status === "failed"
                ? "#ef4444"
                : "#9ca3af",
        fontSize: 11,
        height: 22,
        textTransform: "capitalize",
      }}
    />
  );

  const propertyLine = useMemo(() => {
    if (!property) {
      return "Property unavailable";
    }
    return `${property.name} - Unit ${unit?.unit_number || "-"}`;
  }, [property, unit?.unit_number]);

  if (role !== "tenant") {
    return <Navigate to="/" replace />;
  }

  return (
    <Box>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em", mb: 0.8 }}>
        Pay Rent
      </Typography>
      <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1.5 }}>
        Submit your monthly rent payment securely online
      </Typography>

      {loading ? <Typography>Loading...</Typography> : null}
      {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
      {successPayment ? (
        <Paper
          sx={{
            mb: 1.5,
            p: 1.6,
            borderColor: "rgba(34,197,94,0.4)",
            backgroundColor: "rgba(34,197,94,0.05)",
            "@keyframes successFade": {
              from: { opacity: 0, transform: "translateY(6px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
            animation: "successFade 0.25s ease",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            <CheckCircleIcon sx={{ color: "#22c55e", fontSize: 18 }} />
            <Typography sx={{ fontSize: 13, color: "#e0e0e0" }}>
              Payment successful. Confirmation ID: {successPayment.stripe_payment_intent_id}
            </Typography>
          </Box>
        </Paper>
      ) : null}

      <Paper sx={{ p: 2, bgcolor: "#141414", mb: 1.5 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#fff", mb: 1.1 }}>
          Current Lease
        </Typography>
        {lease ? (
          <>
            <Typography sx={{ fontSize: 13, color: "#e0e0e0", mb: 0.4 }}>{propertyLine}</Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.2 }}>
              Due this cycle: {formatCurrency(lease.monthly_rent)}
            </Typography>
            <Elements stripe={stripePromise}>
              <RentCheckoutForm
                lease={lease}
                user={user}
                onPaymentError={setError}
                onPaymentSuccess={(payment) => {
                  setSuccessPayment(payment);
                  setError("");
                  loadData();
                }}
              />
            </Elements>
          </>
        ) : (
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            No active lease found. Contact your property manager.
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2, bgcolor: "#141414" }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#fff", mb: 0.3 }}>
          Recent Payments
        </Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.3 }}>
          Your latest rent transactions
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Date</TableCell>
                <TableCell sx={headerCellSx}>Amount</TableCell>
                <TableCell sx={headerCellSx}>Method</TableCell>
                <TableCell sx={headerCellSx}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id} sx={{ "& td": { borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 } }}>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell sx={{ textTransform: "capitalize" }}>
                    {String(payment.payment_method || "").replaceAll("_", " ")}
                  </TableCell>
                  <TableCell>{statusChip(payment.status)}</TableCell>
                </TableRow>
              ))}
              {!loading && payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>No payments found.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

export default PayRent;
