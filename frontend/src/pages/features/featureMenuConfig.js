import {
  HomeWork,
  Description,
  Payment,
  VerifiedUser,
  Build,
  AccountBalance,
} from "@mui/icons-material";

const featureMenuConfig = [
  {
    title: "Listings & Marketing",
    description: "Publish listings, attract tenants, and fill vacancies faster",
    icon: HomeWork,
    route: "/features/listings",
    tagline: "Fill vacancies faster with professional listing pages",
    benefits: [
      {
        icon: "Link",
        title: "Auto-Generated Listing Pages",
        description:
          "Each vacant unit gets a professional, SEO-friendly public listing page with photos, details, and a direct application link — no manual website building needed.",
      },
      {
        icon: "Visibility",
        title: "Public Browse Page",
        description:
          "All your available units appear on a single searchable browse page tenants can filter by price, bedrooms, and location.",
      },
      {
        icon: "ToggleOn",
        title: "One-Click Publish",
        description:
          "Toggle any unit to listed or unlisted instantly. Listings go live immediately with auto-generated URLs and slugs.",
      },
    ],
    steps: [
      {
        title: "Mark Unit Available",
        description: "Toggle is_listed on any vacant unit to publish it instantly.",
      },
      {
        title: "Listing Goes Live",
        description: "A public page is auto-generated with photos, rent, and unit details.",
      },
      {
        title: "Tenant Finds Listing",
        description: "Prospective tenants browse your listings and find the right fit.",
      },
      {
        title: "Application Submitted",
        description: "Tenants apply directly from the listing page — no phone calls or emails needed.",
      },
    ],
    highlights: [
      {
        title: "Professional Listing Pages",
        description:
          "Every listing gets a clean, mobile-friendly page with property details, photos, rent amount, and a built-in application button. No design work required — just toggle a unit to listed and the page creates itself.",
      },
      {
        title: "Centralized Vacancy Marketing",
        description:
          "Your browse page shows all available units across your entire portfolio in one place. Tenants can search and filter without you managing separate ads on multiple platforms.",
      },
    ],
  },
  {
    title: "Leasing & Applications",
    description: "Streamline your entire leasing pipeline from application to signed lease",
    icon: Description,
    route: "/features/leasing",
    tagline: "From application to signed lease in minutes, not weeks",
    benefits: [
      {
        icon: "Assignment",
        title: "Multi-Step Applications",
        description:
          "Collect personal info, residence history, employment, references, and consent in a guided 6-step form that tenants complete online.",
      },
      {
        icon: "CheckCircle",
        title: "One-Click Approve & Lease",
        description:
          "Review applications, approve or deny with a click, and generate a lease directly from the approved application — no retyping data.",
      },
      {
        icon: "Draw",
        title: "Digital Lease Signing",
        description:
          "Generate lease documents and send tokenized signing links to tenants. Both parties sign electronically — no printing, scanning, or mailing.",
      },
    ],
    steps: [
      { title: "Tenant Applies", description: "Prospective tenant fills out the multi-step application from your listing page." },
      { title: "Review Application", description: "You review the application details, run screening, and decide to approve or deny." },
      { title: "Generate Lease", description: "One click creates a lease from the approved application with all details pre-filled." },
      { title: "Sign & Activate", description: "Send the lease for e-signature. Once both parties sign, the lease is active." },
    ],
    highlights: [
      {
        title: "Guided Lease Workflow",
        description:
          "A 6-step stepper walks you through the entire lease lifecycle: created, document generated, sent for signing, tenant signed, landlord signed, and active. You always know exactly where each lease stands.",
      },
      {
        title: "Application Review Dashboard",
        description:
          "See all pending applications in one place with applicant details, screening status, and quick-action buttons. No more digging through emails or paper files.",
      },
    ],
  },
  {
    title: "Payments & Rent Collection",
    description: "Collect rent online and keep your ledger accurate automatically",
    icon: Payment,
    route: "/features/payments",
    tagline: "Get paid on time, every time",
    benefits: [
      {
        icon: "CreditCard",
        title: "Online Rent Payments",
        description:
          "Tenants pay rent through a secure Stripe-powered portal with credit card or bank transfer. No more checks in the mail.",
      },
      {
        icon: "AutoAwesome",
        title: "Automatic Bookkeeping",
        description:
          "Every payment automatically creates a journal entry in your double-entry ledger — debit cash, credit rental income. Your books stay accurate without manual data entry.",
      },
      {
        icon: "Receipt",
        title: "Rent Ledger & History",
        description:
          "A running balance for every tenant shows payments, charges, and outstanding amounts. Full payment history with dates and amounts.",
      },
    ],
    steps: [
      { title: "Tenant Logs In", description: "Tenant accesses their portal and sees their balance and payment options." },
      { title: "Submits Payment", description: "Tenant pays via Stripe — card or bank transfer, with instant confirmation." },
      { title: "Ledger Updates", description: "Payment posts to the rent ledger and a journal entry is created automatically." },
      { title: "You Get Paid", description: "Funds arrive in your bank account on Stripe's standard payout schedule." },
    ],
    highlights: [
      {
        title: "Tenant Payment Portal",
        description:
          "A clean, simple interface where tenants see their current balance, upcoming rent, and can pay with one click. No app download required — it works in any browser.",
      },
      {
        title: "Automatic Double-Entry Posting",
        description:
          "When a tenant pays rent, the system creates a balanced journal entry: debit your cash account, credit rental income. Late fees, security deposits, and other charges follow the same pattern.",
      },
    ],
  },
  {
    title: "Screening & Compliance",
    description: "Screen applicants with secure, consent-based background checks",
    icon: VerifiedUser,
    route: "/features/screening",
    tagline: "Make confident leasing decisions with thorough screening",
    benefits: [
      {
        icon: "Security",
        title: "Consent-Based Flow",
        description:
          "Tenants receive a secure tokenized link to provide consent and personal information. Everything is tracked with timestamps for compliance.",
      },
      {
        icon: "FindInPage",
        title: "Background & Credit Checks",
        description:
          "Run background and credit screenings integrated directly into your leasing pipeline. Results appear alongside the application for easy review.",
      },
      {
        icon: "Gavel",
        title: "Compliance Built In",
        description:
          "The consent workflow captures authorization timestamps and tenant acknowledgments, helping you stay compliant with fair housing and screening regulations.",
      },
    ],
    steps: [
      { title: "Request Screening", description: "From the application, initiate a screening request with one click." },
      { title: "Tenant Consents", description: "Tenant receives a secure link, reviews the disclosure, and provides consent and SSN." },
      { title: "Screening Runs", description: "Background and credit checks are processed and results returned." },
      { title: "Review & Decide", description: "Results appear in the application — approve, deny, or request more information." },
    ],
    highlights: [
      {
        title: "Secure Consent Portal",
        description:
          "Tenants access a branded consent page via a unique token link. They review disclosures, provide personal information securely, and submit consent — all tracked with timestamps.",
      },
      {
        title: "Integrated Screening Dashboard",
        description:
          "See all screening requests and their statuses in one place. Results are linked directly to the application so you have everything you need to make a decision.",
      },
    ],
  },
  {
    title: "Maintenance",
    description: "Track requests, assign work, and keep tenants informed",
    icon: Build,
    route: "/features/maintenance",
    tagline: "Never lose track of a maintenance request again",
    benefits: [
      {
        icon: "ReportProblem",
        title: "Tenant Request Portal",
        description:
          "Tenants submit maintenance requests online with descriptions and priority levels. No more phone calls or text messages to track.",
      },
      {
        icon: "Assignment",
        title: "Request Management",
        description:
          "View, prioritize, and manage all open requests in a dashboard. Filter by property, status, or priority to focus on what matters.",
      },
      {
        icon: "Notifications",
        title: "Status Notifications",
        description:
          "Tenants receive automatic notifications when their request status changes. Everyone stays informed without manual follow-up.",
      },
    ],
    steps: [
      { title: "Tenant Submits", description: "Tenant describes the issue and submits a maintenance request from their portal." },
      { title: "You Review", description: "The request appears in your dashboard with details, priority, and tenant contact info." },
      { title: "Assign & Track", description: "Update the status as work progresses — tenant gets notified automatically." },
      { title: "Mark Complete", description: "Close the request when the work is done. Full history is preserved." },
    ],
    highlights: [
      {
        title: "Maintenance Dashboard",
        description:
          "All open and closed requests across your portfolio in one view. Sort by priority, property, or status. See which requests need attention and which are resolved.",
      },
      {
        title: "Communication Trail",
        description:
          "Every update and status change is logged. If a tenant asks about their request, you have the complete history — when it was submitted, what was done, and when it was resolved.",
      },
    ],
  },
  {
    title: "Accounting",
    description: "Double-entry bookkeeping with reports and bank reconciliation",
    icon: AccountBalance,
    route: "/features/accounting",
    tagline: "Real double-entry bookkeeping built for property managers",
    benefits: [
      {
        icon: "AccountTree",
        title: "Full Chart of Accounts",
        description:
          "A hierarchical chart of accounts with asset, liability, equity, revenue, and expense categories — pre-seeded with property management defaults.",
      },
      {
        icon: "Assessment",
        title: "Financial Reports",
        description:
          "Generate P&L, balance sheet, trial balance, cash flow, rent roll, and tax summary reports from your actual journal entries.",
      },
      {
        icon: "ImportExport",
        title: "Bank Statement Import",
        description:
          "Import CSV bank statements, auto-classify transactions with rules, review and book them as journal entries, then reconcile against your books.",
      },
    ],
    steps: [
      {
        title: "Set Up Accounts",
        description: "Start with the pre-seeded chart of accounts or customize it for your portfolio.",
      },
      {
        title: "Record Transactions",
        description:
          "Record income, expenses, and transfers — or let the system post entries from rent payments automatically.",
      },
      {
        title: "Import & Reconcile",
        description: "Import bank statements, classify transactions, and reconcile your books against the bank.",
      },
      {
        title: "Run Reports",
        description: "Generate financial reports for tax season, investor updates, or your own analysis.",
      },
    ],
    highlights: [
      {
        title: "Chart of Accounts with Hierarchy",
        description:
          "A professional COA with account codes, header accounts, and sub-accounts organized by type. Expand and collapse sections, see balances at a glance, and manage accounts from one screen.",
      },
      {
        title: "CSV Import with Auto-Classification",
        description:
          "Upload a bank statement CSV, map the columns, and the system automatically classifies transactions based on rules you define. Review, approve, and book them as journal entries in minutes.",
      },
    ],
  },
];

export default featureMenuConfig;
