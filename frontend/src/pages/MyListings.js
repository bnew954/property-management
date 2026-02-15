import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
  InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DescriptionIcon from "@mui/icons-material/Description";
import EditIcon from "@mui/icons-material/Edit";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import HomeWork from "@mui/icons-material/HomeWork";
import SearchIcon from "@mui/icons-material/Search";
import { getUnits } from "../services/api";

function formatCurrency(value) {
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, amount));
}

function getDaysListed(listing) {
  const dateValue = listing?.listed_date || listing?.created_at;
  if (!dateValue) return null;
  const created = new Date(dateValue);
  if (Number.isNaN(created.getTime())) return null;
  const now = new Date();
  const diff = Math.max(0, now.getTime() - created.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getAddress(listing) {
  const parts = [
    listing?.property_address_line1,
    listing?.property_address_line2,
    listing?.property_city,
    [listing?.property_state, listing?.property_zip_code].filter(Boolean).join(" "),
  ]
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return listing.full_address || "";
}

function ListingCard({ listing, onCopy }) {
  const photo = listing?.listing_photos?.[0];
  const propertyName = listing?.property_name || "Property";
  const unitLabel = listing?.unit_number ? `Unit ${listing.unit_number}` : "Unit";
  const title = `${propertyName} - ${unitLabel}`;
  const rent = formatCurrency(listing?.rent_amount);
  const statusLabel = listing?.is_listed ? "Listed" : "Unlisted";
  const publicUrl = listing?.listing_slug
    ? `${window.location.origin}/listing/${listing.listing_slug}`
    : "";
  const daysListed = getDaysListed(listing);
  const editPath = listing?.property ? `/properties/${listing.property}/units/${listing.id}/edit` : "/properties";
  const address = getAddress(listing);
  const specs = [];
  if (listing?.bedrooms !== null && listing?.bedrooms !== undefined) {
    specs.push(`${listing.bedrooms} BR`);
  }
  if (listing?.bathrooms !== null && listing?.bathrooms !== undefined) {
    specs.push(`${listing.bathrooms} BA`);
  }
  if (listing?.square_feet !== null && listing?.square_feet !== undefined) {
    specs.push(`${listing.square_feet} sqft`);
  }
  const hasApplicationMetric =
    listing?.application_count !== undefined || listing?.applications_count !== undefined;
  const applicationCount = Number(listing?.application_count ?? listing?.applications_count ?? 0);
  const propertyTypeGradient = "linear-gradient(145deg, rgba(30,30,40,0.9) 0%, rgba(20,20,28,0.95) 100%)";

  const copyToClipboard = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    onCopy(publicUrl);
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "16px",
        overflow: "hidden",
        transition: "all 0.2s",
        "&:hover": {
          border: "1px solid rgba(124,92,252,0.2)",
          transform: "translateY(-2px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        },
      }}
    >
      <Box
        sx={{
          height: 200,
          position: "relative",
          overflow: "hidden",
          background: propertyTypeGradient,
        }}
      >
        {photo ? (
          <Box
            component="img"
            src={photo}
            alt={title}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : null}
        <Chip
          size="small"
          label={statusLabel}
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            height: 26,
            borderRadius: "999px",
            fontWeight: 700,
            fontSize: "0.75rem",
            bgcolor: listing?.is_listed ? "rgba(39, 202, 64, 0.9)" : "rgba(120, 120, 120, 0.9)",
            color: "#fff",
            border: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        />
        <Chip
          size="small"
          label={`${rent}/mo`}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            height: 24,
            borderRadius: "8px",
            px: 1.5,
            py: 0.5,
            fontWeight: 700,
            fontSize: "0.85rem",
            color: "#fff",
            bgcolor: "rgba(0, 0, 0, 0.75)",
            border: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            backdropFilter: "blur(4px)",
          }}
        />
        {!photo ? (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              height: 200,
              width: "100%",
              background: "linear-gradient(145deg, rgba(30,30,40,0.9) 0%, rgba(20,20,28,0.95) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <HomeWork sx={{ fontSize: 48, color: "rgba(124,92,252,0.15)" }} />
          </Box>
        ) : null}
      </Box>

      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", flex: 1 }}>
        <Typography variant="subtitle1" sx={{ color: "#fff", fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 0.4, color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>
          {address}
        </Typography>
        <Typography sx={{ mt: 1, color: "rgba(255,255,255,0.55)", fontSize: "0.84rem" }}>
          {specs.length > 0 ? specs.join(" · ") : "Specs coming soon"}
        </Typography>
        <Typography sx={{ mt: 2, color: "rgba(255,255,255,0.45)", fontSize: "0.74rem", display: "flex", alignItems: "center", gap: 1 }}>
          {daysListed !== null ? (
            <>
              <CalendarTodayIcon sx={{ fontSize: 15 }} />
              {daysListed} days listed
            </>
          ) : null}
          {hasApplicationMetric ? (
            <>
              <DescriptionIcon sx={{ fontSize: 15, ml: 1.5 }} />
              {applicationCount} applications
            </>
          ) : null}
        </Typography>

        <Box
          sx={{
            px: 2.5,
            pb: 2,
            pt: 1,
            mt: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton
              size="small"
              component={Link}
              to={editPath}
              aria-label="Edit unit"
              sx={{ color: "rgba(255,255,255,0.75)" }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <Tooltip title="Copy link" arrow>
              <IconButton
                size="small"
                onClick={copyToClipboard}
                aria-label="Copy public link"
                sx={{ color: "rgba(255,255,255,0.75)" }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Button
            variant="outlined"
            component={publicUrl ? "a" : "button"}
            href={publicUrl || undefined}
            target="_blank"
            rel="noreferrer"
            size="small"
            disabled={!publicUrl}
            sx={{
              borderColor: "rgba(124,92,252,0.5)",
              color: "#7c5cfc",
              borderRadius: "8px",
              textTransform: "none",
              "&:hover": {
                borderColor: "#7c5cfc",
                backgroundColor: "rgba(124,92,252,0.08)",
              },
            }}
          >
            View Listing
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

function MyListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getUnits();
      setListings(response.data || []);
      setError("");
    } catch (err) {
      setListings([]);
      setError("Unable to load your listings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const filteredListings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return listings
      .filter((listing) => {
        if (statusFilter === "Listed") return Boolean(listing?.is_listed);
        if (statusFilter === "Unlisted") return !Boolean(listing?.is_listed);
        return true;
      })
      .filter((listing) => {
        if (!normalizedSearch) return true;
        const haystack = [
          listing?.property_name,
          listing?.unit_number,
          listing?.listing_title,
          listing?.listing_description,
        ]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");
        return haystack.includes(normalizedSearch);
      });
  }, [listings, searchTerm, statusFilter]);

  const countLabel = `${filteredListings.length} active listings`;

  const handleCopy = () => {
    setSnackbarMessage("Public listing link copied");
    window.setTimeout(() => {
      setSnackbarMessage("");
    }, 1200);
  };

  return (
    <Box sx={{ backgroundColor: "#0a0a0f", minHeight: "100vh", px: { xs: 2, md: 3 }, py: 3, color: "#fff" }}>
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            mb: 3,
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff" }}>
            Listings
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, flexWrap: "wrap", ml: "auto" }}>
            <TextField
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              size="small"
              placeholder="Search listings..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "rgba(255,255,255,0.45)" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: 250,
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderRadius: "999px",
                  color: "#fff",
                },
              }}
            />
            <Button
              component={Link}
              to="/properties"
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                textTransform: "none",
                borderRadius: "8px",
                backgroundColor: "#7C5CFC",
                "&:hover": { backgroundColor: "#6B4FD8" },
                px: 3,
                whiteSpace: "nowrap",
              }}
            >
              List a Unit
            </Button>
          </Box>
        </Box>

        <Box sx={{ mb: 2, display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <Chip
            label="All"
            onClick={() => setStatusFilter("All")}
            sx={{
              color: statusFilter === "All" ? "#fff" : "rgba(255,255,255,0.6)",
              borderColor: statusFilter === "All" ? "rgba(124,92,252,0.9)" : "rgba(255,255,255,0.25)",
              bgcolor: statusFilter === "All" ? "#7C5CFC" : "transparent",
              borderRadius: "999px",
              "& .MuiChip-label": { px: 0.6 },
            }}
            variant={statusFilter === "All" ? "filled" : "outlined"}
          />
          <Chip
            label="Listed"
            onClick={() => setStatusFilter("Listed")}
            sx={{
              color: statusFilter === "Listed" ? "#fff" : "rgba(255,255,255,0.6)",
              borderColor: statusFilter === "Listed" ? "rgba(39,202,64,0.9)" : "rgba(255,255,255,0.25)",
              bgcolor: statusFilter === "Listed" ? "rgba(39,202,64,0.2)" : "transparent",
              borderRadius: "999px",
              "& .MuiChip-label": { px: 0.6 },
            }}
            variant={statusFilter === "Listed" ? "filled" : "outlined"}
          />
          <Chip
            label="Unlisted"
            onClick={() => setStatusFilter("Unlisted")}
            sx={{
              color: statusFilter === "Unlisted" ? "#fff" : "rgba(255,255,255,0.6)",
              borderColor:
                statusFilter === "Unlisted" ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)",
              bgcolor: statusFilter === "Unlisted" ? "rgba(255,255,255,0.16)" : "transparent",
              borderRadius: "999px",
              "& .MuiChip-label": { px: 0.6 },
            }}
            variant={statusFilter === "Unlisted" ? "filled" : "outlined"}
          />
          <Typography sx={{ ml: "auto", color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
            {countLabel}
          </Typography>
        </Box>

        {loading ? (
          <Typography sx={{ color: "rgba(255,255,255,0.72)" }}>Loading listings...</Typography>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : filteredListings.length === 0 ? (
          <Box
            sx={{
              p: 6,
              textAlign: "center",
              border: "1px dashed rgba(255,255,255,0.18)",
              borderRadius: "16px",
              backgroundColor: "rgba(255,255,255,0.03)",
            }}
          >
            <HomeWorkIcon sx={{ fontSize: 64, color: "rgba(255,255,255,0.35)", mb: 1.2 }} />
            <Typography variant="h6" sx={{ color: "#fff", mb: 1.2 }}>
              No listings yet
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.6)", mb: 2.2 }}>
              List your first unit to start attracting tenants
            </Typography>
            <Button component={Link} to="/properties" variant="contained" sx={{ borderRadius: "8px" }}>
              + List a Unit
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "repeat(3, 1fr)",
              },
              gap: 3,
            }}
          >
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id || listing.listing_slug} listing={listing} onCopy={handleCopy} />
            ))}
          </Box>
        )}
      </Box>

      <Snackbar
        open={Boolean(snackbarMessage)}
        autoHideDuration={1200}
        onClose={() => setSnackbarMessage("")}
        message={snackbarMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}

export default MyListings;
