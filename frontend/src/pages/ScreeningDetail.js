import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import GavelIcon from "@mui/icons-material/Gavel";
import PolicyOutlinedIcon from "@mui/icons-material/PolicyOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getLeases, getScreening } from "../services/api";
import { useUser } from "../services/userContext";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

const recommendationSx = (recommendation) => ({
  fontSize: 14,
  fontWeight: 600,
  px: 1.2,
  height: 30,
  bgcolor:
    recommendation === "approved"
      ? "rgba(34,197,94,0.14)"
      : recommendation === "conditional"
        ? "rgba(245,158,11,0.14)"
        : recommendation === "denied"
          ? "rgba(239,68,68,0.14)"
          : "rgba(107,114,128,0.16)",
  color:
    recommendation === "approved"
      ? "#22c55e"
      : recommendation === "conditional"
        ? "#f59e0b"
        : recommendation === "denied"
          ? "#ef4444"
          : "#9ca3af",
  textTransform: "capitalize",
});

function ScreeningDetail() {
  const { role } = useUser();
  const { id } = useParams();
  const [screening, setScreening] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeLease, setActiveLease] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const screeningRes = await getScreening(id);
        const screeningData = screeningRes.data;
        setScreening(screeningData);
        const leasesRes = await getLeases();
        const lease = (leasesRes.data || []).find(
          (item) => item.tenant === screeningData.tenant && item.is_active
        );
        setActiveLease(lease || null);
      } catch {
        setError("Unable to load screening report.");
      } finally {
        setLoading(false);
      }
    };
    if (role === "landlord") {
      load();
    } else {
      setLoading(false);
    }
  }, [id, role]);

  const incomeThreshold = useMemo(() => {
    if (!activeLease?.monthly_rent) {
      return null;
    }
    return Number(activeLease.monthly_rent) * 3;
  }, [activeLease?.monthly_rent]);

  const meetsIncomeThreshold = useMemo(() => {
    if (!incomeThreshold || !screening?.monthly_income) {
      return null;
    }
    return Number(screening.monthly_income) >= incomeThreshold;
  }, [incomeThreshold, screening?.monthly_income]);

  if (role !== "landlord") {
    return (
      <Paper sx={{ p: 2, bgcolor: "#141414" }}>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Screening reports are available to landlord accounts only.
        </Typography>
      </Paper>
    );
  }

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!screening) {
    return <Typography>No screening report found.</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em" }}>
            Screening Report
          </Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            {screening.tenant_detail
              ? `${screening.tenant_detail.first_name} ${screening.tenant_detail.last_name}`
              : `Tenant #${screening.tenant}`}{" "}
            · Requested {formatDate(screening.created_at)}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={() => window.print()}
          sx={{
            borderColor: "rgba(255,255,255,0.12)",
            color: "#e0e0e0",
            "&:hover": { borderColor: "primary.main", color: "primary.main" },
          }}
        >
          <PrintOutlinedIcon sx={{ mr: 0.6, fontSize: 16 }} />
          Print Report
        </Button>
      </Box>

      <Paper sx={{ p: 1.8, mb: 1.4 }}>
        <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.6 }}>Overall Recommendation</Typography>
        <Chip label={screening.recommendation || "pending"} sx={recommendationSx(screening.recommendation)} />
      </Paper>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.2, mb: 1.2 }}>
        <Paper sx={{ p: 1.6 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#fff", mb: 0.8 }}>
            Credit Report
          </Typography>
          <Typography sx={{ fontSize: 34, lineHeight: 1, fontWeight: 700, color: "#fff" }}>
            {screening.credit_score ?? "-"}
          </Typography>
          <Typography sx={{ mt: 0.6, fontSize: 12, color: "text.secondary", textTransform: "capitalize" }}>
            Rating: {screening.credit_rating ? screening.credit_rating.replaceAll("_", " ") : "-"}
          </Typography>
        </Paper>

        <Paper sx={{ p: 1.6 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#fff", mb: 0.8 }}>
            Background Check
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.7 }}>
            {screening.background_check === "clear" ? (
              <CheckCircleOutlineIcon sx={{ color: "#22c55e", fontSize: 18 }} />
            ) : screening.background_check === "review_needed" ? (
              <WarningAmberOutlinedIcon sx={{ color: "#f59e0b", fontSize: 18 }} />
            ) : (
              <ErrorOutlineIcon sx={{ color: "#ef4444", fontSize: 18 }} />
            )}
            <Typography sx={{ fontSize: 13, textTransform: "capitalize" }}>
              {screening.background_check ? screening.background_check.replaceAll("_", " ") : "-"}
            </Typography>
          </Box>
        </Paper>

        <Paper sx={{ p: 1.6 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#fff", mb: 0.8 }}>
            Eviction History
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.7 }}>
            <GavelIcon
              sx={{
                color:
                  screening.eviction_history === "none_found" ? "#22c55e" : "#ef4444",
                fontSize: 18,
              }}
            />
            <Typography sx={{ fontSize: 13, textTransform: "capitalize" }}>
              {screening.eviction_history
                ? screening.eviction_history.replaceAll("_", " ")
                : "-"}
            </Typography>
          </Box>
        </Paper>
      </Box>

      <Paper sx={{ p: 1.6, mb: 1.2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#fff", mb: 0.8 }}>
          Income Verification
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1 }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            Monthly Income:{" "}
            <Typography component="span" sx={{ color: "#e5e7eb", fontSize: 13 }}>
              {screening.monthly_income ? formatCurrency(screening.monthly_income) : "-"}
            </Typography>
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            Income Verified:{" "}
            <Typography component="span" sx={{ color: "#e5e7eb", fontSize: 13 }}>
              {screening.income_verified === null ? "-" : screening.income_verified ? "Yes" : "No"}
            </Typography>
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            3x Rent Threshold:{" "}
            <Typography component="span" sx={{ color: "#e5e7eb", fontSize: 13 }}>
              {incomeThreshold ? formatCurrency(incomeThreshold) : "No active lease found"}
            </Typography>
          </Typography>
        </Box>
        {meetsIncomeThreshold !== null ? (
          <Box sx={{ mt: 0.8, display: "flex", alignItems: "center", gap: 0.6 }}>
            <PolicyOutlinedIcon
              sx={{ color: meetsIncomeThreshold ? "#22c55e" : "#f59e0b", fontSize: 17 }}
            />
            <Typography sx={{ fontSize: 12, color: meetsIncomeThreshold ? "#22c55e" : "#f59e0b" }}>
              {meetsIncomeThreshold
                ? "Income meets the typical 3x rent threshold."
                : "Income is below the typical 3x rent threshold."}
            </Typography>
          </Box>
        ) : null}
      </Paper>

      <Paper sx={{ p: 1.6 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#fff", mb: 0.8 }}>
          Notes
        </Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
          {screening.notes || "No additional notes."}
        </Typography>
      </Paper>
    </Box>
  );
}

export default ScreeningDetail;

