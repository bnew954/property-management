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
  useTheme,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getLeases, getScreening } from "../services/api";
import { useUser } from "../services/userContext";
import { alpha } from "@mui/material/styles";

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

const recommendationSx = (recommendation, theme) => ({
  fontSize: 14,
  fontWeight: 600,
  px: 1.2,
  height: 30,
  bgcolor: alpha(
    recommendation === "approved"
      ? theme.palette.success.main
      : recommendation === "conditional"
        ? theme.palette.warning.main
        : recommendation === "denied"
          ? theme.palette.error.main
          : theme.palette.text.secondary,
    0.14,
  ),
  color:
    recommendation === "approved"
      ? theme.palette.success.main
      : recommendation === "conditional"
        ? theme.palette.warning.main
        : recommendation === "denied"
          ? theme.palette.error.main
          : theme.palette.text.secondary,
  textTransform: "capitalize",
});

function ScreeningDetail() {
  const { role } = useUser();
  const { id } = useParams();
  const [screening, setScreening] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeLease, setActiveLease] = useState(null);
  const theme = useTheme();

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
      <Paper sx={{ p: 2, bgcolor: "background.paper" }}>
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
          <Typography sx={{ fontSize: 20, fontWeight: 600, color: "text.primary", letterSpacing: "-0.01em" }}>
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
              borderColor: "divider",
              color: "text.secondary",
              "&:hover": { borderColor: "primary.main", color: "primary.main", backgroundColor: "action.hover" },
            }}
          >
            <PrintOutlinedIcon sx={{ mr: 0.6, fontSize: 16 }} />
            Print Report
          </Button>
      </Box>

        <Paper sx={{ p: 1.8, mb: 1.4 }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.6 }}>Overall Recommendation</Typography>
        <Chip label={screening.recommendation || "pending"} sx={recommendationSx(screening.recommendation, theme)} />
      </Paper>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.2, mb: 1.2 }}>
        <Paper sx={{ p: 1.6, bgcolor: "background.paper" }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", mb: 0.8 }}>
            Credit Report
          </Typography>
          <Typography sx={{ fontSize: 34, lineHeight: 1, fontWeight: 700, color: "text.primary" }}>
            {screening.credit_score ?? "-"}
          </Typography>
          <Typography sx={{ mt: 0.6, fontSize: 12, color: "text.secondary", textTransform: "capitalize" }}>
            Rating: {screening.credit_rating ? screening.credit_rating.replaceAll("_", " ") : "-"}
          </Typography>
        </Paper>

        <Paper sx={{ p: 1.6, bgcolor: "background.paper" }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", mb: 0.8 }}>
            Background Check
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.7 }}>
            {screening.background_check === "clear" ? (
              <CheckCircleOutlineIcon sx={{ color: theme.palette.success.main, fontSize: 18 }} />
            ) : screening.background_check === "review_needed" ? (
              <WarningAmberOutlinedIcon sx={{ color: theme.palette.warning.main, fontSize: 18 }} />
            ) : (
              <ErrorOutlineIcon sx={{ color: theme.palette.error.main, fontSize: 18 }} />
            )}
            <Typography sx={{ fontSize: 13, textTransform: "capitalize" }}>
              {screening.background_check ? screening.background_check.replaceAll("_", " ") : "-"}
            </Typography>
          </Box>
        </Paper>

        <Paper sx={{ p: 1.6, bgcolor: "background.paper" }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", mb: 0.8 }}>
            Eviction History
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.7 }}>
            <GavelIcon
              sx={{
                color:
                  screening.eviction_history === "none_found" ? theme.palette.success.main : theme.palette.error.main,
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

      <Paper sx={{ p: 1.6, mb: 1.2, bgcolor: "background.paper" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", mb: 0.8 }}>
          Income Verification
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1 }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            Monthly Income:{" "}
            <Typography component="span" sx={{ color: "text.primary", fontSize: 13 }}>
              {screening.monthly_income ? formatCurrency(screening.monthly_income) : "-"}
            </Typography>
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            Income Verified:{" "}
            <Typography component="span" sx={{ color: "text.primary", fontSize: 13 }}>
              {screening.income_verified === null ? "-" : screening.income_verified ? "Yes" : "No"}
            </Typography>
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            3x Rent Threshold:{" "}
            <Typography component="span" sx={{ color: "text.primary", fontSize: 13 }}>
              {incomeThreshold ? formatCurrency(incomeThreshold) : "No active lease found"}
            </Typography>
          </Typography>
        </Box>
        {meetsIncomeThreshold !== null ? (
          <Box sx={{ mt: 0.8, display: "flex", alignItems: "center", gap: 0.6 }}>
            <PolicyOutlinedIcon
              sx={{
                color: meetsIncomeThreshold ? theme.palette.success.main : theme.palette.warning.main,
                fontSize: 17,
              }}
            />
            <Typography
              sx={{
                fontSize: 12,
                color: meetsIncomeThreshold ? theme.palette.success.main : theme.palette.warning.main,
              }}
            >
              {meetsIncomeThreshold
                ? "Income meets the typical 3x rent threshold."
                : "Income is below the typical 3x rent threshold."}
            </Typography>
          </Box>
        ) : null}
      </Paper>

      <Paper sx={{ p: 1.6, bgcolor: "background.paper" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", mb: 0.8 }}>
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
