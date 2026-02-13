import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { createProperty, getProperty, updateProperty } from "../services/api";

const initialValues = {
  name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  zip_code: "",
  property_type: "",
  description: "",
};

function PropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
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
    const loadProperty = async () => {
      try {
        const response = await getProperty(id);
        setValues({
          ...initialValues,
          ...response.data,
        });
      } catch (err) {
        setSnackbar({
          open: true,
          message: "Unable to load property details.",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    loadProperty();
  }, [id, isEditMode]);

  const validate = () => {
    const nextErrors = {};
    const requiredFields = [
      "name",
      "address_line1",
      "city",
      "state",
      "zip_code",
      "property_type",
    ];
    requiredFields.forEach((field) => {
      if (!String(values[field] || "").trim()) {
        nextErrors[field] = "This field is required.";
      }
    });
    return nextErrors;
  };

  const handleChange = (field) => (event) => {
    const nextValue = event.target.value;
    setValues((prev) => ({ ...prev, [field]: nextValue }));
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
        ...values,
        name: values.name.trim(),
        address_line1: values.address_line1.trim(),
        city: values.city.trim(),
        state: values.state.trim(),
        zip_code: values.zip_code.trim(),
      };
      if (isEditMode) {
        await updateProperty(id, payload);
      } else {
        await createProperty(payload);
      }
      navigate("/properties", {
        state: {
          snackbar: {
            message: isEditMode
              ? "Property updated successfully."
              : "Property created successfully.",
            severity: "success",
          },
        },
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Unable to save property.",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        {isEditMode ? "Edit Property" : "Add Property"}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.2 }}>
        Properties &gt; {isEditMode ? "Edit" : "Add New"}
      </Typography>
      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <Paper
          component="form"
          onSubmit={handleSubmit}
          sx={{ p: 3, borderRadius: 1, bgcolor: "#141414", maxWidth: 600 }}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}>
            <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
              <TextField
                fullWidth
                label="Name"
                variant="outlined"
                value={values.name}
                onChange={handleChange("name")}
                error={Boolean(errors.name)}
                helperText={errors.name}
                required
              />
            </Box>
            <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
              <FormControl fullWidth error={Boolean(errors.property_type)} required>
                <InputLabel>Property Type</InputLabel>
                <Select
                  label="Property Type"
                  value={values.property_type}
                  onChange={handleChange("property_type")}
                >
                  <MenuItem value="residential">Residential</MenuItem>
                  <MenuItem value="commercial">Commercial</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
              <TextField
                fullWidth
                label="Address Line 1"
                variant="outlined"
                value={values.address_line1}
                onChange={handleChange("address_line1")}
                error={Boolean(errors.address_line1)}
                helperText={errors.address_line1}
                required
              />
            </Box>
            <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
              <TextField
                fullWidth
                label="Address Line 2"
                variant="outlined"
                value={values.address_line2}
                onChange={handleChange("address_line2")}
              />
            </Box>
            <Box sx={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 2 }}>
              <TextField
                fullWidth
                label="City"
                variant="outlined"
                value={values.city}
                onChange={handleChange("city")}
                error={Boolean(errors.city)}
                helperText={errors.city}
                required
              />
              <TextField
                fullWidth
                label="State"
                variant="outlined"
                value={values.state}
                onChange={handleChange("state")}
                error={Boolean(errors.state)}
                helperText={errors.state}
                required
              />
              <TextField
                fullWidth
                label="Zip Code"
                variant="outlined"
                value={values.zip_code}
                onChange={handleChange("zip_code")}
                error={Boolean(errors.zip_code)}
                helperText={errors.zip_code}
                required
              />
            </Box>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField
                fullWidth
                label="Description"
                variant="outlined"
                value={values.description}
                onChange={handleChange("description")}
                multiline
                minRows={4}
              />
            </Box>
          </Box>
          <Box sx={{ mt: 2, display: "flex", gap: 1.2, justifyContent: "flex-end" }}>
            <Button variant="text" onClick={() => navigate("/properties")} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {isEditMode ? "Update Property" : "Create Property"}
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

export default PropertyForm;
