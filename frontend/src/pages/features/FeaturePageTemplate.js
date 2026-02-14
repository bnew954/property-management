import { Link } from "react-router-dom";
import * as MuiIcons from "@mui/icons-material";
import {
  Box,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import PublicNavBar from "../../components/PublicNavBar";
import featureMenuConfig from "./featureMenuConfig";

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

function FeatureFooter() {
  return (
    <Box sx={{ mt: 8, bgcolor: "#111111", color: "#fff", pt: 6, pb: 4 }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, maxWidth: "1200px !important" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
            gap: 2.5,
          }}
        >
          <Box>
            <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", cursor: "pointer" }}>
              <BrandLogo textColor="#fff" onyxSize={18} iconSize={26} />
            </Link>
            <Stack spacing={1}>
              <MuiLink href="/#features" underline="none" color="#fff" sx={{ fontSize: 13 }}>
                Features
              </MuiLink>
              <MuiLink href="/#pricing" underline="none" color="#fff" sx={{ fontSize: 13 }}>
                Pricing
              </MuiLink>
              <MuiLink href="/#faq" underline="none" color="#fff" sx={{ fontSize: 13 }}>
                FAQ
              </MuiLink>
              <MuiLink component={Link} to="/login" underline="none" color="#fff" sx={{ fontSize: 13 }}>
                Login
              </MuiLink>
            </Stack>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1.4 }}>Company</Typography>
            <Stack spacing={1}>
              <MuiLink href="#" underline="none" color="#878C9E" sx={{ fontSize: 13 }}>
                About
              </MuiLink>
              <MuiLink href="#" underline="none" color="#878C9E" sx={{ fontSize: 13 }}>
                Blog
              </MuiLink>
              <MuiLink href="#" underline="none" color="#878C9E" sx={{ fontSize: 13 }}>
                Careers
              </MuiLink>
            </Stack>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1.4 }}>Legal</Typography>
            <Stack spacing={1}>
              <MuiLink href="#" underline="none" color="#878C9E" sx={{ fontSize: 13 }}>
                Privacy Policy
              </MuiLink>
              <MuiLink href="#" underline="none" color="#878C9E" sx={{ fontSize: 13 }}>
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
          <Typography sx={{ fontSize: 12, color: "#6b7280" }}>(c) 2026 Onyx PM. All rights reserved.</Typography>
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

export default function FeaturePageTemplate({ feature }) {
  if (!feature) {
    return null;
  }

  const HeaderIcon = feature.icon;

  return (
    <Box sx={{ bgcolor: "#0a0a0a", color: "#e5e7eb", fontFamily: "Inter, Roboto, sans-serif", pt: "64px" }}>
      <PublicNavBar />

      <Box sx={{ pb: 4 }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>
          <Box sx={{ mb: 8 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.8, color: "#7c5cfc", mb: 2 }}>
              <HeaderIcon sx={{ fontSize: 48 }} />
              <Typography variant="h3" sx={{ fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>
                {feature.title}
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 900, lineHeight: 1.7 }}>
              {feature.tagline}
            </Typography>
          </Box>
        </Container>
      </Box>

      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>
          <Grid container spacing={3} alignItems="stretch">
            {feature.benefits.map((benefit) => {
              const BenefitIcon = MuiIcons[benefit.icon] || MuiIcons.CheckCircleOutline;
              return (
                <Grid key={benefit.title} item xs={12} md={4}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: "100%",
                      borderRadius: "12px",
                      backgroundColor: "#111827",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <CardContent sx={{ p: "32px 24px", display: "flex", flexDirection: "column", gap: 1.2, width: "100%", minHeight: 0 }}>
                      <BenefitIcon sx={{ color: "#7c5cfc", fontSize: 40 }} />
                      <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, mt: 2 }}>
                        {benefit.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.65 }}>
                        {benefit.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>
          <Typography variant="h4" sx={{ color: "#fff", fontWeight: 700, textAlign: "center", mb: 6 }}>
            How It Works
          </Typography>
          <Grid container spacing={3}>
            {feature.steps.map((step, index) => (
              <Grid key={step.title} item xs={12} sm={6} md={3}>
                <Paper
                  elevation={0}
                  sx={{
                    position: "relative",
                    height: "100%",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "#141414",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    p: 3,
                  }}
                >
                  {index !== feature.steps.length - 1 ? (
                    <Box
                      sx={{
                        display: { xs: "none", md: "block" },
                        position: "absolute",
                        top: 33,
                        left: "calc(50% + 22px)",
                        width: "calc(100% - 22px)",
                        borderTop: "1px solid rgba(255,255,255,0.1)",
                        zIndex: 0,
                      }}
                    />
                  ) : null}
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      color: "#fff",
                      backgroundColor: "#7c5cfc",
                      mb: 2,
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Typography variant="subtitle1" sx={{ color: "#fff", fontWeight: 700 }}>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, color: "text.secondary", lineHeight: 1.65 }}>
                    {step.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>
          <Typography variant="h4" sx={{ color: "#fff", fontWeight: 700, textAlign: "center", mb: 6 }}>
            Feature Highlights
          </Typography>
          <Box sx={{ mt: 0 }}>
            {feature.highlights.map((highlight, index) => (
              <Grid
                key={highlight.title}
                container
                spacing={3}
                alignItems="stretch"
                sx={{
                  mb: 4,
                  flexDirection: { xs: "column", md: index % 2 === 0 ? "row" : "row-reverse" },
                }}
              >
                <Grid item xs={12} md={7}>
                  <Box sx={{ height: "100%", display: "grid", alignItems: "center" }}>
                    <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700 }}>
                      {highlight.title}
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 2, color: "text.secondary", lineHeight: 1.65 }}>
                      {highlight.description}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={5}>
                  <Box
                    sx={{
                      borderRadius: "12px",
                      backgroundColor: "#1a1a2e",
                      height: 300,
                      display: "grid",
                      alignItems: "center",
                      justifyItems: "center",
                      color: "rgba(255,255,255,0.4)",
                      fontSize: "0.875rem",
                    }}
                  >
                    Screenshot coming soon
                  </Box>
                </Grid>
              </Grid>
            ))}
          </Box>
        </Container>
      </Box>

      <FeatureFooter />
    </Box>
  );
}

