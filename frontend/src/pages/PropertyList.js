import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBack from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import SearchIcon from "@mui/icons-material/Search";
import {
  createLease,
  deleteProperty,
  getLeases,
  getProperties,
  getTenants,
  getUnits,
  updateUnit,
} from "../services/api";

function parseList(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.results)) return value.results;
  return [];
}

function formatCurrency(value) {
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, amount));
}

function formatCurrencyWithCents(value) {
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.max(0, amount));
}

function formatDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAddress(item) {
  const cityStateZip = [item?.city || "", item?.state || "", item?.zip_code || ""].filter(Boolean).join(" ").trim();
  return [item?.address_line1, item?.address_line2, cityStateZip]
    .filter(Boolean)
    .join(", ");
}

function normalizeType(value) {
  return String(value || "").trim().toLowerCase();
}

function getTypeLabel(value) {
  const valueLower = normalizeType(value);
  if (!valueLower) return "";
  return `${valueLower.charAt(0).toUpperCase()}${valueLower.slice(1)}`;
}

function getUnitSpecs(unit) {
  const specs = [];
  if (unit?.bedrooms !== null && unit?.bedrooms !== undefined) specs.push(`${unit.bedrooms} BR`);
  if (unit?.bathrooms !== null && unit?.bathrooms !== undefined) specs.push(`${unit.bathrooms} BA`);
  if (unit?.square_feet !== null && unit?.square_feet !== undefined) specs.push(`${unit.square_feet} sqft`);
  return specs.length > 0 ? specs.join(" · ") : "Specs coming soon";
}

function buildUnitPayload(unit, updates = {}) {
  return {
    property: unit?.property,
    unit_number: String(updates.unit_number ?? unit?.unit_number ?? ""),
    bedrooms: Number(updates.bedrooms ?? unit?.bedrooms ?? 0),
    bathrooms: Number(updates.bathrooms ?? unit?.bathrooms ?? 0),
    square_feet: Number(updates.square_feet ?? unit?.square_feet ?? 0),
    rent_amount: Number(updates.rent_amount ?? unit?.rent_amount ?? 0),
    is_available: Boolean(updates.is_available ?? unit?.is_available ?? true),
    is_listed: Boolean(updates.is_listed ?? unit?.is_listed ?? false),
    listing_title: String(updates.listing_title ?? unit?.listing_title ?? ""),
    listing_description: String(updates.listing_description ?? unit?.listing_description ?? ""),
    listing_photos: Array.isArray(updates.listing_photos ?? unit?.listing_photos)
      ? updates.listing_photos ?? unit?.listing_photos
      : [],
    listing_amenities: Array.isArray(updates.listing_amenities ?? unit?.listing_amenities)
      ? updates.listing_amenities ?? unit?.listing_amenities
      : [],
    listing_available_date: updates.listing_available_date ?? unit?.listing_available_date ?? null,
    listing_lease_term: String(updates.listing_lease_term ?? unit?.listing_lease_term ?? ""),
    listing_deposit: updates.listing_deposit ?? unit?.listing_deposit ?? null,
    listing_contact_email: String(updates.listing_contact_email ?? unit?.listing_contact_email ?? ""),
    listing_contact_phone: String(updates.listing_contact_phone ?? unit?.listing_contact_phone ?? ""),
  };
}

function occupancyColor(occupancyPct) {
  if (occupancyPct === 100) return "#27ca40";
  if (occupancyPct > 70) return "#fbbf24";
  return "#ef4444";
}

