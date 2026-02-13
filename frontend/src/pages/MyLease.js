import { useEffect, useMemo, useState } from "react";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import {
  Alert,
  Box,
  Chip,
  Paper,
  Typography,
} from "@mui/material";
import { getLeases, getProperties, getTenants, getUnits } from "../services/api";
import { useUser } from "../services/userContext";

const formatDate = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

function MyLease() {
  const { user } = useUser();
  const [lease, setLease] = useState(null);
  const [unit, setUnit] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLease = async () => {
      try {
        const tenantIdFromContext = user?.tenant_id || null;
        const requests = tenantIdFromContext
          ? [getLeases(), getUnits(), getProperties()]
          : [getLeases(), getUnits(), getProperties(), getTenants()];
        const [leasesRes, unitsRes, propertiesRes, tenantsRes] = await Promise.all(requests);
        const tenantId = tenantIdFromContext || (tenantsRes?.data || [])[0]?.id || null;

        if (!tenantId) {
          setLease(null);
          return;
        }

        const allLeases = leasesRes.data || [];
        const tenantLeases = allLeases.filter((item) => {
          const nestedId = item.tenant_detail?.id ?? item.tenant;
          return nestedId === tenantId;
        });

        const activeLeases = tenantLeases
          .filter((item) => item.is_active)
          .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

        const selectedLease = activeLeases[0] || null;
        setLease(selectedLease);

        if (!selectedLease) {
          return;
        }

        const units = unitsRes.data || [];
        const properties = propertiesRes.data || [];
        const selectedUnit =
          selectedLease.unit_detail ||
          units.find((item) => item.id === selectedLease.unit) ||
          null;
        setUnit(selectedUnit);

        const selectedProperty = selectedUnit
          ? properties.find((item) => item.id === selectedUnit.property) || null
          : null;
        setProperty(selectedProperty);
      } catch (requestError) {
        setError("Unable to load lease information.");
      } finally {
        setLoading(false);
      }
    };

    loadLease();
  }, [user?.tenant_id]);

  const address = useMemo(() => {
    if (!property) {
      return "";
    }
    const line2 = property.address_line2 ? `, ${property.address_line2}` : "";
    return `${property.address_line1}${line2}, ${property.city}, ${property.state} ${property.zip_code}`;
  }, [property]);

  return (
    <Box>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em", mb: 0.8 }}>
        My Lease
      </Typography>
      <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1.5 }}>
        Review your current lease details
      </Typography>

      {loading ? <Typography>Loading...</Typography> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      {!loading && !error && !lease ? (
        <Paper sx={{ p: 2.5, bgcolor: "#141414" }}>
          <Typography sx={{ fontSize: 14, color: "#e0e0e0", mb: 0.5 }}>
            No active lease found.
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            Contact your property manager.
          </Typography>
        </Paper>
      ) : null}

      {!loading && !error && lease ? (
        <Paper sx={{ p: 2.5, bgcolor: "#141414" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <HomeWorkIcon sx={{ fontSize: 18, color: "#7c5cfc" }} />
              <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>
                {property?.name || "Property"}
              </Typography>
            </Box>
            <Chip
              size="small"
              icon={<AssignmentTurnedInIcon />}
              label={lease.is_active ? "Active" : "Inactive"}
              sx={{
                bgcolor: lease.is_active ? "rgba(34,197,94,0.1)" : "rgba(107,114,128,0.15)",
                color: lease.is_active ? "#22c55e" : "#9ca3af",
                fontWeight: 500,
                fontSize: 11,
                height: 22,
              }}
            />
          </Box>

          <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 2 }}>
            {address}
          </Typography>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1.25 }}>
            <Box>
              <Typography sx={{ fontSize: 11, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Unit
              </Typography>
              <Typography sx={{ fontSize: 13 }}>{unit?.unit_number || "-"}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Bedrooms
              </Typography>
              <Typography sx={{ fontSize: 13 }}>{unit?.bedrooms ?? "-"}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Bathrooms
              </Typography>
              <Typography sx={{ fontSize: 13 }}>{unit?.bathrooms ?? "-"}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Square Feet
              </Typography>
              <Typography sx={{ fontSize: 13 }}>{unit?.square_feet ?? "-"}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Lease Start
              </Typography>
              <Typography sx={{ fontSize: 13 }}>{formatDate(lease.start_date)}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Lease End
              </Typography>
              <Typography sx={{ fontSize: 13 }}>{formatDate(lease.end_date)}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Monthly Rent
              </Typography>
              <Typography sx={{ fontSize: 13 }}>{formatCurrency(lease.monthly_rent)}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Security Deposit
              </Typography>
              <Typography sx={{ fontSize: 13 }}>{formatCurrency(lease.security_deposit)}</Typography>
            </Box>
          </Box>
        </Paper>
      ) : null}
    </Box>
  );
}

export default MyLease;

