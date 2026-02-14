import { useState } from "react";
import { Link } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuIcon from "@mui/icons-material/Menu";
import { useTheme } from "@mui/material/styles";
import {
  AppBar,
  Box,
  Card,
  CardContent,
  Collapse,
  Container,
  Divider,
  Drawer,
  Fade,
  Grid,
  IconButton,
  Link as MuiLink,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { FEATURE_MENU_ITEMS } from "./featureMenuConfig";

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
            <BrandLogo textColor="#fff" onyxSize={18} iconSize={26} />
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

function FeatureNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
  const [featuresMenuOpen, setFeaturesMenuOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const navSectionLinks = [
    { label: "Pricing", href: "/#pricing" },
    { label: "FAQ", href: "/#faq" },
  ];

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backgroundColor: "rgba(10,10,10,0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          color: "#fff",
          zIndex: 1300,
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, maxWidth: "1200px !important" }}>
          <Box sx={{ minHeight: 68, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.5 }}>
            <BrandLogo textColor="#fff" onyxSize={18} iconSize={26} />
            {isMobile ? (
              <IconButton
                onClick={() => setMobileMenuOpen(true)}
                sx={{ color: "#fff" }}
                aria-label="Open menu"
              >
                <MenuIcon />
              </IconButton>
            ) : (
              <Stack direction="row" spacing={1.6} alignItems="center">
                <Box
                  onMouseEnter={() => setFeaturesMenuOpen(true)}
                  onMouseLeave={() => setFeaturesMenuOpen(false)}
                  sx={{ position: "relative", display: "inline-flex", alignItems: "center" }}
                >
                  <Button
                    size="small"
                    sx={{
                      color: "#878C9E",
                      minWidth: "auto",
                      textTransform: "none",
                      fontSize: 13,
                      "&:hover": { color: "#fff" },
                    }}
                  >
                    Features
                  </Button>
                  <Fade in={featuresMenuOpen} timeout={170} unmountOnExit>
                    <Paper
                      elevation={24}
                      sx={{
                        position: "absolute",
                        left: "50%",
                        top: "100%",
                        mt: 1,
                        transform: "translateX(-50%)",
                        width: "min(980px, calc(100vw - 64px))",
                        maxWidth: 1020,
                        p: 1.5,
                        borderRadius: 2.4,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "linear-gradient(160deg, #111111 0%, #0a0a0a 42%, #090909 100%)",
                        boxShadow: "0 22px 48px rgba(0,0,0,0.55)",
                        zIndex: 1301,
                      }}
                    >
                      <Grid container spacing={1.2}>
                        {FEATURE_MENU_ITEMS.map((item) => {
                          const Icon = item.Icon;
                          return (
                            <Grid item xs={12} sm={6} md={4} key={item.title}>
                              <Paper
                                component={Link}
                                to={item.path}
                                onClick={() => setFeaturesMenuOpen(false)}
                                elevation={0}
                                sx={{
                                  p: 1.8,
                                  borderRadius: 2,
                                  border: "1px solid rgba(255,255,255,0.06)",
                                  backgroundColor: "#141414",
                                  color: "#fff",
                                  textDecoration: "none",
                                  minHeight: "120px",
                                  display: "grid",
                                  gap: 0.6,
                                  cursor: "pointer",
                                  transition: "transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease",
                                  "&:hover": {
                                    borderColor: "rgba(124,92,252,0.35)",
                                    backgroundColor: "rgba(124,92,252,0.1)",
                                    transform: "translateY(-2px)",
                                  },
                                }}
                              >
                                <Icon sx={{ color: "#7c5cfc", fontSize: 28 }} />
                                <Typography sx={{ fontWeight: 600, color: "#fff", lineHeight: 1.2 }} noWrap>
                                  {item.title}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ color: "#878C9E", lineHeight: 1.35 }}
                                  noWrap
                                >
                                  {item.description}
                                </Typography>
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Paper>
                  </Fade>
                </Box>
                {navSectionLinks.map((link) => (
                  <MuiLink
                    key={link.label}
                    href={link.href}
                    underline="none"
                    sx={{ fontSize: 13, color: "#878C9E", "&:hover": { color: "#fff" } }}
                  >
                    {link.label}
                  </MuiLink>
                ))}
                <Button component={Link} to="/login" size="small" sx={{ color: "#fff", fontWeight: 500 }}>
                  Log In
                </Button>
                <Button
                  component={Link}
                  to="/register"
                  size="small"
                  variant="contained"
                  sx={{ px: 1.8, backgroundColor: "#6347f5", "&:hover": { backgroundColor: "#5539d9" } }}
                >
                  Get Started Free
                </Button>
              </Stack>
            )}
          </Box>
        </Container>
      </AppBar>

      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{ sx: { width: 260, background: "#0a0a0a", p: 1.2, color: "#fff" } }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end", px: 0.6, mb: 1 }}>
          <IconButton onClick={() => setMobileMenuOpen(false)} sx={{ color: "#fff" }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <List>
          <ListItemButton
            onClick={() => setMobileFeaturesOpen((open) => !open)}
            sx={{ borderRadius: 1, color: "#fff", "&:hover": { backgroundColor: "rgba(255,255,255,0.04)" } }}
          >
            <ListItemText
              primary="Features"
              primaryTypographyProps={{ color: "#878C9E", fontSize: 14, fontWeight: 500 }}
            />
            <ExpandMoreIcon
              sx={{
                color: "#878C9E",
                transition: "transform 0.2s ease",
                transform: mobileFeaturesOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </ListItemButton>
          <Collapse in={mobileFeaturesOpen} timeout="auto" unmountOnExit>
            <List disablePadding>
              {FEATURE_MENU_ITEMS.map((item) => (
                <ListItemButton
                  key={item.title}
                  component={Link}
                  to={item.path}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setMobileFeaturesOpen(false);
                  }}
                  sx={{ borderRadius: 1, ml: 2, mt: 0.4, color: "#878C9E", "&:hover": { color: "#fff" } }}
                >
                  <ListItemText
                    primary={item.title}
                    secondary={item.description}
                    primaryTypographyProps={{ fontSize: 14, color: "#e5e7eb" }}
                    secondaryTypographyProps={{ fontSize: 11, color: "#6b7280" }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
          {navSectionLinks.map((link) => (
            <ListItemButton
              key={link.label}
              component="a"
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              sx={{ borderRadius: 1, color: "#878C9E", "&:hover": { color: "#fff" } }}
            >
              <ListItemText primary={link.label} />
            </ListItemButton>
          ))}
          <Divider sx={{ my: 1 }} />
          <ListItemButton component={Link} to="/login" onClick={() => setMobileMenuOpen(false)} sx={{ borderRadius: 1, color: "#fff" }}>
            <ListItemText primary="Log In" />
          </ListItemButton>
          <ListItemButton component={Link} to="/register" onClick={() => setMobileMenuOpen(false)} sx={{ borderRadius: 1, color: "#fff" }}>
            <ListItemText primary="Get Started Free" />
          </ListItemButton>
        </List>
      </Drawer>
    </>
  );
}

export default function FeaturePageTemplate({ feature }) {
  const HeaderIcon = feature.icon;

  return (
    <Box
      sx={{
        bgcolor: "#0a0a0a",
        color: "#e5e7eb",
        fontFamily: "Inter, Roboto, sans-serif",
      }}
    >
      <FeatureNav />
      <Box sx={{ pt: { xs: 12, md: 14 }, pb: { xs: 3, md: 5 } }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>
          <Box
            sx={{
              borderRadius: 3,
              backgroundColor: "#0a0a0a",
              border: "1px solid rgba(255,255,255,0.08)",
              px: { xs: 2.5, md: 3.5 },
              py: { xs: 5, md: 6 },
            }}
          >
            <Box sx={{ color: "#7c5cfc", mb: 1.6 }}>
              <HeaderIcon sx={{ fontSize: 56 }} />
            </Box>
            <Typography
              variant="h3"
              sx={{ color: "#fff", fontWeight: 700, fontSize: { xs: 34, md: 44 }, lineHeight: 1.1 }}
            >
              {feature.title}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1.4, maxWidth: 900, lineHeight: 1.55 }}>
              {feature.tagline}
            </Typography>
            <Divider sx={{ mt: 3, borderColor: "rgba(255,255,255,0.16)" }} />
          </Box>

          <Box sx={{ py: 10 }}>
            <Typography variant="h4" sx={{ color: "#fff", fontWeight: 700, textAlign: "center", mb: 6 }}>
              Key Benefits
            </Typography>
            <Grid container spacing={2} sx={{ mt: 0 }} alignItems="stretch">
              {feature.benefits.map((benefit) => {
                const Icon = benefit.Icon;
                return (
                  <Grid key={benefit.title} item xs={12} md={4}>
                    <Card
                      sx={{
                        height: "100%",
                        minHeight: 190,
                        display: "flex",
                        background: "#141414",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 3,
                      }}
                    >
                      <CardContent sx={{ p: 2.2, display: "flex", flexDirection: "column", gap: 0.8 }}>
                        <Icon sx={{ color: "#7c5cfc", mb: 1.2, fontSize: 28 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: "#fff", fontSize: 17 }}>
                          {benefit.title}
                        </Typography>
                        <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
                          {benefit.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          <Box sx={{ py: 10 }}>
            <Typography variant="h4" sx={{ color: "#fff", fontWeight: 700, textAlign: "center", mb: 6 }}>
              How It Works
            </Typography>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {feature.steps.map((step) => (
                <Grid key={step.title} item xs={12} md={4}>
                    <Paper
                      sx={{
                        minHeight: 186,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        p: 2.1,
                        borderRadius: 3,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "#141414",
                      }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          color: "#7c5cfc",
                          border: "1px solid rgba(124,92,252,0.45)",
                          backgroundColor: "rgba(124,92,252,0.12)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 16,
                          fontWeight: 700,
                          mb: 1,
                        }}
                      >
                        {step.number}
                    </Box>
                      <Typography sx={{ fontWeight: 600, color: "#fff", fontSize: 16, mb: 0.6 }}>
                        {step.title}
                      </Typography>
                      <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.55 }}>
                        {step.description}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>

          <Box sx={{ py: 10 }}>
            <Typography variant="h4" sx={{ color: "#fff", fontWeight: 700, textAlign: "center", mb: 6 }}>
              Feature Highlights
            </Typography>
            <Box sx={{ mt: 2.5 }}>
              {feature.highlights.map((highlight, index) => (
                <Grid
                  key={highlight.title}
                  container
                  spacing={2}
                  alignItems="stretch"
                  direction={index % 2 === 1 ? "row-reverse" : "row"}
                  sx={{ mb: 2 }}
                >
                  <Grid item xs={12} md={6}>
                      <Paper
                        sx={{
                          p: 2.4,
                          borderRadius: 3,
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "#141414",
                        height: "100%",
                      }}
                    >
                      <Typography sx={{ color: "#fff", fontWeight: 600, fontSize: 22, mb: 0.8 }}>
                        {highlight.title}
                      </Typography>
                        <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.62 }}>
                          {highlight.description}
                        </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                      <Paper
                        sx={{
                          p: 2.4,
                          borderRadius: 3,
                          background: "#1a1a2e",
                          border: "1px solid rgba(255,255,255,0.08)",
                          minHeight: 190,
                          display: "grid",
                          placeItems: "center",
                          color: "text.secondary",
                          fontWeight: 600,
                          fontSize: 13,
                          textAlign: "center",
                          letterSpacing: "0.02em",
                        }}
                      >
                        Coming soon
                      </Paper>
                    </Grid>
                  </Grid>
                ))}
              </Box>
            </Box>

        </Container>
      </Box>
      <FeatureFooter />
    </Box>
  );
}