function PropertyList() {
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [leases, setLeases] = useState([]);
  const [tenants, setTenants] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [drawerMode, setDrawerMode] = useState("units");

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [editUnitOpen, setEditUnitOpen] = useState(false);
  const [editUnitSaving, setEditUnitSaving] = useState(false);
  const [editUnitData, setEditUnitData] = useState({
    unit_number: "",
    bedrooms: "",
    bathrooms: "",
    square_feet: "",
    rent_amount: "",
    is_available: true,
    is_listed: false,
  });

  const [createLeaseOpen, setCreateLeaseOpen] = useState(false);
  const [leaseSaving, setLeaseSaving] = useState(false);
  const [leaseForm, setLeaseForm] = useState({
    tenant: "",
    start_date: "",
    end_date: "",
    monthly_rent: "",
    security_deposit: "",
    is_active: true,
  });

  const location = useLocation();
  const navigate = useNavigate();

  const loadPortfolio = async () => {
    try {
      setError("");
      const [propertiesRes, unitsRes, leasesRes, tenantsRes] = await Promise.all([
        getProperties(),
        getUnits(),
        getLeases(),
        getTenants(),
      ]);
      setProperties(parseList(propertiesRes.data));
      setUnits(parseList(unitsRes.data));
      setLeases(parseList(leasesRes.data));
      setTenants(parseList(tenantsRes.data));
    } catch (err) {
      setError("Unable to load property portfolio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  useEffect(() => {
    if (location.state?.snackbar?.message) {
      setSnackbar({
        open: true,
        message: location.state.snackbar.message,
        severity: location.state.snackbar.severity || "success",
      });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const activeLeasesByUnit = useMemo(() => {
    const map = {};
    leases.forEach((lease) => {
      const unitId = Number(lease?.unit);
      if (!unitId || !lease?.is_active) return;
      if (!map[unitId]) map[unitId] = [];
      map[unitId].push(lease);
    });
    Object.keys(map).forEach((unitId) => {
      map[unitId] = map[unitId].sort((a, b) => {
        const aUpdated = Date.parse(a?.updated_at || a?.created_at || "");
        const bUpdated = Date.parse(b?.updated_at || b?.created_at || "");
        if (Number.isNaN(aUpdated) && Number.isNaN(bUpdated)) return 0;
        if (Number.isNaN(aUpdated)) return 1;
        if (Number.isNaN(bUpdated)) return -1;
        return bUpdated - aUpdated;
      });
    });
    return map;
  }, [leases]);

  const tenantsById = useMemo(() => {
    const map = {};
    tenants.forEach((tenant) => {
      map[Number(tenant?.id)] = tenant;
    });
    return map;
  }, [tenants]);

  const unitsByProperty = useMemo(() => {
    const map = {};
    units.forEach((unit) => {
      const propertyId = Number(unit?.property);
      if (!Number.isFinite(propertyId)) return;
      if (!map[propertyId]) map[propertyId] = [];
      map[propertyId].push(unit);
    });
    return map;
  }, [units]);

  const getPropertyUnits = (propertyId) => unitsByProperty[Number(propertyId)] || [];

  const getActiveLease = (unitId) => {
    return (activeLeasesByUnit[Number(unitId)] || [])[0] || null;
  };

  const isUnitOccupied = (unit) => {
    if (!unit) return false;
    if (normalizeType(unit?.lease_status) === "active") return true;
    if (unit?.current_tenant) return true;
    if (getActiveLease(unit?.id)) return true;
    return unit?.is_available === false;
  };

  const getOccupancyStatsForUnits = (propertyUnits) => {
    const total = propertyUnits.length;
    const occupied = propertyUnits.filter(isUnitOccupied).length;
    const vacant = total - occupied;
    const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const monthlyRevenue = propertyUnits
      .filter(isUnitOccupied)
      .reduce((sum, unit) => sum + Number.parseFloat(unit?.rent_amount || 0), 0);

    return { total, occupied, vacant, occupancyPct, monthlyRevenue };
  };

  const filteredProperties = useMemo(() => {
    const normalizedFilter = normalizeType(typeFilter);
    const query = searchTerm.trim().toLowerCase();
    return properties.filter((property) => {
      if (normalizedFilter !== "all") {
        if (normalizeType(property?.property_type) !== normalizedFilter) return false;
      }
      if (!query) return true;
      const haystack = [
        property?.name,
        property?.city,
        property?.address_line1,
        property?.address_line2,
        property?.state,
        property?.zip_code,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(query);
    });
  }, [properties, searchTerm, typeFilter]);

  const resolvedSelectedProperty = useMemo(() => {
    if (!selectedProperty) return null;
    return properties.find((property) => String(property.id) === String(selectedProperty.id)) || selectedProperty;
  }, [properties, selectedProperty]);

  const selectedPropertyStats = useMemo(() => {
    if (!resolvedSelectedProperty) return null;
    return getOccupancyStatsForUnits(getPropertyUnits(resolvedSelectedProperty.id));
  }, [getOccupancyStatsForUnits, getPropertyUnits, resolvedSelectedProperty]);

  const selectedPropertyUnits = useMemo(() => {
    if (!resolvedSelectedProperty) return [];
    return getPropertyUnits(resolvedSelectedProperty.id);
  }, [getPropertyUnits, resolvedSelectedProperty]);

  const selectedUnit = useMemo(() => {
    if (!selectedUnitId) return null;
    return units.find((unit) => String(unit.id) === String(selectedUnitId)) || null;
  }, [selectedUnitId, units]);

  const selectedUnitLease = useMemo(() => {
    if (!selectedUnit) return null;
    return getActiveLease(selectedUnit.id);
  }, [getActiveLease, selectedUnit]);

  const selectedUnitTenant = useMemo(() => {
    if (!selectedUnitLease) return null;
    return (
      selectedUnitLease.tenant_detail ||
      tenantsById[Number(selectedUnitLease.tenant)] ||
      null
    );
  }, [selectedUnitLease, tenantsById]);

  const occupiedUnits = units.filter(isUnitOccupied).length;
  const totalUnits = units.length;
  const vacantUnits = Math.max(totalUnits - occupiedUnits, 0);
  const portfolioRevenue = units
    .filter(isUnitOccupied)
    .reduce((sum, unit) => sum + Number.parseFloat(unit?.rent_amount || 0), 0);

  const typePillColors = {
    all: {
      border: "rgba(255,255,255,0.18)",
      bg: "rgba(255,255,255,0.02)",
      labelColor: "#fff",
      chipColor: "default",
    },
    residential: {
      border: "rgba(16,185,129,0.35)",
      bg: "rgba(16,185,129,0.08)",
      labelColor: "#6ee7b7",
      chipColor: "success",
    },
    commercial: {
      border: "rgba(59,130,246,0.35)",
      bg: "rgba(59,130,246,0.08)",
      labelColor: "#93c5fd",
      chipColor: "info",
    },
  };

  function getTypeTone(value) {
    const normalized = normalizeType(value);
    return normalized === "commercial"
      ? typePillColors.commercial
      : {
          border: "rgba(16,185,129,0.25)",
          bg: "rgba(16,185,129,0.08)",
          labelColor: "#86efac",
          chipColor: "success",
        };
  }

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = (_, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const openDrawerForProperty = (property) => {
    setSelectedProperty(property);
    setSelectedUnitId(null);
    setDrawerMode("units");
  };

  const closeDrawer = () => {
    setSelectedProperty(null);
    setSelectedUnitId(null);
    setDrawerMode("units");
  };

  const openUnitDetail = (unit, event) => {
    event?.stopPropagation?.();
    setSelectedUnitId(unit?.id);
    setDrawerMode("unit");
  };

  const goBackToUnits = () => {
    setSelectedUnitId(null);
    setDrawerMode("units");
  };

  const handleDeleteProperty = async (propertyId) => {
    try {
      setActionBusy(true);
      await deleteProperty(propertyId);
      if (resolvedSelectedProperty?.id === propertyId) closeDrawer();
      await loadPortfolio();
      showSnackbar("Property deleted successfully.", "success");
    } catch (err) {
      showSnackbar("Failed to delete property.", "error");
    } finally {
      setActionBusy(false);
    }
  };

  const handleOpenEditProperty = (property, event) => {
    event?.stopPropagation?.();
    navigate(`/properties/${property.id}/edit`);
  };

  const handleOpenEditUnit = (event) => {
    event?.stopPropagation?.();
    if (!selectedUnit) return;
    setEditUnitData({
      unit_number: selectedUnit.unit_number || "",
      bedrooms: String(selectedUnit.bedrooms ?? ""),
      bathrooms: String(selectedUnit.bathrooms ?? ""),
      square_feet: String(selectedUnit.square_feet ?? ""),
      rent_amount: String(selectedUnit.rent_amount ?? ""),
      is_available: Boolean(selectedUnit.is_available),
      is_listed: Boolean(selectedUnit.is_listed),
    });
    setEditUnitOpen(true);
  };

  const handleSaveUnit = async () => {
    if (!selectedUnit) return;
    try {
      setEditUnitSaving(true);
      const payload = buildUnitPayload(selectedUnit, {
        unit_number: editUnitData.unit_number,
        bedrooms: editUnitData.bedrooms,
        bathrooms: editUnitData.bathrooms,
        square_feet: editUnitData.square_feet,
        rent_amount: editUnitData.rent_amount,
        is_available: editUnitData.is_available,
        is_listed: editUnitData.is_listed,
      });
      await updateUnit(selectedUnit.id, payload);
      setEditUnitOpen(false);
      await loadPortfolio();
      showSnackbar("Unit updated successfully.");
    } catch (err) {
      showSnackbar("Unable to update unit.", "error");
    } finally {
      setEditUnitSaving(false);
    }
  };

  const handleToggleListing = async () => {
    if (!selectedUnit) return;
    try {
      setActionBusy(true);
      const payload = buildUnitPayload(selectedUnit, { is_listed: !selectedUnit.is_listed });
      await updateUnit(selectedUnit.id, payload);
      showSnackbar(selectedUnit.is_listed ? "Unit unlisted." : "Unit listed.");
      await loadPortfolio();
    } catch (err) {
      showSnackbar("Unable to update listing status.", "error");
    } finally {
      setActionBusy(false);
    }
  };

  const handleOpenCreateLease = () => {
    if (!selectedUnit) return;
    setLeaseForm({
      tenant: "",
      start_date: "",
      end_date: "",
      monthly_rent: String(selectedUnit.rent_amount || ""),
      security_deposit: "",
      is_active: true,
    });
    setCreateLeaseOpen(true);
  };

  const handleCreateLease = async () => {
    if (!selectedUnit) return;
    if (!leaseForm.tenant || !leaseForm.start_date || !leaseForm.end_date) {
      showSnackbar("Select tenant and lease dates before saving.", "error");
      return;
    }

    try {
      setLeaseSaving(true);
      await createLease({
        unit: selectedUnit.id,
        tenant: Number(leaseForm.tenant),
        start_date: leaseForm.start_date,
        end_date: leaseForm.end_date,
        monthly_rent: Number(leaseForm.monthly_rent || selectedUnit.rent_amount || 0),
        security_deposit: Number(leaseForm.security_deposit || 0),
        is_active: Boolean(leaseForm.is_active),
      });
      setCreateLeaseOpen(false);
      await loadPortfolio();
      showSnackbar("Lease created successfully.");
      goBackToUnits();
    } catch (err) {
      showSnackbar("Unable to create lease.", "error");
    } finally {
      setLeaseSaving(false);
    }
  };

  const statCards = [
    {
      title: "Properties",
      value: properties.length,
      valueColor: "#fff",
      background: "rgba(255,255,255,0.02)",
      borderColor: "rgba(255,255,255,0.08)",
      icon: HomeWorkIcon,
      iconColor: "#a5b4fc",
      labelColor: "#e2e8f0",
    },
    {
      title: "Total Units",
      value: totalUnits,
      valueColor: "#38bdf8",
      background: "rgba(59,130,246,0.08)",
      borderColor: "rgba(59,130,246,0.3)",
      icon: null,
      iconColor: "#7dd3fc",
      labelColor: "#bae6fd",
    },
    {
      title: "Occupied",
      value: occupiedUnits,
      valueColor: "#86efac",
      background: "rgba(34,197,94,0.08)",
      borderColor: "rgba(34,197,94,0.3)",
      icon: null,
      iconColor: "#86efac",
      labelColor: "#bbf7d0",
    },
    {
      title: "Vacant",
      value: vacantUnits,
      valueColor: "#facc15",
      background: "rgba(250,204,21,0.1)",
      borderColor: "rgba(251,191,36,0.35)",
      icon: null,
      iconColor: "#fbbf24",
      labelColor: "#fef08a",
    },
    {
      title: "Monthly Revenue",
      value: formatCurrency(portfolioRevenue),
      valueColor: "#c4b5fd",
      background: "rgba(139,92,246,0.12)",
      borderColor: "rgba(139,92,246,0.35)",
      icon: null,
      iconColor: "#ddd6fe",
      labelColor: "#ddd6fe",
    },
  ];

  if (loading) {
    return (
      <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ color: "#fff", px: { xs: 2, md: 3 }, py: 2.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff" }}>
            Properties
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)" }}>
            Manage your property portfolio
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => navigate("/properties/new")}
        >
          Add Property
        </Button>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
          alignItems: "stretch",
        }}
      >
        {statCards.map((item) => {
          const Icon = item.icon;
          return (
            <Box
              key={item.title}
              sx={{
                flex: 1,
                minWidth: 180,
                p: 2.5,
                borderRadius: 2,
                border: `1px solid ${item.borderColor}`,
                backgroundColor: item.background,
              }}
            >
              <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1 }}>
                {Icon ? <Icon sx={{ fontSize: 19, color: item.iconColor }} /> : null}
                <Typography variant="body2" sx={{ color: item.labelColor, fontWeight: 500 }}>
                  {item.title}
                </Typography>
              </Stack>
              <Typography variant="h5" sx={{ fontWeight: 700, color: item.valueColor }}>
                {item.value}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          placeholder="Search properties..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          sx={{ flex: 1, minWidth: 260, maxWidth: 380 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "rgba(255,255,255,0.5)" }} />
              </InputAdornment>
            ),
          }}
          size="small"
        />
        {[
          { label: "All", value: "all", theme: typePillColors.all },
          { label: "Residential", value: "residential", theme: typePillColors.residential },
          { label: "Commercial", value: "commercial", theme: typePillColors.commercial },
        ].map((option) => {
          const isActive = normalizeType(typeFilter) === option.value;
          return (
            <Chip
              key={option.value}
              label={option.label}
              clickable
              color={isActive ? option.theme.chipColor : "default"}
              onClick={() => setTypeFilter(option.label)}
              variant={isActive ? "filled" : "outlined"}
              sx={{
                borderRadius: 999,
                borderColor: option.theme.border,
                backgroundColor: isActive ? option.theme.bg : "transparent",
                color: isActive ? "#fff" : option.theme.labelColor,
                fontWeight: 600,
              }}
            />
          );
        })}
      </Box>

      {properties.length === 0 ? (
        <Box
          sx={{
            border: "1px dashed rgba(255,255,255,0.18)",
            borderRadius: 3,
            p: 8,
            textAlign: "center",
            backgroundColor: "rgba(255,255,255,0.02)",
          }}
        >
          <HomeWorkIcon sx={{ fontSize: 64, color: "rgba(255,255,255,0.24)", mb: 2 }} />
          <Typography variant="h6" sx={{ color: "#fff", mb: 1 }}>
            No properties yet
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.55)", mb: 3 }}>
            Add your first property to start building your portfolio
          </Typography>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate("/properties/new")}>
            Add Property
          </Button>
        </Box>
      ) : filteredProperties.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No properties match this search or type filter.
        </Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          {filteredProperties.map((property) => {
            const propertyUnits = getPropertyUnits(property.id);
            const occupancy = getOccupancyStatsForUnits(propertyUnits);
            const occupancyPct = occupancy.occupancyPct;
            const propertyType = getTypeLabel(property.property_type);
            const tone = getTypeTone(property.property_type);

            return (
              <Box
                key={property.id}
                onClick={() => openDrawerForProperty(property)}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "16px",
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  minHeight: 286,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  '&:hover': {
                    border: "1px solid rgba(124,92,252,0.2)",
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <Box sx={{ p: 2.5, pb: 0 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ color: "#fff", fontWeight: 700 }}>
                        {property.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
                        {formatAddress(property)}
                      </Typography>
                    </Box>
                    <Chip
                      label={propertyType || "Type"}
                      size="small"
                      sx={{
                        backgroundColor: tone.bg,
                        border: `1px solid ${tone.border}`,
                        color: tone.labelColor,
                        fontWeight: 600,
                      }}
                    />
                  </Stack>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-around",
                      px: 2.5,
                      py: 2,
                      mt: 1,
                    }}
                  >
                    <Box sx={{ flex: 1, textAlign: "center" }}>
                      <Typography variant="body2" sx={{ color: "#fff", fontWeight: 700 }}>
                        {occupancy.total}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
                        Units
                      </Typography>
                    </Box>

                    <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.12)" }} />

                    <Box sx={{ flex: 1, textAlign: "center" }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: occupancy.occupied > 0 && occupancy.occupied === occupancy.total
                            ? "#22c55e"
                            : "#f59e0b",
                          fontWeight: 700,
                        }}
                      >
                        {occupancy.occupied}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
                        Occupied
                      </Typography>
                    </Box>

                    <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.12)" }} />

                    <Box sx={{ flex: 1, textAlign: "center" }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: occupancy.vacant > 0 ? "#fbbf24" : "#22c55e",
                          fontWeight: 700,
                        }}
                      >
                        {occupancy.vacant}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
                        Vacant
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ px: 2.5, pb: 1 }}>
                    <Box
                      sx={{
                        width: "100%",
                        height: 4,
                        backgroundColor: "rgba(255,255,255,0.06)",
                        borderRadius: 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: `${occupancyPct}%`,
                          height: "100%",
                          backgroundColor: occupancyColor(occupancyPct),
                          borderRadius: 2,
                          transition: "width 0.3s",
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", mt: 0.5, display: "block" }}>
                      {occupancyPct}% occupied
                    </Typography>
                  </Box>

                  <Box sx={{ px: 2.5, pb: 1 }}>
                    <Typography variant="body2" sx={{ color: "#7C5CFC", fontWeight: 600 }}>
                      {formatCurrency(occupancy.monthlyRevenue)}/mo revenue
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    mt: "auto",
                    px: 2.5,
                    py: 1.5,
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Button
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation();
                      openDrawerForProperty(property);
                    }}
                    sx={{ color: "#cbd5e1" }}
                  >
                    View Units
                  </Button>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={(event) => handleOpenEditProperty(property, event)}
                      sx={{ color: "rgba(255,255,255,0.75)" }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={actionBusy}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteProperty(property.id);
                      }}
                      sx={{ color: "rgba(255,255,255,0.75)" }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <Drawer
        anchor="right"
        open={Boolean(resolvedSelectedProperty)}
        onClose={closeDrawer}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: "600px" },
            backgroundColor: "#0f172a",
            color: "#fff",
          },
        }}
      >
        {resolvedSelectedProperty ? (
          <Box>
            <Box sx={{ p: 3, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                <Box>
                  <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700 }}>
                    {resolvedSelectedProperty.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)", mt: 0.5 }}>
                    {formatAddress(resolvedSelectedProperty)}
                  </Typography>
                  <Chip
                    size="small"
                    label={getTypeLabel(resolvedSelectedProperty.property_type) || "Type"}
                    sx={{
                      mt: 1,
                      backgroundColor: getTypeTone(resolvedSelectedProperty.property_type).bg,
                      border: `1px solid ${getTypeTone(resolvedSelectedProperty.property_type).border}`,
                      color: getTypeTone(resolvedSelectedProperty.property_type).labelColor,
                      fontWeight: 600,
                    }}
                  />
                </Box>
                <IconButton onClick={closeDrawer} sx={{ mt: -0.75, color: "rgba(255,255,255,0.7)" }}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>

            {selectedPropertyStats ? (
              <>
                <Box sx={{ px: 3, py: 2, backgroundColor: "rgba(255,255,255,0.02)" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Property Stats
                  </Typography>
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <Box sx={{ flex: 1, minWidth: 130 }}>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                        Total Units
                      </Typography>
                      <Typography variant="body1" sx={{ color: "#fff", fontWeight: 700 }}>
                        {selectedPropertyStats.total}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 130 }}>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                        Occupied
                      </Typography>
                      <Typography variant="body1" sx={{ color: "#86efac", fontWeight: 700 }}>
                        {selectedPropertyStats.occupied}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 130 }}>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                        Vacant
                      </Typography>
                      <Typography variant="body1" sx={{ color: "#fbbf24", fontWeight: 700 }}>
                        {selectedPropertyStats.vacant}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 130 }}>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                        Monthly Revenue
                      </Typography>
                      <Typography variant="body1" sx={{ color: "#c4b5fd", fontWeight: 700 }}>
                        {formatCurrency(selectedPropertyStats.monthlyRevenue)}
                      </Typography>
                    </Box>
                  </Stack>

                  <Box sx={{ mt: 2 }}>
                    <Box
                      sx={{
                        width: "100%",
                        height: 6,
                        backgroundColor: "rgba(255,255,255,0.06)",
                        borderRadius: 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: `${selectedPropertyStats.occupancyPct}%`,
                          height: "100%",
                          backgroundColor: occupancyColor(selectedPropertyStats.occupancyPct),
                          borderRadius: 2,
                          transition: "width 0.3s",
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                      {selectedPropertyStats.occupancyPct}% occupied
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ px: 3, py: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: 600 }}>
                      Units
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                      {selectedPropertyUnits.length} total
                    </Typography>
                  </Box>

                  {drawerMode === "units" ? (
                    <>
                      {selectedPropertyUnits.length === 0 ? (
                        <Typography sx={{ color: "rgba(255,255,255,0.6)" }}>No units found for this property.</Typography>
                      ) : (
                        <Box>
                          {selectedPropertyUnits.map((unit) => {
                            const occupied = isUnitOccupied(unit);
                            const unitLease = getActiveLease(unit.id);
                            const tenant =
                              unit.current_tenant_detail ||
                              (unitLease
                                ? unitLease.tenant_detail || tenantsById[Number(unitLease?.tenant)]
                                : null);

                            const statusLabel = occupied ? "Occupied" : unit.is_listed ? "Listed" : "Vacant";
                            const statusColor = occupied ? "success" : unit.is_listed ? "info" : "warning";

                            return (
                              <Box
                                key={unit.id}
                                onClick={(event) => openUnitDetail(unit, event)}
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  p: 2,
                                  mb: 1,
                                  borderRadius: "12px",
                                  backgroundColor: "rgba(255,255,255,0.02)",
                                  border: "1px solid rgba(255,255,255,0.04)",
                                  cursor: "pointer",
                                  '&:hover': {
                                    backgroundColor: "rgba(255,255,255,0.04)",
                                  },
                                }}
                              >
                                <Box>
                                  <Typography variant="body2" sx={{ color: "#fff", fontWeight: 700 }}>
                                    Unit {unit.unit_number}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                                    {getUnitSpecs(unit)}
                                  </Typography>
                                </Box>

                                <Box sx={{ maxWidth: 160 }}>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      color: occupied ? "#fff" : "#fbbf24",
                                      fontStyle: occupied ? "normal" : "italic",
                                    }}
                                  >
                                    {occupied
                                      ? tenant?.full_name || tenant?.name || "Occupied"
                                      : "Vacant"}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                                    {occupied ? "Tenant" : "No active lease"}
                                  </Typography>
                                </Box>

                                <Box sx={{ textAlign: "right" }}>
                                  <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                                    {formatCurrencyWithCents(unit.rent_amount)}/mo
                                  </Typography>
                                  <Chip size="small" color={statusColor} label={statusLabel} />
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      )}
                    </>
                  ) : (
                    <Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <Button
                          size="small"
                          startIcon={<ArrowBack />}
                          onClick={goBackToUnits}
                          sx={{ color: "rgba(255,255,255,0.7)" }}
                        >
                          Back to {resolvedSelectedProperty.name}
                        </Button>
                      </Box>

                      {selectedUnit ? (
                        <>
                          <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, mb: 0.5 }}>
                            Unit {selectedUnit.unit_number}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", mb: 2, display: "block" }}>
                            {getUnitSpecs(selectedUnit)}
                          </Typography>

                          <Typography variant="h5" sx={{ color: "#7C5CFC", fontWeight: 700, mb: 1 }}>
                            {formatCurrencyWithCents(selectedUnit.rent_amount)}/mo
                          </Typography>

                          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                            <Chip
                              size="small"
                              color={isUnitOccupied(selectedUnit) ? "success" : "warning"}
                              label={isUnitOccupied(selectedUnit) ? "Occupied" : "Vacant"}
                            />
                            <Chip
                              size="small"
                              color={selectedUnit.is_listed ? "info" : "default"}
                              label={selectedUnit.is_listed ? "Listed" : "Unlisted"}
                            />
                          </Stack>

                          {selectedUnitTenant ? (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: 600 }}>
                                Tenant
                              </Typography>
                              <Typography sx={{ color: "#fff" }}>
                                {selectedUnitTenant.full_name || selectedUnitTenant.name}
                              </Typography>
                              {selectedUnitTenant.email ? (
                                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                                  {selectedUnitTenant.email}
                                </Typography>
                              ) : null}
                              {selectedUnitTenant.phone ? (
                                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                                  {selectedUnitTenant.phone}
                                </Typography>
                              ) : null}
                              <Button
                                size="small"
                                onClick={() => navigate("/tenants")}
                                sx={{ mt: 1, color: "#60a5fa" }}
                              >
                                View Full Tenant Profile
                              </Button>
                            </Box>
                          ) : (
                            <Typography sx={{ color: "rgba(255,255,255,0.5)", mt: 2 }}>No active lease</Typography>
                          )}

                          <Box sx={{ mt: 3 }}>
                            <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: 600, mb: 1 }}>
                              Lease
                            </Typography>
                            {selectedUnitLease ? (
                              <Box
                                sx={{
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  borderRadius: 2,
                                  p: 2,
                                  backgroundColor: "rgba(255,255,255,0.03)",
                                }}
                              >
                                <Typography variant="body2" sx={{ color: "#fff", mb: 0.5 }}>
                                  {formatDate(selectedUnitLease.start_date)} ? {formatDate(selectedUnitLease.end_date)}
                                </Typography>
                                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                                  Monthly: {formatCurrencyWithCents(selectedUnitLease.monthly_rent)}
                                </Typography>
                                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)", mb: 0.5 }}>
                                  Term: {selectedUnitLease.term || "N/A"}
                                </Typography>
                                <Chip
                                  size="small"
                                  color={selectedUnitLease.is_active ? "success" : "default"}
                                  label={selectedUnitLease.is_active ? "Active" : "Inactive"}
                                />
                              </Box>
                            ) : (
                              <Typography sx={{ color: "rgba(255,255,255,0.5)" }}>No active lease</Typography>
                            )}
                          </Box>

                          <Stack direction="row" spacing={1.5} sx={{ mt: 3, flexWrap: "wrap" }}>
                            <Button variant="outlined" size="small" onClick={handleOpenEditUnit}>
                              Edit Unit
                            </Button>
                            <Button variant="outlined" size="small" onClick={handleToggleListing} disabled={actionBusy}>
                              {selectedUnit.is_listed ? "Unlist Unit" : "List Unit"}
                            </Button>
                            {!isUnitOccupied(selectedUnit) ? (
                              <Button variant="contained" size="small" onClick={handleOpenCreateLease}>
                                Create Lease
                              </Button>
                            ) : null}
                          </Stack>
                        </>
                      ) : null}
                    </Box>
                  )}
                </Box>
              </>
            ) : null}
          </Box>
        ) : null}
      </Drawer>

      <Dialog open={editUnitOpen} onClose={() => setEditUnitOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Edit Unit</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>Update unit details for this property.</DialogContentText>
          <Stack spacing={2}>
            <TextField
              label="Unit number"
              value={editUnitData.unit_number}
              onChange={(event) =>
                setEditUnitData((prev) => ({
                  ...prev,
                  unit_number: event.target.value,
                }))
              }
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Bedrooms"
                type="number"
                value={editUnitData.bedrooms}
                onChange={(event) =>
                  setEditUnitData((prev) => ({
                    ...prev,
                    bedrooms: event.target.value,
                  }))
                }
                fullWidth
              />
              <TextField
                label="Bathrooms"
                type="number"
                value={editUnitData.bathrooms}
                onChange={(event) =>
                  setEditUnitData((prev) => ({
                    ...prev,
                    bathrooms: event.target.value,
                  }))
                }
                fullWidth
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Square feet"
                type="number"
                value={editUnitData.square_feet}
                onChange={(event) =>
                  setEditUnitData((prev) => ({
                    ...prev,
                    square_feet: event.target.value,
                  }))
                }
                fullWidth
              />
              <TextField
                label="Monthly rent"
                type="number"
                value={editUnitData.rent_amount}
                onChange={(event) =>
                  setEditUnitData((prev) => ({
                    ...prev,
                    rent_amount: event.target.value,
                  }))
                }
                fullWidth
              />
            </Stack>
            <FormControlLabel
              control={<Checkbox checked={editUnitData.is_available} onChange={(event) => setEditUnitData((prev) => ({ ...prev, is_available: event.target.checked }))} />}
              label="Available"
            />
            <FormControlLabel
              control={<Checkbox checked={editUnitData.is_listed} onChange={(event) => setEditUnitData((prev) => ({ ...prev, is_listed: event.target.checked }))} />}
              label="Listed"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUnitOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUnit} disabled={editUnitSaving}>
            {editUnitSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createLeaseOpen} onClose={() => setCreateLeaseOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Lease</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Create a lease for {selectedUnit ? `Unit ${selectedUnit.unit_number}` : "the selected unit"}.
          </DialogContentText>
          <Stack spacing={2}>
            <TextField
              select
              label="Tenant"
              value={leaseForm.tenant}
              onChange={(event) => setLeaseForm((prev) => ({ ...prev, tenant: event.target.value }))}
              fullWidth
            >
              {tenants.map((tenant) => (
                <MenuItem key={tenant.id} value={tenant.id}>
                  {tenant.full_name || tenant.name || `Tenant #${tenant.id}`}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Lease start"
                type="date"
                value={leaseForm.start_date}
                onChange={(event) => setLeaseForm((prev) => ({ ...prev, start_date: event.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Lease end"
                type="date"
                value={leaseForm.end_date}
                onChange={(event) => setLeaseForm((prev) => ({ ...prev, end_date: event.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            <TextField
              label="Monthly rent"
              type="number"
              value={leaseForm.monthly_rent}
              onChange={(event) => setLeaseForm((prev) => ({ ...prev, monthly_rent: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Security deposit"
              type="number"
              value={leaseForm.security_deposit}
              onChange={(event) => setLeaseForm((prev) => ({ ...prev, security_deposit: event.target.value }))}
              fullWidth
            />
            <FormControlLabel
              control={<Checkbox checked={leaseForm.is_active} onChange={(event) => setLeaseForm((prev) => ({ ...prev, is_active: event.target.checked }))} />}
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateLeaseOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateLease} disabled={leaseSaving}>
            {leaseSaving ? "Creating..." : "Create Lease"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default PropertyList;
