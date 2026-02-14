import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Autorenew,
  Check,
  ContentCopy,
  Description,
  Download,
  Send,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import {
  createLease,
  downloadDocument,
  generateLeaseDocument,
  getLease,
  getProperties,
  getTenants,
  getUnits,
  landlordSignLease,
  sendLeaseForSigning,
  updateLease,
} from "../services/api";

const createLeaseApi = async (payload, isEditMode, id) => {
  if (isEditMode) {
    return updateLease(id, payload);
  }
  return createLease(payload);
};

const initialValues = {
  unit: "",
  tenant: "",
  start_date: "",
  end_date: "",
  monthly_rent: "",
  security_deposit: "",
  is_active: true,
};

const workflowSteps = [
  "Lease Created",
  "Document Generated",
  "Sent for Signing",
  "Tenant Signed",
  "Landlord Signed",
  "Lease Active",
];

function parseStepState(lease) {
  const signatureStatus = lease?.signature_status || "draft";
  const hasDocument = Boolean(lease?.lease_document);
  const tenantSigned = Boolean(lease?.tenant_signature);
  const landlordSigned = Boolean(lease?.landlord_signature);
  const isSent = ["sent", "viewed", "signed"].includes(signatureStatus);

  const completed = [
    true,
    hasDocument,
    isSent,
    tenantSigned,
    landlordSigned,
    tenantSigned && landlordSigned,
  ];

  const firstIncomplete = completed.findIndex((value) => !value);
  const activeStep = firstIncomplete === -1 ? workflowSteps.length - 1 : firstIncomplete;

  return {
    signatureStatus,
    hasDocument,
    isSent,
    tenantSigned,
    landlordSigned,
    completed,
    activeStep,
  };
}

function WorkflowStepIcon({ active, completed }) {
  if (completed) {
    return <CheckCircleIcon sx={{ color: "success.main", fontSize: 18 }} />;
  }

  if (active) {
    return (
      <Box
        sx={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: "2px solid",
          borderColor: "primary.main",
          bgcolor: "primary.light",
          opacity: 0.2,
        }}
      />
    );
  }

  return <Box sx={{ width: 18, height: 18, borderRadius: "50%", border: "1px solid", borderColor: "text.disabled" }} />;
}

function SignaturePanel({ label, signature, date }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.4,
        borderRadius: 2,
        borderColor: signature ? "success.main" : "divider",
        bgcolor: signature ? "rgba(16,185,129,0.02)" : "transparent",
      }}
    >
      <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.4 }}>{label}</Typography>
      {signature ? (
        <>
          <Typography
            sx={{
              fontSize: 18,
              fontFamily: "\"Times New Roman\", Georgia, serif",
              fontStyle: "italic",
              color: "text.primary",
              lineHeight: 1.5,
            }}
          >
            {signature}
          </Typography>
          {date ? <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.4 }}>{`Signed on ${new Date(date).toLocaleString()}`}</Typography> : null}
        </>
      ) : (
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Pending signature</Typography>
      )}
    </Paper>
  );
}

