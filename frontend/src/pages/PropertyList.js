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

const headerCellSx = {
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: "11px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

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
      <Box sx={{ mb: 0.8 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "#fff" }}>
          Properties
        </Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Manage your property portfolio
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.2 }}>
        <Button
          component={Link}
          to="/properties/new"
          variant="outlined"
          size="small"
          sx={{
            borderColor: "rgba(255,255,255,0.1)",
            color: "#e0e0e0",
            "&:hover": {
              borderColor: "primary.main",
              color: "primary.main",
              backgroundColor: "rgba(124,92,252,0.08)",
            },
          }}
        >
          <AddRoundedIcon sx={{ mr: 0.6, fontSize: 16 }} />
          Add Property
        </Button>
      </Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      <TableContainer component={Paper} sx={{ borderRadius: 1, bgcolor: "#141414" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>Name</TableCell>
              <TableCell sx={headerCellSx}>City</TableCell>
              <TableCell sx={headerCellSx}>State</TableCell>
              <TableCell sx={headerCellSx}>Type</TableCell>
              <TableCell align="right" sx={headerCellSx}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {properties.map((property) => (
              <TableRow key={property.id} sx={{ "& td": { borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 } }}>
                <TableCell>
                  <Link to={`/properties/${property.id}`} style={{ color: "#7c5cfc", fontWeight: 500 }}>
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
                      size="small"
                      sx={{ color: "#6b7280", "&:hover": { color: "primary.main", backgroundColor: "transparent" } }}
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(property.id)}
                      sx={{ color: "#6b7280", "&:hover": { color: "error.main", backgroundColor: "transparent" } }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
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
        {!loading && properties.length < 6 ? (
          <Box
            sx={{
              mx: 1.2,
              mb: 1.2,
              mt: 0.4,
              border: "1px dashed rgba(255,255,255,0.12)",
              borderRadius: 1,
              py: 1,
              textAlign: "center",
              color: "text.secondary",
              fontSize: 12,
            }}
          >
            No more records
          </Box>
        ) : null}
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
