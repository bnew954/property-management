import {
  Alert,
  Menu,
  Box,
  Grid,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  InputAdornment,
  Link,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Step,
  StepLabel,
  Stepper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Tabs,
  Tab,
  TextField,
  Typography,
} from "@mui/material";
import {
  Add,
  ChevronRight,
  ExpandLess,
  ExpandMore,
  Edit,
  Delete,
  MoreVert,
  Refresh,
  CheckCircle,
  Rule,
} from "@mui/icons-material";
import { useTheme } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import { Link as RouteLink, useNavigate } from "react-router-dom";
import {
  createAccountingCategory,
  createJournalEntry,
  createRecurringTransaction,
  bulkApproveTransactions,
  bookImport,
  getAccountingCashflow,
  getAccountingCategories,
  getAccountingCategoryLedger,
  getTransactionImport,
  createTransactionImport,
  getClassificationRules,
  createClassificationRule,
  updateClassificationRule,
  deleteClassificationRule,
  updateImportedTransaction,
  confirmImportMapping,
  getAccountingPeriods,
  getAccountingRentRoll,
  deleteAccountingCategory,
  getAccountingTaxReport,
  getBalanceSheetReport,
  getGeneralLedgerReport,
  getJournalEntries,
  getOwnerStatements,
  getAccountingPnL,
  getProperties,
  getRecurringTransactions,
  deleteRecurringTransaction,
  getTrialBalanceReport,
  lockAccountingPeriod,
  recordExpense,
  recordIncome,
  recordTransfer,
  postJournalEntry,
  reverseJournalEntry,
  runRecurringTransaction,
  updateAccountingCategory,
  getReconciliations,
  createReconciliation,
  getReconciliation,
  completeReconciliation,
  addReconciliationMatch,
  removeReconciliationMatch,
  excludeReconciliationItem,
  unlockAccountingPeriod,
  updateRecurringTransaction,
  runAllRecurring,
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
const formatDisplayDate = (value) => {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).format(date);
};
const dateIsOverdue = (value, compareTo = toDateStr(new Date())) => {
  if (!value) return false;
  return String(value).split("T")[0] < compareTo;
};
const formatMoneyWithSign = (value) => {
  const amount = parseNumber(value);
  const abs = Math.abs(amount).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return amount < 0 ? `(${abs})` : abs;
};

const parseList = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
};

const formatSignedMoney = (value) => {
  const amount = Number(value || 0);
  const abs = Math.abs(amount).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return amount < 0 ? `(${abs})` : abs;
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

const resolveParentId = (account = {}) => {
  const rawParent = account.parent !== undefined ? account.parent : account.parent_account;
  if (!rawParent) return null;
  if (typeof rawParent === "object") return rawParent.id || rawParent.account_id || null;
  return rawParent;
};

const compareAccountCodes = (a, b) => {
  const aCode = String(a.account_code || a.code || "").trim();
  const bCode = String(b.account_code || b.code || "").trim();
  const aMissing = aCode ? 0 : 1;
  const bMissing = bCode ? 0 : 1;
  if (aMissing !== bMissing) return aMissing - bMissing;
  const byCode = aCode.localeCompare(bCode, "en-US", {
    numeric: true,
    sensitivity: "base",
  });
  if (byCode !== 0) return byCode;
  return String(a.name || "").localeCompare(String(b.name || ""), "en-US", {
    sensitivity: "base",
  });
};

const asTree = (raw) => {
  const items = parseList(raw).map((item) => ({
    ...item,
    parent_account: resolveParentId(item),
    children: [],
  }));
  const sortedItems = [...items].sort(compareAccountCodes);
  const hasParentReferences = sortedItems.some(
    (item) =>
      item.parent_account || item.parent_account_id || item.parent || item.parent_id
  );
  if (!hasParentReferences) {
    const withChildren = sortedItems.some((i) => Array.isArray(i.sub_accounts) && i.sub_accounts.length > 0);
    if (withChildren) {
      const build = (node) => ({
        ...node,
        children: Array.isArray(node.sub_accounts)
          ? [...node.sub_accounts].sort(compareAccountCodes).map((c) => build(c))
          : [],
      });
      return [...sortedItems].map(build);
    }
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
      node.children = node.children.sort(compareAccountCodes);
    }
  });
  return roots.sort(compareAccountCodes);
};

const flattenTree = (nodes, output = []) => {
  nodes.forEach((node) => {
    output.push(node);
    if (Array.isArray(node.children) && node.children.length > 0) flattenTree(node.children, output);
  });
  return output;
};

const clean = (obj) => Object.fromEntries(Object.entries(obj || {}).filter(([, v]) => v !== "" && v !== null && v !== undefined));
const formatAccountWithCode = (account) => {
  if (!account) return "-";
  const code = account.account_code ? `${account.account_code}` : "";
  return code ? `${code} \u00b7 ${account.name}` : account.name;
};

const recurringDateValue = (value) => String(value || "").split("T")[0];
const recurringIsDue = (value, now) => recurringDateValue(value) <= recurringDateValue(now);
const recurringIsOverdue = (value, now) => recurringDateValue(value) < recurringDateValue(now);

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
const recurringFormInitial = {
  name: "",
  description: "",
  frequency: "monthly",
  amount: "",
  debit_account: "",
  credit_account: "",
  property: "",
  start_date: toDateStr(new Date()),
  next_run_date: toDateStr(new Date()),
  end_date: "",
  is_active: true,
};
const recurringFrequencyLabels = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
  weekly: "Weekly",
};
const recurringQuickPresets = [
  {
    label: "Monthly mortgage payment",
    frequency: "monthly",
    description: "Monthly mortgage payment",
    debit_account_name: "5010 Mortgage Interest",
    credit_account_name: "1020 Cash in Bank",
  },
  {
    label: "Monthly insurance",
    frequency: "monthly",
    description: "Monthly insurance",
    debit_account_name: "5040 Insurance",
    credit_account_name: "1020 Cash in Bank",
  },
  {
    label: "Monthly rent charge",
    frequency: "monthly",
    description: "Monthly rent charge",
    debit_account_name: "1100 Accounts Receivable",
    credit_account_name: "4100 Rental Income",
  },
];
const accountTypeOrder = ["asset", "liability", "equity", "revenue", "expense"];
const classificationRuleInitial = {
  match_field: "description",
  match_type: "contains",
  match_value: "",
  category: "",
  property_link: "",
  priority: 0,
  is_active: true,
};
const accountTypeLabel = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expenses",
};
const ruleMatchFieldLabel = {
  description: "Description",
  reference: "Reference",
};
const ruleMatchTypeLabel = {
  contains: "Contains",
  starts_with: "Starts With",
  exact: "Exact Match",
};
const importSteps = ["Upload CSV", "Map Columns", "Review & Classify"];
const normalizeHeader = (value) => String(value || "").trim().toLowerCase();

const detectImportMapping = (headers = []) => {
  const normalized = headers.map((h) => ({
    raw: h,
    key: normalizeHeader(h),
  }));
  const find = (checkers) =>
    normalized.find((entry) => checkers.some((checker) => checker(entry.key)) )?.raw || "";

  const dateColumn = find([(v) => v.includes("date")]);
  const descriptionColumn = find([(v) => v.includes("description"), (v) => v.includes("memo"), (v) => v.includes("details")]);
  const amountColumn = find([(v) => v.includes("amount"), (v) => v.includes("total"), (v) => v.includes("debit"), (v) => v.includes("credit"), (v) => v.includes("value")]);
  const referenceColumn = find([(v) => v.includes("reference"), (v) => v.includes("ref"), (v) => v.includes("check"), (v) => v.includes("txn"), (v) => v.includes("transaction")]);

  return {
    date_column: dateColumn || "",
    description_column: descriptionColumn || "",
    amount_column: amountColumn || "",
    reference_column: referenceColumn || "",
  };
};

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
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(false);

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
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showRuleManager, setShowRuleManager] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState("");
  const [classificationRules, setClassificationRules] = useState([]);
  const [ruleForm, setRuleForm] = useState(classificationRuleInitial);
  const [ruleLoading, setRuleLoading] = useState(false);
  const [ruleError, setRuleError] = useState("");
  const [ruleManagementLoading, setRuleManagementLoading] = useState(false);
  const [rulePrefillMode, setRulePrefillMode] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState("");
  const [coaMenuAnchor, setCoaMenuAnchor] = useState(null);
  const [coaMenuAccount, setCoaMenuAccount] = useState(null);

  const [incomeForm, setIncomeForm] = useState(incomeFormInitial);
  const [expenseForm, setExpenseForm] = useState(expenseFormInitial);
  const [transferForm, setTransferForm] = useState(transferFormInitial);
  const [journalForm, setJournalForm] = useState(journalFormInitial);
  const [addAccountForm, setAddAccountForm] = useState(addAccountInitial);
  const [importUploadFile, setImportUploadFile] = useState(null);
  const [importStep, setImportStep] = useState(0);
  const [importDetectedHeaders, setImportDetectedHeaders] = useState([]);
  const [activeImport, setActiveImport] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [importError, setImportError] = useState("");
  const [importMapping, setImportMapping] = useState({
    date_column: "",
    description_column: "",
    amount_column: "",
    reference_column: "",
  });
  const [importSummary, setImportSummary] = useState({ created: 0, skipped: 0, duplicates: 0, auto_classified: 0, auto_classified_ids: [] });
  const [importSelectedRows, setImportSelectedRows] = useState([]);
  const [importBulkCategory, setImportBulkCategory] = useState("");
  const [importBookingSummary, setImportBookingSummary] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [showReconcileStart, setShowReconcileStart] = useState(false);
  const [showReconciliationWorkspace, setShowReconciliationWorkspace] = useState(false);
  const [reconciliationLoading, setReconciliationLoading] = useState(false);
  const [reconciliationError, setReconciliationError] = useState("");
  const [reconciliationForm, setReconciliationForm] = useState({
    account_id: "",
    start_date: bounds.start,
    end_date: bounds.end,
    statement_ending_balance: "0",
  });
  const [activeReconciliation, setActiveReconciliation] = useState(null);
  const [reconBankSelection, setReconBankSelection] = useState([]);
  const [reconBookSelection, setReconBookSelection] = useState([]);

