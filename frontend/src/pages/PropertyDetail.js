import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
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
import { getProperty, getUnits } from "../services/api";

function PropertyDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const loadPropertyDetail = async () => {
      try {
        const [propertyRes, unitsRes] = await Promise.all([
          getProperty(id),
          getUnits({ property_id: id }),
        ]);
        setProperty(propertyRes.data);
        setUnits(unitsRes.data || []);
      } catch (err) {
        setError("Unable to load property details.");
      } finally {
        setLoading(false);
      }
    };

    loadPropertyDetail();
  }, [id]);

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

  return (
    <Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      {!loading && property ? (
        <>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {property.name}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button component={Link} to={`/properties/${id}/edit`} variant="outlined">
                Edit Property
              </Button>
              <Button component={Link} to={`/properties/${id}/units/new`} variant="contained">
                Add Unit
              </Button>
            </Stack>
          </Box>

          <Paper sx={{ p: 3, mb: 2, boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Address:</strong> {property.address_line1}
              {property.address_line2 ? `, ${property.address_line2}` : ""}, {property.city},{" "}
              {property.state} {property.zip_code}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1, textTransform: "capitalize" }}>
              <strong>Type:</strong> {property.property_type}
            </Typography>
            <Typography variant="body1">
              <strong>Description:</strong> {property.description || "No description provided."}
            </Typography>
          </Paper>

          <TableContainer component={Paper} sx={{ boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Unit #</TableCell>
                  <TableCell>Bedrooms</TableCell>
                  <TableCell>Bathrooms</TableCell>
                  <TableCell>Sq Ft</TableCell>
                  <TableCell>Rent</TableCell>
                  <TableCell>Available</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.id} hover>
                    <TableCell>{unit.unit_number}</TableCell>
                    <TableCell>{unit.bedrooms}</TableCell>
                    <TableCell>{unit.bathrooms}</TableCell>
                    <TableCell>{unit.square_feet}</TableCell>
                    <TableCell>${Number(unit.rent_amount).toLocaleString()}</TableCell>
                    <TableCell>{unit.is_available ? "Yes" : "No"}</TableCell>
                    <TableCell align="right">
                      <Button
                        component={Link}
                        to={`/properties/${id}/units/${unit.id}/edit`}
                        variant="text"
                        size="small"
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && units.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>No units found for this property.</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </>
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

export default PropertyDetail;
