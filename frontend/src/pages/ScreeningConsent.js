import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Alert, Box, Button, Checkbox, Paper, TextField, Typography, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getScreeningConsentDetails,
  submitScreeningConsent,
} from "../services/api";

function formatError(error) {
  if (!error) {
    return "Unable to submit your authorization right now.";
  }
  if (typeof error === "string") {
    return error;
  }
  if (Array.isArray(error)) {
    return error.join(" ");
  }
  if (typeof error === "object") {
    return Object.entries(error)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: ${value.join(", ")}`;
        }
        if (typeof value === "string" && value) {
          return `${key}: ${value}`;
        }
        return null;
      })
      .filter(Boolean)
      .join(" ") || "Unable to submit your authorization right now.";
  }
  return "Unable to submit your authorization right now.";
}

function ScreeningConsent() {
  const { token } = useParams();
  const theme = useTheme();
  const [screening, setScreening] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dob, setDob] = useState("");
  const [ssnLast4, setSsnLast4] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [responseState, setResponseState] = useState({ status: null, message: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getScreeningConsentDetails(token);
        setScreening(response.data || {});
      } catch (err) {
        if (err.response?.status === 404) {
          setError("This consent link is invalid or has already been used.");
        } else {
          setError("We could not load the consent details. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      load();
    }
  }, [token]);

  const handleSubmit = async (event, consentDecision) => {
    event.preventDefault();

    if (consentDecision && !authorized) {
      setError("Please confirm the authorization checkbox before continuing.");
      return;
    }

    if (consentDecision && (!dob || !ssnLast4)) {
      setError("Date of birth and last 4 SSN digits are required to authorize.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload = {
        consent: Boolean(consentDecision),
      };

      if (consentDecision) {
        payload.date_of_birth = dob;
        payload.ssn_last4 = ssnLast4;
      }

      const response = await submitScreeningConsent(token, payload);

      if (consentDecision) {
        setResponseState({
          status: "authorized",
          message:
            "Thank you! Your authorization has been received. Your landlord will be notified and the screening will proceed.",
        });
      } else {
        setResponseState({
          status: "declined",
          message: "You have declined the screening request. Your landlord will be notified.",
        });
      }

      setScreening(response.data || screening);
    } catch (err) {
      if (err.response?.data) {
        setError(formatError(err.response.data.detail || err.response.data));
      } else {
        setError("Unable to submit your authorization right now.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (error && !screening) {
    return (
      <Box sx={{ maxWidth: 860, mx: "auto", py: 8, px: 2 }}>
        <Paper sx={{ p: 3, bgcolor: "background.paper", maxWidth: 520, mx: "auto" }}>
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
          <Button component={Link} to="/login" variant="outlined" size="small">
            Continue to Onyx PM
          </Button>
        </Paper>
      </Box>
    );
  }

  if (responseState.status) {
    const success = responseState.status === "authorized";
    return (
      <Box sx={{ maxWidth: 860, mx: "auto", py: 8, px: 2 }}>
        <Paper
          sx={{
            p: { xs: 2.5, md: 3.5 },
            bgcolor: "background.paper",
            maxWidth: 680,
            mx: "auto",
            textAlign: "center",
          }}
        >
          {success ? (
            <CheckCircleOutlineIcon sx={{ color: theme.palette.success.main, fontSize: 44, mb: 1 }} />
          ) : (
            <ErrorOutlineIcon sx={{ color: theme.palette.error.main, fontSize: 44, mb: 1 }} />
          )}
          <Typography sx={{ fontSize: 20, fontWeight: 600, color: "text.primary" }}>
            {success ? "Authorization Received" : "Authorization Not Given"}
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 14, color: "text.secondary" }}>
            {responseState.message}
          </Typography>
        </Paper>
      </Box>
    );
  }

  const company = screening?.landlord_name || "your landlord";
  const property = screening?.property_name || "this property";

  return (
    <Box sx={{ maxWidth: 860, mx: "auto", py: 7, px: 2 }}>
      <Paper
        sx={{
          p: { xs: 2.4, md: 3.5 },
          bgcolor: "#fff",
          color: "#111827",
          maxWidth: 760,
          mx: "auto",
          borderRadius: 2,
          border: "1px solid #e5e7eb",
        }}
      >
        <Box sx={{ textAlign: "center", mb: 1.5 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              justifyContent: "center",
              mb: 1.2,
            }}
          >
            <img
              src="/logo-icon.png"
              alt="Onyx PM"
              style={{
                width: 42,
                height: 42,
                display: "block",
                mixBlendMode: "screen",
                background: "transparent",
                filter: "brightness(1.1)",
              }}
            />
            <Typography
              sx={{
                fontSize: 24,
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#111827",
                lineHeight: 1,
              }}
            >
              ONYX
            </Typography>
            <Box
              component="span"
              sx={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 600,
                letterSpacing: "0.05em",
                backgroundColor: "rgba(124,92,252,0.15)",
                color: "#7c5cfc",
                px: "10px",
                py: "3px",
                borderRadius: "6px",
                fontSize: "70%",
                lineHeight: 1.4,
                textTransform: "uppercase",
              }}
            >
              PM
            </Box>
          </Box>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            Tenant Screening Authorization
          </Typography>
        </Box>

        <Typography sx={{ color: "text.secondary", mb: 1.8 }}>
          Your landlord <strong>{company}</strong> has requested a background and credit
          check as part of your rental application for <strong>{property}</strong>.
        </Typography>
        <Typography sx={{ color: "text.secondary", mb: 1.6 }}>
          We will request your credit history, criminal background, and eviction history records.
        </Typography>

        <Box
          component="form"
          onSubmit={(event) => handleSubmit(event, authorized)}
          sx={{ display: "grid", gap: 1.3, mt: 0.8 }}
        >
          <TextField
            label="Full legal name"
            value={`${screening?.tenant_name || ""}`}
            fullWidth
            size="small"
            InputProps={{ readOnly: true }}
            sx={{
              "& .MuiInputBase-root.Mui-disabled": { backgroundColor: "rgba(17,24,39,0.04)" },
            }}
            disabled
          />
          <TextField
            type="date"
            label="Date of birth"
            required
            value={dob}
            onChange={(event) => setDob(event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
          />
          <TextField
            label="Last 4 digits of SSN"
            inputProps={{ maxLength: 4 }}
            required
            value={ssnLast4}
            onChange={(event) =>
              setSsnLast4(event.target.value.replace(/\D/g, "").slice(0, 4))
            }
            fullWidth
            size="small"
          />

          <Box sx={{ display: "grid", gap: 0.8, mt: 0.6 }}>
            <Typography sx={{ fontSize: 14, color: "#374151" }}>
              I authorize {company} to obtain a consumer report including credit, criminal
              background, and eviction history for the purpose of evaluating my rental
              application. I understand this may affect my credit score.
            </Typography>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Checkbox
                checked={authorized}
                onChange={(event) => setAuthorized(event.target.checked)}
                color="primary"
              />
              <span style={{ fontSize: 14 }}>I consent to this screening check</span>
            </label>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              The tenant authorization includes a date of birth and last 4 SSN digits.
            </Typography>
          </Box>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <Button
              type="button"
              variant="contained"
              disabled={!authorized || submitting}
              onClick={(event) => handleSubmit(event, true)}
            >
              I Authorize This Screening
            </Button>
            <Button
              type="button"
              variant="outlined"
              disabled={submitting}
              onClick={(event) => handleSubmit(event, false)}
            >
              Decline
            </Button>
          </Box>
          <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.6 }}>
            If you have trouble with this page, please contact your landlord.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export default ScreeningConsent;


