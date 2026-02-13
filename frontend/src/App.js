import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import "./App.css";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import MaintenanceList from "./pages/MaintenanceList";
import MaintenanceForm from "./pages/MaintenanceForm";
import LeaseForm from "./pages/LeaseForm";
import LeaseList from "./pages/LeaseList";
import Login from "./pages/Login";
import PaymentForm from "./pages/PaymentForm";
import PaymentsList from "./pages/PaymentsList";
import PropertyDetail from "./pages/PropertyDetail";
import PropertyForm from "./pages/PropertyForm";
import PropertyList from "./pages/PropertyList";
import Register from "./pages/Register";
import TenantForm from "./pages/TenantForm";
import TenantList from "./pages/TenantList";
import UnitForm from "./pages/UnitForm";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#6366f1" },
    secondary: { main: "#38bdf8" },
    success: { main: "#22c55e" },
    warning: { main: "#f59e0b" },
    error: { main: "#ef4444" },
    background: { default: "#0a0e1a", paper: "#111827" },
    text: { primary: "#e5e7eb", secondary: "#9ca3af" },
  },
  typography: {
    fontFamily: "Inter, Roboto, sans-serif",
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          border: "1px solid rgba(99,102,241,0.14)",
          transition: "all 0.2s ease",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "rgba(148,163,184,0.12)",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          transition: "all 0.2s ease",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          transition: "all 0.2s ease",
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout>
                    <Outlet />
                  </Layout>
                </ProtectedRoute>
              }
            >
            <Route path="/" element={<Dashboard />} />
            <Route path="/properties" element={<PropertyList />} />
            <Route path="/properties/new" element={<PropertyForm />} />
            <Route path="/properties/:id" element={<PropertyDetail />} />
            <Route path="/properties/:id/edit" element={<PropertyForm />} />
            <Route path="/properties/:id/units/new" element={<UnitForm />} />
            <Route path="/properties/:id/units/:unitId/edit" element={<UnitForm />} />
            <Route path="/tenants" element={<TenantList />} />
            <Route path="/tenants/new" element={<TenantForm />} />
            <Route path="/tenants/:id/edit" element={<TenantForm />} />
            <Route path="/leases" element={<LeaseList />} />
            <Route path="/leases/new" element={<LeaseForm />} />
            <Route path="/leases/:id/edit" element={<LeaseForm />} />
            <Route path="/payments" element={<PaymentsList />} />
            <Route path="/payments/new" element={<PaymentForm />} />
            <Route path="/payments/:id/edit" element={<PaymentForm />} />
            <Route path="/maintenance" element={<MaintenanceList />} />
            <Route path="/maintenance/new" element={<MaintenanceForm />} />
            <Route path="/maintenance/:id/edit" element={<MaintenanceForm />} />
            </Route>
          </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
