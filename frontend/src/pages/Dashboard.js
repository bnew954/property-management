import { useEffect, useState } from "react";
import ApartmentIcon from "@mui/icons-material/Apartment";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import BuildIcon from "@mui/icons-material/Build";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import PeopleIcon from "@mui/icons-material/People";
import { Box, Card, CardContent, Grid, Paper, Typography } from "@mui/material";
import {
  getLeases,
  getMaintenanceRequests,
  getProperties,
  getTenants,
  getUnits,
} from "../services/api";

function Dashboard() {
  const [counts, setCounts] = useState({
    properties: 0,
    units: 0,
    tenants: 0,
    activeLeases: 0,
    openMaintenance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
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
        });
      } catch (err) {
        setError("Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const cards = [
    { title: "Total Properties", value: counts.properties, icon: <ApartmentIcon sx={{ color: "#38bdf8" }} /> },
    { title: "Total Units", value: counts.units, icon: <HomeWorkIcon sx={{ color: "#60a5fa" }} /> },
    { title: "Total Tenants", value: counts.tenants, icon: <PeopleIcon sx={{ color: "#a78bfa" }} /> },
    { title: "Active Leases", value: counts.activeLeases, icon: <AssignmentTurnedInIcon sx={{ color: "#22c55e" }} /> },
    { title: "Open Maintenance Requests", value: counts.openMaintenance, icon: <BuildIcon sx={{ color: "#f59e0b" }} /> },
  ];
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        Welcome back, Admin
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
        {today}
      </Typography>
      {loading ? <Typography sx={{ mb: 2 }}>Loading...</Typography> : null}
      {error ? (
        <Typography sx={{ mb: 2, color: "error.main" }}>{error}</Typography>
      ) : null}
      <Grid container spacing={2.5}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.title}>
            <Card
              sx={{
                bgcolor: "#111827",
                position: "relative",
                overflow: "hidden",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 5,
                  background: "linear-gradient(180deg, #38bdf8 0%, #6366f1 100%)",
                },
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                },
              }}
            >
              <CardContent sx={{ pl: 2.3 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  {card.icon}
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                  {card.value}
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.8 }}>
                  {card.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Paper sx={{ mt: 3, p: 2.5, bgcolor: "#111827" }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Recent Activity
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No recent activity
        </Typography>
      </Paper>
    </Box>
  );
}

export default Dashboard;
