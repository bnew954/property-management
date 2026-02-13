import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { createUnit, getUnit, updateUnit } from "../services/api";

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
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    if (!isEditMode) {
      return;
    }
    const loadUnit = async () => {
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
    loadUnit();
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
      setSnackbar({
        open: true,
        message: "Unable to save unit.",
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
          sx={{ p: 3, borderRadius: 3, bgcolor: "#111827" }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
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
            </Grid>
            <Grid item xs={12} md={6}>
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
            </Grid>
            <Grid item xs={12} md={4}>
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
            </Grid>
            <Grid item xs={12} md={4}>
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
            </Grid>
            <Grid item xs={12} md={4}>
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
            </Grid>
            <Grid item xs={12}>
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
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, display: "flex", gap: 1.5 }}>
            <Button type="submit" variant="contained" disabled={submitting} sx={{ flex: 1 }}>
              {isEditMode ? "Update Unit" : "Create Unit"}
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/properties/${id}`)} sx={{ flex: 1 }}>
              Cancel
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
