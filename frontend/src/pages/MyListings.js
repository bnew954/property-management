import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
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

function ListingCard({ listing }) {
  const photo = listing?.listing_photos?.[0];
  const title = listing.listing_title || `Unit ${listing.unit_number}`;
  const address = listing.full_address || listing.property_name || "Unit";
  const propertyName = listing.property_name || "Property";
  const rent = formatCurrency(listing.rent_amount);
  const publicUrl = listing.listing_slug
    ? `${window.location.origin}/listing/${listing.listing_slug}`
    : "";
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card
      sx={{
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        minWidth: 280,
      }}
    >
      <CardContent sx={{ p: 1.2 }}>
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

        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.4 }}>{title}</Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.3 }}>{propertyName}</Typography>
        <Typography sx={{ fontSize: 11, color: "text.secondary", mb: 0.8 }}>{address}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 16, color: "primary.main", mb: 0.9 }}>
          {rent}
          <Typography component="span" sx={{ fontSize: 12, fontWeight: 500, color: "text.secondary" }}>
            {" / month"}
          </Typography>
        </Typography>

        <Typography sx={{ fontSize: 12, color: "success.main", mb: 1 }}>Status: Listed</Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 0.9 }}>
          <Button component={Link} to={`/properties/${listing.property}/units/${listing.id}/edit`} size="small" variant="contained">
            Edit Unit
          </Button>
          <Tooltip title={copied ? "Copied!" : "Copy link"} arrow>
            <IconButton size="small" onClick={copyToClipboard} aria-label="Copy public link" color="inherit">
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        <Button
          size="small"
          variant="outlined"
          component="a"
          href={publicUrl || undefined}
          target="_blank"
          rel="noreferrer"
          disabled={!publicUrl}
          fullWidth
          sx={{ mt: 0.2 }}
        >
          Open Listing
        </Button>
      </CardContent>
    </Card>
  );
}

function MyListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getUnits();
      const sourceData = (response.data || []).filter((unit) => Boolean(unit.is_listed));
      setListings(sourceData);
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

  return (
    <Box sx={{ pr: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 600, color: "text.primary" }}>Listings</Typography>
        <Button component={Link} to="/properties" size="small" variant="contained">
          + List a Unit
        </Button>
      </Box>

      {loading ? (
        <Typography sx={{ color: "text.secondary" }}>Loading listed units...</Typography>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : listings.length === 0 ? (
        <Card
          sx={{ border: "1px dashed", borderColor: "divider", bgcolor: "background.paper", py: 4, textAlign: "center" }}
        >
          <HomeWorkIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
          <Typography sx={{ fontWeight: 600, color: "text.primary" }}>No active listings</Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.6, maxWidth: 520, mx: "auto", px: 2 }}>
            List a vacant unit to attract tenants. Go to Properties to edit a unit and toggle the listing on.
          </Typography>
          <Button component={Link} to="/properties" variant="contained" size="small" sx={{ mt: 1.6 }}>
            Go to Properties
          </Button>
        </Card>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 1.5,
          }}
        >
          {listings.map((listing) => (
            <Box key={listing.id || listing.listing_slug}>
              <ListingCard listing={listing} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default MyListings;
