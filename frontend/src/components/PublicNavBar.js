import { useState } from "react";
import { Link } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuIcon from "@mui/icons-material/Menu";
import {
  Box,
  Button,
  Collapse,
  Container,
  Divider,
  Drawer,
  Fade,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  Link as MuiLink,
} from "@mui/material";
import { useTheme as useMuiTheme } from "@mui/material/styles";
import featureMenuConfig from "../pages/features/featureMenuConfig";

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

export default function PublicNavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
  const [featuresMenuOpen, setFeaturesMenuOpen] = useState(false);
  const theme = useMuiTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const navLinks = [
    { label: "Why Onyx?", href: "/why-onyx" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <>
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          backgroundColor: "rgba(10, 10, 15, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          height: "64px",
          display: "flex",
          alignItems: "center",
          px: 4,
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, maxWidth: "1200px !important", width: "100%" }}>
          <Box sx={{ minHeight: 64, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.5 }}>
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
                        position: "fixed",
                        top: "64px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "880px",
                        backgroundColor: "rgba(10, 10, 15, 0.95)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        borderTop: "none",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        borderTopColor: "transparent",
                        borderRadius: "0 0 12px 12px",
                        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5)",
                        p: "20px",
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "4px",
                        zIndex: 1100,
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
                              "&:hover": {
                                backgroundColor: "rgba(124, 92, 252, 0.08)",
                                boxShadow: "0 0 0 1px rgba(124, 92, 252, 0.15)",
                              },
                              "&:hover .feature-dropdown-icon": {
                                filter:
                                  "drop-shadow(0 0 12px rgba(124, 92, 252, 0.8)) drop-shadow(0 0 24px rgba(124, 92, 252, 0.4))",
                              },
                            }}
                          >
                            <Icon
                              className="feature-dropdown-icon"
                              sx={{
                                color: "#7c5cfc",
                                fontSize: 36,
                                mt: "2px",
                                flexShrink: 0,
                                filter: "drop-shadow(0 0 8px rgba(124, 92, 252, 0.6))",
                              }}
                            />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body1" sx={{ fontWeight: 600, color: "#fff", lineHeight: 1.3 }}>
                                {item.title}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  mt: "2px",
                                  color: "text.secondary",
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
                {navLinks.map((link) => (
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
      </Box>

      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{ sx: { width: 250, background: "#0a0a0a", p: 1.2, color: "#fff" } }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end", px: 0.6, mb: 1 }}>
          <IconButton onClick={() => setMobileMenuOpen(false)} sx={{ color: "#fff" }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <List>
          <ListItemButton
            onClick={() => setMobileFeaturesOpen((open) => !open)}
            sx={{ borderRadius: 1, color: "#fff", "&:hover": { color: "#fff", backgroundColor: "rgba(255,255,255,0.04)" } }}
          >
            <ListItemText primary="Features" primaryTypographyProps={{ fontSize: 14, color: "#fff" }} />
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
          {navLinks.map((link) => (
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
          <ListItemButton
            component={Link}
            to="/login"
            onClick={() => setMobileMenuOpen(false)}
            sx={{ borderRadius: 1, color: "#fff" }}
          >
            <ListItemText primary="Log In" />
          </ListItemButton>
          <ListItemButton
            component={Link}
            to="/register"
            onClick={() => setMobileMenuOpen(false)}
            sx={{ borderRadius: 1, color: "#fff" }}
          >
            <ListItemText primary="Get Started Free" />
          </ListItemButton>
        </List>
      </Drawer>
    </>
  );
}
