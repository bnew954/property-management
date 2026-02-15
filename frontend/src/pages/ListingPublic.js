import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import HomeRepairServiceIcon from "@mui/icons-material/HomeRepairService";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PetsIcon from "@mui/icons-material/Pets";
import PublicNavBar from "../components/PublicNavBar";
import PublicFooter from "../components/PublicFooter";
import { getListingBySlug } from "../services/api";

const PRIMARY_TEXT = "#1a1a2e";
const SECONDARY_TEXT = "#6b7280";
const MUTED_TEXT = "#9ca3af";
const BORDER_COLOR = "#e5e7eb";
const SUBTLE_BG = "#f3f4f6";
const ACCENT = "#4f46e5";
const CTA_SUCCESS = "#059669";

function formatCurrency(value) {
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.max(0, amount));
}

function formatDate(value) {
  if (!value) return "Now";
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

  const loadListing = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getListingBySlug(slug);
      const payload = response.data || null;
      setListing(payload);
      setError("");

      const title = payload?.listing_title || "Unit";
      const address = payload?.full_address || "";
      document.title = `${title} | ${address} | Onyx PM`;
    } catch (err) {
      setListing(null);
      setError("Listing not found");
      document.title = "Listing not found | Onyx PM";
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    loadListing();
  }, [loadListing]);

  const photos = useMemo(() => {
    if (!listing || !Array.isArray(listing.listing_photos)) return [];
    return listing.listing_photos.filter(Boolean);
  }, [listing]);

  const amenities = useMemo(() => {
    if (!listing || !Array.isArray(listing.listing_amenities)) return [];
    return listing.listing_amenities.filter(Boolean);
  }, [listing]);

  const galleryItems = useMemo(() => {
    if (photos.length === 1) return [...photos, ...Array(3).fill(null)];
    if (photos.length === 2) return photos;
    if (photos.length === 3) return photos;
    return photos.slice(0, 6);
  }, [photos]);

  if (loading) {
    return (
      <Box sx={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
        <PublicNavBar />
        <Container maxWidth="lg" sx={{ pt: "128px", pb: 8, display: "flex", justifyContent: "center", mt: 3 }}>
          <CircularProgress sx={{ color: "#4f46e5" }} />
        </Container>
      </Box>
    );
  }

  if (error || !listing) {
    return (
      <Box sx={{ backgroundColor: "#f8f9fa", minHeight: "100vh", color: PRIMARY_TEXT }}>
        <PublicNavBar />
        <Container maxWidth="md" sx={{ pt: "128px", pb: 8 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            Listing not found
          </Alert>
          <MuiLink component={Link} to="/browse-listings" sx={{ color: "#4f46e5", fontWeight: 600 }}>
            ← Back to listings
          </MuiLink>
        </Container>
        <PublicFooter />
      </Box>
    );
  }

  const title = listing.listing_title
    ? listing.listing_title
    : listing.unit_number
      ? `${listing.property_name || "Property"} - Unit ${listing.unit_number}`
      : "Listing";
  const addressLine = listing.full_address || listing.property_name || "";
  const applyUrl = `/listing/${listing.listing_slug}/apply`;

  const specs = [
    { label: "Bedrooms", value: listing.bedrooms ?? "—" },
    { label: "Bathrooms", value: listing.bathrooms ?? "—" },
    { label: "Sq Ft", value: listing.square_feet ? `${listing.square_feet}` : "—" },
  ];

  const leaseTerm = listing.listing_lease_term || "12 months";
  const availableText = listing.listing_available_date ? formatDate(listing.listing_available_date) : "Now";
  const petPolicy = listing.pet_policy || "Ask";

  return (
    <Box sx={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <PublicNavBar />
      <Box sx={{ pt: "64px" }}>
        <Container
          maxWidth="lg"
          sx={{
            pt: 6,
            pb: 4,
            color: PRIMARY_TEXT,
            maxWidth: "1200px !important",
          }}
        >
          <Box sx={{ pb: 4 }}>
            {photos.length === 0 ? (
              <Box
                sx={{
                  height: 400,
                  borderRadius: "16px",
                  border: `1px solid ${BORDER_COLOR}`,
                  background: "linear-gradient(145deg, #eef2ff 0%, #f8f9fa 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <HomeWorkIcon sx={{ fontSize: 80, color: "#c7d2fe" }} />
              </Box>
            ) : (
              <Grid container spacing={1.2}>
                <Grid item xs={12} md={photos.length === 1 ? 12 : 8}>
                  <Box
                    component="img"
                    src={galleryItems[0]}
                    alt={`${title} photo 1`}
                    sx={{
                      width: "100%",
                      height: 400,
                      objectFit: "cover",
                      borderRadius: 2,
                      border: `1px solid ${BORDER_COLOR}`,
                    }}
                  />
                </Grid>
                {photos.length > 1 ? (
                  <Grid item xs={12} md={4}>
                    <Grid container spacing={1}>
                      {galleryItems.slice(1, 3).map((photo, index) => (
                        <Grid item xs={6} key={`${photo}-${index}`}>
                          <Box
                            component="img"
                            src={photo}
                            alt={`${title} photo ${index + 2}`}
                            sx={{
                              width: "100%",
                              height: 196,
                              objectFit: "cover",
                              borderRadius: 2,
                              border: `1px solid ${BORDER_COLOR}`,
                            }}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>
                ) : null}
              </Grid>
            )}
          </Box>

          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: PRIMARY_TEXT, lineHeight: 1.1 }}>
                {title}
              </Typography>
              <Typography sx={{ mt: 1.2, color: SECONDARY_TEXT, fontSize: "1.05rem" }}>
                {addressLine}
              </Typography>

              <Divider sx={{ borderColor: BORDER_COLOR, my: 3 }} />

              <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", rowGap: 2 }}>
                {specs.map((item, index) => (
                  <Box
                    key={item.label}
                    sx={{
                      display: "inline-flex",
                      flexDirection: "column",
                      alignItems: "center",
                      minWidth: 96,
                      px: 4,
                      position: "relative",
                      "&:after":
                        index === specs.length - 1
                          ? {}
                          : {
                              content: '""',
                              position: "absolute",
                              right: 0,
                              top: 4,
                              bottom: 4,
                              width: "1px",
                              backgroundColor: BORDER_COLOR,
                            },
                    }}
                  >
                    <Typography variant="h6" sx={{ color: PRIMARY_TEXT, fontWeight: 700, lineHeight: 1 }}>
                      {item.value}
                    </Typography>
                    <Typography variant="caption" sx={{ mt: 0.7, color: MUTED_TEXT, textAlign: "center", textTransform: "capitalize" }}>
                      {item.label}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ borderColor: BORDER_COLOR, my: 3 }} />

              <Typography sx={{ fontWeight: 600, mb: 2, color: PRIMARY_TEXT, fontSize: "1.35rem" }}>
                About This Unit
              </Typography>
              <Typography sx={{ color: "#4b5563", lineHeight: 1.8, fontSize: "1.05rem", maxWidth: 900 }}>
                {listing.listing_description || "Contact the landlord for more details about this unit."}
              </Typography>

              {amenities.length > 0 ? (
                <Box sx={{ mt: 4 }}>
                  <Typography sx={{ fontWeight: 600, color: PRIMARY_TEXT, fontSize: "1.35rem", mb: 2 }}>
                    Features & Amenities
                  </Typography>
                  <Grid container spacing={1.2}>
                    {amenities.map((item) => (
                      <Grid item key={item}>
                        <Chip
                          size="small"
                          icon={<CheckCircleIcon sx={{ color: "#9ca3af", fontSize: 16 }} />}
                          label={item}
                          sx={{
                            backgroundColor: SUBTLE_BG,
                            border: "1px solid #e5e7eb",
                            color: SECONDARY_TEXT,
                            "& .MuiChip-label": { fontSize: "0.8rem" },
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ) : null}
            </Grid>

            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  position: { xs: "static", md: "sticky" },
                  top: 80,
                  backgroundColor: "#ffffff",
                  border: `1px solid ${BORDER_COLOR}`,
                  borderRadius: "16px",
                  p: 4,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                }}
              >
                <Typography sx={{ color: ACCENT, fontSize: "2.2rem", fontWeight: 800, lineHeight: 1.1 }}>
                  {formatCurrency(listing.rent_amount)}
                  <Typography component="span" sx={{ fontSize: "1.1rem", color: SECONDARY_TEXT, fontWeight: 500 }}>
                    {" /month"}
                  </Typography>
                </Typography>

                <Divider sx={{ borderColor: BORDER_COLOR, my: 2 }} />

                <Stack spacing={1} sx={{ color: SECONDARY_TEXT, fontSize: "0.95rem" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <HomeRepairServiceIcon sx={{ fontSize: 16, color: MUTED_TEXT }} />
                    <Typography sx={{ fontSize: "0.95rem" }}>Available: {availableText}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <ScheduleIcon sx={{ fontSize: 16, color: MUTED_TEXT }} />
                    <Typography sx={{ fontSize: "0.95rem" }}>Lease Term: {leaseTerm}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PetsIcon sx={{ fontSize: 16, color: MUTED_TEXT }} />
                    <Typography sx={{ fontSize: "0.95rem" }}>Pet Policy: {petPolicy}</Typography>
                  </Box>
                </Stack>

                <Divider sx={{ borderColor: BORDER_COLOR, my: 2 }} />

                <Button
                  component={Link}
                  to={applyUrl}
                  fullWidth
                  variant="contained"
                  sx={{
                    backgroundColor: CTA_SUCCESS,
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "1rem",
                    py: 1.5,
                    borderRadius: "12px",
                    textTransform: "none",
                    "&:hover": { backgroundColor: "#047857" },
                  }}
                >
                  Apply Now
                </Button>
                <Typography sx={{ mt: 1.2, textAlign: "center", color: "#9ca3af", fontSize: "0.8rem" }}>
                  Free to apply · Takes about 10 minutes
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <PublicFooter />
    </Box>
  );
}

export default ListingPublic;
