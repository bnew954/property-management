import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Container,
  Grid,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EmailIcon from "@mui/icons-material/Email";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PhoneIcon from "@mui/icons-material/Phone";
import { getListingBySlug } from "../services/api";

function formatCurrency(value) {
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.max(0, amount));
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

function formatLeaseTerm(value) {
  if (!value) return "Month-to-month";
  const trimmed = String(value).trim();
  if (!trimmed) return "Month-to-month";
  if (/month/i.test(trimmed)) return trimmed;
  return `${trimmed} months`;
}

function BrandMark({ textColor = "#1a1a1a" }) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
      <img
        src="/logo-icon.png"
        alt="Onyx PM"
        style={{
          width: 22,
          height: 22,
          objectFit: "contain",
          mixBlendMode: "screen",
          filter: "brightness(1.05)",
        }}
      />
      <Typography
        component="span"
        sx={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: textColor,
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ONYX
      </Typography>
      <Box
        component="span"
        sx={{
          backgroundColor: "rgba(124,92,252,0.15)",
          color: "#7c5cfc",
          px: "10px",
          py: "3px",
          borderRadius: "6px",
          fontFamily: "'Syne', sans-serif",
          fontWeight: 600,
          letterSpacing: "0.05em",
          fontSize: 12,
          textTransform: "uppercase",
          lineHeight: 1,
        }}
      >
        PM
      </Box>
    </Box>
  );
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
      document.title = `${title} | ${address}`;
    } catch (err) {
      setListing(null);
      setError("This listing is no longer available.");
      document.title = "Listing not found | Onyx PM";
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
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

  if (loading) {
    return (
      <Container
        maxWidth={false}
        sx={{ px: { xs: "20px", md: "40px" }, py: { xs: "60px", md: "70px" }, maxWidth: "900px", margin: "0 auto" }}
      >
        <Typography>Loading listing...</Typography>
      </Container>
    );
  }

  if (error || !listing) {
    return (
      <Container maxWidth={false} sx={{ px: { xs: "20px", md: "40px" }, py: { xs: "60px", md: "70px" }, maxWidth: "900px", margin: "0 auto" }}>
        <Alert severity="error">{error || "Listing not found."}</Alert>
      </Container>
    );
  }

  const title = listing.listing_title || `Unit ${listing.unit_number || ""}`;
  const addressLine = listing.full_address || listing.property_name || "";
  const applyUrl = `/listing/${listing.listing_slug}/apply`;
  const leaseTerm = formatLeaseTerm(listing.listing_lease_term);
  const depositValue = Number.parseFloat(listing.listing_deposit);
  const depositDisplay = depositValue > 0 ? formatCurrency(depositValue) : "Contact landlord";

  return (
    <Box sx={{ bgcolor: "#ffffff", minHeight: "100vh", color: "#1a1a1a", fontFamily: "Inter, Roboto, sans-serif" }}>
      <Container
        disableGutters
        sx={{
          maxWidth: "900px",
          mx: "auto",
          px: { xs: "20px", md: "40px" },
          py: { xs: "60px", md: "70px" },
        }}
      >
        <Stack spacing={1.8}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
            <BrandMark />
            <Breadcrumbs
              separator="›"
              aria-label="listing breadcrumb"
              sx={{
                fontSize: 12,
                color: "#9ca3af",
                alignItems: "center",
                "& .MuiBreadcrumbs-separator": { color: "#9ca3af" },
              }}
            >
              <Link to="/" style={{ color: "#9ca3af", textDecoration: "none", fontSize: 12 }}>
                Onyx PM
              </Link>
              <Link to="/browse-listings" style={{ color: "#9ca3af", textDecoration: "none", fontSize: 12 }}>
                Listings
              </Link>
              <Typography sx={{ color: "#9ca3af", fontSize: 12 }} component="span">
                {title}
              </Typography>
            </Breadcrumbs>
          </Box>

          <Box
            sx={{
              mt: 2.5,
              borderRadius: 3,
              border: "1px solid #e5e7eb",
              overflow: "hidden",
              minHeight: photos.length === 0 ? 300 : "auto",
              background: "#f3f4f6",
            }}
          >
            {photos.length === 0 ? (
              <Box
                sx={{
                  height: 300,
                  display: "grid",
                  alignItems: "center",
                  justifyItems: "center",
                  gap: 1,
                  color: "#6b7280",
                }}
              >
                <HomeOutlinedIcon sx={{ color: "#9ca3af", fontSize: 40 }} />
                <Typography sx={{ color: "#6b7280" }}>No photos available</Typography>
              </Box>
            ) : (
              <Grid container spacing={1.2} sx={{ p: 1.2 }}>
                {photos.map((photo, index) => (
                  <Grid item xs={12} sm={6} key={`${photo}-${index}`}>
                    <Box
                      component="img"
                      src={photo}
                      alt={`${title} photo ${index + 1}`}
                      sx={{
                        width: "100%",
                        height: 240,
                        objectFit: "cover",
                        borderRadius: 2,
                        display: "block",
                        border: "1px solid #e5e7eb",
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          <Box sx={{ pt: 1 }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: { xs: "24px", md: "32px" },
                color: "#1a1a1a",
                lineHeight: 1.15,
                mb: "4px",
              }}
            >
              {title}
            </Typography>
            <Typography sx={{ color: "#6b7280", fontSize: 16, mb: 3 }}>{addressLine}</Typography>

            <Box sx={{ mb: 3.5 }}>
              <Typography sx={{ color: "#1a1a1a", fontSize: "36px", fontWeight: 700, lineHeight: 1.1 }}>
                {formatCurrency(listing.rent_amount)}
              </Typography>
              <Typography component="span" sx={{ fontSize: 16, color: "#6b7280", ml: 1 }}>
                /month
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(6, minmax(0, 1fr))",
                },
                gap: 1.2,
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 3,
                p: 1.5,
                mb: 4,
              }}
            >
              {[
                { label: "Bedrooms", value: listing.bedrooms || "—" },
                { label: "Bathrooms", value: listing.bathrooms || "—" },
                { label: "Square Feet", value: listing.square_feet ? `${listing.square_feet} sqft` : "—" },
                { label: "Available", value: formatDate(listing.listing_available_date) },
                { label: "Lease Term", value: leaseTerm },
                { label: "Deposit", value: depositDisplay },
              ].map((item) => (
                <Box
                  key={item.label}
                  sx={{
                    borderRadius: 2,
                    border: "1px solid #e5e7eb",
                    backgroundColor: "#fff",
                    px: 1.3,
                    py: 1.2,
                    minHeight: 94,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: "#9ca3af",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.7,
                      fontSize: 18,
                      color: "#1a1a1a",
                      fontWeight: 600,
                      lineHeight: 1.2,
                    }}
                  >
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Typography sx={{ mt: 1.5, fontSize: 20, fontWeight: 600, color: "#1a1a1a" }}>
              Description
            </Typography>
            <Typography sx={{ mt: 1.6, fontSize: 15, color: "#374151", lineHeight: 1.7 }}>
              {listing.listing_description || "No description provided."}
            </Typography>

            <Typography sx={{ mt: 4.5, fontSize: 20, fontWeight: 600, color: "#1a1a1a" }}>
              Amenities
            </Typography>
            {amenities.length === 0 ? (
              <Typography sx={{ mt: 1.2, color: "#6b7280" }}>No amenities listed.</Typography>
            ) : (
              <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1} sx={{ mt: 1.5 }}>
                {amenities.map((item) => (
                  <Chip
                    key={item}
                    icon={<CheckCircleIcon sx={{ color: "#22c55e", fontSize: 16 }} />}
                    label={item}
                    size="small"
                    variant="filled"
                    sx={{
                      border: "1px solid #e5e7eb",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      fontFamily: "Inter, Roboto, sans-serif",
                      borderRadius: "20px",
                    }}
                  />
                ))}
              </Stack>
            )}
          </Box>

          <Box
            sx={{
              mt: 4.5,
              border: "1px solid #e5e7eb",
              borderRadius: 2,
              p: { xs: 2.2, md: 2.6 },
              maxWidth: "100%",
              textAlign: "center",
            }}
          >
            <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#1a1a1a" }}>
              Interested in this unit?
            </Typography>
            <Button
              component={Link}
              to={applyUrl}
              variant="contained"
              fullWidth
              sx={{
                mt: 2,
                py: 1.4,
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 1,
                backgroundColor: "#6347f5",
                textTransform: "none",
                "&:hover": { backgroundColor: "#5739df" },
              }}
            >
              Apply Now
            </Button>
            <Typography sx={{ mt: 1.2, fontSize: 13, color: "#6b7280" }}>
              Applications are reviewed within 24-48 hours
            </Typography>
          </Box>

          {(listing.listing_contact_email || listing.listing_contact_phone) && (
            <Box
              sx={{
                border: "1px solid #e5e7eb",
                borderRadius: 2,
                p: { xs: 2, md: 2.2 },
                mt: 2.5,
              }}
            >
              <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#1a1a1a", mb: 1.2 }}>
                Contact
              </Typography>
              <Stack spacing={1.1}>
                {listing.listing_contact_email ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <EmailIcon sx={{ fontSize: 18, color: "#6b7280" }} />
                    <Typography sx={{ fontSize: 14, color: "#374151" }}>
                      {listing.listing_contact_email}
                    </Typography>
                  </Stack>
                ) : null}
                {listing.listing_contact_phone ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PhoneIcon sx={{ fontSize: 18, color: "#6b7280" }} />
                    <Typography sx={{ fontSize: 14, color: "#374151" }}>
                      {listing.listing_contact_phone}
                    </Typography>
                  </Stack>
                ) : null}
              </Stack>
            </Box>
          )}
        </Stack>

        <Box sx={{ mt: "60px", textAlign: "center", color: "#6b7280", fontSize: 12 }}>
          <MuiLink
            to="/"
            component={Link}
            color="inherit"
            underline="hover"
            sx={{ fontSize: 12, display: "inline-block", mb: 0.5 }}
          >
            Listed on Onyx PM
          </MuiLink>
        </Box>
      </Container>
    </Box>
  );
}

export default ListingPublic;