const [periods, setPeriods] = useState([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [recurringTemplates, setRecurringTemplates] = useState([]);
  const [showRecurringManager, setShowRecurringManager] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingRecurringId, setEditingRecurringId] = useState("");
  const [recurringForm, setRecurringForm] = useState(recurringFormInitial);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [recurringDeleteId, setRecurringDeleteId] = useState("");
  const [showRecurringDeleteDialog, setShowRecurringDeleteDialog] = useState(false);
  const [recurringDeleteName, setRecurringDeleteName] = useState("");
  const [recurringMessage, setRecurringMessage] = useState("");
  const [recurringFormError, setRecurringFormError] = useState("");

  const accountById = useMemo(() => Object.fromEntries(categoryFlat.map((a) => [String(a.id), a])), [categoryFlat]);
  const recurringAccountLabel = (accountId) => {
    const account = accountById[String(accountId)];
    if (!account) return "-";
    return formatAccountWithCode(account);
  };
  const recurringToday = recurringDateValue(new Date());
  const autoClassifiedIds = useMemo(
    () => new Set((activeImport?.column_mapping?.auto_classified_ids || importSummary.auto_classified_ids || []).map((id) => String(id))),
    [activeImport?.column_mapping?.auto_classified_ids, importSummary.auto_classified_ids]
  );
  const reconciliationAccounts = useMemo(
    () => categoryFlat.filter((account) => account.is_active !== false && account.account_type === "asset" && !account.is_header),
    [categoryFlat]
  );
  const reconciliationMatches = parseList(activeReconciliation?.matches);
  const reconMatchByBank = useMemo(
    () =>
      Object.fromEntries(
        parseList(reconciliationMatches)
          .filter((match) => match?.imported_transaction || match?.imported_transaction_id)
          .map((match) => [String(match.imported_transaction || match.imported_transaction_id), match])
      ),
    [reconciliationMatches]
  );
  const reconMatchByBookLine = useMemo(
    () =>
      Object.fromEntries(
        parseList(reconciliationMatches)
          .filter((match) => match?.journal_entry_line || match?.journal_entry_line_id)
          .map((match) => [String(match.journal_entry_line || match.journal_entry_line_id), match])
      ),
    [reconciliationMatches]
  );
  const reconciliationUnmatchedBank = useMemo(() => parseList(activeReconciliation?.unmatched_bank_transactions), [activeReconciliation]);
  const reconciliationUnmatchedBook = useMemo(() => parseList(activeReconciliation?.unmatched_book_entries), [activeReconciliation]);
  const reconciliationMatchedItems = useMemo(() => parseList(activeReconciliation?.matches), [activeReconciliation]);
  const reconciledBankRows = useMemo(
    () =>
      reconciliationMatchedItems
        .map((match) => {
          const detail = match.imported_transaction_detail || match.imported_transaction || {};
          if (!detail || !detail.id) return null;
          return {
            ...detail,
            _matchedMatchId: match.id || null,
            _source: "matched",
          };
        })
        .filter(Boolean),
    [reconciliationMatchedItems]
  );
  const reconciledBookRows = useMemo(
    () =>
      reconciliationMatchedItems
        .map((match) => {
          const detail = match.journal_entry_line_detail || match.journal_entry_line || {};
          if (!detail || !detail.id) return null;
          return {
            ...detail,
            _matchedMatchId: match.id || null,
            _source: "matched",
          };
        })
        .filter(Boolean),
    [reconciliationMatchedItems]
  );
  const reconciliationBankRows = useMemo(() => {
    const merged = [...reconciliationUnmatchedBank, ...reconciledBankRows];
    const seen = new Set();
    return merged.filter((row) => {
      const id = String(row.id || row.imported_transaction || "");
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [reconciliationUnmatchedBank, reconciledBankRows]);
  const reconciliationBookRows = useMemo(() => {
    const merged = [...reconciliationUnmatchedBook, ...reconciledBookRows];
    const seen = new Set();
    return merged.filter((row) => {
      const id = String(row.id || row.journal_entry_line || "");
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [reconciliationUnmatchedBook, reconciledBookRows]);
  const reconciliationSummary = useMemo(() => {
    const statementBalance = parseNumber(activeReconciliation?.statement_ending_balance);
    const bookBalance = parseNumber(activeReconciliation?.book_balance);
    const difference = statementBalance - bookBalance;
    return {
      matchedCount: parseNumber(activeReconciliation?.matched_count || reconciliationMatches.length),
      unmatchedBankCount: parseNumber(activeReconciliation?.unmatched_bank_count || reconciliationUnmatchedBank.length),
      unmatchedBookCount: parseNumber(activeReconciliation?.unmatched_book_count || reconciliationUnmatchedBook.length),
      statementBalance,
      bookBalance,
      difference,
      isBalanced: Math.abs(difference) < 0.01,
    };
  }, [activeReconciliation, reconciliationMatches, reconciliationUnmatchedBank.length, reconciliationUnmatchedBook.length]);

  const visibleCategoryTree = useMemo(() => {
    if (showInactiveAccounts) return categoryTree;
    const pruneInactive = (nodes = []) =>
      nodes
        .map((node) => ({
          ...node,
          children: pruneInactive(node.children || []),
        }))
        .filter((node) => node.is_active !== false);
    return pruneInactive(categoryTree);
  }, [categoryTree, showInactiveAccounts]);

  const orderedVisibleAccountTypeSections = useMemo(() => {
    const sortByHeaderThenCode = (left, right) => {
      const leftIsHeader = left.is_header === true;
      const rightIsHeader = right.is_header === true;
      if (leftIsHeader !== rightIsHeader) {
        return leftIsHeader ? -1 : 1;
      }
      return compareAccountCodes(left, right);
    };

    const sections = [];
    accountTypeOrder.forEach((accountType) => {
      const rows = visibleCategoryTree
        .filter((account) => String(account.account_type || "expense") === accountType)
        .slice()
        .sort(sortByHeaderThenCode);
      sections.push({ type: accountType, label: accountTypeLabel[accountType], rows });
    });
    return sections;
  }, [visibleCategoryTree]);

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
  const recurringPostingAccounts = useMemo(
    () => allPostingAccounts.filter((account) => account.account_type),
    [allPostingAccounts]
  );

  const loadAccounts = async () => {
    const response = await getAccountingCategories();
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

  const loadClassificationRules = async () => {
    const rulesRes = await getClassificationRules();
    setClassificationRules(parseList(rulesRes.data));
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
       await loadClassificationRules();
       setPeriods(parseList(pRes.data));
       await refreshRecurringTemplates();
    } catch (err) {
      setError("Unable to load accounting dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const loadLedger = async (accountId, filters = selectedAccountFilters) => {
    if (!accountId) return;
    const response = await getAccountingCategoryLedger(accountId, clean(filters));
    if (response?.data?.entries) {
      setSelectedAccountLedger(parseList(response.data.entries));
    } else {
      setSelectedAccountLedger(parseList(response.data));
    }
  };

  const refreshRecurringTemplates = async () => {
    const response = await getRecurringTransactions();
    setRecurringTemplates(parseList(response.data));
  };

  const openRecurringManager = async () => {
    setRecurringMessage("");
    setRecurringFormError("");
    setShowRecurringForm(false);
    setShowRecurringDeleteDialog(false);
    setRecurringDeleteId("");
    setRecurringDeleteName("");
    setEditingRecurringId("");
    setShowRecurringManager(true);
    setRecurringForm(recurringFormInitial);
    await refreshRecurringTemplates();
  };

  const closeRecurringManager = () => {
    setShowRecurringManager(false);
    setShowRecurringForm(false);
    setShowRecurringDeleteDialog(false);
    setRecurringDeleteId("");
    setRecurringDeleteName("");
    setEditingRecurringId("");
    setRecurringForm(recurringFormInitial);
    setRecurringFormError("");
  };

  const openRecurringCreateForm = () => {
    setRecurringForm(recurringFormInitial);
    setEditingRecurringId("");
    setRecurringFormError("");
    setRecurringMessage("");
    setShowRecurringForm(true);
  };

  const openRecurringEditForm = (template) => {
    if (!template) return;
    setEditingRecurringId(String(template.id));
    setRecurringForm({
      name: template.name || template.description || "",
      description: template.description || template.name || "",
      frequency: template.frequency || "monthly",
      amount: String(template.amount || ""),
      debit_account: String(template.debit_account?.id || template.debit_account || ""),
      credit_account: String(template.credit_account?.id || template.credit_account || ""),
      property: String(template.property?.id || template.property || ""),
      start_date: recurringDateValue(template.start_date),
      end_date: recurringDateValue(template.end_date),
      next_run_date: recurringDateValue(template.next_run_date || template.start_date),
      is_active: template.is_active !== false,
    });
    setRecurringFormError("");
    setRecurringMessage("");
    setShowRecurringForm(true);
  };

  const closeRecurringForm = () => {
    setShowRecurringForm(false);
    setEditingRecurringId("");
    setRecurringForm(recurringFormInitial);
    setRecurringFormError("");
  };

  const saveRecurringTransaction = async () => {
    setRecurringLoading(true);
    setRecurringFormError("");
    setRecurringMessage("");
    const amountValue = parseNumber(recurringForm.amount);
    if (!(recurringForm.name || "").trim()) {
      setRecurringFormError("Name is required.");
      setRecurringLoading(false);
      return;
    }
    if (!recurringForm.frequency) {
      setRecurringFormError("Frequency is required.");
      setRecurringLoading(false);
      return;
    }
    if (!amountValue || amountValue <= 0) {
      setRecurringFormError("Amount must be greater than 0.");
      setRecurringLoading(false);
      return;
    }
    if (!recurringForm.debit_account) {
      setRecurringFormError("Debit account is required.");
      setRecurringLoading(false);
      return;
    }
    if (!recurringForm.credit_account) {
      setRecurringFormError("Credit account is required.");
      setRecurringLoading(false);
      return;
    }
    if (recurringForm.debit_account === recurringForm.credit_account) {
      setRecurringFormError("Debit and credit accounts must be different.");
      setRecurringLoading(false);
      return;
    }
    if (!recurringForm.start_date) {
      setRecurringFormError("Start date is required.");
      setRecurringLoading(false);
      return;
    }

    const payload = {
      name: (recurringForm.name || "").trim(),
      description: (recurringForm.description || "").trim(),
      frequency: recurringForm.frequency,
      amount: amountValue,
      debit_account: Number(recurringForm.debit_account),
      credit_account: Number(recurringForm.credit_account),
      property: recurringForm.property || null,
      start_date: recurringForm.start_date,
      end_date: recurringForm.end_date || null,
      next_run_date: recurringForm.next_run_date || recurringForm.start_date,
      is_active: Boolean(recurringForm.is_active),
    };

    try {
      if (editingRecurringId) {
        await updateRecurringTransaction(editingRecurringId, payload);
      } else {
        await createRecurringTransaction(payload);
      }
      await refreshRecurringTemplates();
      setRecurringMessage(
        editingRecurringId
          ? "Recurring transaction updated."
          : "Recurring transaction created."
      );
      setShowRecurringForm(false);
      setEditingRecurringId("");
      setRecurringForm(recurringFormInitial);
    } catch {
      setRecurringFormError("Unable to save recurring transaction.");
    } finally {
      setRecurringLoading(false);
    }
  };

  const runRecurringNow = async (template) => {
    if (!template?.id) return;
    setRecurringLoading(true);
    setRecurringMessage("");
    setRecurringFormError("");
    try {
      await runRecurringTransaction(template.id);
      await refreshRecurringTemplates();
      await loadTransactions();
      setRecurringMessage("Recurring transaction run and posted.");
    } catch {
      setRecurringMessage("Unable to run recurring transaction.");
    } finally {
      setRecurringLoading(false);
    }
  };

  const runAllDueRecurring = async () => {
    setRecurringLoading(true);
    setRecurringMessage("");
    setRecurringFormError("");
    try {
      const response = await runAllRecurring();
      const created = parseNumber(
        response?.data?.count ??
          response?.data?.created ??
          response?.data?.entries_created ??
          response?.data?.processed ??
          0
      );
      await refreshRecurringTemplates();
      await loadTransactions();
      setRecurringMessage(`${created} recurring entr${created === 1 ? "y" : "ies"} created.`);
    } catch {
      setRecurringMessage("Unable to run all recurring transactions.");
    } finally {
      setRecurringLoading(false);
    }
  };

  const toggleRecurringActive = async (template) => {
    if (!template?.id) return;
    setRecurringLoading(true);
    setRecurringMessage("");
    setRecurringFormError("");
    try {
      await updateRecurringTransaction(template.id, { is_active: template.is_active === false });
      await refreshRecurringTemplates();
      setRecurringMessage(
        template.is_active ? "Recurring transaction paused." : "Recurring transaction resumed."
      );
    } catch {
      setRecurringMessage("Unable to update recurring transaction.");
    } finally {
      setRecurringLoading(false);
    }
  };

  const openRecurringDeleteConfirm = (template) => {
    if (!template?.id) return;
    setRecurringDeleteId(String(template.id));
    setRecurringDeleteName(template.name || template.description || "this recurring transaction");
    setShowRecurringDeleteDialog(true);
  };

  const closeRecurringDeleteConfirm = () => {
    setShowRecurringDeleteDialog(false);
    setRecurringDeleteId("");
    setRecurringDeleteName("");
  };

  const confirmDeleteRecurring = async () => {
    if (!recurringDeleteId) return;
    setRecurringLoading(true);
    setRecurringMessage("");
    try {
      await deleteRecurringTransaction(recurringDeleteId);
      await refreshRecurringTemplates();
      setRecurringMessage("Recurring transaction deleted.");
      closeRecurringDeleteConfirm();
    } catch {
      setRecurringMessage("Unable to delete recurring transaction.");
    } finally {
      setRecurringLoading(false);
    }
  };

  const loadReconciliation = async (id) => {
    if (!id) return null;
    const response = await getReconciliation(id);
    const payload = response.data || null;
    setActiveReconciliation(payload);
    return payload;
  };

  const openReconcileStart = () => {
    const defaults = reconciliationAccounts;
    const defaultAccount = defaults.find((account) => account.account_code === "1020") || defaults[0] || {};
    setReconciliationForm({
      account_id: String(defaultAccount.id || ""),
      start_date: bounds.start,
      end_date: bounds.end,
      statement_ending_balance: "0",
    });
    setReconciliationError("");
    setShowReconcileStart(true);
  };

  const closeReconcileStart = () => {
    setShowReconcileStart(false);
    setReconciliationError("");
    setReconciliationForm((prev) => ({
      ...prev,
      start_date: prev.start_date || bounds.start,
      end_date: prev.end_date || bounds.end,
    }));
  };

  const closeReconciliationWorkspace = () => {
    setShowReconciliationWorkspace(false);
    setActiveReconciliation(null);
    setReconBankSelection([]);
    setReconBookSelection([]);
  };

  const startReconciliation = async () => {
    setReconciliationLoading(true);
    setReconciliationError("");
    try {
      const account = parseNumber(reconciliationForm.account_id);
      if (!account) {
        setReconciliationError("Select an asset account.");
        return;
      }
      const response = await createReconciliation({
        account,
        start_date: reconciliationForm.start_date,
        end_date: reconciliationForm.end_date,
        statement_ending_balance: parseNumber(reconciliationForm.statement_ending_balance),
      });
      const payload = response.data || null;
      if (payload?.id) {
        await loadReconciliation(payload.id);
        setReconBankSelection([]);
        setReconBookSelection([]);
        setShowReconcileStart(false);
        setShowReconciliationWorkspace(true);
      } else {
        setReconciliationError("Unable to start reconciliation.");
      }
    } catch {
      setReconciliationError("Unable to start reconciliation.");
    } finally {
      setReconciliationLoading(false);
    }
  };

  const reloadActiveReconciliation = async () => {
    if (!activeReconciliation?.id) return;
    await loadReconciliation(activeReconciliation.id);
  };

  const toggleReconBankSelection = (id) => {
    const value = String(id);
    setReconBankSelection([value]);
  };

  const toggleReconBookSelection = (id) => {
    const value = String(id);
    setReconBookSelection([value]);
  };

  const handleReconcileMatch = async () => {
    if (!activeReconciliation?.id) return;
    const importedTransactionId = reconBankSelection[0];
    const journalEntryLineId = reconBookSelection[0];
    if (!importedTransactionId || !journalEntryLineId) return;
    setReconciliationLoading(true);
    setReconciliationError("");
    try {
      await addReconciliationMatch(activeReconciliation.id, {
        imported_transaction_id: Number(importedTransactionId),
        journal_entry_line_id: Number(journalEntryLineId),
      });
      setReconBankSelection([]);
      setReconBookSelection([]);
      await reloadActiveReconciliation();
    } catch {
      setReconciliationError("Unable to match transactions.");
    } finally {
      setReconciliationLoading(false);
    }
  };

  const handleReconcileExclude = async () => {
    if (!activeReconciliation?.id) return;
    const importedTransactionId = reconBankSelection[0];
    if (!importedTransactionId) return;
    if (reconMatchByBank[String(importedTransactionId)]) return;
    setReconciliationLoading(true);
    setReconciliationError("");
    try {
      await excludeReconciliationItem(activeReconciliation.id, {
        imported_transaction_id: Number(importedTransactionId),
      });
      setReconBankSelection([]);
      await reloadActiveReconciliation();
    } catch {
      setReconciliationError("Unable to exclude bank row.");
    } finally {
      setReconciliationLoading(false);
    }
  };

  const handleReconcileUnmatch = async (matchId) => {
    if (!activeReconciliation?.id || !matchId) return;
    setReconciliationLoading(true);
    setReconciliationError("");
    try {
      await removeReconciliationMatch(activeReconciliation.id, { match_id: Number(matchId) });
      await reloadActiveReconciliation();
    } catch {
      setReconciliationError("Unable to remove match.");
    } finally {
      setReconciliationLoading(false);
    }
  };

  const handleReconcileComplete = async () => {
    if (!activeReconciliation?.id) return;
    if (!reconciliationSummary.isBalanced) return;
    setReconciliationLoading(true);
    setReconciliationError("");
    try {
      await completeReconciliation(activeReconciliation.id);
      await reloadActiveReconciliation();
    } catch {
      setReconciliationError("Reconciliation could not be completed.");
    } finally {
      setReconciliationLoading(false);
    }
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

  const resetImportFlow = () => {
    setImportUploadFile(null);
    setImportStep(0);
    setImportDetectedHeaders([]);
    setActiveImport(null);
    setImportRows([]);
    setImportMapping({
      date_column: "",
      description_column: "",
      amount_column: "",
      reference_column: "",
    });
    setImportSummary({ created: 0, skipped: 0, duplicates: 0, auto_classified: 0, auto_classified_ids: [] });
    setImportSelectedRows([]);
    setImportBulkCategory("");
    setImportBookingSummary(null);
  };

  const startImportDialog = () => {
    resetImportFlow();
    setShowImportDialog(true);
  };

  const closeImportDialog = () => {
    setShowImportDialog(false);
    setImportLoading(false);
    setImportError("");
  };

  const setDefaultImportMapping = (headers = []) => {
    const mapping = detectImportMapping(headers);
    setImportMapping(mapping);
  };

  const loadCurrentImportRows = async (importRecord) => {
    const target = importRecord || activeImport;
    if (!target?.id) return [];
    const response = await getTransactionImport(target.id);
    const rows = parseList(response.data?.transactions || response.data);
    setImportRows(rows);
    if (response.data?.import) {
      setActiveImport(response.data.import);
    }
    return rows;
  };

  const openRuleManager = async () => {
    setRuleError("");
    setShowRuleManager(true);
    setRuleManagementLoading(true);
    try {
      await loadClassificationRules();
    } catch {
      setRuleError("Unable to load classification rules.");
    } finally {
      setRuleManagementLoading(false);
    }
  };

  const closeRuleManager = () => {
    setShowRuleManager(false);
  };

  const resetRuleForm = () => {
    setEditingRuleId("");
    setRuleForm(classificationRuleInitial);
    setRulePrefillMode("");
    setRuleError("");
  };

  const openRuleFormForCreate = (prefill = {}) => {
    setRuleError("");
    setShowRuleForm(true);
    setEditingRuleId("");
    setRuleForm({
      ...classificationRuleInitial,
      ...prefill,
      property_link: prefill.property_link || "",
      category: prefill.category || "",
      priority: prefill.priority ?? 0,
      is_active: prefill.is_active ?? true,
    });
  };

  const openRuleFormForEdit = (rule) => {
    if (!rule) return;
    setRuleError("");
    setEditingRuleId(String(rule.id));
    setRuleForm({
      match_field: rule.match_field || "description",
      match_type: rule.match_type || "contains",
      match_value: rule.match_value || "",
      category: String(rule.category?.id || rule.category || ""),
      property_link: String(rule.property_link?.id || rule.property_link || ""),
      priority: rule.priority ?? 0,
      is_active: rule.is_active !== false,
    });
    setShowRuleForm(true);
  };

  const closeRuleForm = () => {
    setShowRuleForm(false);
    resetRuleForm();
  };

  const createRuleFromRow = (row) => {
    openRuleFormForCreate({
      match_field: "description",
      match_type: "contains",
      match_value: String(row?.description || "").trim(),
      category: String(row?.category || ""),
      property_link: String(row?.property_link || ""),
      priority: 0,
    });
  };

  const saveRule = async () => {
    setRuleLoading(true);
    setRuleError("");
    try {
      const payload = {
        match_field: ruleForm.match_field,
        match_type: ruleForm.match_type,
        match_value: (ruleForm.match_value || "").trim(),
        category: ruleForm.category || null,
        property_link: ruleForm.property_link || null,
        priority: Number(ruleForm.priority || 0),
        is_active: Boolean(ruleForm.is_active),
      };
      if (!payload.match_value) {
        setRuleError("Match value is required.");
        setRuleLoading(false);
        return;
      }
      if (!payload.category) {
        setRuleError("Category is required.");
        setRuleLoading(false);
        return;
      }

      if (editingRuleId) {
        await updateClassificationRule(editingRuleId, payload);
      } else {
        await createClassificationRule(payload);
      }
      await loadClassificationRules();
      setShowRuleForm(false);
      resetRuleForm();
    } catch {
      setRuleError("Unable to save rule.");
    } finally {
      setRuleLoading(false);
    }
  };

  const removeRule = async (id) => {
    setRuleManagementLoading(true);
    setRuleError("");
    try {
      await deleteClassificationRule(id);
      await loadClassificationRules();
    } catch {
      setRuleError("Unable to delete rule.");
    } finally {
      setRuleManagementLoading(false);
    }
  };

  const handleUploadImport = async () => {
    if (!importUploadFile) return;
    setImportLoading(true);
    setImportError("");
    try {
      const formData = new FormData();
      formData.append("file", importUploadFile);
      const response = await createTransactionImport(formData);
      const createdImport = response.data?.import || response.data;
      const headers = parseList(response.data?.detected_headers || createdImport?.column_mapping?.headers || []);
      setActiveImport(createdImport);
      setImportDetectedHeaders(headers);
      setDefaultImportMapping(headers);
      setImportSummary({ created: 0, skipped: 0, duplicates: 0, auto_classified: 0, auto_classified_ids: [] });
      setImportRows([]);
      setImportSelectedRows([]);
      setImportStep(1);
    } catch {
      setImportError("Unable to upload CSV.");
      setError("Unable to upload CSV.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImportMapping = async () => {
    if (!activeImport?.id) return;
    if (!importMapping.date_column || !importMapping.description_column || !importMapping.amount_column) {
      setImportError("Please map date, description, and amount columns.");
      return;
    }
    setImportLoading(true);
    setImportError("");
    try {
      const response = await confirmImportMapping(activeImport.id, {
        date_column: importMapping.date_column,
        description_column: importMapping.description_column,
        amount_column: importMapping.amount_column,
        reference_column: importMapping.reference_column || "",
      });
      if (response.data?.import) {
        setActiveImport(response.data.import);
      }
      const rows = await loadCurrentImportRows(response.data?.import || activeImport);
      setImportRows(rows);
      const parsedCount = parseNumber(
        response.data?.parsed !== undefined ? response.data.parsed : response.data?.created
      );
      setImportSummary({
        created: parsedCount,
        skipped: parseNumber(response.data?.skipped),
        duplicates: parseNumber(response.data?.duplicates),
        auto_classified: parseNumber(response.data?.auto_classified),
        auto_classified_ids: parseList(response.data?.auto_classified_ids).map((id) => String(id)),
      });
      setImportStep(2);
    } catch {
      setImportError("Unable to map columns.");
      setError("Unable to map columns.");
    } finally {
      setImportLoading(false);
    }
  };

  const updateImportRow = async (rowId, payload) => {
    const response = await updateImportedTransaction(rowId, payload);
    const updated = response.data || {};
    setImportRows((previous) => previous.map((row) => (row.id === rowId ? { ...row, ...updated } : row)));
    return response.data || {};
  };

  const setImportRowCategory = async (rowId, categoryId) => {
    await updateImportRow(rowId, { category: categoryId || null });
  };

  const setImportRowProperty = async (rowId, propertyId) => {
    await updateImportRow(rowId, { property_link: propertyId || null });
  };

  const setImportRowStatus = async (rowId, status) => {
    await updateImportRow(rowId, { status });
    await loadCurrentImportRows();
  };

  const toggleImportRowSelection = (rowId) => {
    const nextId = String(rowId);
    setImportSelectedRows((prev) =>
      prev.includes(nextId) ? prev.filter((value) => value !== nextId) : [...prev, nextId]
    );
  };

  const toggleAllImportRows = () => {
    const selectable = parseList(importRows).map((row) => String(row.id));
    const allSelected = selectable.length > 0 && selectable.every((id) => importSelectedRows.includes(id));
    if (allSelected) {
      setImportSelectedRows([]);
      return;
    }
    setImportSelectedRows(selectable);
  };

  const handleBulkApprove = async () => {
    if (!activeImport?.id || importSelectedRows.length === 0) return;
    setImportLoading(true);
    setImportError("");
    try {
      await bulkApproveTransactions({
        ids: importSelectedRows,
        category: importBulkCategory || undefined,
      });
      await loadCurrentImportRows();
      setImportSelectedRows([]);
    } catch {
      setImportError("Unable to bulk approve rows.");
      setError("Unable to bulk approve rows.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleBookImport = async () => {
    if (!activeImport?.id) return;
    setImportLoading(true);
    setImportError("");
    try {
      const response = await bookImport(activeImport.id);
      setImportBookingSummary(response.data || null);
      await loadCurrentImportRows();
      await loadTransactions();
      await loadDashboardData();
    } catch {
      setImportError("Unable to book import.");
      setError("Unable to book import.");
    } finally {
      setImportLoading(false);
    }
  };

  const closeCoaMenu = () => {
    setCoaMenuAnchor(null);
    setCoaMenuAccount(null);
  };

  const openCoaMenu = (event, account) => {
    event.stopPropagation();
    setCoaMenuAnchor(event.currentTarget);
    setCoaMenuAccount(account);
  };

  const saveAccount = async () => {
    const payload = {
      account_code: addAccountForm.account_code,
      name: addAccountForm.name,
      account_type: addAccountForm.account_type,
      normal_balance: addAccountForm.normal_balance,
      parent_account: addAccountForm.parent_account || null,
      category_type: addAccountForm.account_type === "revenue" ? "income" : "expense",
      is_header: addAccountForm.is_header,
      description: addAccountForm.description || "",
    };
    if (editingAccountId) {
      await updateAccountingCategory(editingAccountId, payload);
    } else {
      await createAccountingCategory({
        ...payload,
        is_active: true,
      });
    }
    closeAccountDialog();
    await loadAccounts();
  };

  const closeAccountDialog = () => {
    setShowAccount(false);
    setAddAccountForm(addAccountInitial);
    setEditingAccountId("");
  };

  const startEditAccount = (account) => {
    setEditingAccountId(account ? String(account.id) : "");
    setAddAccountForm({
      account_code: account.account_code || "",
      name: account.name || "",
      account_type: account.account_type || "expense",
      normal_balance: account.normal_balance || "debit",
      parent_account: account.parent || account.parent_account || "",
      is_header: !!account.is_header,
      description: account.description || "",
    });
    setShowAccount(true);
  };

  const toggleAccountActive = async (account) => {
    if (!account) return;
    await updateAccountingCategory(account.id, { is_active: account.is_active === false });
    await loadAccounts();
  };

  const deleteSelectedAccount = async () => {
    if (!coaMenuAccount) return;
    await deleteAccountingCategory(coaMenuAccount.id);
    closeCoaMenu();
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

  const renderAccountRows = (nodes, depth = 0) => {
    return nodes.flatMap((account) => {
      const children = Array.isArray(account.children) ? account.children : [];
      const hasChildren = children.length > 0;
      const isExpanded = expandedNodes[account.id] ?? hasChildren;
      const rowBalance = parseNumber(account.balance ?? accountBalanceById[String(account.id)]);
      const accountCode = account.account_code || account.code || "";
      const isHeader = account.is_header === true;
    const rowStyle = isHeader
      ? { fontWeight: 700, fontSize: "0.95rem" }
      : {};
    const isInactive = account.is_active === false;
    const balanceIsZero = rowBalance === 0;
    const balanceColor = rowBalance < 0 ? "error.main" : "text.primary";
    const row = (
      <TableRow
          key={account.id}
          hover
        sx={{
          "& td": { fontSize: 12, fontFamily: "monospace" },
          "& .coa-row-menu": { opacity: 0, visibility: "hidden" },
          "&:hover .coa-row-menu": { opacity: 1, visibility: "visible" },
          bgcolor: isHeader ? "rgba(124,92,252,0.08)" : "transparent",
          cursor: isHeader && hasChildren ? "pointer" : "pointer",
          fontStyle: isInactive ? "italic" : "normal",
          opacity: isInactive && !showInactiveAccounts ? 0.5 : 1,
          color: isInactive && showInactiveAccounts ? "text.secondary" : undefined,
        }}
        onClick={() => {
          if (isHeader) {
            if (hasChildren) {
              toggleNode(account.id);
            }
            return;
          }
          if (!isHeader) setSelectedAccount(account.id);
        }}
      >
          <TableCell sx={{ pl: 2 + depth * 3, display: { xs: "none", md: "table-cell" } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {hasChildren ? (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNode(account.id);
                  }}
                  className="coa-row-menu"
                >
                  {isExpanded ? <ExpandMore /> : <ChevronRight />}
                </IconButton>
              ) : (
                <Box sx={{ width: 32 }} />
              )}
              <Typography sx={rowStyle}>{accountCode || ""}</Typography>
            </Box>
          </TableCell>
          <TableCell sx={{ pl: `${16 + depth * 24}px` }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
              <Typography sx={rowStyle}>
                {`${accountCode ? `${accountCode} · ` : ""}${account.name || ""}`}
              </Typography>
              <IconButton
                size="small"
                className="coa-row-menu"
                onClick={(e) => openCoaMenu(e, account)}
                sx={{ ml: 1 }}
              >
                <MoreVert fontSize="small" />
              </IconButton>
            </Box>
          </TableCell>
          <TableCell>
            <Chip
              label={account.account_type || "expense"}
              size="small"
              sx={{ textTransform: "uppercase", fontSize: 11 }}
            />
          </TableCell>
          <TableCell align="right" sx={{ fontFamily: "monospace" }}>
            {isHeader ? "" : (
              <Typography
                sx={{
                  color: balanceIsZero ? "text.secondary" : balanceColor,
                  fontStyle: isInactive ? "italic" : "normal",
                  fontFamily: "monospace",
                }}
              >
                {balanceIsZero ? "$0.00" : money(rowBalance)}
              </Typography>
            )}
          </TableCell>
        </TableRow>
      );
      const nextRows = hasChildren && isExpanded ? renderAccountRows(children, depth + 1) : [];
      return [row, ...nextRows];
    });
  };

  const renderReconAmount = (value) => {
    const normalized = parseNumber(value);
    return (
      <Typography
        variant="body2"
        sx={{
          color: normalized < 0 ? "error.main" : normalized > 0 ? "success.main" : "text.secondary",
          fontFamily: "monospace",
          fontSize: 13,
        }}
      >
        {formatMoneyWithSign(normalized)}
      </Typography>
    );
  };
  const reconciliationBankRowsCount = reconciliationBankRows.length;
  const reconciliationBookRowsCount = reconciliationBookRows.length;
  const reconciliationHasData = Boolean(activeReconciliation);
  const canMatchSelection = reconBankSelection.length === 1 && reconBookSelection.length === 1;
  const canExcludeSelection = reconBankSelection.length === 1 && !reconMatchByBank[String(reconBankSelection[0])];

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
                  <RechartsTooltip contentStyle={{ backgroundColor: theme.palette.background.paper }} />
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
                    primary={`${entry.entry_date || entry.date} - ${entry.memo || "-"}`}
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
              <Button size="small" variant="outlined" onClick={startImportDialog}>
                Import
              </Button>
              <Button size="small" variant="outlined" color="info" onClick={openRuleManager}>
                Manage Rules
              </Button>
              <Button size="small" variant="outlined" color="success" onClick={openRecurringManager}>
                Recurring
              </Button>
              <Button size="small" variant="outlined" sx={{ borderColor: "success.main", color: "success.main" }} onClick={openReconcileStart}>
                Reconcile
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
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography sx={{ fontWeight: 700 }}>Chart of Accounts</Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={showInactiveAccounts}
                    onChange={(e) => setShowInactiveAccounts(e.target.checked)}
                  />
                }
                label="Show inactive accounts"
              />
              <Button
                variant="contained"
                sx={{ bgcolor: accent }}
                onClick={() => {
                  setEditingAccountId("");
                  setAddAccountForm(addAccountInitial);
                  setShowAccount(true);
                }}
                startIcon={<Add />}
              >
                Add Account
              </Button>
              {selectedAccountId ? (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSelectedAccountId("");
                    setSelectedAccountLedger([]);
                  }}
                >
                  Back to Tree
                </Button>
              ) : null}
            </Box>
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
                    <TableCell sx={{ ...headerCellStyle, display: { xs: "none", md: "table-cell" } }}>Code</TableCell>
                    <TableCell sx={headerCellStyle}>Account</TableCell>
                    <TableCell sx={headerCellStyle}>Type</TableCell>
                    <TableCell sx={headerCellStyle} align="right">Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orderedVisibleAccountTypeSections.every((section) => section.rows.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ textAlign: "center", py: 2, color: "text.secondary" }}>
                        No accounts yet. Click &quot;Add Account&quot; to get started, or accounts will be seeded automatically.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {orderedVisibleAccountTypeSections.flatMap((section, sectionIndex) => {
                    if (!section.rows.length) return [];
                    const rows = renderAccountRows(section.rows);
                    if (!rows.length) return [];
                    const sectionHeader = (
                      <TableRow key={`${section.type}-header`}>
                        <TableCell
                          colSpan={4}
                          sx={{
                            borderBottom: "2px solid rgba(255,255,255,0.12)",
                            py: 0.5,
                            px: 0.8,
                            fontWeight: 700,
                            color: "text.secondary",
                            fontSize: 12,
                            backgroundColor: sectionIndex > 0 ? "rgba(124,92,252,0.05)" : "transparent",
                          }}
                        >
                          {accountTypeLabel[section.type]}
                        </TableCell>
                      </TableRow>
                    );
                    return [sectionHeader, ...rows];
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          <Menu anchorEl={coaMenuAnchor} open={Boolean(coaMenuAnchor)} onClose={closeCoaMenu}>
            <MenuItem
              onClick={() => {
                if (coaMenuAccount) {
                  startEditAccount(coaMenuAccount);
                }
                closeCoaMenu();
              }}
            >
              Edit
            </MenuItem>
            <MenuItem
              onClick={async () => {
                if (!coaMenuAccount) return;
                await toggleAccountActive(coaMenuAccount);
                closeCoaMenu();
              }}
            >
              {coaMenuAccount?.is_active === false ? "Activate" : "Deactivate"}
            </MenuItem>
            <MenuItem
              disabled={
                !coaMenuAccount ||
                parseNumber(coaMenuAccount?.children_count) > 0 ||
                parseNumber(coaMenuAccount?.journal_lines_count) > 0
              }
              onClick={async () => {
                await deleteSelectedAccount();
              }}
            >
              Delete
            </MenuItem>
          </Menu>
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
                      <RechartsTooltip />
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
                      <TableCell>{row.unit_number || row.unit_name || row.unit || row.unit?.unit_number || "-"}</TableCell>
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

      <Dialog open={showReconcileStart} onClose={closeReconcileStart} fullWidth maxWidth="sm">
        <DialogTitle>Start Reconciliation</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1, pt: 1 }}>
          {reconciliationError ? <Alert severity="error">{reconciliationError}</Alert> : null}
          <FormControl fullWidth size="small">
            <InputLabel>Bank Account</InputLabel>
            <Select
              value={reconciliationForm.account_id}
              label="Bank Account"
              onChange={(e) =>
                setReconciliationForm((prev) => ({ ...prev, account_id: e.target.value }))
              }
            >
              {reconciliationAccounts.map((account) => (
                <MenuItem key={account.id} value={String(account.id)}>
                  {account.account_code ? `${account.account_code} · ` : ""}
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            type="date"
            label="Start Date"
            value={reconciliationForm.start_date}
            onChange={(e) =>
              setReconciliationForm((prev) => ({ ...prev, start_date: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            type="date"
            label="End Date"
            value={reconciliationForm.end_date}
            onChange={(e) => setReconciliationForm((prev) => ({ ...prev, end_date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            type="number"
            label="Statement Ending Balance"
            value={reconciliationForm.statement_ending_balance}
            onChange={(e) =>
              setReconciliationForm((prev) => ({ ...prev, statement_ending_balance: e.target.value }))
            }
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReconcileStart}>Cancel</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: accent }}
            onClick={startReconciliation}
            disabled={reconciliationLoading}
          >
            {reconciliationLoading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
            Start Reconciliation
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showReconciliationWorkspace}
        onClose={closeReconciliationWorkspace}
        fullWidth
        maxWidth="xl"
        PaperProps={{ sx: { maxHeight: "94vh" } }}
      >
        <DialogTitle>Reconciliation Workspace</DialogTitle>
        <DialogContent dividers sx={{ display: "grid", gap: 1.5 }}>
          {reconciliationError ? <Alert severity="error">{reconciliationError}</Alert> : null}
          {!reconciliationHasData ? (
            <Alert severity="info">No reconciliation loaded.</Alert>
          ) : null}
          {reconciliationHasData ? (
            <>
              <Paper variant="outlined" sx={{ p: 1.2, display: "grid", gap: 0.8 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Statement Balance: {money(reconciliationSummary.statementBalance)} | Book Balance:{" "}
                  {money(reconciliationSummary.bookBalance)}
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: reconciliationSummary.isBalanced ? "success.main" : "error.main",
                    fontFamily: "monospace",
                  }}
                >
                  Difference: {formatMoneyWithSign(reconciliationSummary.difference)}
                </Typography>
                <Typography variant="body2">
                  Matched: {reconciliationSummary.matchedCount} | Bank Unmatched:{" "}
                  {reconciliationSummary.unmatchedBankCount} | Book Unmatched:{" "}
                  {reconciliationSummary.unmatchedBookCount}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                  <Button
                    size="small"
                    variant="contained"
                    sx={{ bgcolor: accent }}
                    onClick={reloadActiveReconciliation}
                    disabled={reconciliationLoading}
                  >
                    {reconciliationLoading ? <CircularProgress size={14} sx={{ mr: 1 }} /> : <Refresh fontSize="small" />}
                    Refresh
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    sx={{ bgcolor: reconciliationSummary.isBalanced ? "success.main" : "text.disabled" }}
                    color={reconciliationSummary.isBalanced ? "success" : "inherit"}
                    disabled={!reconciliationSummary.isBalanced || reconciliationLoading}
                    onClick={handleReconcileComplete}
                  >
                    {reconciliationLoading ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null}
                    Complete
                  </Button>
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ p: 1 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Matching Actions</Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button
                    size="small"
                    variant="contained"
                    sx={{ bgcolor: "success.main" }}
                    disabled={!canMatchSelection || reconciliationLoading}
                    onClick={handleReconcileMatch}
                  >
                    {reconciliationLoading ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null}
                    Match Selected
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    sx={{ bgcolor: "warning.main" }}
                    disabled={!canExcludeSelection || reconciliationLoading}
                    onClick={handleReconcileExclude}
                  >
                    {reconciliationLoading ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null}
                    Exclude
                  </Button>
                </Box>
              </Paper>

              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <Typography sx={{ mb: 1, fontWeight: 700 }}>
                      Bank Transactions ({reconciliationSummary.unmatchedBankCount} unmatched)
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={headerCellStyle}></TableCell>
                            <TableCell sx={headerCellStyle}>Date</TableCell>
                            <TableCell sx={headerCellStyle}>Description</TableCell>
                            <TableCell sx={headerCellStyle} align="right">
                              Amount
                            </TableCell>
                            <TableCell sx={headerCellStyle}>Status</TableCell>
                            <TableCell sx={headerCellStyle} align="right">
                              Actions
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reconciliationBankRowsCount === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} sx={{ textAlign: "center", color: "text.secondary" }}>
                                No bank rows in this reconciliation.
                              </TableCell>
                            </TableRow>
                          ) : null}
                          {reconciliationBankRows.map((row) => {
                            const rowId = String(row.id || row.imported_transaction || "");
                            const rowMatch = reconMatchByBank[rowId];
                            const isMatched = Boolean(rowMatch);
                            const isExcluded = rowMatch?.match_type === "excluded";
                            return (
                              <TableRow key={rowId} sx={{ opacity: isMatched ? 0.8 : 1 }}>
                                <TableCell>
                                  <Checkbox
                                    checked={reconBankSelection.includes(rowId)}
                                    disabled={isMatched}
                                    onChange={() => {
                                      if (isMatched) return;
                                      toggleReconBankSelection(rowId);
                                    }}
                                  />
                                  {isMatched ? <CheckCircle color="success" fontSize="small" sx={{ ml: 0.4 }} /> : null}
                                </TableCell>
                                <TableCell>{toDateStr(row.date || row.entry_date || row.transaction_date)}</TableCell>
                                <TableCell>{row.description || row.memo || "-"}</TableCell>
                                <TableCell align="right">{renderReconAmount(parseNumber(row.amount || 0))}</TableCell>
                                <TableCell>
                                  {isMatched ? (
                                    <Chip
                                      size="small"
                                      color={isExcluded ? "default" : "success"}
                                      label={isExcluded ? "Excluded" : "Matched"}
                                    />
                                  ) : (
                                    <Chip size="small" label="Unmatched" />
                                  )}
                                </TableCell>
                                <TableCell align="right">
                                  {isMatched ? (
                                    <Button
                                      size="small"
                                      onClick={() => handleReconcileUnmatch(rowMatch.id)}
                                      disabled={reconciliationLoading}
                                    >
                                      Unmatch
                                    </Button>
                                  ) : null}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <Typography sx={{ mb: 1, fontWeight: 700 }}>
                      Book Entries ({reconciliationSummary.unmatchedBookCount} unmatched)
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={headerCellStyle}></TableCell>
                            <TableCell sx={headerCellStyle}>Date</TableCell>
                            <TableCell sx={headerCellStyle}>Memo</TableCell>
                            <TableCell sx={headerCellStyle} align="right">
                              Amount
                            </TableCell>
                            <TableCell sx={headerCellStyle} align="right">
                              Actions
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reconciliationBookRowsCount === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} sx={{ textAlign: "center", color: "text.secondary" }}>
                                No book lines in this reconciliation.
                              </TableCell>
                            </TableRow>
                          ) : null}
                          {reconciliationBookRows.map((line) => {
                            const rowId = String(line.id || line.journal_entry_line || "");
                            const rowMatch = reconMatchByBookLine[rowId];
                            const isMatched = Boolean(rowMatch);
                            const amount = parseNumber(line.debit_amount) - parseNumber(line.credit_amount);
                            return (
                              <TableRow key={rowId} sx={{ opacity: isMatched ? 0.8 : 1 }}>
                                <TableCell>
                                  <Checkbox
                                    checked={reconBookSelection.includes(rowId)}
                                    disabled={isMatched}
                                    onChange={() => {
                                      if (isMatched) return;
                                      toggleReconBookSelection(rowId);
                                    }}
                                  />
                                  {isMatched ? <CheckCircle color="success" fontSize="small" sx={{ ml: 0.4 }} /> : null}
                                </TableCell>
                                <TableCell>{toDateStr(line.entry_date || line.date || line.transaction_date)}</TableCell>
                                <TableCell>{line.memo || line.description || line.journal_entry?.memo || "-"}</TableCell>
                                <TableCell align="right">{renderReconAmount(amount)}</TableCell>
                                <TableCell align="right">
                                  {isMatched ? (
                                    <Button
                                      size="small"
                                      onClick={() => handleReconcileUnmatch(rowMatch.id)}
                                      disabled={reconciliationLoading}
                                    >
                                      Unmatch
                                    </Button>
                                  ) : null}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              </Grid>
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReconciliationWorkspace}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showImportDialog} onClose={closeImportDialog} fullWidth maxWidth="md">
        <DialogTitle>Import Transactions</DialogTitle>
        <DialogContent dividers sx={{ display: "grid", gap: 1.4 }}>
          <Stepper activeStep={importStep} alternativeLabel>
            {importSteps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {importError ? <Alert severity="error">{importError}</Alert> : null}

          {importStep === 0 ? (
            <Box sx={{ display: "grid", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Upload a CSV bank statement to begin.
              </Typography>
              <Button component="label" variant="outlined" color="inherit">
                Choose CSV File
                <input
                  type="file"
                  accept=".csv,text/csv"
                  hidden
                  onChange={(e) => setImportUploadFile((e.target.files || [])[0] || null)}
                />
              </Button>
              {importUploadFile ? (
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                  {importUploadFile.name}
                </Typography>
              ) : null}
              <Button
                size="small"
                variant="contained"
                sx={{ bgcolor: accent }}
                disabled={!importUploadFile || importLoading}
                onClick={handleUploadImport}
              >
                {importLoading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                Upload &amp; Continue
              </Button>
            </Box>
          ) : null}

          {importStep === 1 ? (
            <Box sx={{ display: "grid", gap: 1 }}>
              <Alert severity="info">
                Detected columns: {importDetectedHeaders.length ? importDetectedHeaders.join(", ") : "No headers detected"}
              </Alert>
              <FormControl size="small">
                <InputLabel>Date column</InputLabel>
                <Select
                  value={importMapping.date_column}
                  label="Date column"
                  onChange={(e) => setImportMapping((prev) => ({ ...prev, date_column: e.target.value }))}
                >
                  <MenuItem value="">Select</MenuItem>
                  {importDetectedHeaders.map((header) => (
                    <MenuItem key={header} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel>Description column</InputLabel>
                <Select
                  value={importMapping.description_column}
                  label="Description column"
                  onChange={(e) => setImportMapping((prev) => ({ ...prev, description_column: e.target.value }))}
                >
                  <MenuItem value="">Select</MenuItem>
                  {importDetectedHeaders.map((header) => (
                    <MenuItem key={header} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel>Amount column</InputLabel>
                <Select
                  value={importMapping.amount_column}
                  label="Amount column"
                  onChange={(e) => setImportMapping((prev) => ({ ...prev, amount_column: e.target.value }))}
                >
                  <MenuItem value="">Select</MenuItem>
                  {importDetectedHeaders.map((header) => (
                    <MenuItem key={header} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel>Reference column</InputLabel>
                <Select
                  value={importMapping.reference_column}
                  label="Reference column"
                  onChange={(e) => setImportMapping((prev) => ({ ...prev, reference_column: e.target.value }))}
                >
                  <MenuItem value="">None</MenuItem>
                  {importDetectedHeaders.map((header) => (
                    <MenuItem key={header} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  onClick={() => setImportStep(0)}
                  disabled={importLoading}
                >
                  Back
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  sx={{ bgcolor: accent }}
                  disabled={
                    importLoading ||
                    !importMapping.date_column ||
                    !importMapping.description_column ||
                    !importMapping.amount_column
                  }
                  onClick={handleConfirmImportMapping}
                >
                  {importLoading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                  Confirm Mapping
                </Button>
              </Box>
            </Box>
          ) : null}

          {importStep === 2 ? (
            <Box sx={{ display: "grid", gap: 1 }}>
                <Alert severity="info">
                  Parsed {importSummary.created} rows, skipped {importSummary.skipped}, duplicates {importSummary.duplicates}
                  {importSummary.auto_classified ? `, auto-classified ${importSummary.auto_classified}` : ", auto-classified 0"}
                </Alert>
              {importBookingSummary ? (
                <Alert severity="success">
                  Booked {importBookingSummary.booked} rows for {formatSignedMoney(importBookingSummary.total || 0)}
                </Alert>
              ) : null}

              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Review and classify each row, then approve and post into journal entries.
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={
                        parseList(importRows).length > 0 &&
                        parseList(importRows).every((row) => importSelectedRows.includes(String(row.id)))
                      }
                      onChange={toggleAllImportRows}
                    />
                  }
                    label="Select all"
                />
                <FormControl size="small" sx={{ minWidth: 240 }}>
                  <InputLabel>Default category</InputLabel>
                  <Select
                    value={importBulkCategory}
                    label="Default category"
                    onChange={(e) => setImportBulkCategory(e.target.value)}
                  >
                    <MenuItem value="">No category</MenuItem>
                    {allPostingAccounts.map((account) => (
                      <MenuItem key={account.id} value={String(account.id)}>
                        {account.account_code ? `${account.account_code} ` : ""}
                        {account.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  size="small"
                  variant="contained"
                  sx={{ bgcolor: accent }}
                  disabled={importLoading || importSelectedRows.length === 0}
                  onClick={handleBulkApprove}
                >
                  {importLoading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                  Approve Selected
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  sx={{ bgcolor: "success.main" }}
                  disabled={importLoading || !parseList(importRows).some((row) => row.status === "approved")}
                  onClick={handleBookImport}
                >
                  {importLoading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                  Book All Approved
                </Button>
              </Box>
              {importRows.length === 0 ? (
                <Typography>No rows to review yet.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={headerCellStyle}>Select</TableCell>
                        <TableCell sx={headerCellStyle}>Date</TableCell>
                        <TableCell sx={headerCellStyle}>Description</TableCell>
                        <TableCell sx={headerCellStyle} align="right">
                          Amount
                        </TableCell>
                           <TableCell sx={headerCellStyle}>Category</TableCell>
                            <TableCell sx={headerCellStyle}>Property</TableCell>
                            <TableCell sx={headerCellStyle}>Status</TableCell>
                            <TableCell sx={headerCellStyle}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parseList(importRows).map((row) => (
                        <TableRow
                          key={row.id}
                          sx={row.is_duplicate ? { bgcolor: "rgba(250, 204, 21, 0.08)" } : undefined}
                        >
                          <TableCell>
                            <Checkbox
                              checked={importSelectedRows.includes(String(row.id))}
                              onChange={() => toggleImportRowSelection(row.id)}
                              disabled={row.status === "booked"}
                            />
                          </TableCell>
                          <TableCell>{toDateStr(row.date)}</TableCell>
                          <TableCell>{row.description || "-"}</TableCell>
                          <TableCell align="right" sx={{ color: parseNumber(row.amount) < 0 ? "error.main" : "success.main", fontFamily: "monospace" }}>
                            {formatSignedMoney(row.amount)}
                          </TableCell>
                          <TableCell>
                            <FormControl size="small" fullWidth>
                              <InputLabel>Category</InputLabel>
                              <Select
                                value={String(row.category || "")}
                                label="Category"
                                onChange={(e) => setImportRowCategory(row.id, e.target.value)}
                                disabled={row.status === "booked"}
                              >
                                <MenuItem value="">None</MenuItem>
                                {allPostingAccounts.map((account) => (
                                  <MenuItem key={account.id} value={String(account.id)}>
                                    {account.account_code ? `${account.account_code} ` : ""}
                                    {account.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            {autoClassifiedIds.has(String(row.id)) ? (
                              <Chip size="small" label="Auto" color="primary" variant="outlined" sx={{ mt: 0.5, fontSize: 11 }} />
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <FormControl size="small" fullWidth>
                              <InputLabel>Property</InputLabel>
                              <Select
                                value={String(row.property_link || "")}
                                label="Property"
                                onChange={(e) => setImportRowProperty(row.id, e.target.value)}
                                disabled={row.status === "booked"}
                              >
                                <MenuItem value="">None</MenuItem>
                                {properties.map((property) => (
                                  <MenuItem key={property.id} value={String(property.id)}>
                                    {property.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={row.status || "pending"}
                              color={
                                row.status === "booked"
                                  ? "success"
                                  : row.status === "approved"
                                    ? "info"
                                    : "default"
                              }
                              size="small"
                            />
                            {row.is_duplicate ? (
                              <Chip
                                size="small"
                                label="Possible duplicate"
                                color="warning"
                                sx={{ ml: 0.6, mt: 0.6 }}
                              />
                            ) : null}
                          </TableCell>
                            <TableCell>
                              <Tooltip title="Create Rule">
                                <IconButton size="small" onClick={() => createRuleFromRow(row)}>
                                  <Rule fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Button
                                size="small"
                                onClick={() => setImportRowStatus(row.id, "approved")}
                              disabled={row.status === "approved" || row.status === "booked"}
                            >
                              Approve
                            </Button>
                              <Button
                                size="small"
                                color="warning"
                                onClick={() => setImportRowStatus(row.id, "skipped")}
                              disabled={row.status === "booked"}
                            >
                              Skip
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeImportDialog}>Close</Button>
          {importStep === 2 ? (
            <Button onClick={() => setImportStep(1)} disabled={importLoading}>
              Back
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog open={showRuleManager} onClose={closeRuleManager} fullWidth maxWidth="lg">
        <DialogTitle>Classification Rules</DialogTitle>
        <DialogContent dividers sx={{ display: "grid", gap: 1.2 }}>
          {ruleError ? <Alert severity="error">{ruleError}</Alert> : null}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Create, update, and test classification rules for imported transactions.
            </Typography>
            <Button size="small" variant="contained" onClick={() => openRuleFormForCreate()} sx={{ bgcolor: accent }}>
              Add Rule
            </Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellStyle}>Match Field</TableCell>
                  <TableCell sx={headerCellStyle}>Match Type</TableCell>
                  <TableCell sx={headerCellStyle}>Pattern</TableCell>
                  <TableCell sx={headerCellStyle}>Category</TableCell>
                  <TableCell sx={headerCellStyle}>Property</TableCell>
                  <TableCell sx={headerCellStyle} align="right">
                    Priority
                  </TableCell>
                  <TableCell sx={headerCellStyle}>Active</TableCell>
                  <TableCell sx={headerCellStyle} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parseList(classificationRules).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ color: "text.secondary", textAlign: "center" }}>
                      No rules yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  parseList(classificationRules).map((rule) => (
                    <TableRow key={rule.id} hover>
                      <TableCell>{ruleMatchFieldLabel[rule.match_field] || rule.match_field}</TableCell>
                      <TableCell>{ruleMatchTypeLabel[rule.match_type] || rule.match_type}</TableCell>
                      <TableCell>{rule.match_value}</TableCell>
                      <TableCell>{rule.category_name || rule.category || "-"}</TableCell>
                      <TableCell>{rule.property_name || "-"}</TableCell>
                      <TableCell align="right">{rule.priority}</TableCell>
                      <TableCell>{rule.is_active ? "Active" : "Inactive"}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openRuleFormForEdit(rule)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => removeRule(rule.id)} disabled={ruleManagementLoading}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRuleManager}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showRuleForm} onClose={closeRuleForm} fullWidth maxWidth="sm">
        <DialogTitle>{editingRuleId ? "Edit Rule" : "Create Rule"}</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.2, mt: 0.5 }}>
          {ruleError ? <Alert severity="error">{ruleError}</Alert> : null}
          <FormControl size="small">
            <InputLabel>Match Field</InputLabel>
            <Select
              value={ruleForm.match_field}
              label="Match Field"
              onChange={(e) => setRuleForm((prev) => ({ ...prev, match_field: e.target.value }))}
            >
              <MenuItem value="description">Description</MenuItem>
              <MenuItem value="reference">Reference</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Match Type</InputLabel>
            <Select
              value={ruleForm.match_type}
              label="Match Type"
              onChange={(e) => setRuleForm((prev) => ({ ...prev, match_type: e.target.value }))}
            >
              <MenuItem value="contains">Contains</MenuItem>
              <MenuItem value="starts_with">Starts With</MenuItem>
              <MenuItem value="exact">Exact Match</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Pattern"
            size="small"
            value={ruleForm.match_value}
            onChange={(e) => setRuleForm((prev) => ({ ...prev, match_value: e.target.value }))}
          />
          <FormControl size="small">
            <InputLabel>Category</InputLabel>
            <Select
              value={ruleForm.category}
              label="Category"
              onChange={(e) => setRuleForm((prev) => ({ ...prev, category: e.target.value }))}
            >
              <MenuItem value="">Select category</MenuItem>
              {allPostingAccounts
                .filter((account) => account.account_type && !account.is_header)
                .map((account) => (
                  <MenuItem key={account.id} value={String(account.id)}>
                    {account.account_code ? `${account.account_code} ` : ""}
                    {account.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Property</InputLabel>
            <Select
              value={ruleForm.property_link}
              label="Property"
              onChange={(e) => setRuleForm((prev) => ({ ...prev, property_link: e.target.value }))}
            >
              <MenuItem value="">No property</MenuItem>
              {properties.map((property) => (
                <MenuItem key={property.id} value={String(property.id)}>
                  {property.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Priority"
            type="number"
            size="small"
            value={ruleForm.priority}
            onChange={(e) =>
              setRuleForm((prev) => ({ ...prev, priority: Number(e.target.value === "" ? 0 : e.target.value) }))
            }
          />
          <FormControlLabel
            control={
              <Switch checked={Boolean(ruleForm.is_active)} onChange={(e) => setRuleForm((prev) => ({ ...prev, is_active: e.target.checked }))} />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRuleForm}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: accent }} onClick={saveRule} disabled={ruleLoading}>
            {ruleLoading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showRecurringManager} onClose={closeRecurringManager} fullWidth maxWidth="lg">
        <DialogTitle>{showRecurringForm ? (editingRecurringId ? "Edit Recurring Transaction" : "Create Recurring Transaction") : "Recurring Transactions"}</DialogTitle>
        <DialogContent dividers sx={{ display: "grid", gap: 1.2 }}>
          {recurringMessage ? <Alert severity="success">{recurringMessage}</Alert> : null}
          {showRecurringForm ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Quick setup ideas:
              </Typography>
              <Box sx={{ display: "grid", gap: 0.5, mb: 0.5 }}>
                {recurringQuickPresets.map((preset) => (
                  <Typography key={preset.label} variant="body2" sx={{ color: "text.secondary" }}>
                    {`${preset.label}: ${preset.debit_account_name} → ${preset.credit_account_name}`}
                  </Typography>
                ))}
              </Box>
              {recurringFormError ? <Alert severity="error">{recurringFormError}</Alert> : null}
              <TextField
                label="Name"
                size="small"
                value={recurringForm.name}
                onChange={(e) => setRecurringForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <TextField
                label="Description"
                size="small"
                value={recurringForm.description}
                onChange={(e) => setRecurringForm((prev) => ({ ...prev, description: e.target.value }))}
              />
              <FormControl size="small">
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={recurringForm.frequency}
                  label="Frequency"
                  onChange={(e) => setRecurringForm((prev) => ({ ...prev, frequency: e.target.value }))}
                >
                  {Object.entries(recurringFrequencyLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Amount"
                size="small"
                type="number"
                value={recurringForm.amount}
                onChange={(e) => setRecurringForm((prev) => ({ ...prev, amount: e.target.value }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
              <FormControl size="small">
                <InputLabel>Debit Account</InputLabel>
                <Select
                  value={recurringForm.debit_account}
                  label="Debit Account"
                  onChange={(e) => setRecurringForm((prev) => ({ ...prev, debit_account: e.target.value }))}
                >
                  <MenuItem value="">Select account</MenuItem>
                  {recurringPostingAccounts.map((account) => (
                    <MenuItem key={account.id} value={String(account.id)}>
                      {formatAccountWithCode(account)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel>Credit Account</InputLabel>
                <Select
                  value={recurringForm.credit_account}
                  label="Credit Account"
                  onChange={(e) => setRecurringForm((prev) => ({ ...prev, credit_account: e.target.value }))}
                >
                  <MenuItem value="">Select account</MenuItem>
                  {recurringPostingAccounts.map((account) => (
                    <MenuItem key={account.id} value={String(account.id)}>
                      {formatAccountWithCode(account)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel>Property</InputLabel>
                <Select
                  value={recurringForm.property}
                  label="Property"
                  onChange={(e) => setRecurringForm((prev) => ({ ...prev, property: e.target.value }))}
                >
                  <MenuItem value="">None</MenuItem>
                  {properties.map((property) => (
                    <MenuItem key={property.id} value={String(property.id)}>
                      {property.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Start Date"
                type="date"
                size="small"
                value={recurringForm.start_date}
                onChange={(e) => setRecurringForm((prev) => ({ ...prev, start_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date"
                type="date"
                size="small"
                value={recurringForm.end_date}
                onChange={(e) => setRecurringForm((prev) => ({ ...prev, end_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Next Run Date"
                type="date"
                size="small"
                value={recurringForm.next_run_date}
                onChange={(e) => setRecurringForm((prev) => ({ ...prev, next_run_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(recurringForm.is_active)}
                    onChange={(e) => setRecurringForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Active"
              />
            </>
          ) : (
            <>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Monthly recurring entries for your organization.
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1, mt: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Common recurring transaction presets
                    </Typography>
                    <Box component="ul" sx={{ margin: 0, pl: 2, color: "text.secondary" }}>
                      {recurringQuickPresets.map((preset) => (
                        <li key={preset.label}>
                          <Typography variant="body2">
                            {preset.label} ({preset.frequency}): {preset.debit_account_name} → {preset.credit_account_name}
                          </Typography>
                        </li>
                      ))}
                    </Box>
                  </Paper>
                </Box>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <Button size="small" variant="outlined" onClick={runAllDueRecurring} disabled={recurringLoading}>
                    {recurringLoading ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null}
                    Run All Due
                  </Button>
                  <Button size="small" variant="contained" sx={{ bgcolor: accent }} onClick={openRecurringCreateForm} startIcon={<Add />}>
                    + New Recurring
                  </Button>
                </Box>
              </Box>

              <Paper variant="outlined" sx={{ overflowX: "auto" }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={headerCellStyle}>Name</TableCell>
                        <TableCell sx={headerCellStyle}>Frequency</TableCell>
                        <TableCell sx={headerCellStyle} align="right">
                          Amount
                        </TableCell>
                        <TableCell sx={headerCellStyle}>Debit Account</TableCell>
                        <TableCell sx={headerCellStyle}>Credit Account</TableCell>
                        <TableCell sx={headerCellStyle}>Next Run</TableCell>
                        <TableCell sx={headerCellStyle}>Status</TableCell>
                        <TableCell sx={headerCellStyle} align="right">
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parseList(recurringTemplates).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} sx={{ textAlign: "center", color: "text.secondary" }}>
                            No recurring transactions found.
                          </TableCell>
                        </TableRow>
                      ) : null}
                      {parseList(recurringTemplates).map((template) => {
                        const isDue = recurringIsDue(template.next_run_date, recurringToday);
                        const isOverdue = recurringIsOverdue(template.next_run_date, recurringToday);
                        return (
                          <TableRow key={template.id} hover>
                            <TableCell>{template.name || template.description || "-"}</TableCell>
                            <TableCell>{recurringFrequencyLabels[template.frequency] || template.frequency || "-"}</TableCell>
                            <TableCell align="right">{money(template.amount)}</TableCell>
                            <TableCell>{recurringAccountLabel(template.debit_account)}</TableCell>
                            <TableCell>{recurringAccountLabel(template.credit_account)}</TableCell>
                            <TableCell sx={{ color: isOverdue ? "error.main" : "text.primary", fontWeight: isOverdue ? 700 : 400 }}>
                              {template.next_run_date ? formatDisplayDate(template.next_run_date) : "-"}
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={template.is_active ? "Active" : "Paused"}
                                color={template.is_active ? "success" : "default"}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                onClick={() => runRecurringNow(template)}
                                disabled={!template.is_active || !isDue || recurringLoading}
                              >
                                Run Now
                              </Button>
                              <Button size="small" onClick={() => openRecurringEditForm(template)} disabled={recurringLoading}>
                                Edit
                              </Button>
                              <Button size="small" onClick={() => toggleRecurringActive(template)} disabled={recurringLoading}>
                                {template.is_active ? "Pause" : "Resume"}
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => openRecurringDeleteConfirm(template)}
                                disabled={recurringLoading}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}
        </DialogContent>
        <DialogActions>
          {showRecurringForm ? (
            <>
              <Button onClick={() => setShowRecurringForm(false)}>Back</Button>
              <Button variant="contained" sx={{ bgcolor: accent }} onClick={saveRecurringTransaction} disabled={recurringLoading}>
                {recurringLoading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                Save
              </Button>
            </>
          ) : (
            <Button onClick={closeRecurringManager}>Close</Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={showRecurringDeleteDialog} onClose={closeRecurringDeleteConfirm} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Recurring Transaction</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{recurringDeleteName}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRecurringDeleteConfirm}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDeleteRecurring}
            disabled={recurringLoading}
          >
            {recurringLoading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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

      <Dialog open={showAccount} onClose={closeAccountDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingAccountId ? "Edit Account" : "Add Account"}</DialogTitle>
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
          <Button onClick={closeAccountDialog}>Cancel</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: accent }}
            onClick={saveAccount}
            disabled={!addAccountForm.account_code || !addAccountForm.name}
          >
            {editingAccountId ? "Save Changes" : "Add Account"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Accounting;






