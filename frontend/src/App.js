import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import "./App.css";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import Accounting from "./pages/Accounting";
import MaintenanceList from "./pages/MaintenanceList";
import MaintenanceForm from "./pages/MaintenanceForm";
import ExpenseForm from "./pages/ExpenseForm";
import FinancialReports from "./pages/FinancialReports";
import LeaseForm from "./pages/LeaseForm";
import LeaseList from "./pages/LeaseList";
import Login from "./pages/Login";
import Messages from "./pages/Messages";
import MyLease from "./pages/MyLease";
import PaymentForm from "./pages/PaymentForm";
import PaymentsList from "./pages/PaymentsList";
import PayRent from "./pages/PayRent";
import ApplicationDetail from "./pages/ApplicationDetail";
import Applications from "./pages/Applications";
import PropertyDetail from "./pages/PropertyDetail";
import PropertyForm from "./pages/PropertyForm";
import PropertyList from "./pages/PropertyList";
import Register from "./pages/Register";
import RentLedger from "./pages/RentLedger";
import ScreeningDetail from "./pages/ScreeningDetail";
import ScreeningList from "./pages/ScreeningList";
import ScreeningRequest from "./pages/ScreeningRequest";
import ScreeningConsent from "./pages/ScreeningConsent";
import TenantForm from "./pages/TenantForm";
import TenantList from "./pages/TenantList";
import OrgSettings from "./pages/OrgSettings";
import Welcome from "./pages/Welcome";
import Templates from "./pages/Templates";
import ListingPublic from "./pages/ListingPublic";
import ListingsIndex from "./pages/ListingsIndex";
import MyListings from "./pages/MyListings";
import UnitForm from "./pages/UnitForm";
import ListingApply from "./pages/ListingApply";
import LeaseSigning from "./pages/LeaseSigning";
import LandingPage from "./pages/LandingPage";
import ListingsFeature from "./pages/features/ListingsFeature";
import LeasingFeature from "./pages/features/LeasingFeature";
import AccountingFeature from "./pages/features/AccountingFeature";
import PaymentsFeature from "./pages/features/PaymentsFeature";
import ScreeningFeature from "./pages/features/ScreeningFeature";
import MaintenanceFeature from "./pages/features/MaintenanceFeature";
import WhyOnyx from "./pages/WhyOnyx";
import { UserProvider, useUser } from "./services/userContext";
import { ThemeModeProvider, useThemeMode } from "./services/themeContext";

const createAppTheme = (mode) => {
  const isLight = mode === "light";
  return createTheme({
    palette: {
      mode,
      primary: { main: isLight ? "#6347f5" : "#7c5cfc" },
      secondary: { main: "#878C9E" },
      success: { main: "#22c55e" },
      warning: { main: "#f59e0b" },
      error: { main: "#ef4444" },
      background: {
        default: isLight ? "#f5f5f7" : "#0a0a0a",
        paper: isLight ? "#ffffff" : "#141414",
      },
      text: {
        primary: isLight ? "#1a1a1a" : "#e0e0e0",
        secondary: "#6b7280",
      },
      divider: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)",
    },
    typography: {
      fontFamily: "Inter, Roboto, sans-serif",
      fontSize: 13,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 600,
      h4: {
        fontSize: 20,
        fontWeight: 600,
        letterSpacing: "-0.01em",
      },
      h5: {
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: "-0.01em",
      },
      body1: { fontSize: 13 },
      body2: { fontSize: 12 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            margin: 0,
            transition: "background-color 0.3s ease, color 0.3s ease",
          },
          "*::-webkit-scrollbar": { width: "6px", height: "6px" },
          "*::-webkit-scrollbar-track": {
            background: isLight ? "#d5d6db" : "#0a0a0a",
          },
          "*::-webkit-scrollbar-thumb": {
            background: isLight ? "#9ca3af" : "#232323",
            borderRadius: "999px",
          },
          "*::-webkit-scrollbar-thumb:hover": {
            background: isLight ? "#6b7280" : "#333",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            boxShadow: isLight ? "0 0 0 rgba(0,0,0,0)" : "none",
            border: isLight ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.06)",
            transition:
              "color 0.3s ease, background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            boxShadow: isLight ? "0 0 0 rgba(0,0,0,0)" : "none",
            border: isLight ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.06)",
            transition:
              "color 0.3s ease, background 0.3s ease, border-color 0.3s ease",
          },
        },
      },
      MuiTableHead: {
        styleOverrides: { root: { backgroundColor: isLight ? "#f9fafb" : "transparent" } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: isLight ? "rgba(0,0,0,0.06)" : "rgba(148,163,184,0.12)",
            fontSize: 12,
            paddingTop: 10,
            paddingBottom: 10,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:hover": { backgroundColor: isLight ? "#f5f5f7" : "rgba(255,255,255,0.02)" },
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: { fontSize: 12, color: isLight ? "#6b7280" : "#6b7280" },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            fontSize: 13,
            transition:
              "color 0.3s ease, background 0.3s ease, border-color 0.3s ease",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.1)",
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            fontSize: 12,
            textTransform: "none",
            transition: "color 0.3s ease, background 0.3s ease, border-color 0.3s ease",
          },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { transition: "color 0.3s ease, background-color 0.3s ease" } },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 500, fontSize: "11px", height: 22 } },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            transition: "background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease",
          },
        },
      },
    },
  });
};

