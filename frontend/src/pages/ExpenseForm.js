import { Alert, Box, Button, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Paper, Select, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createExpense, getDocuments, getExpense, getProperties, getUnits, updateExpense } from "../services/api";

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
  const [error, setError] = useState("");

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
        setError("Unable to load expense form.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEditMode]);

  const filteredUnits = useMemo(() => {
    if (!values.property) return units;
    return units.filter((u) => String(u.property) === String(values.property));
  }, [units, values.property]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!values.property || !values.description.trim() || !values.amount || !values.date) {
      setError("Please complete required fields.");
      return;
    }
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
    } catch {
      setError("Unable to save expense.");
    }
  };

  return (
    <Box>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#fff", mb: 0.6 }}>
        {isEditMode ? "Edit Expense" : "Add Expense"}
      </Typography>
      <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1.4 }}>
        Accounting &gt; Expenses
      </Typography>
      {error ? <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert> : null}
      {loading ? <Typography>Loading...</Typography> : null}
      {!loading ? (
        <Paper component="form" onSubmit={submit} sx={{ p: 2.2, maxWidth: 680 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.2 }}>
            <FormControl fullWidth required>
              <InputLabel>Property</InputLabel>
              <Select label="Property" value={values.property} onChange={(e) => setValues((p) => ({ ...p, property: e.target.value, unit: "" }))}>
                {properties.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Unit (Optional)</InputLabel>
              <Select label="Unit (Optional)" value={values.unit} onChange={(e) => setValues((p) => ({ ...p, unit: e.target.value }))}>
                <MenuItem value="">None</MenuItem>
                {filteredUnits.map((u) => <MenuItem key={u.id} value={u.id}>Unit {u.unit_number}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select label="Category" value={values.category} onChange={(e) => setValues((p) => ({ ...p, category: e.target.value }))}>
                {categories.map((cat) => <MenuItem key={cat} value={cat}>{cat.replaceAll("_", " ")}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Vendor Name" value={values.vendor_name} onChange={(e) => setValues((p) => ({ ...p, vendor_name: e.target.value }))} />
            <TextField label="Amount" type="number" inputProps={{ step: "0.01" }} required value={values.amount} onChange={(e) => setValues((p) => ({ ...p, amount: e.target.value }))} />
            <TextField label="Date" type="date" required InputLabelProps={{ shrink: true }} value={values.date} onChange={(e) => setValues((p) => ({ ...p, date: e.target.value }))} />
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField label="Description" fullWidth multiline minRows={3} required value={values.description} onChange={(e) => setValues((p) => ({ ...p, description: e.target.value }))} />
            </Box>
            <FormControl fullWidth>
              <InputLabel>Receipt (Optional)</InputLabel>
              <Select label="Receipt (Optional)" value={values.receipt} onChange={(e) => setValues((p) => ({ ...p, receipt: e.target.value }))}>
                <MenuItem value="">None</MenuItem>
                {documents.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FormControlLabel
                control={<Checkbox checked={values.is_recurring} onChange={(e) => setValues((p) => ({ ...p, is_recurring: e.target.checked }))} />}
                label="Recurring Expense"
              />
            </Box>
            {values.is_recurring ? (
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select label="Frequency" value={values.recurring_frequency} onChange={(e) => setValues((p) => ({ ...p, recurring_frequency: e.target.value }))}>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="annually">Annually</MenuItem>
                </Select>
              </FormControl>
            ) : null}
          </Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
            <Button onClick={() => navigate("/accounting")} sx={{ color: "text.secondary" }}>Cancel</Button>
            <Button type="submit" variant="contained">{isEditMode ? "Update Expense" : "Create Expense"}</Button>
          </Box>
        </Paper>
      ) : null}
    </Box>
  );
}

export default ExpenseForm;

