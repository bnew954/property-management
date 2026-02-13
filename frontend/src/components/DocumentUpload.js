import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import { getLeases, getProperties, getTenants, getUnits, uploadDocument } from "../services/api";

const documentTypes = [
  "lease_agreement",
  "inspection_report",
  "insurance",
  "tax_document",
  "notice",
  "receipt",
  "photo",
  "other",
];

function DocumentUpload({
  open,
  onClose,
  onUploaded,
  defaultIsTemplate = false,
  initialFile = null,
}) {
  const theme = useTheme();
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [leases, setLeases] = useState([]);
  const [file, setFile] = useState(null);
  const [values, setValues] = useState({
    name: "",
    document_type: "other",
    description: "",
    property: "",
    unit: "",
    tenant: "",
    lease: "",
    is_template: defaultIsTemplate,
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    const loadOptions = async () => {
      try {
        const [propertiesRes, unitsRes, tenantsRes, leasesRes] = await Promise.all([
          getProperties(),
          getUnits(),
          getTenants(),
          getLeases(),
        ]);
        setProperties(propertiesRes.data || []);
        setUnits(unitsRes.data || []);
        setTenants(tenantsRes.data || []);
        setLeases(leasesRes.data || []);
      } catch {
        setError("Unable to load upload options.");
      }
    };
    loadOptions();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setValues({
        name: "",
        document_type: "other",
        description: "",
        property: "",
        unit: "",
        tenant: "",
        lease: "",
        is_template: defaultIsTemplate,
      });
      setUploadProgress(0);
      setSubmitting(false);
      setError("");
    }
  }, [defaultIsTemplate, open]);

  useEffect(() => {
    if (open && initialFile) {
      setFile(initialFile);
      setValues((prev) => ({
        ...prev,
        name: prev.name || initialFile.name.replace(/\.[^/.]+$/, ""),
      }));
    }
  }, [initialFile, open]);

  const filteredUnits = useMemo(() => {
    if (!values.property) {
      return units;
    }
    return units.filter((unit) => String(unit.property) === String(values.property));
  }, [units, values.property]);

  const onFileChange = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) {
      return;
    }
    setFile(selected);
    setValues((prev) => ({
      ...prev,
      name: prev.name || selected.name.replace(/\.[^/.]+$/, ""),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    if (!values.name.trim()) {
      setError("Please provide a document name.");
      return;
    }
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", values.name.trim());
      formData.append("document_type", values.document_type);
      formData.append("description", values.description);
      if (values.property) formData.append("property", values.property);
      if (values.unit) formData.append("unit", values.unit);
      if (values.tenant) formData.append("tenant", values.tenant);
      if (values.lease) formData.append("lease", values.lease);
      formData.append("is_template", values.is_template ? "true" : "false");

      await uploadDocument(formData, (progressEvent) => {
        const total = progressEvent.total || 1;
        const percent = Math.round((progressEvent.loaded * 100) / total);
        setUploadProgress(percent);
      });
      onUploaded?.();
      onClose?.();
    } catch {
      setError("Failed to upload document.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        Upload Document
      </DialogTitle>
      <DialogContent sx={{ bgcolor: "background.paper", pt: 2 }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 1.2, mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Button
            variant="outlined"
            component="label"
            sx={{
              borderStyle: "dashed",
              borderColor: alpha(theme.palette.text.secondary, 0.4),
              color: "text.secondary",
              justifyContent: "flex-start",
            }}
          >
            {file ? `Selected: ${file.name}` : "Select File"}
            <input
              hidden
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx"
              onChange={onFileChange}
            />
          </Button>
          <TextField
            label="Name"
            value={values.name}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <FormControl fullWidth>
            <InputLabel>Document Type</InputLabel>
            <Select
              label="Document Type"
              value={values.document_type}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, document_type: event.target.value }))
              }
            >
              {documentTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Description"
            multiline
            minRows={3}
            value={values.description}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, description: event.target.value }))
            }
          />
          <FormControl fullWidth>
            <InputLabel>Property (Optional)</InputLabel>
            <Select
              label="Property (Optional)"
              value={values.property}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  property: event.target.value,
                  unit: "",
                }))
              }
            >
              <MenuItem value="">None</MenuItem>
              {properties.map((property) => (
                <MenuItem key={property.id} value={property.id}>
                  {property.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Unit (Optional)</InputLabel>
            <Select
              label="Unit (Optional)"
              value={values.unit}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, unit: event.target.value }))
              }
            >
              <MenuItem value="">None</MenuItem>
              {filteredUnits.map((unit) => (
                <MenuItem key={unit.id} value={unit.id}>
                  Unit {unit.unit_number}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Tenant (Optional)</InputLabel>
            <Select
              label="Tenant (Optional)"
              value={values.tenant}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, tenant: event.target.value }))
              }
            >
              <MenuItem value="">None</MenuItem>
              {tenants.map((tenant) => (
                <MenuItem key={tenant.id} value={tenant.id}>
                  {tenant.first_name} {tenant.last_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Lease (Optional)</InputLabel>
            <Select
              label="Lease (Optional)"
              value={values.lease}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, lease: event.target.value }))
              }
            >
              <MenuItem value="">None</MenuItem>
              {leases.map((lease) => (
                <MenuItem key={lease.id} value={lease.id}>
                  Lease #{lease.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={values.is_template}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, is_template: event.target.checked }))
                }
              />
            }
            label={<Typography sx={{ fontSize: 12, color: "text.secondary" }}>Save as template</Typography>}
          />
          {submitting ? <LinearProgress variant="determinate" value={uploadProgress} /> : null}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button onClick={onClose} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              Upload
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentUpload;
