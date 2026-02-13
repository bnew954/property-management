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
import { getPayments } from "../services/api";

const statusStyles = {
  pending: { bgcolor: "#ffedd5", color: "#c2410c" },
  completed: { bgcolor: "#dcfce7", color: "#15803d" },
  failed: { bgcolor: "#fee2e2", color: "#b91c1c" },
  refunded: { bgcolor: "#dbeafe", color: "#1d4ed8" },
};

const toLabel = (value) => value.replaceAll("_", " ");

function PaymentsList() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPayments = async () => {
      try {
        const response = await getPayments();
        setPayments(response.data || []);
      } catch (err) {
        setError("Unable to load payments.");
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, []);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        Payments
      </Typography>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      <TableContainer component={Paper} sx={{ boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lease</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Payment Date</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id} hover>
                <TableCell>{payment.lease}</TableCell>
                <TableCell>${Number(payment.amount || 0).toLocaleString()}</TableCell>
                <TableCell>{payment.payment_date}</TableCell>
                <TableCell sx={{ textTransform: "capitalize" }}>
                  {toLabel(payment.payment_method)}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={toLabel(payment.status)}
                    sx={{
                      ...(statusStyles[payment.status] || { bgcolor: "#e2e8f0", color: "#334155" }),
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {!loading && payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>No payments found.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default PaymentsList;
