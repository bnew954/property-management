import ApartmentIcon from "@mui/icons-material/Apartment";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import BuildIcon from "@mui/icons-material/Build";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import PeopleIcon from "@mui/icons-material/People";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";

export const FEATURE_MENU_ITEMS = [
  {
    title: "Leasing & Applications",
    description: "Streamline your entire leasing pipeline from listing to signed lease",
    path: "/features/leasing",
    Icon: ApartmentIcon,
  },
  {
    title: "Accounting & Bookkeeping",
    description: "Double-entry bookkeeping with chart of accounts, reports, and bank imports",
    path: "/features/accounting",
    Icon: AccountBalanceIcon,
  },
  {
    title: "Tenant Management",
    description: "Manage tenants, communications, and maintenance requests in one place",
    path: "/features/tenants",
    Icon: PeopleIcon,
  },
  {
    title: "Payments & Rent Collection",
    description: "Collect rent online, track balances, and automate late fees",
    path: "/features/payments",
    Icon: CreditCardIcon,
  },
  {
    title: "Screening & Background Checks",
    description: "Consent-based screening, background checks, and credit checks",
    path: "/features/screening",
    Icon: VerifiedUserIcon,
  },
  {
    title: "Maintenance & Operations",
    description: "Track maintenance requests, assign work, and communicate with tenants",
    path: "/features/maintenance",
    Icon: BuildIcon,
  },
];

