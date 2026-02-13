import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Alert, Box, Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getScreenings } from "../services/api";
import { useUser } from "../services/userContext";

const headerCellSx = {
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: "11px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";

const statusChipSx = (status) => ({
  bgcolor:
    status === "completed"
      ? "rgba(34,197,94,0.1)"
      : status === "processing"
        ? "rgba(245,158,11,0.1)"
        : status === "failed"
          ? "rgba(239,68,68,0.1)"
          : "rgba(107,114,128,0.15)",
  color:
    status === "completed"
      ? "#22c55e"
      : status === "processing"
        ? "#f59e0b"
        : status === "failed"
          ? "#ef4444"
          : "#9ca3af",
  fontWeight: 500,
  fontSize: 11,
  height: 22,
  textTransform: "capitalize",
});

const recommendationChipSx = (value) => ({
  bgcolor:
    value === "approved"
      ? "rgba(34,197,94,0.1)"
      : value === "conditional"
        ? "rgba(245,158,11,0.1)"
        : value === "denied"
          ? "rgba(239,68,68,0.1)"
          : "rgba(107,114,128,0.15)",
  color:
    value === "approved"
      ? "#22c55e"
      : value === "conditional"
        ? "#f59e0b"
        : value === "denied"
          ? "#ef4444"
          : "#9ca3af",
  fontWeight: 500,
  fontSize: 11,
  height: 22,
  textTransform: "capitalize",
});

function ScreeningList() {
  const { role } = useUser();
  const [screenings, setScreenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getScreenings();
        setScreenings(response.data || []);
      } catch {
        setError("Unable to load screening requests.");
      } finally {
        setLoading(false);
      }
    };
    if (role === "landlord") {
      load();
    } else {
      setLoading(false);
    }
  }, [role]);

  if (role !== "landlord") {
    return (
      <Paper sx={{ p: 2, bgcolor: "#141414" }}>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Screening tools are available to landlord accounts only.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 0.8 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "#fff" }}>
          Screening
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Run and review tenant screening reports
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.2 }}>
        <Button
          component={Link}
          to="/screenings/new"
          variant="outlined"
          size="small"
          sx={{
            borderColor: "rgba(255,255,255,0.1)",
            color: "#e0e0e0",
            "&:hover": {
              borderColor: "primary.main",
              color: "primary.main",
              backgroundColor: "rgba(124,92,252,0.08)",
            },
          }}
        >
          <AddRoundedIcon sx={{ mr: 0.6, fontSize: 16 }} />
          New Screening
        </Button>
      </Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
      <TableContainer component={Paper} sx={{ borderRadius: 1, bgcolor: "#141414" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>Tenant Name</TableCell>
              <TableCell sx={headerCellSx}>Date Requested</TableCell>
              <TableCell sx={headerCellSx}>Status</TableCell>
              <TableCell sx={headerCellSx}>Credit Score</TableCell>
              <TableCell sx={headerCellSx}>Background</TableCell>
              <TableCell sx={headerCellSx}>Recommendation</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {screenings.map((screening) => (
              <TableRow
                key={screening.id}
                component={Link}
                to={`/screenings/${screening.id}`}
                sx={{
                  textDecoration: "none",
                  cursor: "pointer",
                  "& td": { borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13, color: "#e5e7eb" },
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.02)" },
                }}
              >
                <TableCell>
                  {screening.tenant_detail
                    ? `${screening.tenant_detail.first_name} ${screening.tenant_detail.last_name}`
                    : `Tenant #${screening.tenant}`}
                </TableCell>
                <TableCell>{formatDate(screening.created_at)}</TableCell>
                <TableCell>
                  <Chip size="small" label={screening.status} sx={statusChipSx(screening.status)} />
                </TableCell>
                <TableCell>{screening.credit_score ?? "-"}</TableCell>
                <TableCell sx={{ textTransform: "capitalize" }}>
                  {screening.background_check ? screening.background_check.replaceAll("_", " ") : "-"}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={screening.recommendation || "pending"}
                    sx={recommendationChipSx(screening.recommendation)}
                  />
                </TableCell>
              </TableRow>
            ))}
            {!loading && screenings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>No screening requests found.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default ScreeningList;

