import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PrintIcon from "@mui/icons-material/Print";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getLeaseSigningDetails, submitLeaseSigning } from "../services/api";

function formatCurrency(value) {
  const amount = Number.parseFloat(value || 0);
  if (Number.isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function LeaseSigning() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lease, setLease] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getLeaseSigningDetails(token);
        const next = response?.data || null;
        setLease(next);
        if (next?.tenant_signature) {
          setSignature(next.tenant_signature);
        }
      } catch {
        setError("Signing link is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const dateText = (value) => (value ? new Date(value).toLocaleDateString() : "Not signed");

  const onSubmit = async () => {
    if (!signature.trim()) {
      setMessage("Please type your full legal name as signature.");
      return;
    }
    if (!agreed) {
      setMessage("Please confirm that you agree to the lease terms.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      const response = await submitLeaseSigning(token, { signature, agreed: true });
      setLease(response?.data?.lease || response?.data || lease);
    } catch (err) {
      const detail = err?.response?.data;
      if (typeof detail === "object") {
        const first = Object.values(detail)[0];
        setMessage(Array.isArray(first) ? first[0] : String(first));
      } else {
        setMessage("Unable to submit lease signature.");
      }
    } finally {
      setSaving(false);
    }
  };

  const onDecline = async () => {
    try {
      setSaving(true);
      setMessage("");
      const response = await submitLeaseSigning(token, { signature: signature || "", agreed: false });
      setLease(response?.data?.lease || response?.data || lease);
    } catch {
      setMessage("Unable to update signature status.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "100vh", color: "text.primary", bgcolor: "#fff" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: "100vh", py: 6, px: 2, bgcolor: "#fff" }}>
        <Paper sx={{ p: 3, maxWidth: 700, mx: "auto", border: "1px solid", borderColor: "divider" }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Lease Signing
          </Typography>
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
          <Button component={Link} to="/" variant="outlined" sx={{ mt: 1 }}>
            Return to Home
          </Button>
        </Paper>
      </Box>
    );
  }

  const isSigned = lease?.signature_status === "signed";

  return (
    <Box sx={{ minHeight: "100vh", py: 4, px: 2, bgcolor: "#fff", color: "#1a1a1a" }}>
      <Paper sx={{ maxWidth: 980, mx: "auto", p: { xs: 2, md: 3 }, border: "1px solid", borderColor: "rgba(226,232,240,0.8)" }}>
        <Typography variant="h4" sx={{ mb: 0.2, fontWeight: 700 }}>
          Tenant Screening Authorization
        </Typography>
        <Typography sx={{ color: "text.secondary", mb: 2 }}>
          Please review and sign the lease agreement.
        </Typography>

        <Typography sx={{ fontWeight: 700, fontSize: 20, mb: 0.4 }}>
          {lease?.property_name || "Property"}
        </Typography>
        <Typography sx={{ color: "text.secondary", mb: 0.8 }}>
          Unit {lease?.unit_number || "-"}
        </Typography>

        <Divider sx={{ my: 1.5 }} />

        <Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, mb: 1.8 }}>
          <Typography>
            <strong>Landlord:</strong> {lease?.landlord_name || "N/A"}
          </Typography>
          <Typography>
            <strong>Tenant:</strong> {lease?.tenant_name || "N/A"}
          </Typography>
          <Typography>
            <strong>Term:</strong> {lease?.start_date} to {lease?.end_date}
          </Typography>
          <Typography>
            <strong>Monthly Rent:</strong> {formatCurrency(lease?.monthly_rent)}
          </Typography>
          <Typography>
            <strong>Security Deposit:</strong> {formatCurrency(lease?.security_deposit)}
          </Typography>
          <Typography>
            <strong>Property Address:</strong> {lease?.property_address || "-"}
          </Typography>
        </Box>

        <Typography sx={{ fontWeight: 700, mb: 0.8 }}>Lease Agreement</Typography>
        <Paper
          sx={{
            p: 1.6,
            maxHeight: 320,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
            border: "1px solid rgba(226,232,240,0.9)",
            backgroundColor: "#f8fafc",
          }}
        >
          {lease?.content ? <div dangerouslySetInnerHTML={{ __html: lease.content }} /> : "No lease content available."}
        </Paper>
        <Typography sx={{ mt: 0.8, fontSize: 12, color: "text.secondary" }}>
          Scroll to read the full lease
        </Typography>

        <Divider sx={{ my: 1.8 }} />

        {isSigned ? (
          <Alert severity="success" sx={{ mb: 1.2 }}>
            This lease has already been signed. Tenant signature: {lease?.tenant_signature || "Not provided"} on{" "}
            {dateText(lease?.tenant_signed_date)}. Landlord signature: {lease?.landlord_signature || "Pending"}.
          </Alert>
        ) : (
          <Box>
            <FormControlLabel
              control={<Checkbox checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />}
              label="I have read and agree to all terms and conditions of this lease agreement"
            />
            <TextField
              fullWidth
              label="Type your full legal name as your electronic signature"
              value={signature}
              onChange={(event) => setSignature(event.target.value)}
              sx={{ mt: 1, mb: 1 }}
            />
            <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.2 }}>
              Current date: {new Date().toLocaleDateString()}
            </Typography>

            {message ? <Alert severity="warning">{message}</Alert> : null}

            <Box sx={{ display: "flex", gap: 1.1, flexWrap: "wrap", mt: 1.2 }}>
              <Button variant="contained" onClick={onSubmit} disabled={saving}>
                {saving ? "Signing..." : "Sign Lease"}
              </Button>
              <Button variant="outlined" color="inherit" onClick={onDecline} disabled={saving}>
                {saving ? "Saving..." : "Decline"}
              </Button>
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 1.8 }} />

        <Typography sx={{ color: "text.secondary", fontSize: 12, mb: 0.8 }}>
          Thank you! A copy of the signed lease will be available in your tenant portal.
        </Typography>

        <Box sx={{ display: "flex", gap: 1.2, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            Status: <strong>{lease?.signature_status || "unknown"}</strong>
          </Typography>
          <Button
            variant="text"
            endIcon={<PrintIcon />}
            onClick={() => window.print()}
            sx={{ color: "text.secondary" }}
          >
            Download / Print
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default LeaseSigning;
