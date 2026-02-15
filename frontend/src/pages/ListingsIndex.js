import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Pagination,
  TextField,
  Typography,
} from "@mui/material";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import { getListings } from "../services/api";

const PRIMARY_TEXT = "#1a1a2e";
const SECONDARY_TEXT = "#6b7280";
const BORDER_COLOR = "#e5e7eb";

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
  const propertyName = listing.property_name || "Property";
  const unitLabel = listing.unit_number ? `Unit ${listing.unit_number}` : "";
  const title = listing.listing_title || `${propertyName}${unitLabel ? ` - ${unitLabel}` : ""}`;
  const address = listing.full_address || propertyName || "Listing";
  const details = `${listing.bedrooms ?? "—"} br - ${listing.bathrooms ?? "—"} ba - ${listing.square_feet ?? "—"} sqft`;

  return (
    <Card
      component={Link}
      to={`/listing/${listing.listing_slug}`}
      sx={{
        height: "100%",
        border: `1px solid ${BORDER_COLOR}`,
        bgcolor: "#ffffff",
        color: PRIMARY_TEXT,
        borderRadius: 2,
        overflow: "hidden",
        textDecoration: "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: "#059669",
          transform: "translateY(-2px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
        },
      }}
    >
      <Box>
        <Box
          sx={{
            width: "100%",
            height: 165,
            bgcolor: "#f8f9fa",
            display: "grid",
            placeItems: "center",
            borderBottom: `1px solid ${BORDER_COLOR}`,
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
            <HomeWorkIcon sx={{ fontSize: 56, color: "#c7d2fe" }} />
          )}
        </Box>

        <CardContent sx={{ display: "flex", flexDirection: "column" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.6, color: PRIMARY_TEXT }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: 13, color: SECONDARY_TEXT, mb: 0.6 }}>{address}</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 18, color: "#4f46e5", mb: 0.9 }}>
            {formatCurrency(listing.rent_amount)} / month
          </Typography>
          <Typography sx={{ fontSize: 12, color: SECONDARY_TEXT, mb: 0.8 }}>{details}</Typography>
          <Button
            fullWidth
            variant="contained"
            sx={{
              mt: 1.4,
              backgroundColor: "#059669",
              color: "#fff",
              textTransform: "none",
              borderRadius: "10px",
              fontWeight: 600,
              py: 1.05,
              "&:hover": { backgroundColor: "#047857" },
            }}
          >
            View Listing
          </Button>
        </CardContent>
      </Box>
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
    <Box sx={{ px: 0, backgroundColor: "#f8f9fa", minHeight: "100vh", color: PRIMARY_TEXT }}>
      <Box sx={{ pt: "64px", px: { xs: 2, md: 3 } }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: PRIMARY_TEXT }}>
          Vacant Listings
        </Typography>
        <Typography sx={{ color: SECONDARY_TEXT, mb: 2 }}>Powered by Onyx PM</Typography>

        <Grid container spacing={1.5} sx={{ mb: 2, alignItems: "center" }}>
          <Grid item xs={12} sm={4} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Min Rent"
              value={filters.min_rent}
              onChange={(event) => setFilters((prev) => ({ ...prev, min_rent: event.target.value }))}
              sx={{
                "& .MuiInputLabel-root": { color: SECONDARY_TEXT },
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#fff",
                  borderRadius: "10px",
                  "& fieldset": { borderColor: BORDER_COLOR },
                  "&:hover fieldset": { borderColor: "#d1d5db" },
                },
                "& .MuiInputBase-input": { color: PRIMARY_TEXT },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Max Rent"
              value={filters.max_rent}
              onChange={(event) => setFilters((prev) => ({ ...prev, max_rent: event.target.value }))}
              sx={{
                "& .MuiInputLabel-root": { color: SECONDARY_TEXT },
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#fff",
                  borderRadius: "10px",
                  "& fieldset": { borderColor: BORDER_COLOR },
                  "&:hover fieldset": { borderColor: "#d1d5db" },
                },
                "& .MuiInputBase-input": { color: PRIMARY_TEXT },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Bedrooms"
              value={filters.bedrooms}
              onChange={(event) => setFilters((prev) => ({ ...prev, bedrooms: event.target.value }))}
              sx={{
                "& .MuiInputLabel-root": { color: SECONDARY_TEXT },
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#fff",
                  borderRadius: "10px",
                  "& fieldset": { borderColor: BORDER_COLOR },
                  "&:hover fieldset": { borderColor: "#d1d5db" },
                },
                "& .MuiInputBase-input": { color: PRIMARY_TEXT },
              }}
            />
          </Grid>
        </Grid>

        {loading ? (
          <Typography sx={{ color: SECONDARY_TEXT }}>Loading listings...</Typography>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : listings.length === 0 ? (
          <Card
            sx={{
              border: `1px dashed ${BORDER_COLOR}`,
              borderRadius: 2,
              bgcolor: "#fff",
              py: 4,
              textAlign: "center",
            }}
          >
            <Typography>No listings available yet.</Typography>
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

        <Divider sx={{ mt: 3.5, mb: 2, borderColor: BORDER_COLOR }} />
        <Typography sx={{ color: SECONDARY_TEXT, fontSize: 12 }}>
          Search, compare, and apply to available units directly from your browser.
        </Typography>
      </Box>
    </Box>
  );
}

export default ListingsIndex;
