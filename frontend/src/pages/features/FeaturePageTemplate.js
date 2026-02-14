import { useState } from "react";
import { Link } from "react-router-dom";
import * as MuiIcons from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuIcon from "@mui/icons-material/Menu";
import { useTheme } from "@mui/material/styles";
import {
  AppBar,
  Box,
  Card,
  CardContent,
  Button,
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
            <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", cursor: "pointer" }}>
              <BrandLogo textColor="#fff" onyxSize={18} iconSize={26} />
            </Link>
            {isMobile ? (
              <IconButton onClick={() => setMobileMenuOpen(true)} sx={{ color: "#fff" }} aria-label="Open menu">
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
                  <Fade in={featuresMenuOpen} timeout={150} unmountOnExit>
                    <Paper
                      elevation={0}
                      sx={{
                        position: "absolute",
                        left: "50%",
                        top: "100%",
                        mt: "8px",
                        transform: "translateX(-50%)",
                        width: "820px",
                        maxWidth: "calc(100vw - 32px)",
                        p: "20px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        backgroundColor: "#111827",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "4px",
                        zIndex: 1000,
                      }}
                    >
                      {featureMenuConfig.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Box
                            key={item.title}
                            component={Link}
                            to={item.route}
                            onClick={() => setFeaturesMenuOpen(false)}
                            sx={{
                              textDecoration: "none",
                              color: "#fff",
                              borderRadius: "8px",
                              p: "14px 16px",
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "14px",
                              cursor: "pointer",
                              transition: "background 0.15s",
                              "&:hover": { backgroundColor: "rgba(255,255,255,0.05)" },
                            }}
                          >
                            <Icon sx={{ color: "#7c5cfc", fontSize: 36, mt: "2px", flexShrink: 0 }} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body1" sx={{ fontWeight: 600, color: "#fff" }}>
                                {item.title}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  mt: "2px",
                                  color: "rgba(255,255,255,0.55)",
                                  lineHeight: 1.4,
                                }}
                              >
                                {item.description}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
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
              {featureMenuConfig.map((item) => (
                <ListItemButton
                  key={item.title}
                  component={Link}
                  to={item.route}
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
  if (!feature) {
    return null;
  }

  const HeaderIcon = feature.icon;

  return (
    <Box sx={{ bgcolor: "#0a0a0a", color: "#e5e7eb", fontFamily: "Inter, Roboto, sans-serif" }}>
      <FeatureNav />

      <Box sx={{ pt: { xs: 12, md: 14 }, pb: 4 }}>
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
