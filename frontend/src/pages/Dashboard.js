import { useEffect, useState } from "react";
import { getMaintenanceRequests, getProperties, getTenants } from "../services/api";

function Dashboard() {
  const [counts, setCounts] = useState({
    properties: 0,
    tenants: 0,
    openMaintenance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [propertiesRes, tenantsRes, maintenanceRes] = await Promise.all([
          getProperties(),
          getTenants(),
          getMaintenanceRequests(),
        ]);

        const maintenanceItems = maintenanceRes.data || [];
        const openMaintenance = maintenanceItems.filter(
          (item) => item.status !== "completed" && item.status !== "cancelled"
        ).length;

        setCounts({
          properties: (propertiesRes.data || []).length,
          tenants: (tenantsRes.data || []).length,
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

  return (
    <div className="container">
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>
      {loading ? <p>Loading...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <div className="card-grid">
        <div className="card summary-card">
          <h3>Total Properties</h3>
          <p>{counts.properties}</p>
        </div>
        <div className="card summary-card">
          <h3>Total Tenants</h3>
          <p>{counts.tenants}</p>
        </div>
        <div className="card summary-card">
          <h3>Open Maintenance Requests</h3>
          <p>{counts.openMaintenance}</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
