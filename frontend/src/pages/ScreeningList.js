import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Alert, Box, Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getScreenings } from "../services/api";
import { useUser } from "../services/userContext";

const headerCellSx = {
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: "11px",
  borderBottom: "1px solid",
  borderColor: "divider",
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";

const statusChipSx = (status, theme) => {
  const colorMap = {
    completed: theme.palette.success.main,
    processing: theme.palette.warning.main,
    failed: theme.palette.error.main,
  };
  const color = colorMap[status] || theme.palette.text.secondary;
  return {
    bgcolor: `${color}22`,
    color,
    fontWeight: 500,
    fontSize: 11,
    height: 22,
    textTransform: "capitalize",
  };
};

const recommendationChipSx = (value, theme) => {
  const colorMap = {
    approved: theme.palette.success.main,
    conditional: theme.palette.warning.main,
    denied: theme.palette.error.main,
  };
  const color = colorMap[value] || theme.palette.text.secondary;
  return {
    bgcolor: `${color}22`,
    color,
    fontWeight: 500,
    fontSize: 11,
    height: 22,
    textTransform: "capitalize",
  };
};

function ScreeningList() {
  const { role } = useUser();
  const theme = useTheme();
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
      <Paper sx={{ p: 2, bgcolor: "background.paper" }}>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Screening tools are available to landlord accounts only.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 0.8 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "text.primary" }}>
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
            borderColor: "divider",
            color: "text.secondary",
            "&:hover": {
              borderColor: "primary.main",
              color: "primary.main",
              backgroundColor: "action.hover",
            },
          }}
        >
          <AddRoundedIcon sx={{ mr: 0.6, fontSize: 16 }} />
          New Screening
        </Button>
      </Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
          <TableContainer component={Paper} sx={{ borderRadius: 1, bgcolor: "background.paper" }}>
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
                  "& td": { borderBottom: "1px solid", borderColor: "divider", fontSize: 13, color: "text.primary" },
                  "&:hover": { backgroundColor: "action.hover" },
                }}
              >
                <TableCell>
                  {screening.tenant_detail
                    ? `${screening.tenant_detail.first_name} ${screening.tenant_detail.last_name}`
                    : `Tenant #${screening.tenant}`}
                </TableCell>
                <TableCell>{formatDate(screening.created_at)}</TableCell>
                <TableCell>
                  <Chip size="small" label={screening.status} sx={statusChipSx(screening.status, theme)} />
                </TableCell>
                <TableCell>{screening.credit_score ?? "-"}</TableCell>
                <TableCell sx={{ textTransform: "capitalize" }}>
                  {screening.background_check ? screening.background_check.replaceAll("_", " ") : "-"}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={screening.recommendation || "pending"}
                    sx={recommendationChipSx(screening.recommendation, theme)}
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
