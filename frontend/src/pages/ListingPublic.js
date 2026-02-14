import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { getListingBySlug } from "../services/api";

function formatCurrency(value) {
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.max(0, amount));
}

function placeholderImage(title) {
  return `https://placehold.co/1200x700/e5e7eb/0f172a?text=${encodeURIComponent(
    title || "Property"
  )}`;
}

function formatDate(value) {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ListingPublic() {
  const { slug } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadListing = async () => {
    setLoading(true);
    try {
      const response = await getListingBySlug(slug);
      const payload = response.data || null;
      setListing(payload);
      setError("");

      const title = payload?.listing_title || "Unit";
      const address = payload?.full_address || "";
      document.title = `${title} | ${address}`;
    } catch (err) {
      setListing(null);
      setError("This listing is no longer available.");
      document.title = "Listing not found | Onyx PM";
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListing();
  }, [slug]);

  const photos = useMemo(() => {
    if (!listing || !Array.isArray(listing.listing_photos)) return [];
    return listing.listing_photos.filter(Boolean);
  }, [listing]);

  const amenities = useMemo(() => {
    if (!listing || !Array.isArray(listing.listing_amenities)) return [];
    return listing.listing_amenities.filter(Boolean);
  }, [listing]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Typography>Loading listing...</Typography>
      </Container>
    );
  }

  if (error || !listing) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error">{error || "Listing not found."}</Alert>
      </Container>
    );
  }

  const title = listing.listing_title || `Unit ${listing.unit_number || ""}`;
  const addressLine = listing.full_address || listing.property_name || "";
  const applyUrl = `/listing/${listing.listing_slug}/apply`;

  return (
    <Box sx={{ bgcolor: "#fafbff", minHeight: "100vh", color: "#111827" }}>
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Stack
          spacing={0.8}
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Breadcrumbs separator=">" aria-label="listing breadcrumb">
            <Link to="/" style={{ color: "#6b7280", textDecoration: "none", fontSize: 13 }}>
              Onyx PM
            </Link>
            <Link to="/listings" style={{ color: "#6b7280", textDecoration: "none", fontSize: 13 }}>
              Listings
            </Link>
            <Typography color="text.primary" sx={{ fontSize: 13 }}>
              {title}
            </Typography>
          </Breadcrumbs>
          <Typography sx={{ color: "#6b7280", fontSize: 12 }}>Listed on Onyx PM</Typography>
        </Stack>

        <Grid container spacing={3} sx={{ mt: 0.5 }}>
          <Grid item xs={12} lg={8}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: { xs: 34, md: 42 },
                lineHeight: 1.08,
              }}
            >
              {title}
            </Typography>
            <Typography sx={{ mt: 0.7, color: "#4b5563", fontSize: 18 }}>{addressLine}</Typography>
            <Typography sx={{ mt: 2, color: "#111827", fontWeight: 700, fontSize: 34 }}>
              {formatCurrency(listing.rent_amount)}
              <Typography component="span" sx={{ fontSize: 16, fontWeight: 500 }}>
                {" "}
                /month
              </Typography>
            </Typography>

            <Card sx={{ mt: 2, border: "1px solid rgba(17,24,39,0.1)", borderRadius: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1.2} sx={{ flexWrap: "wrap", rowGap: 1.2 }}>
                  <Box sx={{ borderRight: "1px solid rgba(148,163,184,0.2)", pr: 2, minWidth: 140 }}>
                    <Typography sx={{ fontSize: 12, color: "#6b7280" }}>Bedrooms</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{listing.bedrooms}</Typography>
                  </Box>
                  <Box sx={{ borderRight: "1px solid rgba(148,163,184,0.2)", pr: 2, minWidth: 140 }}>
                    <Typography sx={{ fontSize: 12, color: "#6b7280" }}>Bathrooms</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{listing.bathrooms}</Typography>
                  </Box>
                  <Box sx={{ borderRight: "1px solid rgba(148,163,184,0.2)", pr: 2, minWidth: 160 }}>
                    <Typography sx={{ fontSize: 12, color: "#6b7280" }}>Square Feet</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{listing.square_feet}</Typography>
                  </Box>
                  <Box sx={{ borderRight: "1px solid rgba(148,163,184,0.2)", pr: 2, minWidth: 180 }}>
                    <Typography sx={{ fontSize: 12, color: "#6b7280" }}>Available</Typography>
                    <Typography sx={{ fontWeight: 600 }}>
                      {formatDate(listing.listing_available_date)}
                    </Typography>
                  </Box>
                  <Box sx={{ borderRight: "1px solid rgba(148,163,184,0.2)", pr: 2, minWidth: 180 }}>
                    <Typography sx={{ fontSize: 12, color: "#6b7280" }}>Lease Term</Typography>
                    <Typography sx={{ fontWeight: 600 }}>
                      {listing.listing_lease_term || "Month-to-month"}
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: 120 }}>
                    <Typography sx={{ fontSize: 12, color: "#6b7280" }}>Deposit</Typography>
                    <Typography sx={{ fontWeight: 600 }}>
                      {formatCurrency(listing.listing_deposit)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Typography sx={{ mt: 3, fontSize: 22, fontWeight: 600 }}>Description</Typography>
            <Card sx={{ mt: 1, border: "1px solid rgba(17,24,39,0.12)", borderRadius: 2 }}>
              <CardContent>
                <Typography sx={{ color: "#374151", lineHeight: 1.7 }}>
                  {listing.listing_description || "No description provided."}
                </Typography>
              </CardContent>
            </Card>

            <Typography sx={{ mt: 3, fontSize: 22, fontWeight: 600 }}>Amenities</Typography>
            <Card sx={{ mt: 1, border: "1px solid rgba(17,24,39,0.12)", borderRadius: 2 }}>
              <CardContent>
                {amenities.length === 0 ? (
                  <Typography sx={{ color: "#6b7280" }}>No amenities listed.</Typography>
                ) : (
                  <Stack direction="row" spacing={1.2} sx={{ flexWrap: "wrap", gap: 0.8 }}>
                    {amenities.map((item) => (
                      <Chip
                        key={item}
                        label={item}
                        color="default"
                        variant="outlined"
                        size="small"
                        icon={<CheckCircleIcon />}
                      />
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Card
              sx={{
                border: "1px solid rgba(17,24,39,0.1)",
                borderRadius: 2,
                position: "sticky",
                top: 16,
              }}
            >
              <CardContent>
                <Typography sx={{ fontWeight: 700, fontSize: 22, mb: 1.2 }}>
                  Apply for this unit
                </Typography>
                <Typography sx={{ color: "#6b7280", fontSize: 14 }}>Contact:</Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  {listing.listing_contact_email || "Email not provided"}
                </Typography>
                <Typography sx={{ color: "#6b7280", mb: 1 }}>
                  {listing.listing_contact_phone || "Phone not provided"}
                </Typography>
                <Button component={Link} to={applyUrl} variant="contained" fullWidth sx={{ mt: 1 }}>
                  Apply Now
                </Button>
                <Typography sx={{ mt: 2, fontSize: 12, color: "#6b7280" }}>
                  This listing is shown publicly by the property management team.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Typography sx={{ mt: 4, mb: 1.5, fontSize: 22, fontWeight: 600 }}>Photos</Typography>
        <Grid container spacing={1}>
          {photos.length === 0 ? (
            <Grid item xs={12}>
              <Card sx={{ border: "1px dashed rgba(17,24,39,0.2)", borderRadius: 2 }}>
                <CardContent>
                  <img
                    src={placeholderImage(`${listing.property_name || "Onyx PM"} - ${title}`)}
                    alt={title}
                    style={{
                      width: "100%",
                      maxHeight: 360,
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ) : (
            photos.map((photo, index) => (
              <Grid item xs={12} sm={6} md={4} key={`${photo}-${index}`}>
                <Card sx={{ border: "1px solid rgba(17,24,39,0.12)", borderRadius: 2 }}>
                  <img
                    src={photo}
                    alt={`${title} photo ${index + 1}`}
                    style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
                  />
                </Card>
              </Grid>
            ))
          )}
        </Grid>

        <Box sx={{ mt: 4, pt: 2, borderTop: "1px solid rgba(17,24,39,0.12)" }}>
          <Typography sx={{ color: "#9ca3af", fontSize: 12 }}>
            Listed on Onyx PM · <Link to="/">Go to Onyx PM</Link>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default ListingPublic;
