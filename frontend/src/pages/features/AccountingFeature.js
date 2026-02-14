import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import FeaturePageTemplate from "./FeaturePageTemplate";

const accountingFeature = {
  title: "Accounting & Bookkeeping",
  tagline: "Real double-entry bookkeeping built for property managers",
  icon: AccountBalanceIcon,
  benefits: [
    {
      title: "Full Chart of Accounts",
      description: "Build and maintain a structured chart of accounts for each property and entity in your portfolio.",
      Icon: AccountBalanceIcon,
    },
    {
      title: "Automated Journal Entries",
      description: "Capture lease, expense, and payment activity as auditable journal entries with minimal manual work.",
      Icon: CompareArrowsIcon,
    },
    {
      title: "Financial Reports",
      description: "Generate clear P&L and cash flow views and slice data by property, date, and report type.",
      Icon: AutoGraphIcon,
    },
  ],
  steps: [
    { number: 1, title: "Set Up Accounts", description: "Configure property-specific accounts and expense groupings once, then reuse across workflows." },
    { number: 2, title: "Record Transactions", description: "Post rent income, fee charges, expenses, and credits with clear debit/credit balance checks." },
    { number: 3, title: "Run Reports", description: "Create period reports to review performance trends, rent collection health, and expense patterns." },
    { number: 4, title: "Close Periods", description: "Finalize monthly ledgers, reconcile balances, and archive reporting snapshots." },
  ],
  highlights: [
    {
      title: "Chart of Accounts with Hierarchy",
      description:
        "Define parent and sub-account structures for easy filtering and reporting by class, property, or purpose.",
    },
    {
      title: "P&L / Balance Sheet / Trial Balance",
      description: "Switch between report types in one place to validate totals and monitor operational cash flow at a glance.",
    },
    {
      title: "CSV Bank Statement Import with Auto-Classification",
      description:
        "Upload bank statements and let auto-classification pre-assign lines to accounts before review.",
    },
  ],
};

export default function AccountingFeature() {
  return <FeaturePageTemplate feature={accountingFeature} />;
}
