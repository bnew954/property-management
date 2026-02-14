import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  TextField,
  Typography,
} from "@mui/material";
import { Add, ExpandLess, ExpandMore, Lock, Refresh } from "@mui/icons-material";
import { useTheme } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Bar, BarChart, Pie, PieChart, Cell } from "recharts";
import { Link as RouteLink, useNavigate } from "react-router-dom";
import {
  createAccountingCategory,
  createJournalEntry,
  createRecurringTransaction,
  getAccountingCashflow,
  getAccountingCategories,
  getAccountingCategoryLedger,
  getAccountingCategoryTree,
  getAccountingPeriods,
  getAccountingRentRoll,
  getAccountingTaxReport,
  getBalanceSheetReport,
  getGeneralLedgerReport,
  getJournalEntries,
  getOwnerStatements,
  getAccountingPnL,
  getProperties,
  getRecurringTransactions,
  getTrialBalanceReport,
  lockAccountingPeriod,
  recordExpense,
  recordIncome,
  recordTransfer,
  postJournalEntry,
  reverseJournalEntry,
  runRecurringTransaction,
  updateAccountingCategory,
  unlockAccountingPeriod,
  updateRecurringTransaction,
  voidJournalEntry,
} from "../services/api";
import { useUser } from "../services/userContext";

const accent = "#7c5cfc";
const debitColor = "#4ade80";
const creditColor = "#f87171";

const money = (value) => Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
const toDateStr = (value) => {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const parseList = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
};

const parseNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const headerCellStyle = {
  textTransform: "uppercase",
  color: "text.secondary",
  letterSpacing: "0.06em",
  fontSize: 11,
  borderBottom: "1px solid",
  borderColor: "divider",
};

const monthBounds = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toDateStr(start), end: toDateStr(end), today: toDateStr(now) };
};

const parseRent = (payload = {}) => {
  if (Array.isArray(payload)) return { rows: payload, summary: {} };
  const rows = parseList(payload);
  return { rows, summary: payload.summary || {} };
};

const asTree = (raw) => {
  const items = parseList(raw).map((item) => ({ ...item, children: [] }));
  const compareAccounts = (a, b) => {
    const aCode = String(a.account_code || a.code || "").trim();
    const bCode = String(b.account_code || b.code || "").trim();
    const byCode = aCode.localeCompare(bCode, "en-US", { numeric: true, sensitivity: "base" });
    if (byCode !== 0) return byCode;
    return String(a.name || "").localeCompare(String(b.name || ""), "en-US", { sensitivity: "base" });
  };
  const sortedItems = [...items].sort(compareAccounts);
  const withChildren = sortedItems.some((i) => Array.isArray(i.sub_accounts) && i.sub_accounts.length > 0);
  if (withChildren) {
    const build = (node) => ({
      ...node,
      children: Array.isArray(node.sub_accounts)
        ? [...node.sub_accounts].sort(compareAccounts).map((c) => build(c))
        : [],
    });
    return [...sortedItems].map(build);
  }
  const map = {};
  const roots = [];
  sortedItems.forEach((i) => {
    map[i.id] = { ...i, children: [] };
  });
  sortedItems.forEach((i) => {
    const p = i.parent_account || i.parent_account_id;
    if (p && map[p]) map[p].children.push(map[i.id]);
    else roots.push(map[i.id]);
  });
  roots.forEach((node) => {
    if (Array.isArray(node.children) && node.children.length > 1) {
      node.children = node.children.sort(compareAccounts);
    }
  });
  return roots.sort(compareAccounts);
};

const flattenTree = (nodes, output = []) => {
  nodes.forEach((node) => {
    output.push(node);
    if (Array.isArray(node.children) && node.children.length > 0) flattenTree(node.children, output);
  });
  return output;
};

const clean = (obj) => Object.fromEntries(Object.entries(obj || {}).filter(([, v]) => v !== "" && v !== null && v !== undefined));

const statusColor = (status = "") => {
  switch (String(status).toLowerCase()) {
    case "posted":
      return "success";
    case "reversed":
      return "warning";
    case "voided":
      return "error";
    default:
      return "default";
  }
};

const rentStatus = (daysSince) => {
  if (daysSince === null) return { label: "Current", color: "success" };
  if (daysSince >= 30) return { label: "Delinquent", color: "error" };
  if (daysSince > 0) return { label: "Late 1-30", color: "warning" };
  return { label: "Current", color: "success" };
};

const incomeFormInitial = { amount: "", revenue_account_id: "", date: toDateStr(new Date()), property_id: "", deposit_to_account_id: "1020", description: "" };
const expenseFormInitial = { amount: "", expense_account_id: "", date: toDateStr(new Date()), property_id: "", paid_from_account_id: "1020", vendor: "", description: "" };
const transferFormInitial = { amount: "", from_account_id: "", to_account_id: "", date: toDateStr(new Date()), description: "", property_id: "" };
const journalLineInitial = { account_id: "", debit_amount: "", credit_amount: "", description: "" };
const journalFormInitial = { memo: "", entry_date: toDateStr(new Date()), source_type: "manual", lines: [journalLineInitial, journalLineInitial] };
const addAccountInitial = { account_code: "", name: "", account_type: "expense", normal_balance: "debit", parent_account: "", is_header: false, description: "" };

