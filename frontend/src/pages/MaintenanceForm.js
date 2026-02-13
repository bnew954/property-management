import { useEffect, useMemo, useState } from "react";
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
import {
  createMaintenanceRequest,
  getMaintenanceRequest,
  getProperties,
  getTenants,
  getUnits,
  updateMaintenanceRequest,
} from "../services/api";

const initialValues = {
  unit: "",
  tenant: "",
  title: "",
  description: "",
  priority: "",
  status: "",
};

const priorities = ["low", "medium", "high", "emergency"];
const statuses = ["submitted", "in_progress", "completed", "cancelled"];
const toLabel = (value) => value.replaceAll("_", " ");

function MaintenanceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
          const requestRes = await getMaintenanceRequest(id);
          const request = requestRes.data;
          setValues({
            unit: request.unit ?? "",
            tenant: request.tenant ?? "",
            title: request.title || "",
            description: request.description || "",
            priority: request.priority || "",
            status: request.status || "",
          });
        }
      } catch (err) {
        setSnackbar({
          open: true,
          message: "Unable to load maintenance form data.",
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
    properties.forEach((property) => {
      map[property.id] = property.name;
    });
    return map;
  }, [properties]);

  const validate = () => {
    const nextErrors = {};
    ["unit", "tenant", "title", "description", "priority", "status"].forEach((field) => {
      if (!String(values[field] ?? "").trim()) {
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

  const unitLabel = (unit) => {
    const propertyName = propertyMap[unit.property] || `Property #${unit.property}`;
    return `${propertyName} - Unit ${unit.unit_number}`;
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
        title: values.title.trim(),
        description: values.description.trim(),
        priority: values.priority,
        status: values.status,
      };
      if (isEditMode) {
        await updateMaintenanceRequest(id, payload);
      } else {
        await createMaintenanceRequest(payload);
      }
      navigate("/maintenance", {
        state: {
          snackbar: {
            message: isEditMode
              ? "Maintenance request updated successfully."
              : "Maintenance request created successfully.",
            severity: "success",
          },
        },
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Unable to save maintenance request.",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        {isEditMode ? "Edit Maintenance Request" : "Add Maintenance Request"}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.2 }}>
        Maintenance &gt; {isEditMode ? "Edit" : "Add New"}
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
                      {unitLabel(unit)}
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
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField
                fullWidth
                label="Title"
                variant="outlined"
                value={values.title}
                onChange={handleChange("title")}
                error={Boolean(errors.title)}
                helperText={errors.title}
                required
              />
            </Box>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField
                fullWidth
                multiline
                minRows={4}
                label="Description"
                variant="outlined"
                value={values.description}
                onChange={handleChange("description")}
                error={Boolean(errors.description)}
                helperText={errors.description}
                required
              />
            </Box>
            <Box>
              <FormControl fullWidth error={Boolean(errors.priority)} required>
                <InputLabel>Priority</InputLabel>
                <Select label="Priority" value={values.priority} onChange={handleChange("priority")}>
                  {priorities.map((priority) => (
                    <MenuItem key={priority} value={priority}>
                      {toLabel(priority)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <FormControl fullWidth error={Boolean(errors.status)} required>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={values.status} onChange={handleChange("status")}>
                  {statuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      {toLabel(status)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          <Box sx={{ mt: 2, display: "flex", gap: 1.2, justifyContent: "flex-end" }}>
            <Button variant="text" onClick={() => navigate("/maintenance")} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {isEditMode ? "Update Request" : "Create Request"}
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

export default MaintenanceForm;
