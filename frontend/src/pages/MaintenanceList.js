import { useEffect, useState } from "react";
import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { getMaintenanceRequests } from "../services/api";

const statusStyles = {
  submitted: { bgcolor: "#dbeafe", color: "#1d4ed8" },
  in_progress: { bgcolor: "#ffedd5", color: "#c2410c" },
  completed: { bgcolor: "#dcfce7", color: "#15803d" },
  cancelled: { bgcolor: "#fee2e2", color: "#b91c1c" },
};

const priorityStyles = {
  low: { bgcolor: "#f1f5f9", color: "#334155" },
  medium: { bgcolor: "#dbeafe", color: "#1d4ed8" },
  high: { bgcolor: "#ffedd5", color: "#c2410c" },
  emergency: { bgcolor: "#fee2e2", color: "#b91c1c" },
};

const toLabel = (value) => value.replaceAll("_", " ");

const chipSx = (stylesMap, value) => ({
  ...(stylesMap[value] || { bgcolor: "#e2e8f0", color: "#334155" }),
  fontWeight: 600,
  textTransform: "capitalize",
});

function MaintenanceList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const response = await getMaintenanceRequests();
        setRequests(response.data || []);
      } catch (err) {
        setError("Unable to load maintenance requests.");
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, []);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        Maintenance Requests
      </Typography>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      <TableContainer component={Paper} sx={{ boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id} hover>
                <TableCell>{request.title}</TableCell>
                <TableCell>{request.unit_detail?.unit_number || request.unit}</TableCell>
                <TableCell>
                  <Chip size="small" label={toLabel(request.priority)} sx={chipSx(priorityStyles, request.priority)} />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={toLabel(request.status)} sx={chipSx(statusStyles, request.status)} />
                </TableCell>
              </TableRow>
            ))}
            {!loading && requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>No maintenance requests found.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default MaintenanceList;