function OrgAdminRoute({ children }) {
  const { isOrgAdmin, loading } = useUser();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ p: 2, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "30vh" }}>
        <CircularProgress size={22} />
      </Box>
    );
  }

  if (!isOrgAdmin) {
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }
  return children;
}

function AppContent() {
  const { mode } = useThemeMode();
  const theme = createAppTheme(mode);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary", transition: "background-color 0.3s ease, color 0.3s ease" }}>
        <UserProvider>
            <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/listing/:slug" element={<ListingPublic />} />
                <Route path="/listing/:slug/apply" element={<ListingApply />} />
                <Route path="/browse-listings" element={<ListingsIndex />} />
                <Route path="/features/listings" element={<ListingsFeature />} />
                <Route path="/features/leasing" element={<LeasingFeature />} />
                <Route path="/features/accounting" element={<AccountingFeature />} />
                <Route path="/features/payments" element={<PaymentsFeature />} />
                <Route path="/features/screening" element={<ScreeningFeature />} />
                <Route path="/features/maintenance" element={<MaintenanceFeature />} />
                <Route path="/why-onyx" element={<WhyOnyx />} />
                <Route path="/screening/consent/:token" element={<ScreeningConsent />} />
                <Route path="/lease/sign/:token" element={<LeaseSigning />} />
                <Route
                  element={
                    <ProtectedRoute>
                    <Layout>
                      <Outlet />
                    </Layout>
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/properties" element={<PropertyList />} />
                <Route path="/properties/new" element={<PropertyForm />} />
                <Route path="/properties/:id" element={<PropertyDetail />} />
                <Route path="/properties/:id/edit" element={<PropertyForm />} />
                <Route path="/properties/:id/units/new" element={<UnitForm />} />
                <Route path="/properties/:id/units/:unitId/edit" element={<UnitForm />} />
                <Route path="/tenants" element={<TenantList />} />
                <Route path="/tenants/new" element={<TenantForm />} />
                <Route path="/tenants/:id/edit" element={<TenantForm />} />
                <Route path="/listings" element={<MyListings />} />
                <Route path="/screenings" element={<ScreeningList />} />
                <Route path="/screenings/new" element={<ScreeningRequest />} />
                <Route path="/screenings/:id" element={<ScreeningDetail />} />
                <Route
                  path="/applications"
                  element={
                    <OrgAdminRoute>
                      <Applications />
                    </OrgAdminRoute>
                  }
                />
                <Route
                  path="/applications/:id"
                  element={
                    <OrgAdminRoute>
                      <ApplicationDetail />
                    </OrgAdminRoute>
                  }
                />
                <Route path="/leases" element={<LeaseList />} />
                <Route path="/leases/new" element={<LeaseForm />} />
                <Route path="/leases/:id/edit" element={<LeaseForm />} />
                <Route path="/payments" element={<PaymentsList />} />
                <Route path="/payments/new" element={<PaymentForm />} />
                <Route path="/payments/:id/edit" element={<PaymentForm />} />
                <Route path="/accounting" element={<Accounting />} />
                <Route path="/accounting/ledger/:leaseId" element={<RentLedger />} />
                <Route path="/accounting/expenses/new" element={<ExpenseForm />} />
                <Route path="/accounting/expenses/:id/edit" element={<ExpenseForm />} />
                <Route path="/accounting/reports" element={<FinancialReports />} />
                <Route path="/pay-rent" element={<PayRent />} />
                <Route path="/my-lease" element={<MyLease />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/maintenance" element={<MaintenanceList />} />
                <Route path="/maintenance/new" element={<MaintenanceForm />} />
                <Route path="/maintenance/:id/edit" element={<MaintenanceForm />} />
                <Route
                  path="/settings"
                  element={
                    <OrgAdminRoute>
                      <OrgSettings />
                    </OrgAdminRoute>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </UserProvider>
      </Box>
    </ThemeProvider>
  );
}

function App() {
  return (
    <ThemeModeProvider>
      <AppContent />
    </ThemeModeProvider>
  );
}

export default App;
