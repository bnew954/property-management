import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuIcon from "@mui/icons-material/Menu";
import PeopleIcon from "@mui/icons-material/People";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  Fade,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Collapse,
  Link as MuiLink,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme as useMuiTheme } from "@mui/material/styles";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ApartmentIcon from "@mui/icons-material/Apartment";
import BuildIcon from "@mui/icons-material/Build";
import DescriptionIcon from "@mui/icons-material/Description";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import featureMenuConfig from "./features/featureMenuConfig";

function BrandLogo({ textColor, onyxSize = 22, iconSize = 28, pillSize }) {
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

const featureCards = [
  {
    title: "Portfolio Management",
    body: "Manage unlimited properties and units. Track vacancies, tenant details, and lease terms from a single dashboard.",
    Icon: ApartmentIcon,
  },
  {
    title: "Tenant Screening",
    body: "Background checks, credit reports, and eviction history. Pay only when you screen - no monthly fees.",
    Icon: VerifiedUserIcon,
  },
  {
    title: "Online Rent Collection",
    body: "Tenants pay by credit card or bank transfer. Automatic tracking and reminders. Small processing fee per transaction.",
    Icon: CreditCardIcon,
  },
  {
    title: "Maintenance Tracking",
    body: "Tenants submit requests online. Track priority, status, and resolution. AI-powered triage coming soon.",
    Icon: BuildIcon,
  },
  {
    title: "Accounting & Reports",
    body: "Income and expense tracking, rent ledgers, P&L reports, and late fee automation - all included free.",
    Icon: AccountBalanceIcon,
  },
  {
    title: "Documents & Storage",
    body: "Store leases, inspections, and templates. Upload, organize, and access your documents from anywhere.",
    Icon: DescriptionIcon,
  },
];

const howItWorks = [
  {
    step: 1,
    title: "Sign Up in Seconds",
    body: "Create your free account. No credit card. No trial period. Just start.",
  },
  {
    step: 2,
    title: "Add Your Properties",
    body: "Import your portfolio - 1 unit or 1,000. Add tenants, leases, and documents.",
  },
  {
    step: 3,
    title: "Manage & Grow",
    body: "Collect rent, handle maintenance, run reports. Only pay for payment processing and screenings.",
  },
];

const faqItems = [
  {
    q: "How is Onyx PM free?",
    a: "We make money through small transaction fees when you collect rent online (2.9% + 30c, standard payment processing) and when you run tenant screening reports ($35 each). The platform itself - including all features, unlimited units, and unlimited users - is completely free.",
  },
  {
    q: "Are there any hidden fees?",
    a: "None. No setup fees, no monthly fees, no per-unit charges, no contracts. You can use Onyx PM forever without paying a dime if you collect rent offline and don't use screening.",
  },
  {
    q: "What's the catch?",
    a: "There isn't one. We built Onyx PM because we believe property management software is overpriced. By keeping the platform free and monetizing through transactions, we can grow alongside our customers.",
  },
  {
    q: "How does rent collection work?",
    a: "Tenants can pay rent through their portal using credit card or bank transfer. Payments are processed securely through Stripe. Funds are deposited directly to your bank account.",
  },
  {
    q: "Is there a limit on properties or units?",
    a: "No. Whether you manage 1 unit or 1,000, Onyx PM is free with no feature restrictions.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. We use bank-level encryption, secure authentication, and your data is hosted on enterprise-grade cloud infrastructure.",
  },
];

const sectionSeed = ["hero", "features", "how-it-works", "pricing", "faq"];

function SectionFadeIn({ id, visibleSections, children, sx = {}, ref }) {
  const visible = Boolean(visibleSections[id]);
  return (
    <Box
      id={id}
      ref={ref}
      sx={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.65s ease, transform 0.65s ease",
        scrollMarginTop: "96px",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

function RevenueSvg() {
  return (
    <Box sx={{ pt: 1, width: "100%", height: 120 }}>
      <svg viewBox="0 0 500 130" width="100%" height="100%" role="img" aria-label="Revenue chart">
        <defs>
          <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(124,92,252,0.45)" />
            <stop offset="100%" stopColor="rgba(124,92,252,0)" />
          </linearGradient>
        </defs>
        <path d="M16 98 L74 86 L132 74 L190 62 L248 50 L306 42 L364 44 L422 36 L480 44" fill="none" stroke="#7c5cfc" strokeWidth="2.5" />
        <path d="M16 98 L74 86 L132 74 L190 62 L248 50 L306 42 L364 44 L422 36 L480 44 L480 118 L16 118 Z" fill="url(#rev-fill)" />
        <line x1="16" y1="118" x2="480" y2="118" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <line x1="16" y1="16" x2="16" y2="118" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        {["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan"].map((label, index) => (
          <text
            key={label}
            x={16 + index * (464 / 6)}
            y={128}
            fill="#6b7280"
            fontSize="9"
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
          >
            {label}
          </text>
        ))}
        {["$0", "$10K", "$20K", "$25K"].map((value, index) => (
          <text key={value} x={8} y={118 - index * 34} fill="#6b7280" fontSize="9" textAnchor="end" fontFamily="Inter, sans-serif">
            {value}
          </text>
        ))}
      </svg>
    </Box>
  );
}

function OccupancyDonut({ occupied = 88, total = 100 }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dash = (occupied / total) * circumference;
  return (
    <Box sx={{ width: "100%", height: 120 }}>
      <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="Occupancy donut">
        <circle cx="60" cy="60" r={radius} stroke="rgba(255,255,255,0.2)" strokeWidth="10" fill="none" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#7c5cfc"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 60 60)"
          pathLength={circumference}
        />
        <circle cx="60" cy="60" r="24" fill="#0a0a0a" />
        <text x="60" y="57" textAnchor="middle" fontSize="14" fill="#fff" fontWeight={700} fontFamily="Inter, sans-serif">
          {`${occupied}%`}
        </text>
        <text x="60" y="72" textAnchor="middle" fontSize="8" fill="#6b7280" fontFamily="Inter, sans-serif">
          Occupancy
        </text>
      </svg>
    </Box>
  );
}

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuresMenuOpen, setFeaturesMenuOpen] = useState(false);
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState({});
  const sectionRefs = useRef({});
  const materialTheme = useMuiTheme();
  const isMobile = useMediaQuery(materialTheme.breakpoints.down("md"));
  const heroParticles = useMemo(() => {
    const ambientCount = 40;
    const logoClusterCount = 15;

    const ambientParticles = Array.from({ length: ambientCount }, () => {
      const isLarge = Math.random() < 0.2;
      const size = isLarge ? Math.floor(Math.random() * 2) + 3 : Math.floor(Math.random() * 2) + 2;
      return {
        left: `${(Math.random() * 90 + 5).toFixed(2)}%`,
        top: `${(Math.random() * 50 + 60).toFixed(2)}%`,
        size,
        drift: `${(Math.random() * 40 - 20).toFixed(2)}px`,
        duration: `${(Math.random() * 8 + 6).toFixed(2)}s`,
        delay: `${(Math.random() * 6).toFixed(2)}s`,
        color: isLarge
          ? "rgba(124, 92, 252, 0.25)"
          : "rgba(124, 92, 252, 0.3)",
      };
    });

    const logoClusterParticles = Array.from({ length: logoClusterCount }, () => {
      const isLarge = Math.random() < 0.15;
      const size = isLarge ? 4 : Math.floor(Math.random() * 3) + 1;
      return {
        left: `${(Math.random() * 30 + 35).toFixed(2)}%`,
        top: `${(Math.random() * 30 + 20).toFixed(2)}%`,
        size,
        drift: `${(Math.random() * 20 - 10).toFixed(2)}px`,
        duration: `${(Math.random() * 8 + 6).toFixed(2)}s`,
        delay: `${(Math.random() * 6).toFixed(2)}s`,
        color: isLarge
          ? "rgba(124, 92, 252, 0.25)"
          : "rgba(124, 92, 252, 0.6)",
      };
    });

    return [...ambientParticles, ...logoClusterParticles];
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleSections((current) => {
          const next = { ...current };
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              next[entry.target.id] = true;
            }
          });
          return next;
        });
      },
      { root: null, threshold: 0.18 },
    );

    const nodes = sectionSeed.map((id) => sectionRefs.current[id]).filter(Boolean);
    nodes.forEach((node) => observer.observe(node));
    return () => nodes.forEach((node) => observer.unobserve(node));
  }, []);

  const registerSection = useCallback((id) => (node) => {
    if (node) {
      sectionRefs.current[id] = node;
    }
  }, []);

  const navLinks = useMemo(
    () => [
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
    [],
  );

  return (
      <Box
        sx={{
          bgcolor: "#0a0a0a",
          color: "#e5e7eb",
          fontFamily: "Inter, Roboto, sans-serif",
          "@keyframes onyxFloat": {
            "0%,100%": { transform: "translateY(0px)" },
            "50%": { transform: "translateY(-10px)" },
          },
          "@keyframes breatheGlow": {
            "0%,100%": { filter: "drop-shadow(0 0 20px rgba(124,92,252,0.3))" },
            "50%": { filter: "drop-shadow(0 0 40px rgba(124,92,252,0.6)) drop-shadow(0 0 80px rgba(124,92,252,0.2))" },
          },
          "@keyframes subtleFloat": {
            "0%,100%": { transform: "translateY(0px)" },
            "50%": { transform: "translateY(-5px)" },
          },
        }}
      >
        <style>{`
          @keyframes floatUp {
            0% { transform: translateY(0) translateX(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-500px) translateX(var(--drift)); opacity: 0; }
          }
        `}</style>
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
                          position: "fixed",
                          left: "50%",
                          top: "68px",
                          mt: 0,
                          transform: "translateX(-50%)",
                          width: "880px",
                          maxWidth: "calc(100vw - 32px)",
                          p: "20px",
                          borderRadius: "0 0 12px 12px",
                           border: "1px solid rgba(255,255,255,0.08)",
                           borderTop: "none",
                           backgroundColor: "rgba(10,10,10,0.9)",
                           backdropFilter: "blur(12px)",
                          boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
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
                              <Typography sx={{ fontWeight: 600, color: "#fff", lineHeight: 1.3 }}>
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
      </AppBar>

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
          <ListItemButton component={Link} to="/login" onClick={() => setMobileMenuOpen(false)} sx={{ borderRadius: 1, color: "#fff" }}>
            <ListItemText primary="Log In" />
          </ListItemButton>
          <ListItemButton component={Link} to="/register" onClick={() => setMobileMenuOpen(false)} sx={{ borderRadius: 1, color: "#fff" }}>
            <ListItemText primary="Get Started Free" />
          </ListItemButton>
        </List>
      </Drawer>

      <Box sx={{ pt: { xs: 12, md: 14 } }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, maxWidth: "1200px !important" }}>
          <SectionFadeIn
            id="hero"
            visibleSections={visibleSections}
            ref={registerSection("hero")}
            sx={{
              position: "relative",
              minHeight: "calc(100vh - 96px)",
              pt: { xs: 4, md: 0 },
              pb: 8,
              display: "grid",
              gap: 5,
              justifyItems: "center",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                minHeight: "100%",
                pointerEvents: "none",
                zIndex: 0,
                willChange: "transform, opacity",
              }}
            >
              {heroParticles.map((particle, index) => (
                <Box
                  key={`hero-particle-${index}`}
                  sx={{
                    position: "absolute",
                    left: particle.left,
                    top: particle.top,
                    width: `${particle.size}px`,
                    height: `${particle.size}px`,
                    borderRadius: "50%",
                    backgroundColor: particle.color,
                    transform: "translate(0, 0)",
                    animation: `floatUp ${particle.duration} linear infinite`,
                    animationDelay: particle.delay,
                    animationFillMode: "both",
                    "--drift": particle.drift,
                    willChange: "transform, opacity",
                  }}
                />
              ))}
            </Box>
            <Box sx={{ textAlign: "center", maxWidth: 980, position: "relative", zIndex: 1 }}>
              <Box sx={{ mb: 1.5, display: "flex", justifyContent: "center", position: "relative", zIndex: 1 }}>
                <Box
                  sx={{
                    position: "relative",
                    display: "inline-block",
                    textAlign: "center",
                  }}
                >
                  <img
                    src={`${process.env.PUBLIC_URL || ""}/logo-icon.png`}
                    alt="Onyx PM"
                    style={{
                      height: 48,
                      width: "auto",
                      display: "block",
                      position: "relative",
                      zIndex: 2,
                      background: "transparent",
                      margin: "0 auto",
                      mixBlendMode: "screen",
                      animation: "breatheGlow 3.4s ease-in-out infinite, subtleFloat 6.2s ease-in-out infinite",
                      willChange: "transform, opacity, filter",
                    }}
                  />
                </Box>
              </Box>
              <Typography
                sx={{
                  fontSize: { xs: "2.4rem", md: "3.5rem", lg: "3.8rem" },
                  lineHeight: 1.05,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "#fff",
                  whiteSpace: "pre-line",
                }}
              >
                Stop Paying for Property Management Software.
              </Typography>
              <Typography sx={{ mt: 2, maxWidth: 640, mx: "auto", color: "#878C9E", fontSize: 18, lineHeight: 1.45 }}>
                Onyx PM is 100% free. No subscriptions. No per-unit fees. No limits. We only make money when you collect rent or screen tenants.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} justifyContent="center" sx={{ mt: 3 }}>
                <Button
                  component={Link}
                  to="/register"
                  size="medium"
                  variant="contained"
                  sx={{
                    px: 2.2,
                    backgroundColor: "#6347f5",
                    "&:hover": { backgroundColor: "#5539d9" },
                    fontWeight: 600,
                  }}
                >
                  Get Started - It's Free
                </Button>
                <Button
                  size="medium"
                  variant="outlined"
                  href="#how-it-works"
                  sx={{
                    px: 2.2,
                    borderColor: "rgba(255,255,255,0.1)",
                    color: "#fff",
                    "&:hover": { borderColor: "#fff" },
                  }}
                >
                  See How It Works
                </Button>
              </Stack>
              <Typography sx={{ mt: 1.2, fontSize: 12, color: "#6b7280" }}>
                No credit card required. Unlimited units. Free forever.
              </Typography>
            </Box>

            <Box
              sx={{
                width: "100%",
                maxWidth: 1080,
                borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.06)",
                overflow: "hidden",
                background: "#141414",
                p: { xs: 1.5, md: 2.4 },
                transform: "perspective(2000px) rotateX(2deg)",
                animation: "onyxFloat 7s ease-in-out infinite",
              }}
            >
              <Box sx={{ borderRadius: 2, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#0a0a0a", p: 1.2, color: "#e5e7eb" }}>
                <Box sx={{ px: 0.8, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", pb: 0.9 }}>
                  <Typography sx={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>Dashboard</Typography>
                  <Typography sx={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.03em" }}>/dashboard/overview</Typography>
                </Box>
                <Box sx={{ mt: 1.1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography sx={{ fontSize: 11, color: "#fff" }}>Welcome back, Sarah</Typography>
                    <Typography sx={{ mt: 0.3, fontSize: 10, color: "#6b7280" }}>February 13, 2026</Typography>
                  </Box>
                  <Stack direction="row" spacing={0.8} alignItems="center">
                    <Typography sx={{ width: 26, height: 26, borderRadius: "50%", bgcolor: "#0f172a", border: "1px solid rgba(255,255,255,0.12)", fontSize: 11, display: "grid", placeItems: "center" }}>SN</Typography>
                    <Box sx={{ width: 20, height: 20, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", display: "grid", placeItems: "center" }}>
                      <NotificationsNoneIcon sx={{ fontSize: 12, color: "#9ca3af" }} />
                    </Box>
                  </Stack>
                </Box>
                <Box sx={{ mt: 1, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0.8 }}>
                  {[
                    { label: "Properties", value: "4", icon: ApartmentIcon, color: "#7c5cfc" },
                    { label: "Units", value: "17", icon: PeopleIcon, color: "#06b6d4" },
                    { label: "Active Leases", value: "12", icon: DashboardIcon, color: "#22c55e" },
                    { label: "Open Requests", value: "3", icon: BuildIcon, color: "#f59e0b" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Box
                        key={item.label}
                        sx={{
                          borderRadius: 1.2,
                          border: "1px solid rgba(255,255,255,0.1)",
                          px: 0.9,
                          py: 0.7,
                          background: "rgba(255,255,255,0.03)",
                        }}
                      >
                        <Icon sx={{ fontSize: 12, color: item.color, opacity: 0.85 }} />
                        <Typography sx={{ mt: 0.4, fontSize: 9, color: "#9ca3af", letterSpacing: "0.01em" }}>{item.label}</Typography>
                        <Typography sx={{ fontSize: 17, lineHeight: 1.1, fontWeight: 700, color: "#fff" }}>{item.value}</Typography>
                      </Box>
                    );
                  })}
                </Box>
                <Box sx={{ mt: 1.1, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 0.8 }}>
                  <Box sx={{ borderRadius: 1.2, border: "1px solid rgba(255,255,255,0.1)", p: 0.9, background: "rgba(255,255,255,0.02)" }}>
                    <Typography sx={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.03em" }}>Revenue Overview</Typography>
                    <Typography sx={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>Monthly Rent</Typography>
                    <RevenueSvg />
                  </Box>
                  <Box sx={{ borderRadius: 1.2, border: "1px solid rgba(255,255,255,0.1)", p: 0.9, background: "rgba(255,255,255,0.02)" }}>
                    <Typography sx={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.03em" }}>Occupancy Rate</Typography>
                    <Typography sx={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>Current</Typography>
                    <OccupancyDonut />
                  </Box>
                </Box>
                <Box sx={{ mt: 1.1, borderRadius: 1.2, border: "1px solid rgba(255,255,255,0.1)", p: 0.9, background: "rgba(255,255,255,0.02)" }}>
                  <Typography sx={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.03em" }}>Recent Activity</Typography>
                  <Box sx={{ mt: 0.6, display: "grid", gap: 0.45 }}>
                    {[
                      { subject: "Sarah Chen", action: "Rent payment received", value: "$1,400", age: "2 hours ago" },
                      { subject: "AC repair", action: "In Progress", value: "Oak Park Unit B", age: "5 hours ago" },
                      { subject: "New lease signed", action: "Downtown Loft 2A", value: "", age: "Yesterday" },
                    ].map((row) => (
                      <Box
                        key={`${row.subject}-${row.age}`}
                        sx={{
                          borderBottom: "1px dashed rgba(255,255,255,0.12)",
                          pb: 0.45,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <Typography sx={{ fontSize: 10.5, color: "#d1d5db", width: "42%" }}>{row.subject}</Typography>
                        <Typography sx={{ fontSize: 10.5, color: "#9ca3af", width: "35%" }}>{row.action}</Typography>
                        <Typography sx={{ fontSize: 10.5, color: "#fff", fontWeight: 600, width: "13%", textAlign: "right" }}>{row.value}</Typography>
                        <Typography sx={{ fontSize: 10, color: "#6b7280", width: "10%", textAlign: "right" }}>{row.age}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Box>
          </SectionFadeIn>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, py: { xs: 8, md: 10 }, maxWidth: "1200px !important" }}>
        <SectionFadeIn id="features" visibleSections={visibleSections} ref={registerSection("features")} sx={{ mb: { xs: 8, md: 10 } }}>
          <Typography sx={{ fontSize: { xs: 30, md: 36 }, fontWeight: 700, letterSpacing: "-0.01em", textAlign: "center", color: "#fff" }}>
            Everything you need. Nothing you don&apos;t.
          </Typography>
          <Typography sx={{ mt: 1, textAlign: "center", color: "#878C9E", fontSize: 16 }}>
            A complete property management platform - without the price tag.
          </Typography>
          <Box
            sx={{
              mt: 3.8,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
              gap: 1.5,
            }}
          >
            {featureCards.map((item) => {
              const Icon = item.Icon;
              return (
                <Box
                  key={item.title}
                  sx={{
                    borderRadius: 3,
                    border: "1px solid rgba(255,255,255,0.06)",
                    p: 2.2,
                    background: "#141414",
                    transition: "transform 0.2s ease, border-color 0.2s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      borderColor: "rgba(124,92,252,0.2)",
                    },
                  }}
                >
                  <Icon sx={{ color: "#7c5cfc", mb: 1.2 }} />
                  <Typography sx={{ fontWeight: 600, color: "#fff", fontSize: 16 }}>{item.title}</Typography>
                  <Typography sx={{ mt: 0.8, color: "#878C9E", fontSize: 13, lineHeight: 1.5 }}>{item.body}</Typography>
                </Box>
              );
            })}
          </Box>
        </SectionFadeIn>

        <SectionFadeIn id="how-it-works" visibleSections={visibleSections} ref={registerSection("how-it-works")} sx={{ mb: { xs: 8, md: 10 } }}>
          <Typography sx={{ fontSize: 36, fontWeight: 700, textAlign: "center", color: "#fff" }}>
            How it works
          </Typography>
          <Box
            sx={{
              mt: 3.5,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
              gap: 1.5,
              position: "relative",
            }}
          >
            {howItWorks.map((item, index) => (
              <Box key={item.step} sx={{ position: "relative", gap: 1.2, display: "grid" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      mt: 0.1,
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "1px solid rgba(124,92,252,0.35)",
                      color: "#7c5cfc",
                      background: "rgba(124,92,252,0.12)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {item.step}
                  </Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>{item.title}</Typography>
                </Box>
                <Box sx={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 2, p: 2, background: "#141414" }}>
                  <Typography sx={{ color: "#878C9E", fontSize: 13, lineHeight: 1.5 }}>{item.body}</Typography>
                </Box>
                {index !== howItWorks.length - 1 ? (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 18,
                      left: 18,
                      right: { xs: -9999, md: -24 },
                      borderTop: "1px dashed rgba(255,255,255,0.06)",
                      display: { xs: "none", md: "block" },
                    }}
                  />
                ) : null}
              </Box>
            ))}
          </Box>
        </SectionFadeIn>

        <SectionFadeIn id="pricing" visibleSections={visibleSections} ref={registerSection("pricing")} sx={{ mb: { xs: 8, md: 10 } }}>
          <Typography sx={{ fontSize: 32, fontWeight: 700, textAlign: "center", color: "#fff" }}>
            Free. Really.
          </Typography>
          <Typography sx={{ mt: 1, textAlign: "center", color: "#878C9E", fontSize: 16 }}>
            No subscriptions. No per-unit fees. No catches.
          </Typography>
          <Box sx={{ mt: 3.6, display: "flex", justifyContent: "center" }}>
            <Box sx={{ width: { xs: "100%", md: 760 }, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 3, background: "#141414", p: { xs: 2.2, md: 3 } }}>
              <Typography sx={{ fontSize: 14, color: "#878C9E" }}>Core plan</Typography>
              <Typography sx={{ mt: 1, fontSize: 34, fontWeight: 700, color: "#fff" }}>
                Onyx PM is free for every landlord
              </Typography>
              <Typography sx={{ mt: 1, fontSize: 46, fontWeight: 700, color: "#fff" }}>
                $0 <Typography component="span" sx={{ fontSize: 16, fontWeight: 500, color: "#6b7280" }}>/ month</Typography>
              </Typography>
              <Box sx={{ mt: 2, display: "grid", gap: 0.8 }}>
                {[
                  "Unlimited properties & units",
                  "Unlimited tenants & leases",
                  "Maintenance management",
                  "Accounting & financial reports",
                  "Document storage",
                  "In-app messaging",
                  "Dark & light mode",
                ].map((item) => (
                  <Stack key={item} direction="row" spacing={1} alignItems="center">
                    <CheckCircleOutlineIcon sx={{ fontSize: 14, color: "#22c55e" }} />
                    <Typography sx={{ color: "#878C9E", fontSize: 13 }}>{item}</Typography>
                  </Stack>
                ))}
              </Box>
              <Box sx={{ mt: 1.8, borderTop: "1px solid rgba(255,255,255,0.08)", pt: 1.6 }}>
                <Typography sx={{ fontSize: 16, color: "#fff", fontWeight: 600 }}>Pay only for what you use:</Typography>
                <Typography sx={{ mt: 1, fontSize: 13, color: "#e5e7eb" }}>
                  Rent collection: <Typography component="span" sx={{ color: "#fff", fontWeight: 600 }}>2.9% + 30c</Typography> per transaction
                </Typography>
                <Typography sx={{ fontSize: 11, color: "#878C9E" }}>(passed through from payment processor)</Typography>
                <Typography sx={{ mt: 1, fontSize: 13, color: "#e5e7eb" }}>
                  Tenant screening: <Typography component="span" sx={{ color: "#fff", fontWeight: 600 }}>$35</Typography> per report
                </Typography>
              </Box>
              <Button
                component={Link}
                to="/register"
                variant="contained"
                fullWidth
                sx={{ mt: 2.4, background: "#6347f5", "&:hover": { background: "#5539d9" }, borderRadius: 2, py: 1.2, fontWeight: 600 }}
              >
                Get Started {"\u2014"} It's Free
              </Button>
              <Box sx={{ mt: 2.6, border: "1px solid rgba(124,92,252,0.3)", borderRadius: 2, p: 1.4, background: "#111111" }}>
                <Typography sx={{ fontWeight: 600, color: "#fff" }}>How we compare</Typography>
                {[
                  { name: "AppFolio", value: "AppFolio: $1.40/unit/month + setup fees", active: false },
                  { name: "Buildium", value: "Buildium: $58/month for 20 units", active: false },
                  { name: "Onyx PM", value: "Onyx PM: $0/month for unlimited units", active: true },
                ].map((item) => (
                  <Box
                    key={item.name}
                    sx={{
                      mt: 0.8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderLeft: item.active ? "3px solid #7c5cfc" : "none",
                      pl: item.active ? 1 : 0,
                      color: item.active ? "#7c5cfc" : "#6b7280",
                    }}
                  >
                    <Typography sx={{ fontSize: 12, fontWeight: item.active ? 600 : 400, color: item.active ? "#7c5cfc" : "#6b7280" }}>
                      {item.name}
                    </Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: item.active ? 600 : 400, color: item.active ? "#fff" : "#6b7280" }}>
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </SectionFadeIn>

        <SectionFadeIn id="faq" visibleSections={visibleSections} ref={registerSection("faq")}>
          <Typography sx={{ fontSize: 36, fontWeight: 700, textAlign: "center", color: "#fff" }}>
            Frequently asked questions
          </Typography>
          <Box sx={{ mt: 3.4, maxWidth: 900, mx: "auto" }}>
            {faqItems.map((faq) => (
              <Accordion
                key={faq.q}
                elevation={0}
                sx={{
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 2,
                  mb: 1.2,
                  "&:before": { display: "none" },
                  background: "#141414",
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: "#878C9E" }} />}
                  sx={{ "& .MuiAccordionSummary-content": { fontWeight: 600 } }}
                >
                  <Typography sx={{ color: "#fff", fontWeight: 600 }}>{faq.q}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography sx={{ color: "#878C9E", fontSize: 13, lineHeight: 1.6 }}>{faq.a}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </SectionFadeIn>
      </Container>

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
                <MuiLink href="#features" underline="none" color="#fff" sx={{ fontSize: 13 }}>
                  Features
                </MuiLink>
                <MuiLink href="#pricing" underline="none" color="#fff" sx={{ fontSize: 13 }}>
                  Pricing
                </MuiLink>
                <MuiLink href="#faq" underline="none" color="#fff" sx={{ fontSize: 13 }}>
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
              <MuiLink href="#" color="inherit" underline="none">LinkedIn</MuiLink>
              <MuiLink href="#" color="inherit" underline="none">X</MuiLink>
              <MuiLink href="#" color="inherit" underline="none">YouTube</MuiLink>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

export default LandingPage;






