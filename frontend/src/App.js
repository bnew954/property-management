import { BrowserRouter, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import "./App.css";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import MaintenanceList from "./pages/MaintenanceList";
import MaintenanceForm from "./pages/MaintenanceForm";
import LeaseForm from "./pages/LeaseForm";
import LeaseList from "./pages/LeaseList";
import PaymentForm from "./pages/PaymentForm";
import PaymentsList from "./pages/PaymentsList";
import PropertyDetail from "./pages/PropertyDetail";
import PropertyForm from "./pages/PropertyForm";
import PropertyList from "./pages/PropertyList";
import TenantForm from "./pages/TenantForm";
import TenantList from "./pages/TenantList";
import UnitForm from "./pages/UnitForm";

const theme = createTheme({
  palette: {
    primary: { main: "#2563eb" },
    secondary: { main: "#0ea5e9" },
    background: { default: "#f4f6fb", paper: "#ffffff" },
  },
  typography: {
    fontFamily: "Poppins, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  },
  shape: {
    borderRadius: 12,
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Layout>
          <Routes>
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
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
