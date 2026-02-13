import { BrowserRouter, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import "./App.css";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import MaintenanceList from "./pages/MaintenanceList";
import PaymentsList from "./pages/PaymentsList";
import PropertyDetail from "./pages/PropertyDetail";
import PropertyList from "./pages/PropertyList";
import TenantList from "./pages/TenantList";

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
            <Route path="/properties/:id" element={<PropertyDetail />} />
            <Route path="/tenants" element={<TenantList />} />
            <Route path="/payments" element={<PaymentsList />} />
            <Route path="/maintenance" element={<MaintenanceList />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
