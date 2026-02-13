import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createExpense,
  getDocuments,
  getExpense,
  getProperties,
  getUnits,
  updateExpense,
} from "../services/api";

const categories = [
  "maintenance",
  "insurance",
  "taxes",
  "utilities",
  "management_fee",
  "legal",
  "advertising",
  "supplies",
  "landscaping",
  "capital_improvement",
  "other",
];

function ExpenseForm() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const [values, setValues] = useState({
    property: "",
    unit: "",
    category: "other",
    vendor_name: "",
    description: "",
    amount: "",
    date: "",
    is_recurring: false,
    recurring_frequency: "",
    receipt: "",
  });
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const parseApiErrors = (error) => {
    const detail = error?.response?.data;
    if (!detail || typeof detail !== "object") {
      return { __all__: "Unable to save expense." };
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
    return Object.keys(fieldErrors).length
      ? fieldErrors
      : { __all__: "Unable to save expense." };
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [propertiesRes, unitsRes, docsRes] = await Promise.all([
          getProperties(),
          getUnits(),
          getDocuments({ document_type: "receipt" }),
        ]);
        setProperties(propertiesRes.data || []);
        setUnits(unitsRes.data || []);
        setDocuments(docsRes.data || []);
        if (isEditMode) {
          const expenseRes = await getExpense(id);
          const exp = expenseRes.data;
          setValues({
            property: exp.property || "",
            unit: exp.unit || "",
            category: exp.category || "other",
            vendor_name: exp.vendor_name || "",
            description: exp.description || "",
            amount: exp.amount || "",
            date: exp.date || "",
            is_recurring: Boolean(exp.is_recurring),
            recurring_frequency: exp.recurring_frequency || "",
            receipt: exp.receipt || "",
          });
        }
      } catch {
        setSnackbar({
          open: true,
          message: "Unable to load expense form.",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEditMode]);

  const filteredUnits = useMemo(() => {
    if (!values.property) {
      return units;
    }
    return units.filter((u) => String(u.property) === String(values.property));
  }, [units, values.property]);

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!values.property) {
      nextErrors.property = "This field is required.";
    }
    if (!values.description.trim()) {
      nextErrors.description = "This field is required.";
    }
    if (!values.amount) {
      nextErrors.amount = "This field is required.";
    }
    if (!values.date) {
      nextErrors.date = "This field is required.";
    }
    if (values.is_recurring && !values.recurring_frequency) {
      nextErrors.recurring_frequency = "This field is required.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSnackbar({
        open: true,
        message: "Please fix the highlighted errors.",
        severity: "error",
      });
      return;
    }
    setErrors({});

    const payload = {
      property: Number(values.property),
      unit: values.unit ? Number(values.unit) : null,
      category: values.category,
      vendor_name: values.vendor_name.trim(),
      description: values.description.trim(),
      amount: values.amount,
      date: values.date,
      is_recurring: values.is_recurring,
      recurring_frequency: values.is_recurring ? values.recurring_frequency || null : null,
      receipt: values.receipt ? Number(values.receipt) : null,
    };

    try {
      if (isEditMode) {
        await updateExpense(id, payload);
      } else {
        await createExpense(payload);
      }
      navigate("/accounting");
    } catch (err) {
      const fieldErrors = parseApiErrors(err);
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
      setSnackbar({
        open: true,
        message: fieldErrors.__all__ || "Unable to save expense.",
        severity: "error",
      });
    }
  };

  return (
    <Box>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: "text.primary", mb: 0.6 }}>
        {isEditMode ? "Edit Expense" : "Add Expense"}
      </Typography>
      <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1.4 }}>
        Accounting &gt; Expenses
      </Typography>
      {errors.__all__ ? <Alert severity="error" sx={{ mb: 1 }}>{errors.__all__}</Alert> : null}
      {loading ? <Typography>Loading...</Typography> : null}
      {!loading ? (
        <Paper component="form" onSubmit={submit} sx={{ p: 2.2, maxWidth: 680 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.2 }}>
            <FormControl fullWidth required error={Boolean(errors.property)}>
              <InputLabel>Property</InputLabel>
              <Select
                label="Property"
                value={values.property}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, property: event.target.value, unit: "" }))
                }
              >
                {properties.map((property) => (
                  <MenuItem key={property.id} value={property.id}>
                    {property.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.property ? <FormHelperText>{errors.property}</FormHelperText> : null}
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Unit (Optional)</InputLabel>
              <Select
                label="Unit (Optional)"
                value={values.unit}
                onChange={(event) => setValues((prev) => ({ ...prev, unit: event.target.value }))}
              >
                <MenuItem value="">None</MenuItem>
                {filteredUnits.map((unit) => (
                  <MenuItem key={unit.id} value={unit.id}>
                    Unit {unit.unit_number}
                  </MenuItem>
                ))}
              </Select>
              {errors.unit ? <FormHelperText>{errors.unit}</FormHelperText> : null}
            </FormControl>
            <FormControl fullWidth required error={Boolean(errors.category)}>
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={values.category}
                onChange={(event) => setValues((prev) => ({ ...prev, category: event.target.value }))}
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category.replaceAll("_", " ")}
                  </MenuItem>
                ))}
              </Select>
              {errors.category ? <FormHelperText>{errors.category}</FormHelperText> : null}
            </FormControl>
            <TextField
              fullWidth
              label="Vendor Name"
              value={values.vendor_name}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, vendor_name: event.target.value }))
              }
              error={Boolean(errors.vendor_name)}
              helperText={errors.vendor_name}
            />
            <TextField
              fullWidth
              label="Amount"
              type="number"
              inputProps={{ step: "0.01" }}
              required
              value={values.amount}
              onChange={(event) => setValues((prev) => ({ ...prev, amount: event.target.value }))}
              error={Boolean(errors.amount)}
              helperText={errors.amount}
            />
            <TextField
              fullWidth
              label="Date"
              type="date"
              required
              InputLabelProps={{ shrink: true }}
              value={values.date}
              onChange={(event) => setValues((prev) => ({ ...prev, date: event.target.value }))}
              error={Boolean(errors.date)}
              helperText={errors.date}
            />
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField
                fullWidth
                label="Description"
                multiline
                minRows={3}
                required
                value={values.description}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, description: event.target.value }))
                }
                error={Boolean(errors.description)}
                helperText={errors.description}
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel>Receipt (Optional)</InputLabel>
              <Select
                label="Receipt (Optional)"
                value={values.receipt}
                onChange={(event) => setValues((prev) => ({ ...prev, receipt: event.target.value }))}
              >
                <MenuItem value="">None</MenuItem>
                {documents.map((document) => (
                  <MenuItem key={document.id} value={document.id}>
                    {document.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.receipt ? <FormHelperText>{errors.receipt}</FormHelperText> : null}
            </FormControl>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={values.is_recurring}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, is_recurring: event.target.checked }))
                    }
                  />
                }
                label="Recurring Expense"
              />
            </Box>
            {values.is_recurring ? (
              <FormControl
                fullWidth
                required
                error={Boolean(errors.recurring_frequency)}
              >
                <InputLabel>Frequency</InputLabel>
                <Select
                  label="Frequency"
                  value={values.recurring_frequency}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, recurring_frequency: event.target.value }))
                  }
                >
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="annually">Annually</MenuItem>
                </Select>
                {errors.recurring_frequency ? <FormHelperText>{errors.recurring_frequency}</FormHelperText> : null}
              </FormControl>
            ) : null}
          </Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
            <Button
              onClick={() => navigate("/accounting")}
              sx={{ color: "text.secondary" }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              {isEditMode ? "Update Expense" : "Create Expense"}
            </Button>
          </Box>
        </Paper>
      ) : null}
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

export default ExpenseForm;
