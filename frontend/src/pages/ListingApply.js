import { Link, useNavigate, useParams } from "react-router-dom";
import { Box, Button, Card, CardContent, Typography } from "@mui/material";

function ListingApply() {
  const { slug } = useParams();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: "#f8fafc",
        p: 2,
      }}
    >
      <Card sx={{ p: 0, border: "1px solid", borderColor: "divider", maxWidth: 640, width: "100%" }}>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Application for this listing is coming soon
          </Typography>
          <Typography sx={{ color: "text.secondary", mb: 2 }}>
            You are applying to listing slug: {slug}
          </Typography>
          <Typography sx={{ mb: 1 }}>
            You can still view and review the listing details.
          </Typography>
          <Button component={Link} to={`/listing/${slug}`} sx={{ mr: 1 }} variant="outlined">
            View Listing
          </Button>
          <Button variant="contained" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

export default ListingApply;
