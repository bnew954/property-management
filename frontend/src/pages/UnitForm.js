import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { createUnit, getUnit, getUnits, updateUnit } from "../services/api";
import { useUser } from "../services/userContext";

const initialValues = {
  unit_number: "",
  bedrooms: "",
  bathrooms: "",
  square_feet: "",
  rent_amount: "",
  is_available: true,
};

function UnitForm() {
  const { id, unitId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(unitId);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [unitCount, setUnitCount] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const { organization } = useUser();

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
      } else if (typeof value === "object") {
        fieldErrors[key] = JSON.stringify(value);
      }
    });
    return Object.keys(fieldErrors).length > 0 ? fieldErrors : { __all__: "Unable to save unit." };
  };

  const checkUnitLimit =
    !isEditMode &&
    organization?.plan === "free" &&
    organization?.max_units != null &&
    unitCount >= Number(organization.max_units);

  useEffect(() => {
    const load = async () => {
      if (!isEditMode) {
        try {
          const response = await getUnits();
          setUnitCount((response.data || []).length);
        } catch (err) {
          // leave unitCount as 0 if units cannot be loaded
        }
        return;
      }
      try {
        const response = await getUnit(unitId);
        setValues({
          ...initialValues,
          ...response.data,
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

  const validate = () => {
    const nextErrors = {};
    const requiredFields = [
      "unit_number",
      "bedrooms",
      "bathrooms",
      "square_feet",
      "rent_amount",
    ];
    requiredFields.forEach((field) => {
      if (String(values[field] ?? "").trim() === "") {
        nextErrors[field] = "This field is required.";
      }
    });
    return nextErrors;
  };

  const handleChange = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
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
      const payload = {
        property: Number(id),
        unit_number: values.unit_number.trim(),
        bedrooms: Number(values.bedrooms),
        bathrooms: Number(values.bathrooms),
        square_feet: Number(values.square_feet),
        rent_amount: Number(values.rent_amount),
        is_available: Boolean(values.is_available),
      };
      if (isEditMode) {
        await updateUnit(unitId, payload);
      } else {
        await createUnit(payload);
      }
      navigate(`/properties/${id}`, {
        state: {
          snackbar: {
            message: isEditMode ? "Unit updated successfully." : "Unit created successfully.",
            severity: "success",
          },
        },
      });
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

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        {isEditMode ? "Edit Unit" : "Add Unit"}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.2 }}>
        Properties &gt; Units &gt; {isEditMode ? "Edit" : "Add New"}
      </Typography>
      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <Paper
          component="form"
          onSubmit={handleSubmit}
          sx={{ p: 3, borderRadius: 1, bgcolor: "background.paper", maxWidth: 600 }}
        >
          {errors.unit_limit ? (
            <Alert severity="warning" sx={{ mb: 1.4 }}>
              {errors.unit_limit}{" "}
              <Link to="/settings" style={{ color: "inherit", textDecoration: "underline" }}>
                Go to settings
              </Link>
            </Alert>
          ) : null}
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}>
            <Box>
              <TextField
                fullWidth
                label="Unit Number"
                variant="outlined"
                value={values.unit_number}
                onChange={handleChange("unit_number")}
                error={Boolean(errors.unit_number)}
                helperText={errors.unit_number}
                required
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                type="number"
                label="Bedrooms"
                variant="outlined"
                value={values.bedrooms}
                onChange={handleChange("bedrooms")}
                error={Boolean(errors.bedrooms)}
                helperText={errors.bedrooms}
                required
              />
            </Box>
            <Box sx={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 2 }}>
              <TextField
                fullWidth
                type="number"
                inputProps={{ step: "0.5" }}
                label="Bathrooms"
                variant="outlined"
                value={values.bathrooms}
                onChange={handleChange("bathrooms")}
                error={Boolean(errors.bathrooms)}
                helperText={errors.bathrooms}
                required
              />
              <TextField
                fullWidth
                type="number"
                label="Square Feet"
                variant="outlined"
                value={values.square_feet}
                onChange={handleChange("square_feet")}
                error={Boolean(errors.square_feet)}
                helperText={errors.square_feet}
                required
              />
              <TextField
                fullWidth
                type="number"
                inputProps={{ step: "0.01" }}
                label="Rent Amount"
                variant="outlined"
                value={values.rent_amount}
                onChange={handleChange("rent_amount")}
                error={Boolean(errors.rent_amount)}
                helperText={errors.rent_amount}
                required
              />
            </Box>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(values.is_available)}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, is_available: event.target.checked }))
                    }
                  />
                }
                label="Available for lease"
              />
            </Box>
          </Box>
          <Box sx={{ mt: 2, display: "flex", gap: 1.2, justifyContent: "flex-end" }}>
            <Button variant="text" onClick={() => navigate(`/properties/${id}`)} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {isEditMode ? "Update Unit" : "Create Unit"}
            </Button>
          </Box>
        </Paper>
      )}
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
