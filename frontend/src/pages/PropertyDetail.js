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
import EditIcon from "@mui/icons-material/Edit";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { downloadDocument, getDocuments, getProperty, getUnits } from "../services/api";

function PropertyDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [documents, setDocuments] = useState([]);
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
        const docsRes = await getDocuments({ property_id: id });
        setDocuments(docsRes.data || []);
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

  const headerCellSx = {
    color: "text.secondary",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontSize: "11px",
    borderBottom: "1px solid",
    borderColor: "divider",
  };

  return (
    <Box>
      {loading ? <Typography sx={{ mb: 1.5 }}>Loading...</Typography> : null}
      {error ? <Typography sx={{ mb: 1.5, color: "error.main" }}>{error}</Typography> : null}
      {!loading && property ? (
        <>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "text.primary" }}>
              {property.name}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                component={Link}
                to={`/properties/${id}/edit`}
                variant="outlined"
                size="small"
                sx={{ borderColor: "divider", color: "text.secondary", "&:hover": { borderColor: "primary.main", color: "primary.main", backgroundColor: "action.hover" } }}
              >
                <EditIcon sx={{ mr: 0.6, fontSize: 16 }} />
                Edit Property
              </Button>
              <Button
                component={Link}
                to={`/properties/${id}/units/new`}
                variant="outlined"
                size="small"
                sx={{ borderColor: "divider", color: "text.secondary", "&:hover": { borderColor: "primary.main", color: "primary.main", backgroundColor: "action.hover" } }}
              >
                <AddRoundedIcon sx={{ mr: 0.6, fontSize: 16 }} />
                Add Unit
              </Button>
            </Stack>
          </Box>

          <Paper sx={{ p: 2, mb: 1.2, bgcolor: "background.paper" }}>
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

          <TableContainer component={Paper} sx={{ bgcolor: "background.paper", borderRadius: 1 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>Unit #</TableCell>
                  <TableCell sx={headerCellSx}>Bedrooms</TableCell>
                  <TableCell sx={headerCellSx}>Bathrooms</TableCell>
                  <TableCell sx={headerCellSx}>Sq Ft</TableCell>
                  <TableCell sx={headerCellSx}>Rent</TableCell>
                  <TableCell sx={headerCellSx}>Available</TableCell>
                  <TableCell align="right" sx={headerCellSx}>Actions</TableCell>
                </TableRow>
              </TableHead>
                <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.id} sx={{ "& td": { borderBottom: "1px solid", borderColor: "divider", fontSize: 13 } }}>
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
                        sx={{ color: "text.secondary", "&:hover": { color: "primary.main", backgroundColor: "transparent" } }}
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

          <Paper sx={{ mt: 1.2, p: 1.2, bgcolor: "background.paper" }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary", mb: 0.8 }}>
              Documents
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerCellSx}>Name</TableCell>
                    <TableCell sx={headerCellSx}>Type</TableCell>
                    <TableCell sx={headerCellSx}>Date</TableCell>
                    <TableCell align="right" sx={headerCellSx}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id} sx={{ "& td": { borderBottom: "1px solid", borderColor: "divider", fontSize: 13 } }}>
                      <TableCell>{doc.name}</TableCell>
                      <TableCell sx={{ textTransform: "capitalize" }}>
                        {String(doc.document_type || "").replaceAll("_", " ")}
                      </TableCell>
                      <TableCell>
                        {new Date(doc.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="text"
                          size="small"
                          onClick={async () => {
                            const response = await downloadDocument(doc.id);
                            const url = URL.createObjectURL(response.data);
                            const a = window.document.createElement("a");
                            a.href = url;
                            a.download = doc.file?.split("/").pop() || doc.name;
                            window.document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                          }}
                          sx={{ color: "text.secondary", "&:hover": { color: "primary.main", backgroundColor: "transparent" } }}
                        >
                          <CloudDownloadIcon sx={{ mr: 0.4, fontSize: 15 }} />
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && documents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>No documents linked to this property.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
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
