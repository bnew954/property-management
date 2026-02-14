import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Button,
  IconButton,
  Chip,
  Divider,
  Grid,
  Pagination,
  Tooltip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import { useUser } from "../services/userContext";
import { getListings, getUnits } from "../services/api";

const amenitiesToDisplay = (amenities) => {
  if (!Array.isArray(amenities)) return [];
  return amenities.filter(Boolean);
};

function formatCurrency(value) {
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, amount));
}

function ListingCard({ listing }) {
  const photo = listing?.listing_photos?.[0];
  const title = listing.listing_title || `Unit ${listing.unit_number}`;
  const address = listing.full_address || listing.property_name || "Listing";
  const details = `${listing.bedrooms} br · ${listing.bathrooms} ba · ${listing.square_feet} sqft`;
  const amenities = amenitiesToDisplay(listing.listing_amenities).slice(0, 3);

  return (
    <Card
      sx={{
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        "&:hover": { borderColor: "primary.main" },
      }}
      component={Link}
      to={`/listing/${listing.listing_slug}`}
      state={{ from: "listings" }}
      style={{ textDecoration: "none" }}
    >
      <CardActionArea sx={{ alignItems: "stretch", display: "flex", justifyContent: "flex-start", textAlign: "left", height: "100%" }}>
        <Box
          sx={{
            width: "100%",
            height: 165,
            bgcolor: "action.hover",
            display: "grid",
            placeItems: "center",
            borderBottom: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {photo ? (
            <img
              src={photo}
              alt={title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{address}</Typography>
          )}
        </Box>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.6 }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 0.6 }}>{address}</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 18, color: "primary.main", mb: 0.9 }}>
            {formatCurrency(listing.rent_amount)} / month
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.8 }}>{details}</Typography>
          <Stack direction="row" spacing={0.7} sx={{ flexWrap: "wrap", gap: 0.7 }}>
            {amenities.map((tag) => (
              <Chip key={tag} size="small" label={tag} sx={{ fontSize: 11, height: 20 }} />
            ))}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function LandlordListingCard({ listing }) {
  const photo = listing?.listing_photos?.[0];
  const title = listing.listing_title || `Unit ${listing.unit_number}`;
  const address = listing.full_address || listing.property_name || "Listing";
  const rent = formatCurrency(listing.rent_amount);
  const propertyName = listing.property_name || "Property";
  const publicUrl = listing.listing_slug ? `${window.location.origin}/listing/${listing.listing_slug}` : "";
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch (err) {
      setCopied(false);
    }
  };

  return (
    <Card
      sx={{
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
        <CardContent sx={{ p: 1.5 }}>
        <Box
          sx={{
            width: "100%",
            height: 140,
            bgcolor: "action.hover",
            display: "grid",
            placeItems: "center",
            borderBottom: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
            position: "relative",
            mb: 1,
          }}
        >
          {photo ? (
            <img
              src={photo}
              alt={title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{address}</Typography>
          )}
        </Box>

        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.4 }}>
          {propertyName}
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 0.6 }}>{address}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 16, color: "primary.main", mb: 0.9 }}>
          {rent}
          <Typography component="span" sx={{ fontSize: 12, fontWeight: 500, color: "text.secondary" }}>
            {` / month`}
          </Typography>
        </Typography>

        <Typography
          sx={{ fontSize: 12, color: listing.is_listed ? "success.main" : "text.secondary", mb: 1 }}
        >
          Status: {listing.is_listed ? "Listed" : "Unlisted"}
        </Typography>

        {listing.is_listed && listing.listing_slug ? (
          <Box sx={{ mt: 1, mb: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={0.8} sx={{ mb: 0.4 }}>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Public URL</Typography>
              <Tooltip title={copied ? "Copied!" : "Copy link"} arrow>
                <IconButton size="small" onClick={copyToClipboard} aria-label="Copy public link">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            <Button
              size="small"
              variant="outlined"
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              fullWidth
              sx={{ justifyContent: "flex-start", textTransform: "none" }}
            >
              Open Listing
            </Button>
          </Box>
        ) : null}

        <Stack direction="row" spacing={1} sx={{ mt: listing.is_listed && listing.listing_slug ? 0.8 : 0.4 }}>
          <Button
            component={Link}
            to={`/properties/${listing.property}/units/${listing.id}/edit`}
            variant="contained"
            size="small"
          >
            Edit Unit
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ListingsIndex() {
  const { user, role } = useUser();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ min_rent: "", max_rent: "", bedrooms: "" });
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const isLandlordView = role === "landlord" && Boolean(user);
  const pageTitle = isLandlordView ? "Listings" : "Vacant Listings";

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      let sourceData = [];
      if (isLandlordView) {
        const unitResponse = await getUnits();
        sourceData = (unitResponse.data || []).filter((unit) => Boolean(unit.is_listed));
      } else {
        if (filters.min_rent) params.min_rent = filters.min_rent;
        if (filters.max_rent) params.max_rent = filters.max_rent;
        if (filters.bedrooms) params.bedrooms = filters.bedrooms;
        const response = await getListings(params);
        sourceData = response.data || [];
      }

      setListings(sourceData);
      setError("");
    } catch (err) {
      setError("Unable to load listings.");
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [filters, isLandlordView]);

  useEffect(() => {
    setPage(1);
    loadListings();
  }, [loadListings]);

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(listings.length / pageSize) || 1);
  const visibleRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return listings.slice(start, start + pageSize);
  }, [listings, page]);

  return (
    <Box sx={{ pl: isLandlordView ? 3 : 0, pr: isLandlordView ? 3 : 0, pt: isLandlordView ? 3 : 0 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1.5, mb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "text.primary" }}>
          {pageTitle}
        </Typography>
        {isLandlordView ? (
          <Button component={Link} to="/properties" variant="contained" size="small">
            + List a Unit
          </Button>
        ) : null}
      </Box>
      <Typography sx={{ color: "text.secondary", mb: 2 }}>
        {isLandlordView ? "Manage your listed units, copy public URLs, and edit listing settings." : "Powered by Onyx PM"}
      </Typography>

      {!isLandlordView ? (
        <Grid container spacing={1.5} sx={{ mb: 2, alignItems: "center" }}>
          <Grid item xs={12} sm={4} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Min Rent"
              value={filters.min_rent}
              onChange={(event) => setFilters((prev) => ({ ...prev, min_rent: event.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Max Rent"
              value={filters.max_rent}
              onChange={(event) => setFilters((prev) => ({ ...prev, max_rent: event.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Bedrooms"
              value={filters.bedrooms}
              onChange={(event) => setFilters((prev) => ({ ...prev, bedrooms: event.target.value }))}
            />
          </Grid>
        </Grid>
      ) : null}

      {loading ? (
        <Typography sx={{ color: "text.secondary" }}>Loading listings…</Typography>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : listings.length === 0 ? (
        <Card
          sx={{
            border: "1px dashed",
            borderColor: "divider",
            bgcolor: "background.paper",
            py: 4,
            textAlign: "center",
          }}
        >
          <CardContent>
            {isLandlordView ? (
              <>
                <HomeWorkIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1.2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", mb: 0.6 }}>
                  No active listings
                </Typography>
                <Typography sx={{ color: "text.secondary", maxWidth: 560, mx: "auto", mb: 2 }}>
                  List a vacant unit to attract tenants. Go to Properties to edit a unit and toggle the listing on.
                </Typography>
                <Button component={Link} to="/properties" variant="contained" size="small">
                  Go to Properties
                </Button>
              </>
            ) : (
              <Typography>No listings available yet.</Typography>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "repeat(1, minmax(0, 1fr))", md: "repeat(auto-fill, minmax(220px, 1fr))" },
                gap: "16px",
              }}
            >
            {visibleRows.map((listing) => (
              <Box sx={{ minWidth: 220 }} key={listing.id || listing.listing_slug}>
                {isLandlordView ? <LandlordListingCard listing={listing} /> : <ListingCard listing={listing} />}
              </Box>
            ))}
          </Box>
          {totalPages > 1 ? (
            <Box sx={{ mt: 2.5, display: "flex", justifyContent: "center" }}>
              <Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} />
            </Box>
          ) : null}
        </>
      )}

      <Divider sx={{ mt: 3.5, mb: 2 }} />
      <Typography sx={{ color: "text.secondary", fontSize: 12 }}>
        {isLandlordView
          ? "Landlord listing management for your vacant units. Manage, edit, and share public listing pages here."
          : "Need to list properties fast? Onyx PM makes vacant unit listing, application intake, and leasing workflows simple."}
      </Typography>
    </Box>
  );
}

export default ListingsIndex;
