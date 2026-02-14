import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Divider,
  Grid,
  Pagination,
  TextField,
  Typography,
} from "@mui/material";
import { getListings } from "../services/api";

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
  const details = `${listing.bedrooms} br - ${listing.bathrooms} ba - ${listing.square_feet} sqft`;

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
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function ListingsIndex() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ min_rent: "", max_rent: "", bedrooms: "" });
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.min_rent) params.min_rent = filters.min_rent;
      if (filters.max_rent) params.max_rent = filters.max_rent;
      if (filters.bedrooms) params.bedrooms = filters.bedrooms;

      const response = await getListings(params);
      setListings(response.data || []);
      setError("");
    } catch {
      setError("Unable to load listings.");
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

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
    <Box sx={{ px: 0 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1.5, mb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "text.primary" }}>
          Vacant Listings
        </Typography>
      </Box>
      <Typography sx={{ color: "text.secondary", mb: 2 }}>Powered by Onyx PM</Typography>

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
        <Typography sx={{ color: "text.secondary" }}>Loading listings...</Typography>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : listings.length === 0 ? (
        <Card
          sx={{ border: "1px dashed", borderColor: "divider", bgcolor: "background.paper", py: 4, textAlign: "center" }}
        >
          <CardContent>
            <Typography>No listings available yet.</Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(1, minmax(0, 1fr))", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
              gap: 1.5,
            }}
          >
            {visibleRows.map((listing) => (
              <Box key={listing.listing_slug || listing.id}>
                <ListingCard listing={listing} />
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
        Search, compare, and apply to available units directly from your browser.
      </Typography>
    </Box>
  );
}

export default ListingsIndex;
