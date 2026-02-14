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
import { useTheme } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  generateAccountingCharges,
  getAccountingCategories,
  getAccountingDashboard,
  getAccountingRentRoll,
  getProperties,
  getTransactions,
  deleteTransaction,
} from "../services/api";
import { useUser } from "../services/userContext";

const headerCellSx = {
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: "11px",
  borderBottom: "1px solid",
  borderColor: "divider",
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

const asArray = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload.results || [];
};

function Accounting() {
  const { role } = useUser();
  const theme = useTheme();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [report, setReport] = useState(null);
  const [rentRoll, setRentRoll] = useState({ rows: [], summary: {} });
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expensePropertyFilter, setExpensePropertyFilter] = useState("all");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [dashboardRes, rentRollRes, propertiesRes, categoriesRes, expenseRes] = await Promise.all([
        getAccountingDashboard(),
        getAccountingRentRoll(),
        getProperties(),
        getAccountingCategories(),
        getTransactions({ transaction_type: "expense" }),
      ]);

      setReport(dashboardRes.data || null);

      const rentRollPayload = rentRollRes.data || {};
      setRentRoll({
        rows: Array.isArray(rentRollPayload)
          ? rentRollPayload
          : Array.isArray(rentRollPayload.rows)
            ? rentRollPayload.rows
            : [],
        summary: rentRollPayload.summary || {},
      });

      setProperties(asArray(propertiesRes.data || []));
      setCategories(asArray(categoriesRes.data || []));
      setTransactions(asArray(expenseRes.data || []));
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
    () => Object.fromEntries((properties || []).map((p) => [String(p.id), p])),
    [properties]
  );

  const incomeVsExpenseTrend = report?.income_by_month || report?.monthly_trend || report?.income_expenses_by_month || [];

  const expenseRows = useMemo(() => {
    return transactions.filter((expense) => {
      const propertyMatch =
        expensePropertyFilter === "all" ||
        String(expense.property_detail?.id || expense.property) === String(expensePropertyFilter);
      const categoryMatch =
        expenseCategoryFilter === "all" ||
        String(expense.category_detail?.id || expense.category || expense.category_id) === String(expenseCategoryFilter);
      return propertyMatch && categoryMatch;
    });
  }, [transactions, expensePropertyFilter, expenseCategoryFilter]);

  const rentRollRows = useMemo(() => rentRoll.rows || [], [rentRoll]);

  const getStatusColor = (status) => {
    switch (String(status || "").toLowerCase()) {
      case "current":
        return theme.palette.success.main;
      case "late":
        return theme.palette.warning.main;
      case "delinquent":
      case "overdue":
        return theme.palette.error.main;
      default:
        return theme.palette.info.main;
    }
  };

  if (role !== "landlord") {
    return (
      <Paper sx={{ p: 2, bgcolor: "background.paper" }}>
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
          <Typography
            sx={{ fontSize: 20, fontWeight: 600, color: "text.primary", letterSpacing: "-0.01em" }}
          >
            Accounting
          </Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            Property financials, expenses, and rent roll
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" size="small" component={Link} to="/accounting/reports">
            Reports
          </Button>
          <Button variant="outlined" size="small" onClick={() => generateAccountingCharges().then(loadData)}>
            Generate Charges
          </Button>
        </Box>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      ) : null}

      <Paper sx={{ mb: 1.2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
          <Tab label="Overview" />
          <Tab label="Expenses" />
          <Tab label="Rent Roll" />
        </Tabs>
      </Paper>

      {loading ? <Typography>Loading...</Typography> : null}

      {!loading && tab === 0 && report ? (
        <Box>
          <Box
            sx={{
              display: "grid",
              gap: 1.1,
              gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
              mb: 1.2,
            }}
          >
            <Card>
              <CardContent>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Total Income (YTD)</Typography>
                <Typography sx={{ fontSize: 22, color: "success.main", fontWeight: 600 }}>
                  {formatCurrency(report.total_income_ytd || report.total_income || report.totalIncome)}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Total Expenses (YTD)</Typography>
                <Typography sx={{ fontSize: 22, color: "error.main", fontWeight: 600 }}>
                  {formatCurrency(report.total_expenses_ytd || report.total_expenses || report.totalExpenses)}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Net Operating Income</Typography>
                <Typography
                  sx={{
                    fontSize: 22,
                    color: Number(report.net_operating_income || report.noi || 0) >= 0 ? "success.main" : "error.main",
                    fontWeight: 600,
                  }}
                >
                  {formatCurrency(report.net_operating_income || report.noi)}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Rent Collection Rate</Typography>
                <Typography sx={{ fontSize: 22, color: "text.primary", fontWeight: 600 }}>
                  {Number(report.rent_collection_rate || 0).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Paper sx={{ p: 1.4 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary", mb: 0.8 }}>
              Income vs Expenses by Month
            </Typography>
            <Box sx={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={incomeVsExpenseTrend}>
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "text.secondary", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: theme.palette.divider }}
                  />
                  <YAxis
                    tick={{ fill: "text.secondary", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: theme.palette.divider }}
                    tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(v) => formatCurrency(v)}
                    contentStyle={{
                      background: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                      color: theme.palette.text.primary,
                    }}
                  />
                  <Line type="monotone" dataKey="income" stroke={theme.palette.success.main} strokeWidth={2} dot={false} />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke={theme.palette.error.main}
                    strokeWidth={2}
                    dot={false}
                  />
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
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
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
                  <TableRow
                    key={expense.id}
                    sx={{ "& td": { borderBottom: "1px solid", borderColor: "divider", fontSize: 13 } }}
                  >
                    <TableCell>{formatDate(expense.date)}</TableCell>
                    <TableCell>
                      {propertyMap[String(expense.property_detail?.id || expense.property)]?.name ||
                        expense.property_name ||
                        "-"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={expense.category_detail?.name || expense.category?.name || "Uncategorized"}
                        size="small"
                        sx={{ fontSize: 11, textTransform: "capitalize" }}
                      />
                    </TableCell>
                    <TableCell>{expense.vendor || expense.vendor_name || "-"}</TableCell>
                    <TableCell>{expense.description || "-"}</TableCell>
                    <TableCell sx={{ color: "error.main" }}>{formatCurrency(expense.amount)}</TableCell>
                    <TableCell align="right">
                      <Button size="small" component={Link} to={`/accounting/expenses/${expense.id}/edit`}>
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => deleteTransaction(expense.id).then(loadData)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {expenseRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>No expenses found.</TableCell>
                  </TableRow>
                ) : null}
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
              {rentRollRows.map((row) => {
                const leaseId = row.lease_id || row.lease?.id || row.lease;
                const statusColor = getStatusColor(row.status);
                const tenantName =
                  row.tenant_name ||
                  `${row.tenant_detail?.first_name || ""} ${row.tenant_detail?.last_name || ""}`.trim() ||
                  row.tenant?.name ||
                  "-";
                return (
                  <TableRow
                    key={row.id || leaseId}
                    sx={{ "& td": { borderBottom: "1px solid", borderColor: "divider", fontSize: 13 }, cursor: leaseId ? "pointer" : "default" }}
                    onClick={() => leaseId && navigate(`/accounting/ledger/${leaseId}`)}
                  >
                    <TableCell>{row.property_name || row.property?.name || "-"}</TableCell>
                    <TableCell>{row.unit_number || row.unit?.unit_number || "-"}</TableCell>
                    <TableCell>{tenantName}</TableCell>
                    <TableCell>{formatCurrency(row.monthly_rent)}</TableCell>
                    <TableCell>{formatDate(row.last_payment_date || row.last_payment)}</TableCell>
                    <TableCell sx={{ color: Number(row.balance_due || 0) <= 0 ? "success.main" : "error.main" }}>
                      {formatCurrency(row.balance_due || 0)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.status || "Current"}
                        sx={{ color: statusColor, bgcolor: `${statusColor}22`, textTransform: "capitalize", fontSize: 11 }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {rentRollRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>No active leases found.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </Box>
  );
}

export default Accounting;
