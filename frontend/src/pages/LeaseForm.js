import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormHelperText,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  createLease,
  generateLeaseDocument,
  getLease,
  landlordSignLease,
  getProperties,
  sendLeaseForSigning,
  getTenants,
  getUnits,
  updateLease,
} from "../services/api";

const initialValues = {
  unit: "",
  tenant: "",
  start_date: "",
  end_date: "",
  monthly_rent: "",
  security_deposit: "",
  is_active: true,
};

const signatureChipStyle = (status, theme) => {
  const map = {
    draft: { color: theme.palette.text.secondary, background: "rgba(148,163,184,0.2)" },
    sent: { color: theme.palette.primary.main, background: `${theme.palette.primary.main}22` },
    viewed: { color: theme.palette.warning.main, background: `${theme.palette.warning.main}22` },
    signed: { color: theme.palette.success.main, background: `${theme.palette.success.main}22` },
    declined: { color: theme.palette.error.main, background: `${theme.palette.error.main}22` },
  };
  return map[status] || map.draft;
};

function LeaseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const theme = useTheme();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [leaseSnapshot, setLeaseSnapshot] = useState(null);
  const [landlordSignature, setLandlordSignature] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const parseApiErrors = (error) => {
    const detail = error?.response?.data;
    if (!detail || typeof detail !== "object") {
      return { __all__: "Unable to save lease." };
    }
    const fieldErrors = {};
    Object.entries(detail).forEach(([key, value]) => {
      if (typeof value === "string") {
        fieldErrors[key] = value;
      } else if (Array.isArray(value)) {
        fieldErrors[key] = value.join(" ");
      } else if (typeof value === "object") {
        fieldErrors[key] = JSON.stringify(value);
      }
    });
    return Object.keys(fieldErrors).length > 0 ? fieldErrors : { __all__: "Unable to save lease." };
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [unitsRes, tenantsRes, propertiesRes] = await Promise.all([
          getUnits(),
          getTenants(),
          getProperties(),
        ]);
        setUnits(unitsRes.data || []);
        setTenants(tenantsRes.data || []);
        setProperties(propertiesRes.data || []);

        if (isEditMode) {
          const leaseRes = await getLease(id);
          const lease = leaseRes.data;
          setLeaseSnapshot(lease);
          setLandlordSignature(lease?.landlord_signature || "");
          setValues({
            unit: lease.unit ?? "",
            tenant: lease.tenant ?? "",
            start_date: lease.start_date || "",
            end_date: lease.end_date || "",
            monthly_rent: lease.monthly_rent ?? "",
            security_deposit: lease.security_deposit ?? "",
            is_active: Boolean(lease.is_active),
          });
        }
      } catch (err) {
        setSnackbar({
          open: true,
          message: "Unable to load lease form data.",
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
    properties.forEach((item) => {
      map[item.id] = item.name;
    });
    return map;
  }, [properties]);

  const validate = () => {
    const nextErrors = {};
    ["unit", "tenant", "start_date", "end_date", "monthly_rent", "security_deposit"].forEach(
      (field) => {
        if (String(values[field] ?? "").trim() === "") {
          nextErrors[field] = "This field is required.";
        }
      }
    );
    return nextErrors;
  };

  const handleChange = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
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
        unit: Number(values.unit),
        tenant: Number(values.tenant),
        start_date: values.start_date,
        end_date: values.end_date,
        monthly_rent: Number(values.monthly_rent),
        security_deposit: Number(values.security_deposit),
        is_active: Boolean(values.is_active),
      };
      if (isEditMode) {
        await updateLease(id, payload);
      } else {
        await createLease(payload);
      }
      navigate("/leases", {
        state: {
          snackbar: {
            message: isEditMode ? "Lease updated successfully." : "Lease created successfully.",
            severity: "success",
          },
        },
      });
    } catch (err) {
      const fieldErrors = parseApiErrors(err);
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
      setSnackbar({
        open: true,
        message: fieldErrors.__all__ || "Unable to save lease.",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const refreshLease = async () => {
    if (!id) {
      return;
    }
    try {
      const leaseRes = await getLease(id);
      const lease = leaseRes.data;
      setLeaseSnapshot(lease);
      setLandlordSignature(lease?.landlord_signature || "");
    } catch {
      // Ignore refresh failures to avoid blocking manual actions.
    }
  };

  const handleGenerateDocument = async () => {
    try {
      setActionLoading(true);
      const response = await generateLeaseDocument(id);
      setLeaseSnapshot(response.data?.lease || leaseSnapshot);
      setSnackbar({ open: true, message: "Lease document generated.", severity: "success" });
      await refreshLease();
    } catch {
      setSnackbar({ open: true, message: "Unable to generate lease document.", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendForSigning = async () => {
    try {
      setActionLoading(true);
      const response = await sendLeaseForSigning(id);
      setLeaseSnapshot(response.data?.lease || response.data || leaseSnapshot);
      setSnackbar({ open: true, message: "Lease sent for signing.", severity: "success" });
      await refreshLease();
    } catch {
      setSnackbar({ open: true, message: "Unable to send lease for signing.", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLandlordSign = async () => {
    try {
      if (!landlordSignature.trim()) {
        setSnackbar({ open: true, message: "Landlord signature is required.", severity: "error" });
        return;
      }
      setActionLoading(true);
      await landlordSignLease(id, { signature: landlordSignature.trim() });
      await refreshLease();
      setSnackbar({ open: true, message: "Lease signed by landlord.", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "Unable to save landlord signature.", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopySigningLink = async () => {
    const link = leaseSnapshot?.signing_token ? `${window.location.origin}/lease/sign/${leaseSnapshot.signing_token}` : "";
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopySuccess(true);
      setSnackbar({ open: true, message: "Signing link copied.", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "Could not copy signing link.", severity: "error" });
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        {isEditMode ? "Edit Lease" : "Add Lease"}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.2 }}>
        Leases &gt; {isEditMode ? "Edit" : "Add New"}
      </Typography>
      {isEditMode && leaseSnapshot ? (
        <Paper sx={{ mb: 2, p: 2, borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
            <Box>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Signature Status</Typography>
              <Chip
                size="small"
                label={leaseSnapshot.signature_status || "draft"}
                sx={{
                  mt: 0.5,
                  color: signatureChipStyle(leaseSnapshot.signature_status || "draft", theme).color,
                  backgroundColor: signatureChipStyle(leaseSnapshot.signature_status || "draft", theme).background,
                  textTransform: "capitalize",
                }}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleGenerateDocument}
                disabled={actionLoading}
              >
                {leaseSnapshot.lease_document ? "Regenerate Lease Document" : "Generate Lease Document"}
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={handleSendForSigning}
                disabled={actionLoading || !leaseSnapshot.lease_document || ["signed", "declined"].includes(leaseSnapshot.signature_status)}
              >
                Send for Signing
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={handleCopySigningLink}
                disabled={!leaseSnapshot.signing_token}
              >
                {copySuccess ? "Copied!" : "Copy Signing Link"}
              </Button>
            </Box>
          </Box>
          <Divider sx={{ my: 1.6 }} />
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            <TextField
              size="small"
              fullWidth
              label="Landlord Signature"
              value={landlordSignature}
              onChange={(event) => setLandlordSignature(event.target.value)}
              helperText="Type your full legal name to sign as landlord"
            />
            <Button
              size="small"
              variant="contained"
              onClick={handleLandlordSign}
              disabled={actionLoading || !landlordSignature.trim()}
            >
              Sign as Landlord
            </Button>
          </Box>
          <Typography sx={{ mt: 1.2, fontSize: 12, color: "text.secondary" }}>
            Tenant signature: {leaseSnapshot.tenant_signature || "Pending"}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            Landlord signature: {leaseSnapshot.landlord_signature || "Pending"}
          </Typography>
        </Paper>
      ) : null}
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
              <FormControl fullWidth error={Boolean(errors.unit)} required>
                <InputLabel>Unit</InputLabel>
                <Select label="Unit" value={values.unit} onChange={handleChange("unit")}>
                  {units.map((unit) => (
                    <MenuItem key={unit.id} value={unit.id}>
                      {(propertyMap[unit.property] || "Unknown Property") + ` - Unit ${unit.unit_number}`}
                    </MenuItem>
                  ))}
                </Select>
                {errors.unit ? <FormHelperText>{errors.unit}</FormHelperText> : null}
              </FormControl>
            </Box>
            <Box>
              <FormControl fullWidth error={Boolean(errors.tenant)} required>
                <InputLabel>Tenant</InputLabel>
                <Select label="Tenant" value={values.tenant} onChange={handleChange("tenant")}>
                  {tenants.map((tenant) => (
                    <MenuItem key={tenant.id} value={tenant.id}>
                      {tenant.first_name} {tenant.last_name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.tenant ? <FormHelperText>{errors.tenant}</FormHelperText> : null}
              </FormControl>
            </Box>
            <Box>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                variant="outlined"
                value={values.start_date}
                onChange={handleChange("start_date")}
                error={Boolean(errors.start_date)}
                helperText={errors.start_date}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                variant="outlined"
                value={values.end_date}
                onChange={handleChange("end_date")}
                error={Boolean(errors.end_date)}
                helperText={errors.end_date}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                type="number"
                inputProps={{ step: "0.01" }}
                label="Monthly Rent"
                variant="outlined"
                value={values.monthly_rent}
                onChange={handleChange("monthly_rent")}
                error={Boolean(errors.monthly_rent)}
                helperText={errors.monthly_rent}
                required
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                type="number"
                inputProps={{ step: "0.01" }}
                label="Security Deposit"
                variant="outlined"
                value={values.security_deposit}
                onChange={handleChange("security_deposit")}
                error={Boolean(errors.security_deposit)}
                helperText={errors.security_deposit}
                required
              />
            </Box>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(values.is_active)}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, is_active: event.target.checked }))
                    }
                  />
                }
                label="Lease is active"
              />
            </Box>
          </Box>
          <Box sx={{ mt: 2, display: "flex", gap: 1.2, justifyContent: "flex-end" }}>
            <Button variant="text" onClick={() => navigate("/leases")} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {isEditMode ? "Update Lease" : "Create Lease"}
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

export default LeaseForm;
