import { Link } from "react-router-dom";
import { Box, Container, Divider, Link as MuiLink, Stack, Typography } from "@mui/material";

function BrandLogo({ textColor, onyxSize = 18, iconSize = 28, pillSize }) {
  const pmFontSize = pillSize || `${Math.round(onyxSize * 0.7)}px`;
  const logoSrc = `${process.env.PUBLIC_URL || ""}/logo-icon.png`;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <img
        src={logoSrc}
        alt="Onyx PM"
        style={{
          height: iconSize,
          width: "auto",
          display: "block",
          background: "transparent",
          filter: "brightness(1.1)",
          mixBlendMode: "screen",
        }}
      />
      <Typography
        sx={{
          fontSize: onyxSize,
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: textColor,
          lineHeight: 1,
        }}
      >
        ONYX
      </Typography>
      <Box
        component="span"
        sx={{
          backgroundColor: "rgba(124,92,252,0.15)",
          color: "#7c5cfc",
          px: "10px",
          py: "3px",
          borderRadius: "6px",
          fontFamily: "'Syne', sans-serif",
          fontWeight: 600,
          letterSpacing: "0.05em",
          fontSize: pmFontSize,
          textTransform: "uppercase",
          lineHeight: 1.4,
        }}
      >
        PM
      </Box>
    </Box>
  );
}

export default function PublicFooter() {
  return (
    <Box sx={{ mt: 8, bgcolor: "#111111", color: "#fff", pt: 6, pb: 4 }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, maxWidth: "1200px !important" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
            gap: 2.5,
          }}
        >
          <Box>
            <Link
              to="/"
              style={{ textDecoration: "none", display: "flex", alignItems: "center", cursor: "pointer", marginBottom: "24px" }}
            >
              <BrandLogo textColor="#fff" onyxSize={18} iconSize={26} />
            </Link>
            <Stack spacing={0}>
              <MuiLink
                href="/#features"
                underline="none"
                color="#fff"
                sx={{ fontSize: 13, mb: 1.5, display: "block", "&:last-child": { mb: 0 } }}
              >
                Features
              </MuiLink>
              <MuiLink
                component={Link}
                to="/why-onyx"
                underline="none"
                color="#fff"
                sx={{ fontSize: 13, mb: 1.5, display: "block", "&:last-child": { mb: 0 } }}
              >
                Why Onyx?
              </MuiLink>
              <MuiLink
                href="/#pricing"
                underline="none"
                color="#fff"
                sx={{ fontSize: 13, mb: 1.5, display: "block", "&:last-child": { mb: 0 } }}
              >
                Pricing
              </MuiLink>
              <MuiLink
                href="/#faq"
                underline="none"
                color="#fff"
                sx={{ fontSize: 13, mb: 1.5, display: "block", "&:last-child": { mb: 0 } }}
              >
                FAQ
              </MuiLink>
              <MuiLink
                component={Link}
                to="/login"
                underline="none"
                color="#fff"
                sx={{ fontSize: 13, mb: 1.5, display: "block", "&:last-child": { mb: 0 } }}
              >
                Log In
              </MuiLink>
            </Stack>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1.4 }}>Company</Typography>
            <Stack spacing={1}>
              <MuiLink component={Link} to="/about" underline="none" color="#878C9E" sx={{ fontSize: 13 }}>
                About
              </MuiLink>
              <MuiLink component={Link} to="/blog" underline="none" color="#878C9E" sx={{ fontSize: 13 }}>
                Blog
              </MuiLink>
              <MuiLink component={Link} to="/careers" underline="none" color="#878C9E" sx={{ fontSize: 13 }}>
                Careers
              </MuiLink>
            </Stack>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1.4 }}>Product</Typography>
            <Stack spacing={1}>
              <MuiLink component={Link} to="/features/listings" underline="none" color="#878C9E" sx={{ fontSize: 13 }}>
                Features
              </MuiLink>
              <MuiLink href="/#pricing" underline="none" color="#878C9E" sx={{ fontSize: 13 }}>
                Pricing
              </MuiLink>
              <MuiLink component={Link} to="/why-onyx" underline="none" color="#878C9E" sx={{ fontSize: 13 }}>
                Why Onyx?
              </MuiLink>
            </Stack>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1.4 }}>Legal</Typography>
            <Stack spacing={1}>
              <MuiLink component={Link} to="/privacy" underline="none" color="#878C9E" sx={{ fontSize: 13 }}>
                Privacy Policy
              </MuiLink>
              <MuiLink component={Link} to="/terms" underline="none" color="#878C9E" sx={{ fontSize: 13 }}>
                Terms of Service
              </MuiLink>
            </Stack>
          </Box>
        </Box>
        <Divider sx={{ mt: 2.8, borderColor: "rgba(255,255,255,0.06)" }} />
        <Box
          sx={{
            mt: 1.4,
            display: "flex",
            justifyContent: { xs: "center", md: "space-between" },
            alignItems: "center",
            flexDirection: { xs: "column", md: "row" },
            gap: 0.8,
          }}
        >
          <Typography sx={{ fontSize: 12, color: "#6b7280" }}>© 2026 Onyx PM. All rights reserved.</Typography>
          <Stack direction="row" spacing={1.2} sx={{ color: "#6b7280", fontSize: 12 }}>
            <MuiLink href="#" color="inherit" underline="none">
              LinkedIn
            </MuiLink>
            <MuiLink href="#" color="inherit" underline="none">
              X
            </MuiLink>
            <MuiLink href="#" color="inherit" underline="none">
              YouTube
            </MuiLink>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}


