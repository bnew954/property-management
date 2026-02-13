import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { createTenant, getTenant, updateTenant } from "../services/api";

const initialValues = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
};

function TenantForm() {
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
    const loadTenant = async () => {
      try {
        const response = await getTenant(id);
        setValues({
          ...initialValues,
          ...response.data,
          date_of_birth: response.data?.date_of_birth || "",
        });
      } catch (err) {
        setSnackbar({
          open: true,
          message: "Unable to load tenant details.",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    loadTenant();
  }, [id, isEditMode]);

  const validate = () => {
    const nextErrors = {};
    ["first_name", "last_name", "email", "phone"].forEach((field) => {
      if (!String(values[field] || "").trim()) {
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
        ...values,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        date_of_birth: values.date_of_birth || null,
      };
      if (isEditMode) {
        await updateTenant(id, payload);
      } else {
        await createTenant(payload);
      }
      navigate("/tenants", {
        state: {
          snackbar: {
            message: isEditMode ? "Tenant updated successfully." : "Tenant created successfully.",
            severity: "success",
          },
        },
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Unable to save tenant.",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        {isEditMode ? "Edit Tenant" : "Add Tenant"}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.2 }}>
        Tenants &gt; {isEditMode ? "Edit" : "Add New"}
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
            <Box>
              <TextField
                fullWidth
                label="First Name"
                variant="outlined"
                value={values.first_name}
                onChange={handleChange("first_name")}
                error={Boolean(errors.first_name)}
                helperText={errors.first_name}
                required
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Last Name"
                variant="outlined"
                value={values.last_name}
                onChange={handleChange("last_name")}
                error={Boolean(errors.last_name)}
                helperText={errors.last_name}
                required
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Email"
                variant="outlined"
                type="email"
                value={values.email}
                onChange={handleChange("email")}
                error={Boolean(errors.email)}
                helperText={errors.email}
                required
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Phone"
                variant="outlined"
                value={values.phone}
                onChange={handleChange("phone")}
                error={Boolean(errors.phone)}
                helperText={errors.phone}
                required
              />
            </Box>
            <Box sx={{ gridColumn: "1 / -1", maxWidth: 280 }}>
              <TextField
                fullWidth
                type="date"
                label="Date of Birth"
                variant="outlined"
                value={values.date_of_birth}
                onChange={handleChange("date_of_birth")}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Box>
          <Box sx={{ mt: 2, display: "flex", gap: 1.2, justifyContent: "flex-end" }}>
            <Button variant="text" onClick={() => navigate("/tenants")} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {isEditMode ? "Update Tenant" : "Create Tenant"}
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

export default TenantForm;