function formatDateText(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

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
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
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
        const [unitsRes, tenantsRes, propertiesRes] = await Promise.all([getUnits(), getTenants(), getProperties()]);
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
      } catch {
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

  const unitLabel = useMemo(() => {
    const result = {};
    units.forEach((unit) => {
      const propName = propertyMap[unit.property] || "Unknown Property";
      result[unit.id] = `${propName} - Unit ${unit.unit_number}`;
    });
    return result;
  }, [units, propertyMap]);

  const stepState = useMemo(() => parseStepState(leaseSnapshot || {}), [leaseSnapshot]);

  const signingLink = useMemo(
    () => (leaseSnapshot?.signing_token ? `${window.location.origin}/lease/sign/${leaseSnapshot.signing_token}` : ""),
    [leaseSnapshot?.signing_token],
  );

  const validate = () => {
    const nextErrors = {};
    ["unit", "tenant", "start_date", "end_date", "monthly_rent", "security_deposit"].forEach((field) => {
      if (String(values[field] ?? "").trim() === "") {
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
      await createLeaseApi(payload, isEditMode, id);
      navigate("/leases", {
        state: {
          snackbar: {
            message: isEditMode ? "Lease updated successfully." : "Lease created successfully.",
            severity: "success",
          },
        },
      });
    } catch (error) {
      const fieldErrors = parseApiErrors(error);
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
      // keep state unchanged on refresh failure
    }
  };

  const handleGenerateDocument = async () => {
    try {
      setActionLoading(true);
      await generateLeaseDocument(id);
      await refreshLease();
      setSnackbar({ open: true, message: "Lease document generated.", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "Unable to generate lease document.", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendForSigning = async () => {
    try {
      setActionLoading(true);
      await sendLeaseForSigning(id);
      await refreshLease();
      setSnackbar({ open: true, message: "Lease sent for tenant signing.", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "Unable to send lease for signing.", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLandlordSign = async () => {
    if (!landlordSignature.trim()) {
      setSnackbar({ open: true, message: "Landlord signature is required.", severity: "error" });
      return;
    }

    try {
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
    if (!signingLink) {
      return;
    }
    try {
      await navigator.clipboard.writeText(signingLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1200);
      setSnackbar({ open: true, message: "Signing link copied.", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "Could not copy signing link.", severity: "error" });
    }
  };

  const handleOpenDocument = async () => {
    if (!leaseSnapshot?.lease_document) {
      return;
    }
    try {
      const response = await downloadDocument(leaseSnapshot.lease_document);
      const blob = new Blob([response.data], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 1200);
    } catch {
      setSnackbar({ open: true, message: "Unable to open lease document.", severity: "error" });
    }
  };

  const getWorkflowCardConfig = () => {
    if (!leaseSnapshot) {
      return {
        title: "Lease workflow will appear after saving.",
        description: "Create and save the lease first to enable document generation and signing actions.",
        action: null,
      };
    }

    if (!stepState.hasDocument) {
      return {
        title: "Next Step: Generate Lease Document",
        description:
          "We'll create a standard lease agreement based on the details below. You can review and edit it before sending.",
        action: {
          label: "Generate Lease Document",
          onClick: handleGenerateDocument,
          icon: <Autorenew />,
          color: "primary",
        },
      };
    }

    if (!stepState.isSent) {
      return {
        title: "Next Step: Send to Tenant for Signing",
        description: "The lease document is ready. Send it to the tenant for their electronic signature.",
        action: {
          label: "Send for Signing",
          onClick: handleSendForSigning,
          icon: <Send />,
          color: "primary",
        },
        showSummary: true,
      };
    }

    if (!stepState.tenantSigned) {
      return {
        title: "Waiting for Tenant Signature",
        description: "The lease has been sent to the tenant. Share this link if needed.",
        action: {
          label: "Copy Signing Link",
          onClick: handleCopySigningLink,
          icon: <ContentCopy />,
          color: "primary",
        },
        tenantWaiting: true,
      };
    }

    if (!stepState.landlordSigned) {
      return {
        title: "Tenant Has Signed! Your Turn.",
        description: `The tenant signed on ${formatDateText(leaseSnapshot.tenant_signed_date)}. Review and add your signature to finalize the lease.`,
        action: {
          label: "Sign as Landlord",
          onClick: handleLandlordSign,
          icon: <Check />,
          color: "primary",
        },
        landlordSignatureInput: true,
      };
    }

    return {
      title: "Lease Fully Executed",
      description: "Both signatures are captured. The lease is active and fully executed.",
      action: {
        label: "Download PDF",
        onClick: handleOpenDocument,
        icon: <Download />,
        color: "primary",
      },
      allowView: true,
    };
  };

  const workflowCardConfig = getWorkflowCardConfig();

  const selectedUnitDisplay = values.unit ? unitLabel[Number(values.unit)] : "";

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        {isEditMode ? "Lease Management" : "Add Lease"}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        {isEditMode
          ? "Manage signing flow and lease details."
          : "Create a lease and continue with document workflow from the lease detail page."}
      </Typography>

      {isEditMode ? (
        <Paper sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", mb: 2.5 }}>
          <Box sx={{ p: 2 }}>
            <Stepper
              activeStep={stepState.activeStep}
              alternativeLabel
              sx={{
                mb: 1.5,
                "& .MuiStepLabel-label": {
                  fontSize: 12,
                  letterSpacing: "0.01em",
                  color: "text.secondary",
                },
              }}
            >
              {workflowSteps.map((label, index) => {
                const completed = stepState.completed[index];
                const isActive = index === stepState.activeStep;
                return (
                  <Step key={label} completed={completed}>
                    <StepLabel
                      StepIconComponent={(props) => (
                        <WorkflowStepIcon active={props.active || isActive} completed={completed} />
                      )}
                      sx={{
                        color: isActive ? "primary.main" : "text.secondary",
                        "& .MuiStepLabel-label": {
                          color: completed
                            ? "success.main"
                            : isActive
                              ? "primary.main"
                              : "text.secondary",
                        },
                      }}
                    >
                      {label}
                    </StepLabel>
                  </Step>
                );
              })}
            </Stepper>

            <Box>
              <Typography sx={{ fontWeight: 600, color: theme.palette.text.primary }}>{workflowCardConfig.title}</Typography>
              <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.4 }}>{workflowCardConfig.description}</Typography>

              {workflowCardConfig.showSummary ? (
                <Paper
                  variant="outlined"
                  sx={{ mt: 1.6, p: 1.2, borderRadius: 1.5, background: "rgba(255,255,255,0.02)" }}
                >
                  <Typography sx={{ fontSize: 12, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Lease Preview
                  </Typography>
                  <Typography sx={{ mt: 0.5, color: theme.palette.text.primary }}>
                    {selectedUnitDisplay || unitLabel[leaseSnapshot?.unit] || "Unit"}
                  </Typography>
                  <Typography sx={{ color: "text.secondary", mt: 0.4 }}>
                    {leaseSnapshot?.tenant_detail
                      ? `${leaseSnapshot.tenant_detail.first_name || ""} ${leaseSnapshot.tenant_detail.last_name || ""}`.trim()
                      : "Tenant"}
                  </Typography>
                  <Typography sx={{ color: "text.secondary", mt: 0.4 }}>
                    {`Term: ${formatDateText(leaseSnapshot?.start_date)} to ${formatDateText(leaseSnapshot?.end_date)}`}
                  </Typography>
                  <Typography sx={{ color: "text.secondary", mt: 0.4 }}>
                    {`Rent: $${Number(leaseSnapshot?.monthly_rent || 0).toLocaleString()} · Deposit: $${Number(leaseSnapshot?.security_deposit || 0).toLocaleString()}`}
                  </Typography>
                </Paper>
              ) : null}

              {workflowCardConfig.tenantWaiting ? (
                <Box sx={{ mt: 1.2, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontSize: 12, color: "text.secondary", width: "100%" }}>Share this link:</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={signingLink}
                    InputProps={{ readOnly: true }}
                    sx={{ maxWidth: { xs: "100%", md: 420 }, background: "rgba(255,255,255,0.02)" }}
                  />
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={workflowCardConfig.action.onClick}
                    startIcon={workflowCardConfig.action.icon}
                    disabled={actionLoading || !signingLink}
                    size="small"
                  >
                    {copySuccess ? "Copied" : workflowCardConfig.action.label}
                  </Button>
                  <Button variant="text" onClick={handleOpenDocument} startIcon={<Description />} size="small">
                    Preview Document
                  </Button>
                </Box>
              ) : null}

              {workflowCardConfig.landlordSignatureInput ? (
                <Box sx={{ mt: 1.6, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 220px" }, gap: 1 }}>
                  <TextField
                    size="small"
                    label="Landlord Signature"
                    value={landlordSignature}
                    onChange={(event) => setLandlordSignature(event.target.value)}
                    helperText="Type your full legal name"
                  />
                  <Button
                    variant="contained"
                    onClick={workflowCardConfig.action.onClick}
                    disabled={actionLoading || !landlordSignature.trim()}
                    startIcon={workflowCardConfig.action.icon}
                  >
                    {workflowCardConfig.action.label}
                  </Button>
                </Box>
              ) : null}

                {!workflowCardConfig.landlordSignatureInput && !workflowCardConfig.tenantWaiting ? (
                workflowCardConfig.action ? (
                  stepState.tenantSigned && stepState.landlordSigned ? (
                    <Box sx={{ mt: 1.4, display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Button variant="text" onClick={handleOpenDocument} startIcon={<Description />}>
                        View Lease Document
                      </Button>
                      <Button variant="contained" onClick={workflowCardConfig.action.onClick} startIcon={workflowCardConfig.action.icon} disabled={actionLoading}>
                        {workflowCardConfig.action.label}
                      </Button>
                    </Box>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={workflowCardConfig.action.onClick}
                      disabled={actionLoading}
                      startIcon={workflowCardConfig.action.icon}
                      sx={{ mt: 1.4 }}
                    >
                      {workflowCardConfig.action.label}
                    </Button>
                  )
                ) : null
              ) : null}

              {(stepState.tenantSigned || stepState.landlordSigned) ? (
                <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 1.2 }}>
                  Tenant signed date: {formatDateText(leaseSnapshot?.tenant_signed_date) || "-"}
                </Typography>
              ) : null}

              <Divider sx={{ mt: 1.6 }} />

              <Box sx={{ mt: 1.2, display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" } }}>
                <SignaturePanel label="Tenant Signature" signature={leaseSnapshot?.tenant_signature} date={leaseSnapshot?.tenant_signed_date} />
                <SignaturePanel label="Landlord Signature" signature={leaseSnapshot?.landlord_signature} date={leaseSnapshot?.landlord_signed_date} />
              </Box>
            </Box>
          </Box>
        </Paper>
      ) : null}

      {loading ? (
        <Typography>Loading lease data...</Typography>
      ) : (
        <Accordion defaultExpanded sx={{ border: "1px solid", borderColor: "divider", backgroundColor: "background.paper", borderRadius: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 600, color: "text.primary" }}>Lease Details</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box component="form" onSubmit={handleSubmit}>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}>
                <Box>
                  <FormControl fullWidth error={Boolean(errors.unit)} required>
                    <InputLabel>Unit</InputLabel>
                    <Select value={values.unit} onChange={handleChange("unit")} label="Unit">
                      {units.map((unit) => (
                        <MenuItem key={unit.id} value={unit.id}>
                          {unitLabel[unit.id]}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.unit ? <FormHelperText>{errors.unit}</FormHelperText> : null}
                  </FormControl>
                </Box>

                <Box>
                  <FormControl fullWidth error={Boolean(errors.tenant)} required>
                    <InputLabel>Tenant</InputLabel>
                    <Select value={values.tenant} onChange={handleChange("tenant")} label="Tenant">
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
                        onChange={(event) => setValues((prev) => ({ ...prev, is_active: event.target.checked }))}
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
            </Box>
          </AccordionDetails>
        </Accordion>
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
