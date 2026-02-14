import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Checkbox from "@mui/material/Checkbox";
import { createUnit, getUnit, getUnits, updateUnit } from "../services/api";
import { useUser } from "../services/userContext";

const initialValues = {
  unit_number: "",
  bedrooms: "",
  bathrooms: "",
  square_feet: "",
  rent_amount: "",
  is_available: true,
  is_listed: false,
  listing_title: "",
  listing_description: "",
  listing_photos: "",
  listing_amenities: "",
  listing_available_date: "",
  listing_lease_term: "",
  listing_deposit: "",
  listing_contact_email: "",
  listing_contact_phone: "",
};

const quickAmenities = [
  "In-unit Laundry",
  "Dishwasher",
  "Parking",
  "Pet Friendly",
  "Central AC",
  "Hardwood Floors",
  "Balcony/Patio",
  "Pool",
  "Gym",
  "Storage",
  "Elevator",
  "Wheelchair Accessible",
];

function parseList(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toCommaList(value) {
  return Array.isArray(value) ? value.join(", ") : value || "";
}

function formatListingUrl(slug) {
  if (!slug) return "";
  if (typeof window !== "undefined") {
    return `${window.location.origin}/listing/${slug}`;
  }
  return `/listing/${slug}`;
}

function UnitForm() {
  const { id, unitId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(unitId);
  const { organization } = useUser();

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [unitCount, setUnitCount] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [copyLabel, setCopyLabel] = useState("Copy Link");

  const checkUnitLimit =
    !isEditMode &&
    organization?.plan === "free" &&
    organization?.max_units != null &&
    unitCount >= Number(organization.max_units);

  const parseApiErrors = (error) => {
    const detail = error?.response?.data;
    if (!detail || typeof detail !== "object") {
      return { __all__: "Unable to save unit." };
    }
    const fieldErrors = {};
    Object.entries(detail).forEach(([key, value]) => {
      if (typeof value === "string") {
        fieldErrors[key] = value;
      } else if (Array.isArray(value)) {
        fieldErrors[key] = value.join(" ");
      }
    });
    return Object.keys(fieldErrors).length > 0 ? fieldErrors : { __all__: "Unable to save unit." };
  };

  const suggestedTitle = useMemo(() => {
    if (values.listing_title && values.listing_title.trim()) return values.listing_title;
    const bedroomText = values.bedrooms ? `${values.bedrooms}BR` : "Unit";
    const bathText = values.bathrooms ? `${values.bathrooms}BA` : "";
    const suffix = (bedroomText === "Unit" ? "" : ` / ${bathText}`) || "";
    return `${bedroomText}${suffix} at Unit ${values.unit_number || "Listing"}`;
  }, [values.bedrooms, values.bathrooms, values.listing_title, values.unit_number]);

  useEffect(() => {
    const load = async () => {
      if (!isEditMode) {
        try {
          const response = await getUnits();
          setUnitCount((response.data || []).length);
        } catch {
          setUnitCount(0);
        }
        return;
      }

      try {
        const response = await getUnit(unitId);
        const payload = response.data || {};
        setValues({
          ...initialValues,
          ...payload,
          listing_photos: toCommaList(payload.listing_photos),
          listing_amenities: toCommaList(payload.listing_amenities),
          listing_title: payload.listing_title || "",
        });
      } catch (err) {
        setSnackbar({
          open: true,
          message: "Unable to load unit details.",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isEditMode, unitId]);

  useEffect(() => {
    if (!values.is_listed) {
      return;
    }
    if (!values.listing_title?.trim()) {
      setValues((prev) => ({ ...prev, listing_title: suggestedTitle }));
    }
  }, [values.is_listed, suggestedTitle, values.listing_title]);

  const validate = () => {
    const nextErrors = {};
    ["unit_number", "bedrooms", "bathrooms", "square_feet", "rent_amount"].forEach((field) => {
      if (String(values[field] ?? "").trim() === "") {
        nextErrors[field] = "This field is required.";
      }
    });
    if (values.is_listed && !values.listing_title.trim()) {
      nextErrors.listing_title = "Listing title is required when listing is enabled.";
    }
    return nextErrors;
  };

  const handleChange = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const toggleAmenity = (amenity) => {
    const current = parseList(values.listing_amenities);
    const next =
      current.includes(amenity) ? current.filter((item) => item !== amenity) : [...current, amenity];
    setValues((prev) => ({ ...prev, listing_amenities: next.join(", ") }));
  };

  const getPayload = () => {
    const payload = {
      property: Number(id),
      unit_number: values.unit_number.trim(),
      bedrooms: Number(values.bedrooms),
      bathrooms: Number(values.bathrooms),
      square_feet: Number(values.square_feet),
      rent_amount: Number(values.rent_amount),
      is_available: Boolean(values.is_available),
      is_listed: Boolean(values.is_listed),
      listing_title: values.listing_title.trim(),
      listing_description: values.listing_description.trim(),
      listing_photos: parseList(values.listing_photos),
      listing_amenities: parseList(values.listing_amenities),
      listing_available_date: values.listing_available_date || null,
      listing_lease_term: values.listing_lease_term.trim(),
      listing_deposit: values.listing_deposit ? Number(values.listing_deposit) : null,
      listing_contact_email: values.listing_contact_email.trim(),
      listing_contact_phone: values.listing_contact_phone.trim(),
    };
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    if (checkUnitLimit) {
      setErrors({
        unit_limit:
          "You've reached the unit limit on your current plan. Upgrade to Pro for unlimited units.",
      });
      return;
    }

    try {
      setSubmitting(true);
      const payload = getPayload();
      const response = isEditMode ? await updateUnit(unitId, payload) : await createUnit(payload);
      const saved = response.data || {};
      const listingActive = saved?.is_listed;
      setSnackbar({
        open: true,
        message:
          isEditMode && listingActive
            ? "Unit and listing updated successfully."
            : isEditMode
              ? "Unit updated successfully."
              : "Unit created successfully.",
        severity: "success",
      });
      if (!isEditMode) {
        setValues(saved);
      } else if (saved.listing_slug) {
        setValues((prev) => ({ ...prev, listing_slug: saved.listing_slug }));
      }
      setTimeout(() => {
        navigate(`/properties/${id}`, {
          state: {
            snackbar: {
              message: isEditMode
                ? "Unit updated successfully."
                : listingActive
                  ? "Unit created successfully."
                  : "Unit created successfully.",
              severity: "success",
            },
          },
        });
      }, 300);
    } catch (err) {
      const fieldErrors = parseApiErrors(err);
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
      setSnackbar({
        open: true,
        message: fieldErrors.__all__ || "Unable to save unit.",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const listingUrl = formatListingUrl(values.listing_slug);
  const propertyForTitle = values.listing_title || suggestedTitle;
  const hasListingUrl = Boolean(values.listing_slug && values.is_listed);

  if (loading) {
    return (
      <Box>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        {isEditMode ? "Edit Unit" : "Add Unit"}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.2 }}>
        Properties &gt; Units &gt; {isEditMode ? "Edit" : "Add New"}
      </Typography>
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{ p: 3, borderRadius: 1.5, bgcolor: "background.paper", maxWidth: 860 }}
      >
        {errors.unit_limit ? (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {errors.unit_limit}{" "}
            <Link to="/settings" style={{ color: "inherit", textDecoration: "underline" }}>
              Go to settings
            </Link>
          </Alert>
        ) : null}

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Unit Number"
              value={values.unit_number}
              onChange={handleChange("unit_number")}
              error={Boolean(errors.unit_number)}
              helperText={errors.unit_number}
              required
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              type="number"
              label="Bedrooms"
              value={values.bedrooms}
              onChange={handleChange("bedrooms")}
              error={Boolean(errors.bedrooms)}
              helperText={errors.bedrooms}
              required
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              type="number"
              inputProps={{ step: "0.5" }}
              label="Bathrooms"
              value={values.bathrooms}
              onChange={handleChange("bathrooms")}
              error={Boolean(errors.bathrooms)}
              helperText={errors.bathrooms}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Square Feet"
              value={values.square_feet}
              onChange={handleChange("square_feet")}
              error={Boolean(errors.square_feet)}
              helperText={errors.square_feet}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              inputProps={{ step: "0.01" }}
              label="Rent Amount"
              value={values.rent_amount}
              onChange={handleChange("rent_amount")}
              error={Boolean(errors.rent_amount)}
              helperText={errors.rent_amount}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(values.is_available)}
                  onChange={handleChange("is_available")}
                />
              }
              label="Available for lease"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography sx={{ fontWeight: 600, mb: 1 }}>Listing</Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(values.is_listed)}
              onChange={handleChange("is_listed")}
            />
          }
          label="List this unit"
        />

        {values.is_listed ? (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Listing title"
                value={values.listing_title || propertyForTitle}
                onChange={handleChange("listing_title")}
                error={Boolean(errors.listing_title)}
                helperText={errors.listing_title || "Suggested title shown from bedrooms/bathrooms."}
                required={values.is_listed}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Listing description"
                value={values.listing_description}
                onChange={handleChange("listing_description")}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography sx={{ mb: 0.6, fontSize: 13, color: "text.secondary" }}>
                Amenities (quick add)
              </Typography>
              <Stack direction="row" spacing={0.7} sx={{ flexWrap: "wrap", gap: 0.7 }}>
                {quickAmenities.map((amenity) => {
                  const selected = parseList(values.listing_amenities).includes(amenity);
                  return (
                    <Chip
                      key={amenity}
                      size="small"
                      label={amenity}
                      onClick={() => toggleAmenity(amenity)}
                      color={selected ? "primary" : "default"}
                      variant={selected ? "filled" : "outlined"}
                    />
                  );
                })}
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Amenities (comma-separated)"
                value={values.listing_amenities}
                onChange={handleChange("listing_amenities")}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Photo URLs (comma-separated)"
                value={values.listing_photos}
                onChange={handleChange("listing_photos")}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="Available date"
                value={values.listing_available_date}
                onChange={handleChange("listing_available_date")}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Lease term"
                value={values.listing_lease_term}
                onChange={handleChange("listing_lease_term")}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                inputProps={{ step: "0.01" }}
                label="Security deposit"
                value={values.listing_deposit}
                onChange={handleChange("listing_deposit")}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Contact email"
                value={values.listing_contact_email}
                onChange={handleChange("listing_contact_email")}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Contact phone"
                value={values.listing_contact_phone}
                onChange={handleChange("listing_contact_phone")}
              />
            </Grid>
            {hasListingUrl ? (
              <Grid item xs={12}>
                <Typography sx={{ mt: 0.5, mb: 0.6, color: "text.secondary" }}>
                  Listing URL
                </Typography>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={listingUrl}
                    InputProps={{ readOnly: true }}
                  />
                  <Button
                    variant="outlined"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(listingUrl)
                        .then(() => setCopyLabel("Copied"))
                        .catch(() => setCopyLabel("Copy failed"))
                    }
                  >
                    {copyLabel}
                  </Button>
                  <Button
                    variant="outlined"
                    component={Link}
                    to={`/listing/${values.listing_slug}`}
                  >
                    Preview Listing
                  </Button>
                </Box>
              </Grid>
            ) : null}
          </Grid>
        ) : null}

        <Box sx={{ mt: 2.5, display: "flex", gap: 1.2, justifyContent: "flex-end" }}>
          <Button variant="text" onClick={() => navigate(`/properties/${id}`)} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {isEditMode ? "Update Unit" : "Create Unit"}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default UnitForm;


