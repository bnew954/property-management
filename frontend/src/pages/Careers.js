import { useEffect } from "react";
import PublicFooter from "../components/PublicFooter";
import PublicNavBar from "../components/PublicNavBar";
import { Box, Container, Typography } from "@mui/material";

const mutedText = "rgba(255, 255, 255, 0.55)";

export default function Careers() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Box sx={{ bgcolor: "#0a0a0f", color: "#fff", minHeight: "100vh" }}>
      <PublicNavBar />
      <Box sx={{ pt: "64px" }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, pt: 16, pb: 8, textAlign: "center" }}>
          <Typography variant="h3" sx={{ fontWeight: 800, color: "#fff" }}>
            Careers
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, color: mutedText }}>
            Help us build the future of property management.
          </Typography>
        </Container>

        <Container maxWidth="md" sx={{ px: { xs: 2, md: 3 }, py: 8 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff", mb: 3 }}>
            Why Work at Onyx PM?
          </Typography>
          <Typography variant="body1" sx={{ color: mutedText, lineHeight: 1.8 }}>
            We're a small, fast-moving team building AI-native property management software. If you're excited about making
            professional tools accessible to everyone, we'd love to hear from you.
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff", mb: 3, mt: 6 }}>
            Open Positions
          </Typography>
          <Box
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "16px",
              p: 4,
            }}
          >
            <Typography variant="body1" sx={{ color: mutedText }}>
              No open positions right now
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: mutedText }}>
              But we're always interested in hearing from talented people. Reach out at careers@onyx-pm.com
            </Typography>
          </Box>
        </Container>
      </Box>

      <PublicFooter />
    </Box>
  );
}
