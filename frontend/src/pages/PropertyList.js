import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { getProperties } from "../services/api";

function PropertyList() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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

    loadProperties();
  }, []);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Properties
        </Typography>
        <Button variant="contained" color="primary">
          Add Property
        </Button>
      </Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      <TableContainer component={Paper} sx={{ boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>City</TableCell>
              <TableCell>State</TableCell>
              <TableCell>Type</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {properties.map((property) => (
              <TableRow key={property.id} hover>
                <TableCell>
                  <Link to={`/properties/${property.id}`} style={{ color: "#2563eb", fontWeight: 600 }}>
                    {property.name}
                  </Link>
                </TableCell>
                <TableCell>{property.city}</TableCell>
                <TableCell>{property.state}</TableCell>
                <TableCell sx={{ textTransform: "capitalize" }}>{property.property_type}</TableCell>
              </TableRow>
            ))}
            {!loading && properties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>No properties found.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default PropertyList;
