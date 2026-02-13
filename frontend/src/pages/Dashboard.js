import { useEffect, useState } from "react";
import { Box, Card, CardContent, Grid, Typography } from "@mui/material";
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
    { title: "Total Properties", value: counts.properties, accent: "#2563eb" },
    { title: "Total Units", value: counts.units, accent: "#0ea5e9" },
    { title: "Total Tenants", value: counts.tenants, accent: "#7c3aed" },
    { title: "Active Leases", value: counts.activeLeases, accent: "#16a34a" },
    { title: "Open Maintenance Requests", value: counts.openMaintenance, accent: "#f97316" },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Dashboard
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
                borderLeft: `6px solid ${card.accent}`,
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
              }}
            >
              <CardContent>
                <Typography color="text.secondary" variant="body2">
                  {card.title}
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default Dashboard;
