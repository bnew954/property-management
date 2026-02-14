import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Grid,
  Pagination,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
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

  return (
    <Card
      sx={{
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <CardContent>
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

        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.6 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 0.6 }}>{address}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 18, color: "primary.main", mb: 0.9 }}>
          {rent}
          <Typography component="span" sx={{ fontSize: 12, fontWeight: 500, color: "text.secondary" }}>
            {` / month`}
          </Typography>
        </Typography>

        <Typography sx={{ fontSize: 12, color: listing.is_listed ? "success.main" : "text.secondary", mb: 1 }}>
          Status: {listing.is_listed ? "Listed" : "Unlisted"}
        </Typography>

        {listing.is_listed && listing.listing_slug ? (
          <Typography
            component={Link}
            to={`/listing/${listing.listing_slug}`}
            target="_blank"
            rel="noreferrer"
            sx={{ display: "block", fontSize: 12, mb: 0.6 }}
          >
            Preview Public Listing
          </Typography>
        ) : null}

        <Typography
          component={Link}
          to={`/properties/${listing.property}/units/${listing.id}/edit`}
          sx={{
            display: "inline-block",
            mt: 1,
            fontSize: 12,
            fontWeight: 600,
            color: "primary.main",
            textDecoration: "none",
          }}
        >
          Edit Unit
        </Typography>

        <Typography sx={{ mt: 0.8, fontSize: 12, color: "text.secondary" }}>
          Analytics placeholder
        </Typography>
      </CardContent>
    </Card>
  );
}

function applyUnitFilters(units, filters) {
  return units.filter((unit) => {
    const minRent = filters.min_rent ? Number(filters.min_rent) : null;
    const maxRent = filters.max_rent ? Number(filters.max_rent) : null;
    const bedReq = filters.bedrooms ? Number(filters.bedrooms) : null;
    const rent = Number(unit.rent_amount);
    if (!Number.isNaN(minRent) && minRent > 0 && (Number.isNaN(rent) || rent < minRent)) {
      return false;
    }
    if (!Number.isNaN(maxRent) && maxRent > 0 && (Number.isNaN(rent) || rent > maxRent)) {
      return false;
    }
    if (!Number.isNaN(bedReq) && Number.isFinite(bedReq)) {
      if (Number(unit.bedrooms) !== bedReq) {
        return false;
      }
    }
    return true;
  });
}

function ListingsIndex() {
  const { user, role } = useUser();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ min_rent: "", max_rent: "", bedrooms: "" });
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const isLandlordView = role === "landlord" && Boolean(user);

  const loadListings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.min_rent) params.min_rent = filters.min_rent;
      if (filters.max_rent) params.max_rent = filters.max_rent;
      if (filters.bedrooms) params.bedrooms = filters.bedrooms;

      let sourceData = [];
      if (isLandlordView) {
        const unitResponse = await getUnits({ ...params, is_listed: true });
        sourceData = applyUnitFilters(unitResponse.data || [], filters);
      } else {
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
  };

  useEffect(() => {
    setPage(1);
    loadListings();
  }, [filters, role, user]);

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(listings.length / pageSize) || 1);
  const visibleRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return listings.slice(start, start + pageSize);
  }, [listings, page]);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, color: "text.primary", mb: 0.4 }}>
        {isLandlordView ? "My Listed Units" : "Vacant Listings"}
      </Typography>
      <Typography sx={{ color: "text.secondary", mb: 2 }}>
        {isLandlordView
          ? "Manage your listed units, copy public URLs, and open the unit editor from here."
          : "Powered by Onyx PM"}
      </Typography>

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

      {loading ? (
        <Typography sx={{ color: "text.secondary" }}>Loading listings…</Typography>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : listings.length === 0 ? (
        <Card sx={{ border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
          <CardContent>
            <Typography>
              {isLandlordView
                ? "No units are currently listed. Mark a unit as listed in the unit editor to publish it."
                : "No listings available yet."}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          <Grid container spacing={2}>
            {visibleRows.map((listing) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={listing.id || listing.listing_slug}>
                {isLandlordView ? <LandlordListingCard listing={listing} /> : <ListingCard listing={listing} />}
              </Grid>
            ))}
          </Grid>
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
          ? "Landlord listing management for your vacant units. Application and lease signing flows are in progress."
          : "Need to list properties fast? Onyx PM makes vacant unit listing, application intake, and leasing workflows simple."}
      </Typography>
    </Box>
  );
}

export default ListingsIndex;