function Accounting() {
  const { role } = useUser();
  const theme = useTheme();
  const navigate = useNavigate();
  const bounds = useMemo(() => monthBounds(), []);

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [properties, setProperties] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [categoryFlat, setCategoryFlat] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedAccountLedger, setSelectedAccountLedger] = useState([]);
  const [selectedAccountFilters, setSelectedAccountFilters] = useState({ date_from: "", date_to: "", property_id: "" });

  const [dashboardPnL, setDashboardPnL] = useState(null);
  const [dashboardCashflow, setDashboardCashflow] = useState([]);
  const [rentRoll, setRentRoll] = useState({ rows: [], summary: {} });
  const [accountBalances, setAccountBalances] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalBusy, setJournalBusy] = useState({});
  const [expandedJournal, setExpandedJournal] = useState({});
  const [txFilters, setTxFilters] = useState({ status: "", source_type: "", property_id: "", date_from: "", date_to: "" });

  const [activeReport, setActiveReport] = useState("pnl");
  const [reportFilters, setReportFilters] = useState({
    pnl: { date_from: bounds.start, date_to: bounds.end, property_id: "" },
    balance: { as_of: bounds.today, property_id: "" },
    cashflow: { date_from: bounds.start, date_to: bounds.end, property_id: "" },
    trial: { as_of: bounds.today, property_id: "" },
    gl: { date_from: bounds.start, date_to: bounds.end, property_id: "", account_id: "" },
    rent: {},
    tax: { year: String(new Date().getFullYear()), property_id: "" },
    owner: { date_from: bounds.start, date_to: bounds.end, property_id: "" },
  });

  const [reportData, setReportData] = useState({
    pnl: null,
    balance: null,
    cashflow: [],
    trial: [],
    gl: null,
    rent: null,
    tax: null,
    owner: [],
  });

  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  const [incomeForm, setIncomeForm] = useState(incomeFormInitial);
  const [expenseForm, setExpenseForm] = useState(expenseFormInitial);
  const [transferForm, setTransferForm] = useState(transferFormInitial);
  const [journalForm, setJournalForm] = useState(journalFormInitial);
  const [addAccountForm, setAddAccountForm] = useState(addAccountInitial);

  const [periods, setPeriods] = useState([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [recurringTemplates, setRecurringTemplates] = useState([]);

  const accountById = useMemo(() => Object.fromEntries(categoryFlat.map((a) => [String(a.id), a])), [categoryFlat]);

  const accountBalanceById = useMemo(() => {
    const map = {};
    accountBalances.forEach((line) => {
      const id = String(line.account_id || line.account?.id || "");
      const code = String(line.account_code || line.account?.account_code || "");
      const debit = parseNumber(line.total_debits);
      const credit = parseNumber(line.total_credits);
      const net = parseNumber(line.net_balance ?? line.balance ?? debit - credit);
      if (id) map[id] = net;
      if (code) map[code] = net;
    });
    return map;
  }, [accountBalances]);

  const revenueAccounts = useMemo(
    () => categoryFlat.filter((acc) => acc.account_type === "revenue" && !acc.is_header),
    [categoryFlat]
  );
  const expenseAccounts = useMemo(
    () => categoryFlat.filter((acc) => acc.account_type === "expense" && !acc.is_header),
    [categoryFlat]
  );
  const assetAccounts = useMemo(() => categoryFlat.filter((acc) => acc.account_type === "asset" && !acc.is_header), [categoryFlat]);
  const allPostingAccounts = useMemo(
    () => categoryFlat.filter((acc) => !acc.is_header && acc.is_active !== false && acc.account_type),
    [categoryFlat]
  );

  const loadAccounts = async () => {
    const response = await getAccountingCategoryTree();
    const tree = asTree(response.data);
    setCategoryTree(tree);
    setCategoryFlat(flattenTree(tree, []));
    return { tree, flat: flattenTree(tree, []) };
  };

  const loadDashboardData = async () => {
    const [pnlRes, cashflowRes, rentRes, trialRes] = await Promise.all([
      getAccountingPnL({ date_from: bounds.start, date_to: bounds.end }),
      getAccountingCashflow({ date_from: bounds.start, date_to: bounds.end }),
      getAccountingRentRoll(),
      getTrialBalanceReport({ as_of: bounds.today }),
    ]);
    setDashboardPnL(pnlRes.data || null);
    setDashboardCashflow(cashflowRes.data || []);
    setRentRoll(parseRent(rentRes.data || {}));
    setAccountBalances(parseList(trialRes.data));
  };

  const loadTransactions = async () => {
    const response = await getJournalEntries(clean(txFilters));
    setJournalEntries(parseList(response.data));
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");
      const propertiesRes = await getProperties();
      setProperties(parseList(propertiesRes.data));
      await loadAccounts();
      await loadDashboardData();
      await loadTransactions();
      await loadReports("pnl");
      const pRes = await getAccountingPeriods();
      const rRes = await getRecurringTransactions();
      setPeriods(parseList(pRes.data));
      setRecurringTemplates(parseList(rRes.data));
    } catch (err) {
      setError("Unable to load accounting dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const loadLedger = async (accountId, filters = selectedAccountFilters) => {
    if (!accountId) return;
    const response = await getAccountingCategoryLedger(accountId, clean(filters));
    setSelectedAccountLedger(parseList(response.data));
  };

  const loadReports = async (type) => {
    if (type === "pnl") {
      const res = await getAccountingPnL(clean(reportFilters.pnl));
      setReportData((prev) => ({ ...prev, pnl: res.data || null }));
    }
    if (type === "balance") {
      const res = await getBalanceSheetReport(clean(reportFilters.balance));
      setReportData((prev) => ({ ...prev, balance: res.data || null }));
    }
    if (type === "cashflow") {
      const res = await getAccountingCashflow(clean(reportFilters.cashflow));
      setReportData((prev) => ({ ...prev, cashflow: parseList(res.data) }));
    }
    if (type === "trial") {
      const res = await getTrialBalanceReport(clean(reportFilters.trial));
      setReportData((prev) => ({ ...prev, trial: parseList(res.data) }));
    }
    if (type === "gl") {
      const res = await getGeneralLedgerReport(clean(reportFilters.gl));
      setReportData((prev) => ({ ...prev, gl: res.data || null }));
    }
    if (type === "tax") {
      const res = await getAccountingTaxReport(clean(reportFilters.tax));
      setReportData((prev) => ({ ...prev, tax: res.data || null }));
    }
    if (type === "owner") {
      const res = await getOwnerStatements(clean(reportFilters.owner));
      setReportData((prev) => ({ ...prev, owner: parseList(res.data) }));
    }
    if (type === "rent") {
      const res = await getAccountingRentRoll();
      setRentRoll(parseRent(res.data));
      setReportData((prev) => ({ ...prev, rent: parseRent(res.data) }));
    }
    if (type === "periods") {
      setPeriodsLoading(true);
      const res = await getAccountingPeriods();
      setPeriods(parseList(res.data));
      setPeriodsLoading(false);
    }
    if (type === "recurring") {
      const res = await getRecurringTransactions();
      setRecurringTemplates(parseList(res.data));
    }
  };

  const toggleNode = (id) => setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));

  const setSelectedAccount = async (id) => {
    setSelectedAccountId(id);
    await loadLedger(id);
  };

  const resetAndReload = async () => {
    await loadDashboardData();
    await loadTransactions();
  };

  const journalActions = async (id, action) => {
    setJournalBusy((prev) => ({ ...prev, [id]: true }));
    try {
      if (action === "post") await postJournalEntry(id);
      if (action === "reverse") await reverseJournalEntry(id);
      if (action === "void") await voidJournalEntry(id);
      await loadTransactions();
      await loadDashboardData();
    } catch {
      setError(`Unable to ${action} journal entry.`);
    } finally {
      setJournalBusy((prev) => ({ ...prev, [id]: false }));
    }
  };

  const addJournalLine = () => setJournalForm((prev) => ({ ...prev, lines: [...prev.lines, journalLineInitial] }));
  const removeJournalLine = (index) =>
    setJournalForm((prev) => {
      const lines = [...prev.lines];
      if (lines.length > 1) lines.splice(index, 1);
      return { ...prev, lines };
    });
  const updateJournalLine = (index, field, value) =>
    setJournalForm((prev) => {
      const lines = [...prev.lines];
      lines[index] = { ...lines[index], [field]: value };
      if (field === "debit_amount") lines[index].credit_amount = "";
      if (field === "credit_amount") lines[index].debit_amount = "";
      return { ...prev, lines };
    });

  const jeTotals = useMemo(() => {
    const totals = journalForm.lines.reduce(
      (acc, line) => {
        acc.debits += parseNumber(line.debit_amount);
        acc.credits += parseNumber(line.credit_amount);
        return acc;
      },
      { debits: 0, credits: 0 }
    );
    return totals;
  }, [journalForm.lines]);

  const jeBalanced = jeTotals.debits > 0 && jeTotals.credits > 0 && jeTotals.debits === jeTotals.credits;

  const handleCreateIncome = async () => {
    await recordIncome({
      amount: parseNumber(incomeForm.amount),
      date: incomeForm.date,
      revenue_account_id: Number(incomeForm.revenue_account_id),
      property_id: incomeForm.property_id ? Number(incomeForm.property_id) : undefined,
      deposit_to_account_id: Number(incomeForm.deposit_to_account_id || 0),
      description: incomeForm.description,
    });
    setShowIncome(false);
    setIncomeForm(incomeFormInitial);
    await resetAndReload();
  };

  const handleCreateExpense = async () => {
    await recordExpense({
      amount: parseNumber(expenseForm.amount),
      date: expenseForm.date,
      expense_account_id: Number(expenseForm.expense_account_id),
      paid_from_account_id: Number(expenseForm.paid_from_account_id || 0),
      property_id: expenseForm.property_id ? Number(expenseForm.property_id) : undefined,
      vendor: expenseForm.vendor,
      description: expenseForm.description,
    });
    setShowExpense(false);
    setExpenseForm(expenseFormInitial);
    await resetAndReload();
  };

  const handleCreateTransfer = async () => {
    await recordTransfer({
      amount: parseNumber(transferForm.amount),
      date: transferForm.date,
      from_account_id: Number(transferForm.from_account_id),
      to_account_id: Number(transferForm.to_account_id),
      property_id: transferForm.property_id ? Number(transferForm.property_id) : undefined,
      description: transferForm.description,
    });
    setShowTransfer(false);
    setTransferForm(transferFormInitial);
    await resetAndReload();
  };

  const handleCreateManualJE = async () => {
    const lines = journalForm.lines
      .filter((l) => l.account_id)
      .map((line) => ({
        account_id: Number(line.account_id),
        debit_amount: parseNumber(line.debit_amount),
        credit_amount: parseNumber(line.credit_amount),
        description: line.description || "",
      }));
    await createJournalEntry({ memo: journalForm.memo, entry_date: journalForm.entry_date, source_type: journalForm.source_type, lines });
    setShowJournal(false);
    setJournalForm(journalFormInitial);
    await resetAndReload();
  };

  const addAccount = async () => {
    await createAccountingCategory({
      account_code: addAccountForm.account_code,
      name: addAccountForm.name,
      account_type: addAccountForm.account_type,
      normal_balance: addAccountForm.normal_balance,
      parent_account: addAccountForm.parent_account || null,
      category_type: addAccountForm.account_type === "revenue" ? "income" : "expense",
      is_header: addAccountForm.is_header,
      is_active: true,
      description: addAccountForm.description || "",
    });
    setShowAccount(false);
    setAddAccountForm(addAccountInitial);
    await loadAccounts();
  };

  const toggleAccountActive = async (account) => {
    if (!account) return;
    await updateAccountingCategory(account.id, { is_active: account.is_active === false });
    await loadAccounts();
  };

  const summaryIncome =
    parseNumber(dashboardPnL?.income_current_month) ||
    parseNumber(dashboardPnL?.total_income_current_month) ||
    parseNumber(dashboardPnL?.total_income) ||
    parseNumber(dashboardPnL?.income);
  const summaryExpense =
    parseNumber(dashboardPnL?.expense_current_month) ||
    parseNumber(dashboardPnL?.total_expenses_current_month) ||
    parseNumber(dashboardPnL?.total_expenses);
  const summaryNet = summaryIncome - summaryExpense;
  const summaryCash = parseNumber(accountBalanceById["1020"]) + parseNumber(accountBalanceById["1010"]);
  const summaryCollectionRate = (() => {
    const summary = rentRoll?.summary || {};
    const collected = parseNumber(summary.total_collected_rent);
    const expected = parseNumber(summary.total_expected_rent);
    if (parseNumber(summary.rent_collection_rate) > 0) return parseNumber(summary.rent_collection_rate);
    if (!expected) return 0;
    return (collected / expected) * 100;
  })();

  const monthRows = parseList(dashboardCashflow).slice(-12).map((row) => ({
    ...row,
    month: row.month || row.period || row.date,
    income: parseNumber(row.income),
    expenses: parseNumber(row.expenses),
  }));

  const expenseTop = parseList(dashboardPnL?.expense_breakdown || dashboardPnL?.expense_by_account)
    .map((row) => ({
      name: row.account_name || row.name || row.category || "Expense",
      value: Math.abs(parseNumber(row.total || row.amount)),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  useEffect(() => {
    if (role === "landlord") {
      loadAll();
    }
  }, [role]);

  useEffect(() => {
    if (role === "landlord") {
      loadTransactions();
    }
  }, [txFilters]);

  if (role !== "landlord") {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Accounting is available to landlord accounts only.
        </Typography>
      </Paper>
    );
  }
  const renderAccountRows = (nodes, depth = 0) => {
    return nodes.flatMap((account) => {
      const children = Array.isArray(account.children) ? account.children : [];
      const hasChildren = children.length > 0;
      const isExpanded = expandedNodes[account.id];
      const rowBalance = accountBalanceById[String(account.id)];
      const rowStyle = account.is_header ? { fontWeight: 700 } : {};
      const row = (
        <TableRow
          key={account.id}
          hover
          sx={{
            "& td": { fontSize: 12, fontFamily: "monospace" },
            bgcolor: account.is_header ? "rgba(124,92,252,0.08)" : "transparent",
            cursor: "pointer",
          }}
          onClick={() => setSelectedAccount(account.id)}
        >
          <TableCell sx={{ pl: 2 + depth * 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {hasChildren ? (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNode(account.id);
                  }}
                >
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              ) : (
                <Box sx={{ width: 32 }} />
              )}
              <Typography sx={rowStyle}>{account.account_code || account.code || "-"}</Typography>
            </Box>
          </TableCell>
          <TableCell>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {account.is_system ? <Lock sx={{ fontSize: 14 }} color="disabled" /> : null}
              <Typography sx={rowStyle}>{account.name}</Typography>
            </Box>
          </TableCell>
          <TableCell>
            <Chip
              label={account.account_type || "expense"}
              size="small"
              sx={{ textTransform: "uppercase", fontSize: 11 }}
            />
          </TableCell>
          <TableCell>{account.normal_balance || "debit"}</TableCell>
          <TableCell align="right" sx={{ fontFamily: "monospace" }}>
            {account.is_header ? "-" : money(rowBalance || 0)}
          </TableCell>
          <TableCell>
            <Chip
              label={account.is_active === false ? "inactive" : "active"}
              color={account.is_active === false ? "error" : "success"}
              size="small"
              sx={{ fontSize: 11, textTransform: "uppercase" }}
            />
          </TableCell>
          <TableCell>
            <Button
              size="small"
              disabled={account.is_system}
              onClick={(e) => {
                e.stopPropagation();
                toggleAccountActive(account);
              }}
            >
              {account.is_active === false ? "Activate" : "Deactivate"}
            </Button>
          </TableCell>
        </TableRow>
      );
      const nextRows = hasChildren && isExpanded ? renderAccountRows(children, depth + 1) : [];
      return [row, ...nextRows];
    });
  };

  if (role !== "landlord") {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Accounting is available to landlord accounts only.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ color: theme.palette.text.primary }}>
      <Box sx={{ mb: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700 }}>Accounting</Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Double-entry workspace</Typography>
        </Box>
      </Box>

      {error ? <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert> : null}

      <Paper sx={{ mb: 1 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Dashboard" />
          <Tab label="Transactions" />
          <Tab label="Chart of Accounts" />
          <Tab label="Reports" />
          <Tab label="Rent Roll" />
        </Tabs>
      </Paper>

      {loading ? (
        <Paper sx={{ p: 1.5, bgcolor: "rgba(255,255,255,0.03)" }}>
          <Typography>Loading...</Typography>
        </Paper>
      ) : null}

      {!loading && tab === 0 ? (
        <Box sx={{ display: "grid", gap: 1.5 }}>
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" } }}>
            <Card>
              <CardContent>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Total Income (Current Month)</Typography>
                <Typography sx={{ fontSize: 24, color: "success.main", fontWeight: 700 }}>{money(summaryIncome)}</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Total Expenses (Current Month)</Typography>
                <Typography sx={{ fontSize: 24, color: "error.main", fontWeight: 700 }}>{money(summaryExpense)}</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Net Income (Current Month)</Typography>
                <Typography
                  sx={{
                    fontSize: 24,
                    color: summaryNet >= 0 ? "success.main" : "error.main",
                    fontWeight: 700,
                  }}
                >
                  {money(summaryNet)}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Cash Balance (1010+1020)</Typography>
                <Typography sx={{ fontSize: 24, color: "info.main", fontWeight: 700 }}>{money(summaryCash)}</Typography>
              </CardContent>
            </Card>
          </Box>

          <Paper sx={{ p: 1.5 }}>
            <Typography sx={{ mb: 1, fontWeight: 700, color: "text.secondary" }}>Monthly Cash Flow</Typography>
            <Box sx={{ height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={monthRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                  <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper }} />
                  <Bar dataKey="income" fill={debitColor} />
                  <Bar dataKey="expenses" fill={creditColor} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
            <Paper sx={{ p: 1.5 }}>
              <Typography sx={{ mb: 1, fontWeight: 700, color: "text.secondary" }}>Rent Collection Rate</Typography>
              <Box sx={{ height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      innerRadius={55}
                      outerRadius={85}
                      data={[
                        { name: "Collected", value: summaryCollectionRate },
                        { name: "Outstanding", value: Math.max(0, 100 - summaryCollectionRate) },
                      ]}
                      dataKey="value"
                    >
                      <Cell fill={accent} />
                      <Cell fill={theme.palette.error.main} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <Typography sx={{ textAlign: "center", fontWeight: 700, mt: 1 }}>{summaryCollectionRate.toFixed(1)}%</Typography>
              </Box>
            </Paper>
            <Paper sx={{ p: 1.5 }}>
              <Typography sx={{ mb: 1, fontWeight: 700, color: "text.secondary" }}>Top 5 Expense Categories</Typography>
              <Box sx={{ height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={expenseTop} dataKey="value" nameKey="name" outerRadius={80} label>
                      {expenseTop.map((_, idx) => (
                        <Cell key={idx} fill={idx % 2 ? theme.palette.info.main : accent} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Box>

          <Paper sx={{ p: 1.5 }}>
            <Typography sx={{ mb: 1, fontWeight: 700, color: "text.secondary" }}>Recent Posted Journal Entries</Typography>
            <List dense>
              {journalEntries.slice(0, 10).map((entry) => (
                <ListItem
                  key={entry.id}
                  secondaryAction={<Typography sx={{ fontFamily: "monospace" }}>{money(entry.total_debits || entry.total_credits)}</Typography>}
                  sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
                >
                  <ListItemText
                    primary={`${entry.entry_date || entry.date} � ${entry.memo || "-"}`}
                    secondary={entry.source_type || "manual"}
                    primaryTypographyProps={{ fontSize: 13 }}
                    secondaryTypographyProps={{ fontSize: 12 }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      ) : null}

      {!loading && tab === 1 ? (
        <Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mb: 1 }}>
            <Button size="small" variant="contained" onClick={() => setShowIncome(true)} sx={{ bgcolor: "success.main" }}>
              Record Income
            </Button>
            <Button size="small" variant="contained" onClick={() => setShowExpense(true)} sx={{ bgcolor: "error.main" }}>
              Record Expense
            </Button>
            <Button size="small" variant="contained" onClick={() => setShowTransfer(true)} sx={{ bgcolor: "info.main" }}>
              Transfer
            </Button>
            <Button
              size="small"
              variant="outlined"
              sx={{ borderColor: accent, color: accent }}
              onClick={() => setShowJournal(true)}
            >
              Journal Entry
            </Button>
            <Button size="small" sx={{ ml: "auto" }} onClick={loadTransactions} startIcon={<Refresh />}>
              Refresh
            </Button>
            <TextField
              size="small"
              type="date"
              label="From"
              value={txFilters.date_from}
              onChange={(e) => setTxFilters((prev) => ({ ...prev, date_from: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              value={txFilters.date_to}
              onChange={(e) => setTxFilters((prev) => ({ ...prev, date_to: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={txFilters.status}
                label="Status"
                onChange={(e) => setTxFilters((prev) => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="posted">Posted</MenuItem>
                <MenuItem value="reversed">Reversed</MenuItem>
                <MenuItem value="voided">Voided</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Source</InputLabel>
              <Select
                value={txFilters.source_type}
                label="Source"
                onChange={(e) => setTxFilters((prev) => ({ ...prev, source_type: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="manual">manual</MenuItem>
                <MenuItem value="rent_payment">rent_payment</MenuItem>
                <MenuItem value="expense">expense</MenuItem>
                <MenuItem value="late_fee">late_fee</MenuItem>
                <MenuItem value="import">import</MenuItem>
                <MenuItem value="recurring">recurring</MenuItem>
                <MenuItem value="transfer">transfer</MenuItem>
                <MenuItem value="deposit">deposit</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Property</InputLabel>
              <Select
                value={txFilters.property_id}
                label="Property"
                onChange={(e) => setTxFilters((prev) => ({ ...prev, property_id: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                {properties.map((property) => (
                  <MenuItem key={property.id} value={String(property.id)}>
                    {property.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Paper>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerCellStyle} />
                    <TableCell sx={headerCellStyle}>Date</TableCell>
                    <TableCell sx={headerCellStyle}>Memo</TableCell>
                    <TableCell sx={headerCellStyle}>Source</TableCell>
                    <TableCell sx={headerCellStyle} align="right">
                      Total
                    </TableCell>
                    <TableCell sx={headerCellStyle}>Status</TableCell>
                    <TableCell sx={headerCellStyle} align="right">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {journalEntries.map((entry) => {
                    const lines = parseList(entry.lines);
                    const isExpanded = expandedJournal[entry.id];
                    const total = parseNumber(entry.total_debits || entry.total_credits);
                    return (
                      <>
                        <TableRow key={entry.id}>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() =>
                                setExpandedJournal((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))
                              }
                            >
                              {isExpanded ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                          </TableCell>
                          <TableCell>{toDateStr(entry.entry_date || entry.date)}</TableCell>
                          <TableCell>{entry.memo || "-"}</TableCell>
                          <TableCell>{entry.source_type || "-"}</TableCell>
                          <TableCell align="right" sx={{ fontFamily: "monospace" }}>
                            {money(total)}
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={entry.status || "draft"} color={statusColor(entry.status)} />
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              onClick={() => journalActions(entry.id, "post")}
                              disabled={entry.status !== "draft" || journalBusy[entry.id]}
                            >
                              Post
                            </Button>
                            <Button
                              size="small"
                              onClick={() => journalActions(entry.id, "reverse")}
                              disabled={entry.status !== "posted" || journalBusy[entry.id]}
                            >
                              Reverse
                            </Button>
                            <Button
                              size="small"
                              onClick={() => journalActions(entry.id, "void")}
                              disabled={entry.status !== "draft" || journalBusy[entry.id]}
                            >
                              Void
                            </Button>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={7} sx={{ p: 0 }}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 1 }}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={headerCellStyle}>Account</TableCell>
                                      <TableCell sx={headerCellStyle}>Description</TableCell>
                                      <TableCell sx={headerCellStyle} align="right">
                                        Debit
                                      </TableCell>
                                      <TableCell sx={headerCellStyle} align="right">
                                        Credit
                                      </TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {lines.map((line) => (
                                      <TableRow key={line.id || `${entry.id}-${line.account_id}`}>
                                        <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>
                                          {line.account_name || line.account?.name || line.account_id}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 12 }}>{line.description || "-"}</TableCell>
                                        <TableCell sx={{ color: debitColor, textAlign: "right", fontFamily: "monospace" }}>
                                          {money(line.debit_amount)}
                                        </TableCell>
                                        <TableCell sx={{ color: creditColor, textAlign: "right", fontFamily: "monospace" }}>
                                          {money(line.credit_amount)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </>
                    );
                  })}
                  {journalEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>No journal entries found.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      ) : null}

      {!loading && tab === 2 ? (
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Button variant="contained" sx={{ bgcolor: accent }} onClick={() => setShowAccount(true)} startIcon={<Add />}>
              Add Account
            </Button>
            {selectedAccountId ? (
              <Button variant="outlined" onClick={() => {
                setSelectedAccountId("");
                setSelectedAccountLedger([]);
              }}>
                Back to Tree
              </Button>
            ) : null}
          </Box>

          {selectedAccountId ? (
            <Paper sx={{ p: 1, mb: 1.5 }}>
              <Typography sx={{ fontSize: 16, mb: 1, fontWeight: 700 }}>
                {accountById[selectedAccountId]?.name}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
                <TextField
                  size="small"
                  type="date"
                  label="From"
                  value={selectedAccountFilters.date_from}
                  onChange={(e) => setSelectedAccountFilters((prev) => ({ ...prev, date_from: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="To"
                  value={selectedAccountFilters.date_to}
                  onChange={(e) => setSelectedAccountFilters((prev) => ({ ...prev, date_to: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>Property</InputLabel>
                  <Select
                    value={selectedAccountFilters.property_id}
                    label="Property"
                    onChange={(e) => setSelectedAccountFilters((prev) => ({ ...prev, property_id: e.target.value }))}
                  >
                    <MenuItem value="">All</MenuItem>
                    {properties.map((property) => (
                      <MenuItem key={property.id} value={String(property.id)}>
                        {property.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button onClick={() => loadLedger(selectedAccountId)} variant="contained" sx={{ bgcolor: accent }}>
                  Apply
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headerCellStyle}>Date</TableCell>
                      <TableCell sx={headerCellStyle}>Description</TableCell>
                      <TableCell sx={headerCellStyle} align="right">Debit</TableCell>
                      <TableCell sx={headerCellStyle} align="right">Credit</TableCell>
                      <TableCell sx={headerCellStyle}>Running Balance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedAccountLedger.reduce((rows, line, index) => {
                      const prev = rows[index - 1]?.running || 0;
                      const debit = parseNumber(line.debit_amount);
                      const credit = parseNumber(line.credit_amount);
                      const running = prev + debit - credit;
                      rows.push({ ...line, running });
                      return rows;
                    }, []).map((line) => (
                      <TableRow key={line.id || `${selectedAccountId}-${line.account_id}`}>
                        <TableCell>{toDateStr(line.entry_date || line.date)}</TableCell>
                        <TableCell>{line.memo || line.reference || "-"}</TableCell>
                        <TableCell align="right" sx={{ color: debitColor, fontFamily: "monospace" }}>
                          {money(line.debit_amount)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: creditColor, fontFamily: "monospace" }}>
                          {money(line.credit_amount)}
                        </TableCell>
                        <TableCell sx={{ fontFamily: "monospace" }}>{money(line.running)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : null}

          <Paper>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerCellStyle}>Code</TableCell>
                    <TableCell sx={headerCellStyle}>Account</TableCell>
                    <TableCell sx={headerCellStyle}>Type</TableCell>
                    <TableCell sx={headerCellStyle}>Normal</TableCell>
                    <TableCell sx={headerCellStyle} align="right">Balance</TableCell>
                    <TableCell sx={headerCellStyle}>Status</TableCell>
                    <TableCell sx={headerCellStyle}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{renderAccountRows(categoryTree)}</TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      ) : null}

      {!loading && tab === 3 ? (
        <Box>
          <Box
            sx={{
              display: "grid",
              gap: 1,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
              mb: 1,
            }}
          >
            {[
              { id: "pnl", label: "Profit & Loss", desc: "Income and expense statement" },
              { id: "balance", label: "Balance Sheet", desc: "Assets, liabilities, equity" },
              { id: "cashflow", label: "Cash Flow", desc: "Income vs expense trend" },
              { id: "trial", label: "Trial Balance", desc: "Posted account totals" },
              { id: "gl", label: "General Ledger", desc: "Transaction lines by account" },
              { id: "rent", label: "Rent Roll", desc: "Per-lease rent status" },
              { id: "tax", label: "Tax Summary", desc: "Schedule E by tax category" },
              { id: "owner", label: "Owner Statements", desc: "Property statements" },
            ].map((card) => (
              <Card
                key={card.id}
                variant="outlined"
                sx={{
                  cursor: "pointer",
                  borderColor: activeReport === card.id ? accent : "divider",
                  backgroundColor: activeReport === card.id ? "rgba(124,92,252,0.08)" : "inherit",
                }}
                onClick={() => {
                  setActiveReport(card.id);
                  loadReports(card.id);
                }}
              >
                <CardContent>
                  <Typography sx={{ fontWeight: 700 }}>{card.label}</Typography>
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{card.desc}</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Paper sx={{ p: 1 }}>
            {activeReport === "pnl" ? (
              <Box>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Profit & Loss</Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
                  <TextField
                    size="small"
                    label="From"
                    type="date"
                    value={reportFilters.pnl.date_from}
                    onChange={(e) =>
                      setReportFilters((prev) => ({ ...prev, pnl: { ...prev.pnl, date_from: e.target.value } }))
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    size="small"
                    label="To"
                    type="date"
                    value={reportFilters.pnl.date_to}
                    onChange={(e) =>
                      setReportFilters((prev) => ({ ...prev, pnl: { ...prev.pnl, date_to: e.target.value } }))
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                  <Button size="small" variant="contained" sx={{ bgcolor: accent }} onClick={() => loadReports("pnl")}>
                    Refresh
                  </Button>
                  <Button size="small" onClick={() => window.print()}>
                    Print Report
                  </Button>
                </Box>
                {reportData.pnl ? (
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        {parseList(reportData.pnl.revenue_accounts || reportData.pnl).map((row) => (
                          <TableRow key={row.account_id || row.id}>
                            <TableCell>{row.account_name || row.name || "Revenue"}</TableCell>
                            <TableCell align="right" sx={{ fontFamily: "monospace", color: "success.main" }}>
                              {money(row.total || row.amount || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {parseList(reportData.pnl.expense_accounts).map((row) => (
                          <TableRow key={row.account_id || row.id}>
                            <TableCell>{row.account_name || row.name || "Expense"}</TableCell>
                            <TableCell align="right" sx={{ fontFamily: "monospace", color: "error.main" }}>
                              {money(row.total || row.amount || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : null}
              </Box>
            ) : null}
            {activeReport === "balance" ? (
              <Box>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Balance Sheet</Typography>
                <Button size="small" variant="contained" sx={{ bgcolor: accent }} onClick={() => loadReports("balance")}>
                  Refresh
                </Button>
                <Button size="small" onClick={() => window.print()} sx={{ ml: 1 }}>
                  Print Report
                </Button>
                <Typography sx={{ mt: 1, fontWeight: 700 }}>Assets</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      {parseList(reportData.balance?.assets).map((line) => (
                        <TableRow key={line.account_id || line.id}>
                          <TableCell>{line.account_name || line.name}</TableCell>
                          <TableCell align="right" sx={{ fontFamily: "monospace" }}>
                            {money(line.balance || line.total || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : null}
            {activeReport === "cashflow" ? (
              <Box>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Cash Flow</Typography>
                <Button size="small" variant="contained" sx={{ bgcolor: accent }} onClick={() => loadReports("cashflow")}>
                  Refresh
                </Button>
                <Button size="small" onClick={() => window.print()} sx={{ ml: 1 }}>
                  Print Report
                </Button>
                <Box sx={{ height: 240, mt: 1 }}>
                  <ResponsiveContainer>
                    <LineChart data={parseList(reportData.cashflow)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                      <Tooltip />
                      <Line dataKey="income" stroke={debitColor} />
                      <Line dataKey="expenses" stroke={creditColor} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            ) : null}
            {activeReport === "trial" ? (
              <Box>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Trial Balance</Typography>
                <Button size="small" variant="contained" sx={{ bgcolor: accent }} onClick={() => loadReports("trial")}>
                  Refresh
                </Button>
                <Button size="small" onClick={() => window.print()} sx={{ ml: 1 }}>
                  Print Report
                </Button>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={headerCellStyle}>Account</TableCell>
                        <TableCell sx={headerCellStyle}>Debit</TableCell>
                        <TableCell sx={headerCellStyle}>Credit</TableCell>
                        <TableCell sx={headerCellStyle}>Net</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parseList(reportData.trial).map((line) => {
                        const debit = parseNumber(line.total_debits);
                        const credit = parseNumber(line.total_credits);
                        const net = parseNumber(line.net_balance ?? line.balance ?? debit - credit);
                        return (
                          <TableRow key={line.account_id || line.id}>
                            <TableCell>{line.account_name || line.account?.name || "-"}</TableCell>
                            <TableCell align="right">{money(debit)}</TableCell>
                            <TableCell align="right">{money(credit)}</TableCell>
                            <TableCell align="right">{money(net)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : null}
            {activeReport === "gl" ? (
              <Box>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>General Ledger</Typography>
                <Button size="small" onClick={() => loadReports("gl")} variant="contained" sx={{ bgcolor: accent }}>
                  Refresh
                </Button>
                <Button size="small" onClick={() => window.print()} sx={{ ml: 1 }}>
                  Print Report
                </Button>
                <Box sx={{ mt: 1 }}>
                  {(parseList(reportData.gl?.accounts) || []).map((section) => (
                    <Paper sx={{ mb: 1, p: 1 }} key={section.account_id || section.id}>
                      <Typography sx={{ fontWeight: 700, mb: 1 }}>
                        {section.account_name || section.account?.name}
                      </Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={headerCellStyle}>Date</TableCell>
                            <TableCell sx={headerCellStyle}>Memo</TableCell>
                            <TableCell sx={headerCellStyle} align="right">Debit</TableCell>
                            <TableCell sx={headerCellStyle} align="right">Credit</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {parseList(section.lines).map((line) => (
                            <TableRow key={line.id}>
                              <TableCell>{toDateStr(line.entry_date)}</TableCell>
                              <TableCell>{line.memo || "-"}</TableCell>
                              <TableCell align="right" sx={{ color: debitColor }}>
                                {money(line.debit_amount)}
                              </TableCell>
                              <TableCell align="right" sx={{ color: creditColor }}>
                                {money(line.credit_amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Paper>
                  ))}
                </Box>
              </Box>
            ) : null}
            {activeReport === "rent" ? (
              <Box>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Rent Roll</Typography>
                <Button onClick={() => loadReports("rent")} size="small" variant="contained" sx={{ bgcolor: accent, mr: 1 }}>
                  Refresh
                </Button>
                <Button onClick={() => window.print()} size="small">Print Report</Button>
              </Box>
            ) : null}
            {activeReport === "tax" ? (
              <Box>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Tax Summary</Typography>
                <Button onClick={() => loadReports("tax")} size="small" variant="contained" sx={{ bgcolor: accent, mr: 1 }}>
                  Refresh
                </Button>
                <Button onClick={() => window.print()} size="small">Print Report</Button>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={headerCellStyle}>Category</TableCell>
                        <TableCell sx={headerCellStyle} align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parseList(reportData.tax?.by_tax_category || reportData.tax).map((row) => (
                        <TableRow key={row.tax_category || row.id || row.category}>
                          <TableCell>{row.tax_category || row.category}</TableCell>
                          <TableCell align="right">{money(row.total || row.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : null}
            {activeReport === "owner" ? (
              <Box>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Owner Statements</Typography>
                <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
                  <TextField
                    size="small"
                    type="date"
                    label="From"
                    value={reportFilters.owner.date_from}
                    onChange={(e) =>
                      setReportFilters((prev) => ({ ...prev, owner: { ...prev.owner, date_from: e.target.value } }))
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="To"
                    value={reportFilters.owner.date_to}
                    onChange={(e) => setReportFilters((prev) => ({ ...prev, owner: { ...prev.owner, date_to: e.target.value } }))
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                  <FormControl size="small" sx={{ minWidth: 240 }}>
                    <InputLabel>Property</InputLabel>
                    <Select
                      value={reportFilters.owner.property_id}
                      label="Property"
                      onChange={(e) => setReportFilters((prev) => ({ ...prev, owner: { ...prev.owner, property_id: e.target.value }}))}
                    >
                      <MenuItem value="">All</MenuItem>
                      {properties.map((property) => (
                        <MenuItem key={property.id} value={String(property.id)}>
                          {property.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button size="small" variant="contained" sx={{ bgcolor: accent }} onClick={() => loadReports("owner")}>
                    Refresh
                  </Button>
                  <Button size="small" onClick={() => window.print()}>
                    Print Report
                  </Button>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={headerCellStyle}>Property</TableCell>
                        <TableCell sx={headerCellStyle} align="right">Income</TableCell>
                        <TableCell sx={headerCellStyle} align="right">Expense</TableCell>
                        <TableCell sx={headerCellStyle} align="right">Net</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parseList(reportData.owner).map((statement) => {
                        const net = parseNumber(statement.net_income || statement.net || 0) || (parseNumber(statement.total_income || 0) - parseNumber(statement.total_expense || 0));
                        return (
                          <TableRow key={statement.id || statement.property_id}>
                            <TableCell>{statement.property_name || statement.property || "-"}</TableCell>
                            <TableCell align="right">{money(statement.total_income || statement.income || 0)}</TableCell>
                            <TableCell align="right">{money(statement.total_expense || statement.expenses || 0)}</TableCell>
                            <TableCell align="right">{money(net)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : null}
          </Paper>
        </Box>
      ) : null}

      {!loading && tab === 4 ? (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellStyle}>Property</TableCell>
                  <TableCell sx={headerCellStyle}>Unit</TableCell>
                  <TableCell sx={headerCellStyle}>Tenant</TableCell>
                  <TableCell sx={headerCellStyle}>Monthly Rent</TableCell>
                  <TableCell sx={headerCellStyle}>Last Payment Date</TableCell>
                  <TableCell sx={headerCellStyle}>Days Since Payment</TableCell>
                  <TableCell sx={headerCellStyle}>Balance Due</TableCell>
                  <TableCell sx={headerCellStyle}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rentRoll.rows.map((row) => {
                  const last = row.last_payment_date || row.last_payment;
                  const daysSince = last ? Math.max(0, Math.floor((Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24))) : null;


                  const status = rentStatus(daysSince);
                  return (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{
                        "& td": { fontFamily: "monospace", fontSize: 12 },
                        cursor: row.lease_id || row.lease ? "pointer" : "default",
                      }}
                      onClick={() => {
                        if (row.lease_id || row.lease) navigate(`/accounting/ledger/${row.lease_id || row.lease}`);
                      }}
                    >
                      <TableCell>{row.property_name || row.property || row.property?.name || "-"}</TableCell>
                      <TableCell>{row.unit_number || row.unit || row.unit?.unit_number || "-"}</TableCell>
                      <TableCell>{row.tenant_name || "-"}</TableCell>
                      <TableCell>{money(row.monthly_rent)}</TableCell>
                      <TableCell>{last ? toDateStr(last) : "-"}</TableCell>
                      <TableCell>{daysSince === null ? "-" : daysSince}</TableCell>
                      <TableCell sx={{ color: parseNumber(row.balance_due) > 0 ? "error.main" : "success.main" }}>
                        {money(row.balance_due || 0)}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={status.color} label={status.label} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Divider />
          <Box sx={{ p: 1, display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" } }}>
            <Card>
              <CardContent>
                <Typography variant="body2">Expected Rent</Typography>
                <Typography sx={{ fontWeight: 700 }}>{money(rentRoll.summary.total_expected_rent)}</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant="body2">Collected Rent</Typography>
                <Typography sx={{ fontWeight: 700, color: "success.main" }}>{money(rentRoll.summary.total_collected_rent)}</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant="body2">Outstanding</Typography>
                <Typography sx={{ fontWeight: 700, color: "error.main" }}>
                  {money(rentRoll.summary.total_outstanding_rent || rentRoll.summary.total_outstanding)}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant="body2">Collection Rate</Typography>
                <Typography sx={{ fontWeight: 700 }}>{summaryCollectionRate.toFixed(1)}%</Typography>
              </CardContent>
            </Card>
          </Box>
        </Paper>
      ) : null}

      <Dialog open={showIncome} onClose={() => setShowIncome(false)} fullWidth maxWidth="sm">
        <DialogTitle>Record Income</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.2, mt: 0.5 }}>
          <TextField
            label="Amount"
            type="number"
            size="small"
            value={incomeForm.amount}
            onChange={(e) => setIncomeForm((prev) => ({ ...prev, amount: e.target.value }))}
          />
          <FormControl size="small">
            <InputLabel>Revenue Account</InputLabel>
            <Select
              value={incomeForm.revenue_account_id}
              label="Revenue Account"
              onChange={(e) => setIncomeForm((prev) => ({ ...prev, revenue_account_id: e.target.value }))}
            >
              {revenueAccounts.map((account) => (
                <MenuItem key={account.id} value={String(account.id)}>
                  {account.account_code ? `${account.account_code} ` : ""}
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Deposit To</InputLabel>
            <Select
              value={incomeForm.deposit_to_account_id}
              label="Deposit To"
              onChange={(e) => setIncomeForm((prev) => ({ ...prev, deposit_to_account_id: e.target.value }))}
            >
              {assetAccounts.map((account) => (
                <MenuItem key={account.id} value={String(account.id)}>
                  {account.account_code ? `${account.account_code} ` : ""}
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Date"
            type="date"
            size="small"
            value={incomeForm.date}
            onChange={(e) => setIncomeForm((prev) => ({ ...prev, date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl size="small">
            <InputLabel>Property</InputLabel>
            <Select
              value={incomeForm.property_id}
              label="Property"
              onChange={(e) => setIncomeForm((prev) => ({ ...prev, property_id: e.target.value }))}
            >
              <MenuItem value="">Unspecified</MenuItem>
              {properties.map((property) => (
                <MenuItem key={property.id} value={String(property.id)}>
                  {property.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Description"
            size="small"
            multiline
            rows={2}
            value={incomeForm.description}
            onChange={(e) => setIncomeForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowIncome(false)}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: accent }} onClick={handleCreateIncome}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showExpense} onClose={() => setShowExpense(false)} fullWidth maxWidth="sm">
        <DialogTitle>Record Expense</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.2, mt: 0.5 }}>
          <TextField
            label="Amount"
            type="number"
            size="small"
            value={expenseForm.amount}
            onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
          />
          <FormControl size="small">
            <InputLabel>Expense Account</InputLabel>
            <Select
              value={expenseForm.expense_account_id}
              label="Expense Account"
              onChange={(e) => setExpenseForm((prev) => ({ ...prev, expense_account_id: e.target.value }))}
            >
              {expenseAccounts.map((account) => (
                <MenuItem key={account.id} value={String(account.id)}>
                  {account.account_code ? `${account.account_code} ` : ""}
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Paid From</InputLabel>
            <Select
              value={expenseForm.paid_from_account_id}
              label="Paid From"
              onChange={(e) => setExpenseForm((prev) => ({ ...prev, paid_from_account_id: e.target.value }))}
            >
              {assetAccounts.map((account) => (
                <MenuItem key={account.id} value={String(account.id)}>
                  {account.account_code ? `${account.account_code} ` : ""}
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Vendor"
            size="small"
            value={expenseForm.vendor}
            onChange={(e) => setExpenseForm((prev) => ({ ...prev, vendor: e.target.value }))}
          />
          <TextField
            label="Date"
            type="date"
            size="small"
            value={expenseForm.date}
            onChange={(e) => setExpenseForm((prev) => ({ ...prev, date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Description"
            size="small"
            multiline
            rows={2}
            value={expenseForm.description}
            onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExpense(false)}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: accent }} onClick={handleCreateExpense}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showTransfer} onClose={() => setShowTransfer(false)} fullWidth maxWidth="sm">
        <DialogTitle>Record Transfer</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.2, mt: 0.5 }}>
          <TextField
            label="Amount"
            type="number"
            size="small"
            value={transferForm.amount}
            onChange={(e) => setTransferForm((prev) => ({ ...prev, amount: e.target.value }))}
          />
          <FormControl size="small">
            <InputLabel>From Account</InputLabel>
            <Select
              value={transferForm.from_account_id}
              label="From Account"
              onChange={(e) => setTransferForm((prev) => ({ ...prev, from_account_id: e.target.value }))}
            >
              {allPostingAccounts.map((account) => (
                <MenuItem key={account.id} value={String(account.id)}>
                  {account.account_code ? `${account.account_code} ` : ""}
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>To Account</InputLabel>
            <Select
              value={transferForm.to_account_id}
              label="To Account"
              onChange={(e) => setTransferForm((prev) => ({ ...prev, to_account_id: e.target.value }))}
            >
              {allPostingAccounts.map((account) => (
                <MenuItem key={account.id} value={String(account.id)}>
                  {account.account_code ? `${account.account_code} ` : ""}
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Date"
            type="date"
            size="small"
            value={transferForm.date}
            onChange={(e) => setTransferForm((prev) => ({ ...prev, date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Description"
            size="small"
            multiline
            rows={2}
            value={transferForm.description}
            onChange={(e) => setTransferForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTransfer(false)}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: accent }} onClick={handleCreateTransfer}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={showJournal} onClose={() => setShowJournal(false)} fullWidth maxWidth="md">
        <DialogTitle>Journal Entry</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.2, mt: 0.5 }}>
          <TextField
            label="Memo"
            size="small"
            value={journalForm.memo}
            onChange={(e) => setJournalForm((prev) => ({ ...prev, memo: e.target.value }))}
          />
          <TextField
            label="Entry Date"
            type="date"
            size="small"
            value={journalForm.entry_date}
            onChange={(e) => setJournalForm((prev) => ({ ...prev, entry_date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl size="small">
            <InputLabel>Source</InputLabel>
            <Select
              value={journalForm.source_type}
              label="Source"
              onChange={(e) => setJournalForm((prev) => ({ ...prev, source_type: e.target.value }))}
            >
              <MenuItem value="manual">manual</MenuItem>
              <MenuItem value="rent_payment">rent_payment</MenuItem>
              <MenuItem value="expense">expense</MenuItem>
              <MenuItem value="late_fee">late_fee</MenuItem>
              <MenuItem value="import">import</MenuItem>
              <MenuItem value="recurring">recurring</MenuItem>
              <MenuItem value="transfer">transfer</MenuItem>
              <MenuItem value="deposit">deposit</MenuItem>
            </Select>
          </FormControl>

          <Paper variant="outlined" sx={{ p: 1.2 }}>
            <Typography sx={{ mb: 1, fontWeight: 700 }}>Lines</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerCellStyle}>Account</TableCell>
                    <TableCell sx={headerCellStyle}>Debit</TableCell>
                    <TableCell sx={headerCellStyle}>Credit</TableCell>
                    <TableCell sx={headerCellStyle}>Description</TableCell>
                    <TableCell sx={headerCellStyle}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {journalForm.lines.map((line, idx) => (
                    <TableRow key={`${idx}-${line.account_id || "new"}`}>
                      <TableCell sx={{ minWidth: 260 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Account</InputLabel>
                          <Select
                            value={line.account_id}
                            label="Account"
                            onChange={(e) => updateJournalLine(idx, "account_id", e.target.value)}
                          >
                            {allPostingAccounts.map((account) => (
                              <MenuItem key={account.id} value={String(account.id)}>
                                {account.account_code ? `${account.account_code} ` : ""}
                                {account.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell sx={{ width: 150 }}>
                        <TextField
                          size="small"
                          type="number"
                          value={line.debit_amount}
                          onChange={(e) => updateJournalLine(idx, "debit_amount", e.target.value)}
                        />
                      </TableCell>
                      <TableCell sx={{ width: 150 }}>
                        <TextField
                          size="small"
                          type="number"
                          value={line.credit_amount}
                          onChange={(e) => updateJournalLine(idx, "credit_amount", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={line.description}
                          onChange={(e) => updateJournalLine(idx, "description", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => removeJournalLine(idx)}
                          disabled={journalForm.lines.length <= 1}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button size="small" onClick={addJournalLine} sx={{ mt: 1 }}>
              Add Line
            </Button>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <Typography sx={{ fontSize: 13 }}>
                Debits: {money(jeTotals.debits)} | Credits: {money(jeTotals.credits)}
              </Typography>
              <Typography color={jeBalanced ? "success.main" : "error.main"} sx={{ fontWeight: 700 }}>
                {jeBalanced ? "Balanced" : "Balanced totals required"}
              </Typography>
            </Box>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowJournal(false)}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: accent }} onClick={handleCreateManualJE} disabled={!jeBalanced}>
            Save Journal Entry
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showAccount} onClose={() => setShowAccount(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Account</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.2, mt: 0.5 }}>
          <TextField
            label="Account Code"
            size="small"
            value={addAccountForm.account_code}
            onChange={(e) => setAddAccountForm((prev) => ({ ...prev, account_code: e.target.value }))}
          />
          <TextField
            label="Name"
            size="small"
            value={addAccountForm.name}
            onChange={(e) => setAddAccountForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <FormControl size="small">
            <InputLabel>Account Type</InputLabel>
            <Select
              value={addAccountForm.account_type}
              label="Account Type"
              onChange={(e) => setAddAccountForm((prev) => ({ ...prev, account_type: e.target.value }))}
            >
              <MenuItem value="asset">Asset</MenuItem>
              <MenuItem value="liability">Liability</MenuItem>
              <MenuItem value="equity">Equity</MenuItem>
              <MenuItem value="revenue">Revenue</MenuItem>
              <MenuItem value="expense">Expense</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Normal Balance</InputLabel>
            <Select
              value={addAccountForm.normal_balance}
              label="Normal Balance"
              onChange={(e) => setAddAccountForm((prev) => ({ ...prev, normal_balance: e.target.value }))}
            >
              <MenuItem value="debit">Debit</MenuItem>
              <MenuItem value="credit">Credit</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Parent Account</InputLabel>
            <Select
              value={addAccountForm.parent_account}
              label="Parent Account"
              onChange={(e) => setAddAccountForm((prev) => ({ ...prev, parent_account: e.target.value }))}
            >
              <MenuItem value="">None</MenuItem>
              {categoryFlat
                .filter((account) => account.is_header)
                .map((account) => (
                  <MenuItem key={account.id} value={String(account.id)}>
                    {account.account_code ? `${account.account_code} ` : ""}
                    {account.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Account Role</InputLabel>
            <Select
              value={addAccountForm.is_header ? "header" : "standard"}
              label="Account Role"
              onChange={(e) => setAddAccountForm((prev) => ({ ...prev, is_header: e.target.value === "header" }))}
            >
              <MenuItem value="standard">Standard</MenuItem>
              <MenuItem value="header">Header</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Description"
            size="small"
            value={addAccountForm.description}
            onChange={(e) => setAddAccountForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAccount(false)}>Cancel</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: accent }}
            onClick={addAccount}
            disabled={!addAccountForm.account_code || !addAccountForm.name}
          >
            Add Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Accounting;



