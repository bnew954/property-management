import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import PaymentIcon from "@mui/icons-material/Payment";
import FeaturePageTemplate from "./FeaturePageTemplate";

const paymentsFeature = {
  title: "Payments & Rent Collection",
  tagline: "Get paid faster with online rent collection",
  icon: PaymentIcon,
  benefits: [
    {
      title: "Online Payments via Stripe",
      description: "Offer card and bank transfer checkouts with receipts generated automatically after successful payment.",
      Icon: CreditCardIcon,
    },
    {
      title: "Automatic Rent Ledger",
      description: "Keep a running tenant ledger that updates as soon as payments are made or fees are applied.",
      Icon: AttachMoneyIcon,
    },
    {
      title: "Late Fee Automation",
      description: "Automatically apply late fee rules and notifications based on configurable grace periods and balance status.",
      Icon: RequestQuoteIcon,
    },
  ],
  steps: [
    { number: 1, title: "Tenant Receives Invoice", description: "Generate payment-ready invoices with clear due-date and fee breakdown for each tenant." },
    { number: 2, title: "Pays Online", description: "Tenants pay securely through the self-service portal and supporting payment processors." },
    { number: 3, title: "Payment Recorded", description: "Funds are posted to the ledger with audit-ready references and transaction metadata." },
    { number: 4, title: "Ledger Updated", description: "Balances and aging reports refresh instantly so your accounting and reminders stay accurate." },
  ],
  highlights: [
    {
      title: "Tenant Pay Rent Portal",
      description:
        "Deliver a branded tenant checkout flow for quick one-time or recurring rent payments.",
    },
    {
      title: "Payment History & Receipts",
      description:
        "Let tenants and managers filter payment activity and download receipts from a single view.",
    },
    {
      title: "Rent Ledger with Running Balance",
      description:
        "View each tenant's current balance with transaction-level detail and reconciliation context.",
    },
  ],
};

export default function PaymentsFeature() {
  return <FeaturePageTemplate feature={paymentsFeature} />;
}

