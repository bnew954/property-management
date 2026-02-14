import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Alert, Box, Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Snackbar, TextField, Typography, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createScreening, getTenants, sendScreeningConsent } from "../services/api";
import { useUser } from "../services/userContext";
import { alpha } from "@mui/material/styles";

function ScreeningRequest() {
  const navigate = useNavigate();
  const { role } = useUser();
  const theme = useTheme();
  const [tenant, setTenant] = useState("");
  const [tenants, setTenants] = useState([]);
  const [createdLink, setCreatedLink] = useState("");
  const [createdId, setCreatedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    const loadTenants = async () => {
      try {
        const response = await getTenants();
        setTenants(response.data || []);
      } catch {
        setSnackbar({
          open: true,
          message: "Unable to load tenants.",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    if (role === "landlord") {
      loadTenants();
    } else {
      setLoading(false);
    }
  }, [role]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!tenant) {
      setSnackbar({
        open: true,
        message: "Please select a tenant.",
        severity: "error",
      });
      return;
    }
    try {
      setSubmitting(true);
      const createRes = await createScreening({ tenant });
      const screeningId = createRes.data?.id;
      const token = createRes.data?.consent_token;
      if (!screeningId || !token) {
        throw new Error("Screening creation failed.");
      }
      setCreatedId(screeningId);
      const consentLink = `${window.location.origin}/screening/consent/${token}`;
      setCreatedLink(consentLink);
      await sendScreeningConsent(screeningId);
      setSnackbar({
        open: true,
        message: "Screening request created. A consent link has been generated for the tenant.",
        severity: "success",
      });
      await navigator.clipboard
        .writeText(consentLink)
        .then(() => setCopyFeedback(true))
        .catch(() => {});
    } catch {
      setSnackbar({
        open: true,
        message: "Unable to create screening request.",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!createdLink) {
      return;
    }
    try {
      await navigator.clipboard.writeText(createdLink);
      setSnackbar({ open: true, message: "Consent link copied.", severity: "success" });
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1700);
    } catch {
      setSnackbar({ open: true, message: "Unable to copy link.", severity: "error" });
    }
  };

  if (role !== "landlord") {
    return (
      <Paper sx={{ p: 2, bgcolor: "background.paper" }}>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Screening tools are available to landlord accounts only.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography sx={{ fontSize: 20, fontWeight: 600, mb: 0.8, color: "text.primary", letterSpacing: "-0.01em" }}>
        New Screening Request
      </Typography>
      <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1.5 }}>
        Screening &gt; Run New Check
      </Typography>
      {loading ? <Typography>Loading...</Typography> : null}
      {!loading ? (
        <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, bgcolor: "background.paper", maxWidth: 640 }}>
          <Alert
            severity="info"
            sx={{
              mb: 2,
              bgcolor: alpha(theme.palette.info.main, 0.08),
              border: `1px solid ${alpha(theme.palette.info.main, 0.25)}`,
            }}
          >
            This will run a background check, credit check, and eviction history
            search. Results are typically available within seconds.
          </Alert>
          <Alert
            severity="warning"
            icon={<CheckCircleOutlineIcon />}
            sx={{
              mb: 1.8,
              bgcolor: alpha(theme.palette.warning.main, 0.08),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.28)}`,
            }}
          >
            Status after creation:{" "}
            <Chip
              size="small"
              label="Awaiting Tenant Consent"
              sx={{
                ml: 1,
                height: 22,
                bgcolor: alpha(theme.palette.warning.main, 0.16),
                color: theme.palette.warning.main,
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          </Alert>
          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel>Tenant</InputLabel>
            <Select
              label="Tenant"
              value={tenant}
              onChange={(event) => setTenant(event.target.value)}
            >
              {tenants.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.first_name} {item.last_name} ({item.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {createdLink ? (
            <Paper sx={{ p: 1.6, mb: 1.8, bgcolor: "action.hover", border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}` }}>
              <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.5 }}>
                Screening request created. A consent link has been generated for the tenant.
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Consent Link"
                value={createdLink}
                InputProps={{ readOnly: true }}
                sx={{ mb: 1 }}
              />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontSize: 12, color: copyFeedback ? "success.main" : "text.secondary" }}>
                  {copyFeedback ? "Copied to clipboard." : "Share this link with the tenant."}
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleCopy}
                  startIcon={<ContentCopyIcon />}
                >
                  Copy Link
                </Button>
              </Box>
            </Paper>
          ) : null}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button variant="text" onClick={() => navigate("/screenings")} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              Create Request
            </Button>
            {createdId ? (
              <Button variant="outlined" onClick={() => navigate(`/screenings/${createdId}`)} sx={{ color: "text.secondary" }}>
                View Request
              </Button>
            ) : null}
          </Box>
        </Paper>
      ) : null}
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

export default ScreeningRequest;

