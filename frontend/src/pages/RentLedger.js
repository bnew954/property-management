import { Alert, Box, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getLeases, getProperties, getRentLedgerEntries, getTenants, getUnits } from "../services/api";

const headerCellSx = {
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: "11px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
const formatDate = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "-";

function RentLedger() {
  const { leaseId } = useParams();
  const [entries, setEntries] = useState([]);
  const [propertyName, setPropertyName] = useState("-");
  const [unitNumber, setUnitNumber] = useState("-");
  const [tenantName, setTenantName] = useState("-");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [leasesRes, ledgerRes, unitsRes, propertiesRes, tenantsRes] = await Promise.all([
          getLeases(),
          getRentLedgerEntries({ lease_id: leaseId }),
          getUnits(),
          getProperties(),
          getTenants(),
        ]);
        const foundLease = (leasesRes.data || []).find((item) => String(item.id) === String(leaseId));
        const sortedEntries = (ledgerRes.data || []).sort((a, b) => {
          const ad = new Date(a.date).getTime();
          const bd = new Date(b.date).getTime();
          if (ad !== bd) return ad - bd;
          return a.id - b.id;
        });
        setEntries(sortedEntries);

        if (foundLease) {
          const units = unitsRes.data || [];
          const properties = propertiesRes.data || [];
          const tenants = tenantsRes.data || [];
          const unit = units.find((u) => u.id === foundLease.unit);
          const property = unit ? properties.find((p) => p.id === unit.property) : null;
          const tenant = tenants.find((t) => t.id === foundLease.tenant);
          setPropertyName(property?.name || "-");
          setUnitNumber(unit?.unit_number || "-");
          setTenantName(tenant ? `${tenant.first_name} ${tenant.last_name}` : "-");
        }
      } catch {
        setError("Unable to load rent ledger.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [leaseId]);

  const totals = useMemo(() => {
    let totalCharges = 0;
    let totalPayments = 0;
    entries.forEach((entry) => {
      if (Number(entry.amount) > 0) {
        totalCharges += Number(entry.amount);
      } else {
        totalPayments += Math.abs(Number(entry.amount));
      }
    });
    const balance = entries.length ? Number(entries[entries.length - 1].balance || 0) : 0;
    return { totalCharges, totalPayments, balance };
  }, [entries]);

  return (
    <Box>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em", mb: 0.2 }}>
        Rent Ledger
      </Typography>
      <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1 }}>
        {propertyName} · Unit {unitNumber} · {tenantName}
      </Typography>
      {error ? <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert> : null}
      {loading ? <Typography>Loading...</Typography> : null}
      {!loading ? (
        <>
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, mb: 1.2 }}>
            <Paper sx={{ p: 1.2 }}><Typography sx={{ fontSize: 12, color: "text.secondary" }}>Total Charges</Typography><Typography sx={{ fontSize: 20, color: "#ef4444", fontWeight: 600 }}>{formatCurrency(totals.totalCharges)}</Typography></Paper>
            <Paper sx={{ p: 1.2 }}><Typography sx={{ fontSize: 12, color: "text.secondary" }}>Total Payments</Typography><Typography sx={{ fontSize: 20, color: "#22c55e", fontWeight: 600 }}>{formatCurrency(totals.totalPayments)}</Typography></Paper>
            <Paper sx={{ p: 1.2 }}><Typography sx={{ fontSize: 12, color: "text.secondary" }}>Outstanding Balance</Typography><Typography sx={{ fontSize: 20, color: totals.balance > 0 ? "#ef4444" : "#22c55e", fontWeight: 600 }}>{formatCurrency(totals.balance)}</Typography></Paper>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>Date</TableCell>
                  <TableCell sx={headerCellSx}>Description</TableCell>
                  <TableCell sx={headerCellSx}>Type</TableCell>
                  <TableCell sx={headerCellSx}>Amount</TableCell>
                  <TableCell sx={headerCellSx}>Running Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} sx={{ "& td": { borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 } }}>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell><Chip size="small" label={entry.entry_type.replaceAll("_", " ")} sx={{ fontSize: 11, textTransform: "capitalize" }} /></TableCell>
                    <TableCell sx={{ color: Number(entry.amount) < 0 ? "#22c55e" : "#ef4444" }}>{formatCurrency(entry.amount)}</TableCell>
                    <TableCell>{formatCurrency(entry.balance)}</TableCell>
                  </TableRow>
                ))}
                {entries.length === 0 ? <TableRow><TableCell colSpan={5}>No ledger entries found.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : null}
    </Box>
  );
}

export default RentLedger;
