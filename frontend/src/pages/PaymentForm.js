import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import {
  createPayment,
  getLeases,
  getPayment,
  getProperties,
  updatePayment,
} from "../services/api";

const initialValues = {
  lease: "",
  amount: "",
  payment_date: "",
  payment_method: "",
  status: "",
  notes: "",
};

const paymentMethods = [
  "bank_transfer",
  "credit_card",
  "check",
  "cash",
  "other",
];

const statuses = ["pending", "completed", "failed", "refunded"];

const toLabel = (value) => value.replaceAll("_", " ");

function PaymentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [leases, setLeases] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [leasesRes, propertiesRes] = await Promise.all([getLeases(), getProperties()]);
        setLeases(leasesRes.data || []);
        setProperties(propertiesRes.data || []);
        if (isEditMode) {
          const paymentRes = await getPayment(id);
          const payment = paymentRes.data;
          setValues({
            lease: payment.lease ?? "",
            amount: payment.amount ?? "",
            payment_date: payment.payment_date || "",
            payment_method: payment.payment_method || "",
            status: payment.status || "",
            notes: payment.notes || "",
          });
        }
      } catch (err) {
        setSnackbar({
          open: true,
          message: "Unable to load payment form data.",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, isEditMode]);

  const propertyMap = useMemo(() => {
    const map = {};
    properties.forEach((property) => {
      map[property.id] = property.name;
    });
    return map;
  }, [properties]);

  const validate = () => {
    const nextErrors = {};
    ["lease", "amount", "payment_date", "payment_method", "status"].forEach((field) => {
      if (!String(values[field] ?? "").trim()) {
        nextErrors[field] = "This field is required.";
      }
    });
    return nextErrors;
  };

  const handleChange = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const leaseLabel = (lease) => {
    const tenantName = lease.tenant_detail
      ? `${lease.tenant_detail.first_name} ${lease.tenant_detail.last_name}`
      : `Tenant #${lease.tenant}`;
    const unit = lease.unit_detail;
    const propertyName = unit ? propertyMap[unit.property] || `Property #${unit.property}` : "Unknown Property";
    const unitName = unit ? `Unit ${unit.unit_number}` : `Unit #${lease.unit}`;
    return `${tenantName} - ${propertyName} - ${unitName}`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        lease: Number(values.lease),
        amount: Number(values.amount),
        payment_date: values.payment_date,
        payment_method: values.payment_method,
        status: values.status,
        notes: values.notes || "",
      };
      if (isEditMode) {
        await updatePayment(id, payload);
      } else {
        await createPayment(payload);
      }
      navigate("/payments", {
        state: {
          snackbar: {
            message: isEditMode ? "Payment updated successfully." : "Payment created successfully.",
            severity: "success",
          },
        },
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Unable to save payment.",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        {isEditMode ? "Edit Payment" : "Add Payment"}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.2 }}>
        Payments &gt; {isEditMode ? "Edit" : "Add New"}
      </Typography>
      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <Paper
          component="form"
          onSubmit={handleSubmit}
          sx={{ p: 3, borderRadius: 1, bgcolor: "background.paper", maxWidth: 600 }}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}>
            <Box>
              <FormControl fullWidth error={Boolean(errors.lease)} required>
                <InputLabel>Lease</InputLabel>
                <Select label="Lease" value={values.lease} onChange={handleChange("lease")}>
                  {leases.map((lease) => (
                    <MenuItem key={lease.id} value={lease.id}>
                      {leaseLabel(lease)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <TextField
                fullWidth
                type="number"
                inputProps={{ step: "0.01" }}
                label="Amount"
                variant="outlined"
                value={values.amount}
                onChange={handleChange("amount")}
                error={Boolean(errors.amount)}
                helperText={errors.amount}
                required
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                type="date"
                label="Payment Date"
                variant="outlined"
                value={values.payment_date}
                onChange={handleChange("payment_date")}
                error={Boolean(errors.payment_date)}
                helperText={errors.payment_date}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
            <Box>
              <FormControl fullWidth error={Boolean(errors.payment_method)} required>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  label="Payment Method"
                  value={values.payment_method}
                  onChange={handleChange("payment_method")}
                >
                  {paymentMethods.map((method) => (
                    <MenuItem key={method} value={method}>
                      {toLabel(method)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <FormControl fullWidth error={Boolean(errors.status)} required>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={values.status} onChange={handleChange("status")}>
                  {statuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      {toLabel(status)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField
                fullWidth
                multiline
                minRows={4}
                label="Notes"
                variant="outlined"
                value={values.notes}
                onChange={handleChange("notes")}
              />
            </Box>
          </Box>
          <Box sx={{ mt: 2, display: "flex", gap: 1.2, justifyContent: "flex-end" }}>
            <Button variant="text" onClick={() => navigate("/payments")} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {isEditMode ? "Update Payment" : "Create Payment"}
            </Button>
          </Box>
        </Paper>
      )}
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

export default PaymentForm;
