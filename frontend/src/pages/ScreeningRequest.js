import { Alert, Box, Button, FormControl, InputLabel, MenuItem, Paper, Select, Snackbar, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createScreening, getTenants, runScreening } from "../services/api";
import { useUser } from "../services/userContext";

function ScreeningRequest() {
  const navigate = useNavigate();
  const { role } = useUser();
  const [tenant, setTenant] = useState("");
  const [tenants, setTenants] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    const loadTenants = async () => {
      try {
        const response = await getTenants();
        setTenants(response.data || []);
      } catch {
        setSnackbar({
          open: true,
          message: "Unable to load tenants.",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    if (role === "landlord") {
      loadTenants();
    } else {
      setLoading(false);
    }
  }, [role]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!tenant) {
      setSnackbar({
        open: true,
        message: "Please select a tenant.",
        severity: "error",
      });
      return;
    }
    try {
      setSubmitting(true);
      const createRes = await createScreening({ tenant });
      const screeningId = createRes.data?.id;
      if (!screeningId) {
        throw new Error("Screening creation failed.");
      }
      await runScreening(screeningId);
      navigate(`/screenings/${screeningId}`);
    } catch {
      setSnackbar({
        open: true,
        message: "Unable to run screening.",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (role !== "landlord") {
    return (
      <Paper sx={{ p: 2, bgcolor: "#141414" }}>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Screening tools are available to landlord accounts only.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography sx={{ fontSize: 20, fontWeight: 600, mb: 0.8, color: "#fff", letterSpacing: "-0.01em" }}>
        New Screening Request
      </Typography>
      <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1.5 }}>
        Screening &gt; Run New Check
      </Typography>
      {loading ? <Typography>Loading...</Typography> : null}
      {!loading ? (
        <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, bgcolor: "#141414", maxWidth: 640 }}>
          <Alert
            severity="info"
            sx={{
              mb: 2,
              bgcolor: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.25)",
            }}
          >
            This will run a background check, credit check, and eviction history
            search. Results are typically available within seconds.
          </Alert>
          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel>Tenant</InputLabel>
            <Select
              label="Tenant"
              value={tenant}
              onChange={(event) => setTenant(event.target.value)}
            >
              {tenants.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.first_name} {item.last_name} ({item.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button variant="text" onClick={() => navigate("/screenings")} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              Run Screening
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

export default ScreeningRequest;

