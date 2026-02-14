import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import { getApplications } from "../services/api";

const headerCellSx = {
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: "11px",
  borderBottom: "1px solid",
  borderColor: "divider",
};

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "-";
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") {
    return "$0";
  }
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) {
    return "$0";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, amount));
}

function statusChipSx(status, theme) {
  const colorMap = {
    submitted: theme.palette.info.main,
    under_review: theme.palette.warning.main,
    approved: theme.palette.success.main,
    denied: theme.palette.error.main,
    withdrawn: theme.palette.text.secondary,
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
}

function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const theme = useTheme();

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const response = await getApplications(params);
      setApplications(response.data || []);
      setError("");
    } catch (err) {
      setApplications([]);
      setError("Unable to load rental applications.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const sortedApplications = useMemo(() => {
    const copy = [...applications];
    copy.sort((a, b) => {
      if (sortOrder === "desc") {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });
    return copy;
  }, [applications, sortOrder]);

  const applicantName = (application) => {
    if (!application) return "-";
    const first = application.first_name || "";
    const last = application.last_name || "";
    return `${first} ${last}`.trim() || `Applicant #${application.id}`;
  };

  const unitLabel = (application) => {
    const unit = application.unit_detail;
    if (unit) {
      const propertyName = unit.property_name || "Property";
      const unitName = unit.unit_number ? `Unit ${unit.unit_number}` : `Unit ${unit.id}`;
      return `${propertyName} · ${unitName}`;
    }
    return application.unit ? `Unit #${application.unit}` : "Unit";
  };

  return (
    <Box>
      <Box sx={{ mb: 0.8 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "text.primary" }}>
          Applications
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Review rental applications, track status, and start approvals.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 1,
          mb: 1.2,
          flexWrap: "wrap",
        }}
      >
        <Button
          component={Link}
          to="/listings"
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
          Open Listings
        </Button>

        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(event) => setStatusFilter(event.target.value)}>
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="submitted">Submitted</MenuItem>
              <MenuItem value="under_review">Under Review</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="denied">Denied</MenuItem>
              <MenuItem value="withdrawn">Withdrawn</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Sort by Date</InputLabel>
            <Select value={sortOrder} label="Sort by Date" onChange={(event) => setSortOrder(event.target.value)}>
              <MenuItem value="desc">Newest first</MenuItem>
              <MenuItem value="asc">Oldest first</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {loading ? <Typography>Loading...</Typography> : null}
      {error ? <Alert severity="error" sx={{ mb: 1.2 }}>{error}</Alert> : null}

      <TableContainer component={Paper} sx={{ borderRadius: 1, bgcolor: "background.paper" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>Applicant Name</TableCell>
              <TableCell sx={headerCellSx}>Unit</TableCell>
              <TableCell sx={headerCellSx}>Date Applied</TableCell>
              <TableCell sx={headerCellSx}>Monthly Income</TableCell>
              <TableCell sx={headerCellSx}>Status</TableCell>
              <TableCell sx={headerCellSx} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedApplications.map((application) => (
            <TableRow
              key={application.id}
              hover
              component={Link}
              to={`/applications/${application.id}`}
              sx={{
                textDecoration: "none",
                "&:hover": { textDecoration: "none" },
                cursor: "pointer",
                "& td": { borderBottom: "1px solid", borderColor: "divider", fontSize: 13 },
              }}
            >
                <TableCell>{applicantName(application)}</TableCell>
                <TableCell>{unitLabel(application)}</TableCell>
                <TableCell>{formatDate(application.created_at)}</TableCell>
                <TableCell>{formatCurrency(application.monthly_income)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={application.status}
                    sx={statusChipSx(application.status, theme)}
                  />
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    component={Link}
                    to={`/applications/${application.id}`}
                    startIcon={<EditNoteIcon sx={{ fontSize: 16 }} />}
                    sx={{ color: "text.secondary", fontSize: 12, minWidth: 0 }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    Open
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!loading && sortedApplications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ color: "text.secondary", py: 2 }}>
                  No applications found.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default Applications;
