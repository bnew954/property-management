import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  deleteExpense,
  generateAccountingCharges,
  getAccountingReports,
  getExpenses,
  getLeases,
  getProperties,
  getRentLedgerEntries,
  getTenants,
  getUnits,
} from "../services/api";
import { useUser } from "../services/userContext";

const headerCellSx = {
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: "11px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

const formatDate = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";

function Accounting() {
  const { role } = useUser();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [report, setReport] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [leases, setLeases] = useState([]);
  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expensePropertyFilter, setExpensePropertyFilter] = useState("all");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        reportRes,
        expensesRes,
        leasesRes,
        unitsRes,
        propertiesRes,
        tenantsRes,
        ledgerRes,
      ] = await Promise.all([
        getAccountingReports(),
        getExpenses(),
        getLeases(),
        getUnits(),
        getProperties(),
        getTenants(),
        getRentLedgerEntries(),
      ]);
      setReport(reportRes.data || null);
      setExpenses(expensesRes.data || []);
      setLeases(leasesRes.data || []);
      setUnits(unitsRes.data || []);
      setProperties(propertiesRes.data || []);
      setTenants(tenantsRes.data || []);
      setLedgerEntries(ledgerRes.data || []);
    } catch {
      setError("Unable to load accounting data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "landlord") {
      loadData();
    } else {
      setLoading(false);
    }
  }, [role]);

  const propertyMap = useMemo(
    () => Object.fromEntries(properties.map((p) => [p.id, p])),
    [properties]
  );
  const unitMap = useMemo(() => Object.fromEntries(units.map((u) => [u.id, u])), [units]);
  const tenantMap = useMemo(
    () => Object.fromEntries(tenants.map((t) => [t.id, t])),
    [tenants]
  );

  const expenseRows = useMemo(() => {
    return expenses.filter((expense) => {
      const propertyMatch =
        expensePropertyFilter === "all" ||
        String(expense.property) === String(expensePropertyFilter);
      const categoryMatch =
        expenseCategoryFilter === "all" || expense.category === expenseCategoryFilter;
      return propertyMatch && categoryMatch;
    });
  }, [expenseCategoryFilter, expensePropertyFilter, expenses]);

  const activeLeases = useMemo(
    () => leases.filter((lease) => lease.is_active),
    [leases]
  );

  const leaseRoll = useMemo(() => {
    return activeLeases.map((lease) => {
      const leaseEntries = ledgerEntries
        .filter((entry) => entry.lease === lease.id)
        .sort((a, b) => {
          const ad = new Date(a.date).getTime();
          const bd = new Date(b.date).getTime();
          if (ad !== bd) return ad - bd;
          return a.id - b.id;
        });
      const balance = leaseEntries.length ? Number(leaseEntries[leaseEntries.length - 1].balance || 0) : 0;
      const lastPayment = leaseEntries
        .filter((entry) => entry.entry_type === "payment")
        .slice(-1)[0];
      const status =
        balance <= 0 ? "current" : balance < Number(lease.monthly_rent || 0) ? "partial" : "overdue";
      return {
        lease,
        balance,
        lastPaymentDate: lastPayment?.date || null,
        status,
      };
    });
  }, [activeLeases, ledgerEntries]);

  if (role !== "landlord") {
    return (
      <Paper sx={{ p: 2, bgcolor: "#141414" }}>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Accounting is available to landlord accounts only.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em" }}>
            Accounting
          </Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            Property financials, expenses, and rent roll
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" size="small" onClick={() => navigate("/accounting/reports")}>
            Reports
          </Button>
          <Button variant="outlined" size="small" onClick={() => generateAccountingCharges().then(loadData)}>
            Generate Charges
          </Button>
        </Box>
      </Box>
      {error ? <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert> : null}
      <Paper sx={{ mb: 1.2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Tab label="Overview" />
          <Tab label="Expenses" />
          <Tab label="Rent Roll" />
        </Tabs>
      </Paper>

      {loading ? <Typography>Loading...</Typography> : null}

      {!loading && tab === 0 && report ? (
        <Box>
          <Box sx={{ display: "grid", gap: 1.1, gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, mb: 1.2 }}>
            <Card><CardContent><Typography sx={{ fontSize: 12, color: "text.secondary" }}>Total Income (YTD)</Typography><Typography sx={{ fontSize: 22, color: "#22c55e", fontWeight: 600 }}>{formatCurrency(report.total_income)}</Typography></CardContent></Card>
            <Card><CardContent><Typography sx={{ fontSize: 12, color: "text.secondary" }}>Total Expenses (YTD)</Typography><Typography sx={{ fontSize: 22, color: "#ef4444", fontWeight: 600 }}>{formatCurrency(report.total_expenses)}</Typography></CardContent></Card>
            <Card><CardContent><Typography sx={{ fontSize: 12, color: "text.secondary" }}>Net Operating Income</Typography><Typography sx={{ fontSize: 22, color: Number(report.net_operating_income) >= 0 ? "#22c55e" : "#ef4444", fontWeight: 600 }}>{formatCurrency(report.net_operating_income)}</Typography></CardContent></Card>
            <Card><CardContent><Typography sx={{ fontSize: 12, color: "text.secondary" }}>Rent Collection Rate</Typography><Typography sx={{ fontSize: 22, color: "#e5e7eb", fontWeight: 600 }}>{Number(report.rent_collection_rate || 0).toFixed(1)}%</Typography></CardContent></Card>
          </Box>
          <Paper sx={{ p: 1.4 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#fff", mb: 0.8 }}>
              Income vs Expenses by Month
            </Typography>
            <Box sx={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={report.income_by_month || []}>
                  <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickFormatter={(v) => `$${Number(v).toLocaleString()}`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Box>
      ) : null}

      {!loading && tab === 1 ? (
        <Box>
          <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap", alignItems: "center" }}>
            <Button variant="outlined" size="small" component={Link} to="/accounting/expenses/new">
              Add Expense
            </Button>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Property</InputLabel>
              <Select
                label="Property"
                value={expensePropertyFilter}
                onChange={(e) => setExpensePropertyFilter(e.target.value)}
              >
                <MenuItem value="all">All Properties</MenuItem>
                {properties.map((p) => (
                  <MenuItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {[
                  "maintenance",
                  "insurance",
                  "taxes",
                  "utilities",
                  "management_fee",
                  "legal",
                  "advertising",
                  "supplies",
                  "landscaping",
                  "capital_improvement",
                  "other",
                ].map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat.replaceAll("_", " ")}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>Date</TableCell>
                  <TableCell sx={headerCellSx}>Property</TableCell>
                  <TableCell sx={headerCellSx}>Category</TableCell>
                  <TableCell sx={headerCellSx}>Vendor</TableCell>
                  <TableCell sx={headerCellSx}>Description</TableCell>
                  <TableCell sx={headerCellSx}>Amount</TableCell>
                  <TableCell align="right" sx={headerCellSx}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenseRows.map((expense) => (
                  <TableRow key={expense.id} sx={{ "& td": { borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 } }}>
                    <TableCell>{formatDate(expense.date)}</TableCell>
                    <TableCell>{propertyMap[expense.property]?.name || "-"}</TableCell>
                    <TableCell><Chip label={expense.category.replaceAll("_", " ")} size="small" sx={{ fontSize: 11, textTransform: "capitalize" }} /></TableCell>
                    <TableCell>{expense.vendor_name || "-"}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell sx={{ color: "#ef4444" }}>{formatCurrency(expense.amount)}</TableCell>
                    <TableCell align="right">
                      <Button size="small" component={Link} to={`/accounting/expenses/${expense.id}/edit`}>Edit</Button>
                      <Button size="small" color="error" onClick={() => deleteExpense(expense.id).then(loadData)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {expenseRows.length === 0 ? <TableRow><TableCell colSpan={7}>No expenses found.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ) : null}

      {!loading && tab === 2 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Property</TableCell>
                <TableCell sx={headerCellSx}>Unit</TableCell>
                <TableCell sx={headerCellSx}>Tenant</TableCell>
                <TableCell sx={headerCellSx}>Monthly Rent</TableCell>
                <TableCell sx={headerCellSx}>Last Payment Date</TableCell>
                <TableCell sx={headerCellSx}>Balance Due</TableCell>
                <TableCell sx={headerCellSx}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaseRoll.map((row) => {
                const unit = unitMap[row.lease.unit];
                const property = unit ? propertyMap[unit.property] : null;
                const tenant = tenantMap[row.lease.tenant];
                const statusColor =
                  row.status === "current" ? "#22c55e" : row.status === "overdue" ? "#ef4444" : "#f59e0b";
                return (
                  <TableRow
                    key={row.lease.id}
                    sx={{ "& td": { borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }, cursor: "pointer" }}
                    onClick={() => navigate(`/accounting/ledger/${row.lease.id}`)}
                  >
                    <TableCell>{property?.name || "-"}</TableCell>
                    <TableCell>{unit?.unit_number || "-"}</TableCell>
                    <TableCell>{tenant ? `${tenant.first_name} ${tenant.last_name}` : "-"}</TableCell>
                    <TableCell>{formatCurrency(row.lease.monthly_rent)}</TableCell>
                    <TableCell>{row.lastPaymentDate ? formatDate(row.lastPaymentDate) : "-"}</TableCell>
                    <TableCell sx={{ color: row.balance <= 0 ? "#22c55e" : "#ef4444" }}>
                      {formatCurrency(row.balance)}
                    </TableCell>
                    <TableCell><Chip size="small" label={row.status} sx={{ color: statusColor, bgcolor: `${statusColor}22`, textTransform: "capitalize", fontSize: 11 }} /></TableCell>
                  </TableRow>
                );
              })}
              {leaseRoll.length === 0 ? <TableRow><TableCell colSpan={7}>No active leases found.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </Box>
  );
}

export default Accounting;
