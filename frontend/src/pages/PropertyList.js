import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { deleteProperty, getProperties } from "../services/api";

function PropertyList() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const location = useLocation();
  const navigate = useNavigate();

  const loadProperties = async () => {
    try {
      const response = await getProperties();
      setProperties(response.data || []);
    } catch (err) {
      setError("Unable to load properties.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (location.state?.snackbar?.message) {
      setSnackbar({
        open: true,
        message: location.state.snackbar.message,
        severity: location.state.snackbar.severity || "success",
      });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const handleDelete = async (propertyId) => {
    try {
      await deleteProperty(propertyId);
      setSnackbar({
        open: true,
        message: "Property deleted successfully.",
        severity: "success",
      });
      loadProperties();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to delete property.",
        severity: "error",
      });
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Properties
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Manage your property portfolio
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button component={Link} to="/properties/new" variant="contained" color="primary">
          <AddRoundedIcon sx={{ mr: 0.8 }} fontSize="small" />
          Add Property
        </Button>
      </Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      <TableContainer component={Paper} sx={{ borderRadius: 2.5, bgcolor: "#111827" }}>
        <Table>
          <TableHead sx={{ bgcolor: "#1e2538" }}>
            <TableRow>
              <TableCell sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.74rem" }}>Name</TableCell>
              <TableCell sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.74rem" }}>City</TableCell>
              <TableCell sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.74rem" }}>State</TableCell>
              <TableCell sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.74rem" }}>Type</TableCell>
              <TableCell align="right" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.74rem" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {properties.map((property) => (
              <TableRow key={property.id} hover sx={{ "&:hover": { bgcolor: "#1a1f35" } }}>
                <TableCell>
                  <Link to={`/properties/${property.id}`} style={{ color: "#2563eb", fontWeight: 600 }}>
                    {property.name}
                  </Link>
                </TableCell>
                <TableCell>{property.city}</TableCell>
                <TableCell>{property.state}</TableCell>
                <TableCell sx={{ textTransform: "capitalize" }}>{property.property_type}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <IconButton
                      component={Link}
                      to={`/properties/${property.id}/edit`}
                      color="primary"
                      size="small"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDelete(property.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!loading && properties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>No properties found.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
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

export default PropertyList;
