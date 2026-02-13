import { useEffect, useState } from "react";
import ApartmentIcon from "@mui/icons-material/Apartment";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import BuildIcon from "@mui/icons-material/Build";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import PaymentIcon from "@mui/icons-material/Payment";
import PeopleIcon from "@mui/icons-material/People";
import { Box, Card, CardContent, Paper, Typography } from "@mui/material";
import {
  getLeases,
  getMaintenanceRequests,
  getPayments,
  getProperties,
  getTenants,
  getUnits,
} from "../services/api";
import { useUser } from "../services/userContext";

function Dashboard() {
  const { role, user } = useUser();
  const [counts, setCounts] = useState({
    properties: 0,
    units: 0,
    tenants: 0,
    activeLeases: 0,
    openMaintenance: 0,
    myPayments: 0,
    myMaintenance: 0,
    myLeaseInfo: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        if (role === "tenant") {
          const [paymentsRes, maintenanceRes, leasesRes, tenantsRes] = await Promise.all([
            getPayments(),
            getMaintenanceRequests(),
            getLeases(),
            getTenants(),
          ]);
          const tenantRecord = (tenantsRes.data || [])[0];
          const tenantId = tenantRecord?.id;

          const paymentItems = (paymentsRes.data || []).filter((item) => {
            const nestedId = item.lease_detail?.tenant_detail?.id ?? item.lease_detail?.tenant;
            return !tenantId || nestedId === tenantId;
          });
          const maintenanceItems = (maintenanceRes.data || []).filter((item) => {
            const nestedId = item.tenant_detail?.id ?? item.tenant;
            return !tenantId || nestedId === tenantId;
          });
          const leaseItems = (leasesRes.data || []).filter((item) => {
            const nestedId = item.tenant_detail?.id ?? item.tenant;
            return !tenantId || nestedId === tenantId;
          });

          setCounts((prev) => ({
            ...prev,
            myPayments: paymentItems.length,
            myMaintenance: maintenanceItems.length,
            myLeaseInfo: leaseItems.filter((item) => item.is_active).length,
          }));
        } else {
          const [propertiesRes, unitsRes, tenantsRes, leasesRes, maintenanceRes] = await Promise.all([
            getProperties(),
            getUnits(),
            getTenants(),
            getLeases(),
            getMaintenanceRequests(),
          ]);

          const maintenanceItems = maintenanceRes.data || [];
          const leaseItems = leasesRes.data || [];
          const openMaintenance = maintenanceItems.filter(
            (item) => item.status !== "completed" && item.status !== "cancelled"
          ).length;
          const activeLeases = leaseItems.filter((item) => item.is_active).length;

          setCounts({
            properties: (propertiesRes.data || []).length,
            units: (unitsRes.data || []).length,
            tenants: (tenantsRes.data || []).length,
            activeLeases,
            openMaintenance,
            myPayments: 0,
            myMaintenance: 0,
            myLeaseInfo: 0,
          });
        }
      } catch (err) {
        setError("Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [role]);

  const cards =
    role === "tenant"
      ? [
          { title: "My Payments", value: counts.myPayments, icon: <PaymentIcon sx={{ color: "#7c5cfc", opacity: 0.7, fontSize: 18 }} /> },
          { title: "My Maintenance Requests", value: counts.myMaintenance, icon: <BuildIcon sx={{ color: "#f59e0b", opacity: 0.7, fontSize: 18 }} /> },
          { title: "My Lease Info", value: counts.myLeaseInfo, icon: <AssignmentTurnedInIcon sx={{ color: "#22c55e", opacity: 0.7, fontSize: 18 }} /> },
        ]
      : [
          { title: "Total Properties", value: counts.properties, icon: <ApartmentIcon sx={{ color: "#7c5cfc", opacity: 0.7, fontSize: 18 }} /> },
          { title: "Total Units", value: counts.units, icon: <HomeWorkIcon sx={{ color: "#38bdf8", opacity: 0.7, fontSize: 18 }} /> },
          { title: "Total Tenants", value: counts.tenants, icon: <PeopleIcon sx={{ color: "#a78bfa", opacity: 0.7, fontSize: 18 }} /> },
          { title: "Active Leases", value: counts.activeLeases, icon: <AssignmentTurnedInIcon sx={{ color: "#22c55e", opacity: 0.7, fontSize: 18 }} /> },
          { title: "Open Requests", value: counts.openMaintenance, icon: <BuildIcon sx={{ color: "#f59e0b", opacity: 0.7, fontSize: 18 }} /> },
        ];
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Box>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em" }}>
        Welcome back, {user?.first_name || user?.username || "User"}
      </Typography>
      <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 2 }}>
        {today}
      </Typography>
      {loading ? <Typography sx={{ mb: 2 }}>Loading...</Typography> : null}
      {error ? (
        <Typography sx={{ mb: 2, color: "error.main" }}>{error}</Typography>
      ) : null}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 1.5,
        }}
      >
        {cards.map((card) => (
          <Card key={card.title} sx={{ bgcolor: "#141414" }}>
            <CardContent sx={{ p: 1.8 }}>
              <Box sx={{ mb: 1 }}>{card.icon}</Box>
              <Typography sx={{ fontSize: 24, lineHeight: 1.1, fontWeight: 600, color: "#fff" }}>
                {card.value}
              </Typography>
              <Typography sx={{ mt: 0.6, fontSize: 12, color: "text.secondary" }}>
                {card.title}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Paper sx={{ mt: 2, p: 2, bgcolor: "#141414" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, mb: 0.8 }}>
          Recent Activity
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          No recent activity
        </Typography>
      </Paper>
    </Box>
  );
}

export default Dashboard;
