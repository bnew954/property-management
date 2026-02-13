import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import {
  createLease,
  getLease,
  getProperties,
  getTenants,
  getUnits,
  updateLease,
} from "../services/api";

const initialValues = {
  unit: "",
  tenant: "",
  start_date: "",
  end_date: "",
  monthly_rent: "",
  security_deposit: "",
  is_active: true,
};

function LeaseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [unitsRes, tenantsRes, propertiesRes] = await Promise.all([
          getUnits(),
          getTenants(),
          getProperties(),
        ]);
        setUnits(unitsRes.data || []);
        setTenants(tenantsRes.data || []);
        setProperties(propertiesRes.data || []);

        if (isEditMode) {
          const leaseRes = await getLease(id);
          const lease = leaseRes.data;
          setValues({
            unit: lease.unit ?? "",
            tenant: lease.tenant ?? "",
            start_date: lease.start_date || "",
            end_date: lease.end_date || "",
            monthly_rent: lease.monthly_rent ?? "",
            security_deposit: lease.security_deposit ?? "",
            is_active: Boolean(lease.is_active),
          });
        }
      } catch (err) {
        setSnackbar({
          open: true,
          message: "Unable to load lease form data.",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isEditMode]);

  const propertyMap = useMemo(() => {
    const map = {};
    properties.forEach((item) => {
      map[item.id] = item.name;
    });
    return map;
  }, [properties]);

  const validate = () => {
    const nextErrors = {};
    ["unit", "tenant", "start_date", "end_date", "monthly_rent", "security_deposit"].forEach(
      (field) => {
        if (String(values[field] ?? "").trim() === "") {
          nextErrors[field] = "This field is required.";
        }
      }
    );
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
        unit: Number(values.unit),
        tenant: Number(values.tenant),
        start_date: values.start_date,
        end_date: values.end_date,
        monthly_rent: Number(values.monthly_rent),
        security_deposit: Number(values.security_deposit),
        is_active: Boolean(values.is_active),
      };
      if (isEditMode) {
        await updateLease(id, payload);
      } else {
        await createLease(payload);
      }
      navigate("/tenants", {
        state: {
          snackbar: {
            message: isEditMode ? "Lease updated successfully." : "Lease created successfully.",
            severity: "success",
          },
        },
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Unable to save lease.",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        {isEditMode ? "Edit Lease" : "Add Lease"}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.2 }}>
        Leases &gt; {isEditMode ? "Edit" : "Add New"}
      </Typography>
      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <Paper
          component="form"
          onSubmit={handleSubmit}
          sx={{ p: 3, borderRadius: 1, bgcolor: "background.paper", maxWidth: 600 }}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}>
            <Box>
              <FormControl fullWidth error={Boolean(errors.unit)} required>
                <InputLabel>Unit</InputLabel>
                <Select label="Unit" value={values.unit} onChange={handleChange("unit")}>
                  {units.map((unit) => (
                    <MenuItem key={unit.id} value={unit.id}>
                      {(propertyMap[unit.property] || "Unknown Property") + ` - Unit ${unit.unit_number}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <FormControl fullWidth error={Boolean(errors.tenant)} required>
                <InputLabel>Tenant</InputLabel>
                <Select label="Tenant" value={values.tenant} onChange={handleChange("tenant")}>
                  {tenants.map((tenant) => (
                    <MenuItem key={tenant.id} value={tenant.id}>
                      {tenant.first_name} {tenant.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                variant="outlined"
                value={values.start_date}
                onChange={handleChange("start_date")}
                error={Boolean(errors.start_date)}
                helperText={errors.start_date}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                variant="outlined"
                value={values.end_date}
                onChange={handleChange("end_date")}
                error={Boolean(errors.end_date)}
                helperText={errors.end_date}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                type="number"
                inputProps={{ step: "0.01" }}
                label="Monthly Rent"
                variant="outlined"
                value={values.monthly_rent}
                onChange={handleChange("monthly_rent")}
                error={Boolean(errors.monthly_rent)}
                helperText={errors.monthly_rent}
                required
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                type="number"
                inputProps={{ step: "0.01" }}
                label="Security Deposit"
                variant="outlined"
                value={values.security_deposit}
                onChange={handleChange("security_deposit")}
                error={Boolean(errors.security_deposit)}
                helperText={errors.security_deposit}
                required
              />
            </Box>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(values.is_active)}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, is_active: event.target.checked }))
                    }
                  />
                }
                label="Lease is active"
              />
            </Box>
          </Box>
          <Box sx={{ mt: 2, display: "flex", gap: 1.2, justifyContent: "flex-end" }}>
            <Button variant="text" onClick={() => navigate("/leases")} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {isEditMode ? "Update Lease" : "Create Lease"}
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

export default LeaseForm;
