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
    tabs: [
      {
        label: "Listing Pages",
        mockupId: "ListingPagePreview",
        bullets: [
          "One-click publish for any vacant unit",
          "Professional, mobile-friendly listing pages",
          "Built-in application forms on every listing",
          "Auto-generated SEO-friendly URLs",
          "Photos, pricing, amenities, and unit details",
        ],
      },
      {
        label: "Syndication",
        mockupId: "SyndicationDashboard",
        comingSoon: true,
        bullets: [
          "Push listings to Zillow, Apartments.com, and Realtor.com",
          "Manage all syndicated listings from one dashboard",
          "Track which platforms generate the most leads",
          "Automatic listing updates across all platforms",
        ],
      },
      {
        label: "Lead Management",
        mockupId: "LeadPipeline",
        comingSoon: true,
        bullets: [
          "Track inquiries from first contact to signed lease",
          "See which listings drive the most interest",
          "Automated follow-up sequences for prospects",
          "Convert leads into applications automatically",
        ],
      },
    ],
    faqs: [
      {
        question: "How do I create a listing?",
        answer:
          "Navigate to any vacant unit in your portfolio and switch it on as listed. The listing page is created immediately and you can update the photos, description, and rent amount before sharing.",
      },
      {
        question: "Are listing pages mobile-friendly?",
        answer:
          "Yes. Every listing page is fully responsive and works on phones, tablets, and desktop. Tenants can browse details, upload messages, and apply directly from mobile.",
      },
      {
        question: "Can tenants apply directly from the listing?",
        answer:
          "Absolutely. Each listing has a built-in apply button that takes prospects into the application flow and flows directly into your leasing queue.",
      },
      {
        question: "What is listing syndication?",
        answer:
          "Syndication publishes your vacancies to major rental portals from one workspace. This keeps listing text and photos in sync while reducing manual posting work.",
      },
      {
        question: "Is there a limit on how many listings I can create?",
        answer:
          "You can create listings for every vacant unit in your portfolio with no unit-based limit. Onyx PM scales with your portfolio growth.",
      },
      {
        question: "How do I take a listing down?",
        answer:
          "Open the listing and switch it off from active status. This removes it from public view immediately while preserving historical data in your records.",
      },
    ],
  },
  {
    title: "Leasing & Applications",
    description: "Streamline your entire leasing pipeline from application to signed lease",
    icon: Description,
    route: "/features/leasing",
    tagline: "From application to signed lease in minutes, not weeks",
    tabs: [
      {
        label: "Applications",
        mockupId: "ApplicationForm",
        bullets: [
          "Guided 6-step application form for prospects",
          "Collect personal info, residence, employment, and references",
          "Applications feed directly into your leasing pipeline",
          "Review, approve, or deny with one click",
        ],
      },
      {
        label: "Lease Management",
        mockupId: "LeaseWorkflow",
        bullets: [
          "Create leases from approved applications instantly",
          "Visual 6-step lease workflow tracker",
          "Auto-generated lease documents from templates",
          "Track every lease status across your portfolio",
        ],
      },
      {
        label: "E-Signatures",
        mockupId: "LeaseSigningView",
        bullets: [
          "Send leases for digital signing via secure link",
          "Tenants sign on any device — phone, tablet, or desktop",
          "Landlord countersign to activate the lease",
          "Complete audit trail of all signatures",
        ],
      },
    ],
    faqs: [
      {
        question: "How do applications work?",
        answer:
          "Applicants start from your listing or onboarding link and complete the multi-step form. On submission, validation runs and the application enters your review queue.",
      },
      {
        question: "Can I customize the application form?",
        answer:
          "Yes, you can customize required fields, ordering, and optional prompts so each property can collect the exact data you need. Changes stay consistent across review workflows.",
      },
      {
        question: "How does the lease signing process work?",
        answer:
          "After approval, Onyx PM generates a lease draft from the application and sends signing links. The lease status updates as each party completes the signature.",
      },
      {
        question: "Can tenants sign on their phone?",
        answer:
          "Yes. Signing links are fully responsive and work on modern mobile and desktop browsers. The tenant can review and sign without extra software.",
      },
      {
        question: "What happens after both parties sign?",
        answer:
          "Onyx PM marks the lease as active and stores the final document in the property record. Payment and occupancy tasks can then start automatically.",
      },
      {
        question: "Can I create a lease without an application?",
        answer:
          "Yes, you can create a lease directly from tenant and unit context for renewals and internal workflows while preserving an audit trail of the action.",
      },
    ],
  },
  {
    title: "Payments & Rent Collection",
    description: "Collect rent online and keep your ledger accurate automatically",
    icon: Payment,
    route: "/features/payments",
    tagline: "Get paid on time, every time",
    tabs: [
      {
        label: "Rent Payments",
        mockupId: "TenantPayPortal",
        bullets: [
          "Tenants pay rent online via Stripe — cards and bank transfers",
          "Clean payment portal showing balance and history",
          "Automatic payment confirmations and receipts",
          "Track who has paid and who is overdue",
        ],
      },
      {
        label: "Auto Bookkeeping",
        mockupId: "AutoBookkeeping",
        bullets: [
          "Every payment auto-creates a journal entry",
          "Debit cash, credit rental income — automatically",
          "No manual data entry for rent payments",
          "Full audit trail linking payments to ledger entries",
        ],
      },
      {
        label: "Rent Ledger",
        mockupId: "RentLedger",
        bullets: [
          "Per-tenant ledger with charges, payments, and running balance",
          "See outstanding balances across your entire portfolio",
          "Late fee tracking and follow-up visibility",
          "Complete payment history with exportable records",
        ],
      },
    ],
    faqs: [
      {
        question: "How do tenants pay rent?",
        answer:
          "Tenants access the tenant portal, review current balance, and pay directly from a secure checkout flow. Payments are recorded and reflected in your dashboard immediately.",
      },
      {
        question: "What payment methods are accepted?",
        answer:
          "Cards and ACH-style transfers are supported through your configured payment provider. Accepted methods can be adjusted in account settings by region.",
      },
      {
        question: "How quickly do I receive funds?",
        answer:
          "Fund timing follows your payment processor settings. The dashboard shows confirmation status and payout visibility for each transaction.",
      },
      {
        question: "Are payments automatically recorded in accounting?",
        answer:
          "Yes. Cleared payments create immediate journal entries with balanced debit and credit lines to keep your books current.",
      },
      {
        question: "Can I track who hasn't paid?",
        answer:
          "Yes. Tenant balances and aging views identify delinquent accounts so you can prioritize collections quickly.",
      },
      {
        question: "Is there a fee for online payments?",
        answer:
          "Provider fees vary by processor. Onyx PM does not add hidden fees beyond your selected payment workflow and processor terms.",
      },
    ],
  },
  {
    title: "Screening & Compliance",
    description: "Screen applicants with secure, consent-based background checks",
    icon: VerifiedUser,
    route: "/features/screening",
    tagline: "Make confident leasing decisions with thorough screening",
    tabs: [
      {
        label: "Screening",
        mockupId: "ScreeningDashboard",
        bullets: [
          "Run background and credit checks on applicants",
          "Integrated directly with the application pipeline",
          "View screening status across all applicants",
          "Results delivered directly in your dashboard",
        ],
      },
      {
        label: "Consent Flow",
        mockupId: "ConsentPortal",
        bullets: [
          "Secure tokenized consent link sent to applicants",
          "FCRA-compliant authorization and disclosure",
          "Applicants submit consent on any device",
          "Automatic timestamp and audit trail",
        ],
      },
      {
        label: "Compliance",
        mockupId: "ComplianceLog",
        bullets: [
          "Complete timeline of every screening action",
          "Consent records stored for compliance documentation",
          "Adverse action notice support",
          "Full audit trail for fair housing compliance",
        ],
      },
    ],
    faqs: [
      {
        question: "How does tenant screening work?",
        answer:
          "After an application is started, request screening from the application workspace. Onyx PM tracks each report and keeps you informed as checks progress.",
      },
      {
        question: "What checks are included?",
        answer:
          "Common background and credit checks are included through configured providers, with results appearing in the application workflow and approval queue.",
      },
      {
        question: "How is tenant consent handled?",
        answer:
          "Applicants complete consent through a secure flow before screening begins. Every action is logged with timestamps and evidence for review.",
      },
      {
        question: "How long does screening take?",
        answer:
          "Most checks process quickly, while some may depend on provider response windows. Live status keeps you up-to-date inside Onyx PM.",
      },
      {
        question: "Is screening integrated with applications?",
        answer:
          "Yes. Screening status and documents are linked directly to each application so review and next steps are never separated.",
      },
      {
        question: "What does screening cost?",
        answer:
          "Screening costs depend on provider and check type. Fee details are visible when you request checks and are tracked in the request metadata.",
      },
    ],
  },
  {
    title: "Maintenance",
    description: "Track requests, assign work, and keep tenants informed",
    icon: Build,
    route: "/features/maintenance",
    tagline: "Never lose track of a maintenance request again",
    tabs: [
      {
        label: "Request Portal",
        mockupId: "RequestSubmission",
        bullets: [
          "Tenants submit requests online with descriptions and photos",
          "Priority and category selection for faster routing",
          "Requests appear instantly in your management dashboard",
          "No phone calls or emails needed",
        ],
      },
      {
        label: "Management",
        mockupId: "RequestManagement",
        bullets: [
          "View all requests in one centralized dashboard",
          "Update status, assign vendors, add internal notes",
          "Visual progress tracker from open to completed",
          "Filter by property, priority, or status",
        ],
      },
      {
        label: "History",
        mockupId: "MaintenanceHistory",
        bullets: [
          "Complete log of all past maintenance work",
          "Track resolution times and vendor performance",
          "Reference past issues for recurring problems",
          "Exportable records for property documentation",
        ],
      },
    ],
    faqs: [
      {
        question: "How do tenants submit requests?",
        answer:
          "Tenants submit requests through the tenant portal form, including photos and issue details. Each request gets a unique tracking reference automatically.",
      },
      {
        question: "Can I prioritize requests?",
        answer:
          "Yes. Requests include priority levels and your team can filter and reorder queue visibility based on severity and urgency.",
      },
      {
        question: "Do tenants get status updates?",
        answer:
          "Yes. Status updates are posted at major milestones such as submitted, in progress, and completed, reducing follow-up calls.",
      },
      {
        question: "Can I track maintenance history?",
        answer:
          "Yes. Every request keeps a timestamped timeline with completion notes and historical visibility for operational planning.",
      },
      {
        question: "Is there a mobile interface?",
        answer:
          "Yes. The request queue and status views are responsive for both landlord and tenant users across mobile devices.",
      },
      {
        question: "Can I assign requests to vendors?",
        answer:
          "Yes. You can route requests internally or to external vendors and track accountability through the same request timeline.",
      },
    ],
  },
  {
    title: "Accounting",
    description: "Double-entry bookkeeping with reports and bank reconciliation",
    icon: AccountBalance,
    route: "/features/accounting",
    tagline: "Real double-entry bookkeeping built for property managers",
    tabs: [
      {
        label: "Chart of Accounts",
        mockupId: "AccountingCOA",
        bullets: [
          "Professional chart of accounts with hierarchy",
          "Asset, liability, equity, revenue, and expense accounts",
          "Sub-account nesting with account codes",
          "Seeded with property management defaults",
        ],
      },
      {
        label: "Reports",
        mockupId: "FinancialReports",
        bullets: [
          "Profit & loss, balance sheet, and trial balance",
          "Cash flow statements and general ledger",
          "Rent roll across your entire portfolio",
          "Tax summary reports for Schedule E prep",
        ],
      },
      {
        label: "Bank Import",
        mockupId: "BankImport",
        bullets: [
          "Import bank statements via CSV upload",
          "Auto-classification rules match transactions to accounts",
          "Review and approve before booking to your ledger",
          "Bank reconciliation to verify books match statements",
        ],
      },
    ],
    faqs: [
      {
        question: "What type of accounting does Onyx PM use?",
        answer:
          "Onyx PM uses a double-entry accounting model so every transaction has balanced debit and credit entries. This improves auditability and financial accuracy.",
      },
      {
        question: "What reports can I generate?",
        answer:
          "You can generate P&L, balance sheet, trial balance, cash flow, rent roll, and tax summary reports from your live posted entries.",
      },
      {
        question: "Can I import bank statements?",
        answer:
          "Yes, you can import CSV statements directly into Onyx PM. The importer suggests classifications and routes transactions into your chart of accounts.",
      },
      {
        question: "How does the chart of accounts work?",
        answer:
          "The chart is hierarchical, with parent account groups and nested child accounts for detailed line items and cleaner reporting over time.",
      },
      {
        question: "Does it handle multiple properties?",
        answer:
          "Yes. You can segment data by property and also run consolidated reports when you need a portfolio view.",
      },
      {
        question: "Can I lock accounting periods?",
        answer:
          "Yes. Period controls let you lock closed periods so reported values remain stable while still permitting controlled adjustments with proper logging.",
      },
    ],
  },
];

export default featureMenuConfig;
