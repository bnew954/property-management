import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CreditScoreIcon from "@mui/icons-material/CreditScore";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  approveApplication,
  denyApplication,
  createTenant,
  getApplication,
  runApplicationScreening,
  updateApplication,
} from "../services/api";

const sectionTitle = {
  fontSize: 13,
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

function formatCurrency(value) {
  return Number.isFinite(Number(value))
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
        Math.max(0, Number(value)),
      )
    : "$0";
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";
}

function statusChipSx(status, theme) {
  const palette = {
    submitted: theme.palette.info.main,
    under_review: theme.palette.warning.main,
    approved: theme.palette.success.main,
    denied: theme.palette.error.main,
    withdrawn: theme.palette.text.secondary,
  };
  const color = palette[status] || theme.palette.text.secondary;
  return {
    bgcolor: `${color}22`,
    color,
    fontWeight: 600,
    fontSize: 11,
    height: 24,
    textTransform: "capitalize",
  };
}

function SectionTable({ title, rows }) {
  if (!rows || rows.length === 0) return null;
  return (
    <Paper sx={{ p: 1.8, mb: 1.2 }}>
      <Typography sx={{ fontWeight: 600, color: "text.primary", mb: 1 }}>{title}</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.2 }}>
        {rows.map(({ label, value }) => (
          <Box key={label}>
            <Typography sx={sectionTitle}>{label}</Typography>
            <Typography sx={{ color: "text.primary", mt: 0.3 }}>{value || "-"}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState("");
  const [loadingAction, setLoadingAction] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getApplication(id);
      const payload = response.data || {};
      setApplication(payload);
      setReviewNotes(payload.review_notes || "");
      setError("");
    } catch {
      setError("Unable to load application.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const ratio = useMemo(() => {
    const income = Number(application?.monthly_income || 0);
    const rent = Number(application?.unit_detail?.rent_amount || 0);
    if (!income || !rent) return null;
    return income / rent;
  }, [application?.monthly_income, application?.unit_detail?.rent_amount]);

  const ratioLabel = ratio ? `${ratio.toFixed(2)}x` : "-";
  const ratioStatus = ratio == null ? "Unknown" : ratio >= 3 ? "Healthy" : "Below threshold";
  const ratioColor = ratio == null || ratio < 3 ? theme.palette.error.main : theme.palette.success.main;

  const showToast = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 2500);
  };

  const refreshAfterUpdate = async () => {
    await load();
  };

  const handleUpdateReview = async () => {
    try {
      setLoadingAction("review");
      const response = await updateApplication(id, { review_notes: reviewNotes });
      setApplication(response.data || application);
      showToast("success", "Review notes saved.");
    } catch {
      setMessage({ type: "error", text: "Unable to save review notes." });
    } finally {
      setLoadingAction("");
    }
  };

  const handleStatus = async (status) => {
    try {
      setLoadingAction(status);
      const payload = { status, review_notes: reviewNotes };
      const response = await updateApplication(id, payload);
      setApplication(response.data || application);
      showToast("success", `Status updated to ${status.replace("_", " ")}.`);
    } catch {
      setMessage({ type: "error", text: "Unable to update status." });
    } finally {
      setLoadingAction("");
    }
  };

  const handleApprove = async () => {
    try {
      setLoadingAction("approve");
      const response = await approveApplication(id, { review_notes: reviewNotes });
      setApplication(response.data?.application || response.data || application);
      showToast("success", "Application approved.");
    } catch {
      setMessage({ type: "error", text: "Unable to approve application." });
    } finally {
      setLoadingAction("");
    }
  };

  const handleDeny = async () => {
    try {
      setLoadingAction("deny");
      const response = await denyApplication(id, { review_notes: reviewNotes });
      setApplication(response.data || application);
      showToast("success", "Application denied.");
    } catch {
      setMessage({ type: "error", text: "Unable to deny application." });
    } finally {
      setLoadingAction("");
    }
  };

  const handleRunScreening = async () => {
    try {
      setLoadingAction("screening");
      await runApplicationScreening(id);
      showToast("success", "Screening created for this application.");
      await refreshAfterUpdate();
    } catch {
      setMessage({ type: "error", text: "Unable to run screening." });
    } finally {
      setLoadingAction("");
    }
  };

  const handleCreateTenant = async () => {
    try {
      setLoadingAction("tenant");
      await createTenant({
        first_name: application.first_name,
        last_name: application.last_name,
        email: application.email,
        phone: application.phone,
        date_of_birth: application.date_of_birth,
      });
      showToast("success", "Tenant record created.");
      await refreshAfterUpdate();
    } catch {
      setMessage({ type: "error", text: "Unable to create tenant record. The tenant may already exist." });
    } finally {
      setLoadingAction("");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: 240 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!application) {
    return (
      <Alert
        severity="error"
        action={
          <Button onClick={() => navigate("/applications")} size="small">
            Back
          </Button>
        }
      >
        Unable to load application.
      </Alert>
    );
  }

  const tenantName = `${application.first_name || ""} ${application.last_name || ""}`.trim() || "Applicant";
  const unit = application.unit_detail || {};
  const references = Array.isArray(application.references) ? application.references : [];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1.2, mb: 1.2 }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 600 }}>Application Review</Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.3 }}>
            {tenantName} · {formatDate(application.created_at)}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: 12, mt: 0.2 }}>
            {unit.property_name || "Unit"} · {unit.unit_number ? `Unit ${unit.unit_number}` : `Unit ${application.unit}`}
          </Typography>
        </Box>
        <Chip size="small" label={application.status} sx={statusChipSx(application.status, theme)} />
      </Box>

      {message.text ? <Alert severity={message.type === "error" ? "error" : "success"} sx={{ mb: 1.1 }}>{message.text}</Alert> : null}
      {error ? <Alert severity="error" sx={{ mb: 1.1 }}>{error}</Alert> : null}

      <Box sx={{ display: "grid", gap: 1.2, mb: 1.2, gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr" } }}>
        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 600, color: "text.primary" }}>Applicant</Typography>
            <Typography sx={{ mt: 0.7, fontWeight: 600 }}>{tenantName}</Typography>
            <Typography sx={{ color: "text.secondary" }}>{application.email}</Typography>
            <Typography sx={{ color: "text.secondary" }}>{application.phone}</Typography>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr" } }}>
              <Box>
                <Typography sx={sectionTitle}>Date of Birth</Typography>
                <Typography>{formatDate(application.date_of_birth)}</Typography>
              </Box>
              <Box>
                <Typography sx={sectionTitle}>SSN Last 4</Typography>
                <Typography>{application.ssn_last4 || "Not provided"}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 600, color: "text.primary" }}>Application Progress</Typography>
            <Typography sx={{ mt: 1, fontSize: 28, fontWeight: 700 }}>{ratioLabel}</Typography>
            <Chip size="small" label={ratioStatus} sx={{ mt: 0.6, bgcolor: `${ratioColor}22`, color: ratioColor, fontWeight: 600 }} />
            <Typography sx={{ mt: 1, color: "text.secondary", fontSize: 12 }}>
              Monthly income: {formatCurrency(application.monthly_income)} / Rent: {formatCurrency(unit.rent_amount)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <SectionTable
        title="Current Residence"
        rows={[
          { label: "Address", value: application.current_address },
          { label: "City", value: application.current_city },
          { label: "State", value: application.current_state },
          { label: "ZIP", value: application.current_zip },
          { label: "Current Landlord", value: application.current_landlord_name },
          { label: "Landlord Phone", value: application.current_landlord_phone },
          { label: "Current Rent", value: formatCurrency(application.current_rent) },
          { label: "Reason for Moving", value: application.reason_for_moving },
        ]}
      />

      <SectionTable
        title="Employment & Income"
        rows={[
          { label: "Employer", value: application.employer_name },
          { label: "Employer Phone", value: application.employer_phone },
          { label: "Job Title", value: application.job_title },
          { label: "Employment Length", value: application.employment_length },
          { label: "Monthly Income", value: formatCurrency(application.monthly_income) },
          { label: "Occupants", value: application.num_occupants },
          { label: "Pets", value: application.has_pets ? "Yes" : "No" },
          { label: "Pet Description", value: application.pet_description },
          { label: "Eviction history", value: application.has_been_evicted ? "Yes" : "No" },
          { label: "Criminal History", value: application.has_criminal_history ? "Yes" : "No" },
        ]}
      />

      <Paper sx={{ p: 1.8, mb: 1.2 }}>
        <Typography sx={{ fontWeight: 600, mb: 1 }}>References</Typography>
        {references.length === 0 ? (
          <Typography sx={{ color: "text.secondary", fontSize: 13 }}>No references provided.</Typography>
        ) : (
          <Stack spacing={1}>
            {references.map((item, index) => (
              <Card key={`${item.phone}-${index}`} variant="outlined" sx={{ p: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                  {item?.name || `Reference ${index + 1}`}
                </Typography>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  {item?.phone || "-"} · {item?.relationship || "-"}
                </Typography>
              </Card>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper sx={{ p: 1.8, mb: 1.2 }}>
        <Typography sx={{ fontWeight: 600, mb: 1 }}>Consents</Typography>
        <Stack direction="row" spacing={1.1} flexWrap="wrap">
          <Chip icon={<CheckCircleOutlineIcon />} label={`Background check: ${application.consent_background_check ? "Authorized" : "Not authorized"}`} />
          <Chip icon={<CreditScoreIcon />} label={`Credit check: ${application.consent_credit_check ? "Authorized" : "Not authorized"}`} />
          <Chip
            icon={application.signature_date ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
            label={`Signature: ${application.electronic_signature ? "Captured" : "Missing"}`}
          />
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.8 }}>
        <Typography sx={{ fontWeight: 600, mb: 1 }}>Landlord Review</Typography>
        <TextField
          multiline
          minRows={3}
          fullWidth
          value={reviewNotes}
          onChange={(event) => setReviewNotes(event.target.value)}
          label="Review Notes"
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.2 }} flexWrap="wrap">
          <Button size="small" variant="outlined" onClick={handleUpdateReview} disabled={loadingAction === "review"}>
            Save Notes
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleApprove}
            disabled={loadingAction === "approve"}
          >
            Approve
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            startIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />}
            onClick={() => handleStatus("under_review")}
            disabled={loadingAction === "under_review"}
          >
            Mark Under Review
          </Button>
          <Button size="small" variant="outlined" color="error" onClick={handleDeny} disabled={loadingAction === "deny"}>
            Deny
          </Button>
          <Button size="small" variant="text" component={Link} to="/applications">
            Back
          </Button>
        </Stack>
        <Box sx={{ mt: 1.2, display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleCreateTenant}
            disabled={loadingAction === "tenant"}
          >
            Create Tenant Record
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            onClick={handleRunScreening}
            disabled={loadingAction === "screening"}
          >
            Run Screening
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default ApplicationDetail;
