import AddIcon from "@mui/icons-material/Add";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuIcon from "@mui/icons-material/Menu";
import PeopleIcon from "@mui/icons-material/People";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import ViewCarouselIcon from "@mui/icons-material/ViewCarousel";
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
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Link as MuiLink,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme as useMuiTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ApartmentIcon from "@mui/icons-material/Apartment";
import BuildIcon from "@mui/icons-material/Build";
import DescriptionIcon from "@mui/icons-material/Description";

const featureCards = [
  {
    title: "Property & Unit Management",
    body: "Organize your entire portfolio. Track units, vacancies, and property details in one place.",
    Icon: ApartmentIcon,
  },
  {
    title: "Tenant Screening",
    body: "Background checks, credit reports, and eviction history. Make informed leasing decisions.",
    Icon: VerifiedUserIcon,
  },
  {
    title: "Online Rent Collection",
    body: "Accept payments via credit card and ACH. Automated reminders for overdue rent.",
    Icon: CreditCardIcon,
  },
  {
    title: "Maintenance Tracking",
    body: "Tenants submit requests, you track progress. AI-powered triage coming soon.",
    Icon: BuildIcon,
  },
  {
    title: "Accounting & Reports",
    body: "Income tracking, expense management, P&L reports, and rent ledgers.",
    Icon: AccountBalanceIcon,
  },
  {
    title: "Documents & E-Signatures",
    body: "Store leases, inspections, and templates. Everything organized and searchable.",
    Icon: DescriptionIcon,
  },
];

const howItWorks = [
  { step: 1, title: "Sign Up", body: "Create your free account in 30 seconds." },
  { step: 2, title: "Add Properties", body: "Import your portfolio and invite tenants." },
  { step: 3, title: "Manage Everything", body: "Collect rent, handle maintenance, run reports." },
];

const pricingCards = [
  {
    title: "Free Plan",
    price: "$0",
    cadence: "/month",
    badge: "",
    cta: "Get Started Free",
    buttonVariant: "outlined",
    note: "",
    features: [
      "Up to 5 units",
      "Tenant management",
      "Online rent collection",
      "Maintenance tracking",
      "Basic reports",
      "Document storage",
    ],
    emphasized: false,
  },
  {
    title: "Pro Plan",
    price: "$12",
    cadence: "/unit/month",
    badge: "Most Popular",
    cta: "Start Free Trial",
    buttonVariant: "contained",
    note: "14-day free trial. No credit card required.",
    features: [
      "Everything in Free",
      "Unlimited units",
      "Tenant screening",
      "Advanced accounting & P&L",
      "Late fee automation",
      "AI-powered features",
      "Priority support",
    ],
    emphasized: true,
  },
];

const faqItems = [
  {
    q: "What is Onyx PM?",
    a: "Onyx PM is a modern property management platform built for landlords and property managers. Manage properties, tenants, payments, maintenance, and more from one dashboard.",
  },
  {
    q: "Is there really a free plan?",
    a: "Yes. Our free plan supports up to 5 units with core features. No credit card required, no time limit.",
  },
  {
    q: "How does online rent collection work?",
    a: "Tenants can pay rent directly through their portal using credit card or bank transfer. You get automatic payment tracking and reminders.",
  },
  {
    q: "Can tenants submit maintenance requests?",
    a: "Yes. Tenants have their own portal where they can submit and track maintenance requests. You manage everything from your dashboard.",
  },
  {
    q: "Is my data secure?",
    a: "Absolutely. We use industry-standard encryption, secure authentication, and your data is hosted on enterprise-grade infrastructure.",
  },
  {
    q: "Can I upgrade or downgrade anytime?",
    a: "Yes, you can switch between plans at any time. No long-term contracts.",
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

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [visibleSections, setVisibleSections] = useState({});
  const sectionRefs = useRef({});
  const materialTheme = useMuiTheme();
  const isMobile = useMediaQuery(materialTheme.breakpoints.down("md"));

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);

    return () => window.removeEventListener("scroll", onScroll);
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

    const nodes = sectionSeed
      .map((id) => sectionRefs.current[id])
      .filter(Boolean);
    nodes.forEach((node) => observer.observe(node));

    return () => {
      nodes.forEach((node) => observer.unobserve(node));
    };
  }, []);

  const registerSection = useCallback((id) => (node) => {
    if (node) {
      sectionRefs.current[id] = node;
    }
  }, []);

  const navLinks = useMemo(() => [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ], []);

  return (
    <Box sx={{ bgcolor: "#ffffff", color: "#111827", fontFamily: "Inter, Roboto, sans-serif" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backgroundColor: isScrolled ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.92)",
          backdropFilter: isScrolled ? "blur(14px)" : "blur(8px)",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          color: "#111827",
          zIndex: 1300,
          transition: "background-color 0.3s ease, border-color 0.3s ease",
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, maxWidth: "1200px !important" }}>
          <Box sx={{ minHeight: 68, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.5 }}>
            <Typography sx={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Onyx PM</Typography>
            {isMobile ? (
              <IconButton onClick={() => setMobileMenuOpen(true)} sx={{ color: "#111827" }} aria-label="Open menu">
                <MenuIcon />
              </IconButton>
            ) : (
              <Stack direction="row" spacing={1.8} alignItems="center">
                {navLinks.map((link) => (
                  <MuiLink
                    key={link.label}
                    href={link.href}
                    underline="none"
                    sx={{ fontSize: 13, color: "#4b5563", "&:hover": { color: "#111827" } }}
                  >
                    {link.label}
                  </MuiLink>
                ))}
                <Button component={Link} to="/login" size="small" sx={{ color: "#111827", fontWeight: 500 }}>
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
        PaperProps={{ sx: { width: 250, background: "#fff", p: 1.2 } }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end", px: 0.6, mb: 1 }}>
          <IconButton onClick={() => setMobileMenuOpen(false)} sx={{ color: "#111827" }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <List>
          {navLinks.map((link) => (
            <ListItemButton
              key={link.label}
              component="a"
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              sx={{ borderRadius: 1, color: "#111827" }}
            >
              <ListItemText primary={link.label} />
            </ListItemButton>
          ))}
          <Divider sx={{ my: 1 }} />
          <ListItemButton component={Link} to="/login" onClick={() => setMobileMenuOpen(false)} sx={{ borderRadius: 1 }}>
            <ListItemText primary="Log In" />
          </ListItemButton>
          <ListItemButton component={Link} to="/register" onClick={() => setMobileMenuOpen(false)} sx={{ borderRadius: 1 }}>
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
              minHeight: "calc(100vh - 96px)",
              pt: { xs: 4, md: 0 },
              pb: 8,
              display: "grid",
              gap: 5,
              justifyItems: "center",
            }}
          >
            <Box sx={{ textAlign: "center", maxWidth: 980 }}>
              <Typography
                sx={{
                  fontSize: { xs: "2.4rem", md: "3.5rem", lg: "3.8rem" },
                  lineHeight: 1.05,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "#111827",
                  whiteSpace: "pre-line",
                }}
              >
                Property Management,{"\n"}Simplified.
              </Typography>
              <Typography
                sx={{ mt: 2, maxWidth: 640, mx: "auto", color: "#6b7280", fontSize: 18, lineHeight: 1.45 }}
              >
                The modern platform for landlords and property managers. Manage properties, tenants, payments,
                and maintenance — all in one place.
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
                  Get Started Free
                </Button>
                <Button
                  size="medium"
                  variant="outlined"
                  href="#how-it-works"
                  sx={{
                    px: 2.2,
                    borderColor: alpha("#111827", 0.2),
                    color: "#111827",
                    "&:hover": { borderColor: "#111827" },
                  }}
                  component={MuiLink}
                >
                  See How It Works
                </Button>
              </Stack>
              <Typography sx={{ mt: 1.2, fontSize: 12, color: "#6b7280" }}>
                Free forever for up to 5 units. No credit card required.
              </Typography>
            </Box>
            <Box
              sx={{
                width: "100%",
                maxWidth: 1020,
                borderRadius: 3,
                border: "1px solid rgba(0,0,0,0.08)",
                overflow: "hidden",
                background: "linear-gradient(160deg, #ffffff 0%, #f4f6ff 45%, #ffffff 100%)",
                p: { xs: 2, md: 3 },
                boxShadow: "0 28px 70px rgba(17,24,39,0.15)",
                transform: "perspective(1200px) rotateX(6deg) rotateY(-2deg)",
              }}
            >
              <Box
                sx={{
                  height: { xs: 360, md: 420 },
                  borderRadius: 2,
                  border: "1px solid rgba(0,0,0,0.08)",
                  backgroundColor: "#0f172a",
                  p: 1.8,
                  color: "#e5e7eb",
                  display: "grid",
                  gap: 1.3,
                  gridTemplateColumns: "200px 1fr",
                }}
              >
                <Box
                  sx={{
                    borderRadius: 1.5,
                    background: "rgba(255,255,255,0.05)",
                    p: 1.2,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <Typography sx={{ fontSize: 11, color: alpha("#ffffff", 0.74) }}>Dashboard</Typography>
                  <Box sx={{ mt: 1.2, display: "grid", gap: 0.8 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <DashboardIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                      <Typography sx={{ fontSize: 12 }}>Overview</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PeopleIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                      <Typography sx={{ fontSize: 12 }}>Tenants</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ViewCarouselIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                      <Typography sx={{ fontSize: 12 }}>Maintenance</Typography>
                    </Stack>
                  </Box>
                </Box>
                <Box sx={{ display: "grid", gap: 1 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
                    {[
                      { label: "Revenue", value: "$24,300" },
                      { label: "Units", value: "38" },
                      { label: "Open Requests", value: "9" },
                    ].map((item) => (
                      <Box
                        key={item.label}
                        sx={{
                          borderRadius: 1.2,
                          p: 1.2,
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.04)",
                        }}
                      >
                        <Typography sx={{ fontSize: 11, color: "#9ca3af" }}>{item.label}</Typography>
                        <Typography sx={{ fontSize: 19, fontWeight: 700, mt: 0.8, color: "#fff" }}>{item.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ borderRadius: 1.2, border: "1px solid rgba(255,255,255,0.08)", p: 1.1, background: "rgba(255,255,255,0.04)", minHeight: 188 }}>
                    <Typography sx={{ fontSize: 12, color: "#9ca3af" }}>Net Rent Collected</Typography>
                    <Box sx={{ mt: 1.2, height: 82, borderRadius: 1, background: "linear-gradient(90deg, rgba(99,71,245,0.32), rgba(99,71,245,0.08))", position: "relative", overflow: "hidden" }}>
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(90deg, rgba(255,255,255,0.16) 25%, rgba(255,255,255,0) 25%)",
                          opacity: 0.25,
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </SectionFadeIn>

          <Box sx={{ mt: 4, mb: 8 }}>
            <Typography sx={{ textAlign: "center", color: "#6b7280", fontSize: 14 }}>
              Trusted by property managers across the US
            </Typography>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={3}
              justifyContent="center"
              alignItems="center"
              sx={{ mt: 1.8, color: "#9ca3af", fontSize: 13 }}
            >
              <Typography>Northlake Property Group</Typography>
              <Typography>UrbanNest Management</Typography>
              <Typography>Maple Street Partners</Typography>
              <Typography>Harborline Holdings</Typography>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container
        maxWidth="lg"
        sx={{ px: { xs: 2, md: 3 }, py: { xs: 8, md: 10 }, maxWidth: "1200px !important" }}
      >
        <SectionFadeIn id="features" visibleSections={visibleSections} ref={registerSection("features")} sx={{ mb: { xs: 8, md: 10 } }}>
          <Typography sx={{ fontSize: { xs: 30, md: 36 }, fontWeight: 700, letterSpacing: "-0.01em", textAlign: "center", color: "#111827" }}>
            Everything you need to manage your properties
          </Typography>
          <Typography sx={{ mt: 1, textAlign: "center", color: "#6b7280", fontSize: 16 }}>
            From leasing to accounting, Onyx PM handles it all.
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
                    border: "1px solid rgba(0,0,0,0.08)",
                    p: 2.2,
                    background: "#fff",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                    "&:hover": { transform: "translateY(-2px)", boxShadow: "0 14px 35px rgba(15,23,42,0.08)" },
                  }}
                >
                  <Icon sx={{ color: "#6347f5", mb: 1.2 }} />
                  <Typography sx={{ fontWeight: 600, color: "#111827", fontSize: 16 }}>{item.title}</Typography>
                  <Typography sx={{ mt: 0.8, color: "#6b7280", fontSize: 13, lineHeight: 1.5 }}>{item.body}</Typography>
                </Box>
              );
            })}
          </Box>
        </SectionFadeIn>

        <SectionFadeIn id="how-it-works" visibleSections={visibleSections} ref={registerSection("how-it-works")} sx={{ mb: { xs: 8, md: 10 } }}>
          <Typography sx={{ fontSize: 24, fontWeight: 700, textAlign: "center", color: "#111827" }}>
            How it works
          </Typography>
          <Box
            sx={{
              mt: 3.5,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
              gap: 1.5,
            }}
          >
            {howItWorks.map((item, index) => (
              <Box key={item.step} sx={{ display: "flex", alignItems: "stretch", position: "relative", gap: 1.2 }}>
                <Box
                  sx={{
                    mt: 0.1,
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "1px solid rgba(99,71,245,0.3)",
                    color: "#6347f5",
                    background: "rgba(99,71,245,0.08)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 14,
                    fontWeight: 600,
                    flex: "none",
                  }}
                >
                  {item.step}
                </Box>
                <Box sx={{ flex: 1, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 2, p: 2, background: "#fff" }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>{item.title}</Typography>
                  <Typography sx={{ mt: 0.8, color: "#6b7280", fontSize: 13 }}>{item.body}</Typography>
                </Box>
                {index !== howItWorks.length - 1 ? (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 18,
                      left: 18,
                      right: -24,
                      borderTop: "1px dashed rgba(0,0,0,0.14)",
                      display: { xs: "none", md: "block" },
                    }}
                  >
                    <AddIcon sx={{ position: "absolute", right: -7, top: -10, color: "#cbd5e1", fontSize: 18 }} />
                  </Box>
                ) : null}
              </Box>
            ))}
          </Box>
        </SectionFadeIn>

        <SectionFadeIn id="pricing" visibleSections={visibleSections} ref={registerSection("pricing")} sx={{ mb: { xs: 8, md: 10 } }}>
          <Typography sx={{ fontSize: 32, fontWeight: 700, textAlign: "center", color: "#111827" }}>
            Simple, transparent pricing
          </Typography>
          <Typography sx={{ mt: 1, textAlign: "center", color: "#6b7280", fontSize: 16 }}>
            Start free, upgrade when you&apos;re ready.
          </Typography>
          <Box
            sx={{
              mt: 3.6,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              gap: 2,
            }}
          >
            {pricingCards.map((plan) => (
              <Box
                key={plan.title}
                sx={{
                  borderRadius: 3,
                  border: plan.emphasized ? "1px solid #6347f5" : "1px solid rgba(0,0,0,0.08)",
                  background: "#fff",
                  p: 2.6,
                  position: "relative",
                  boxShadow: plan.emphasized ? "0 14px 30px rgba(99,71,245,0.12)" : "none",
                }}
              >
                {plan.badge ? (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      fontSize: 11,
                      color: "#fff",
                      px: 1.1,
                      py: 0.35,
                      borderRadius: 12,
                      background: "#6347f5",
                      lineHeight: 1.2,
                    }}
                  >
                    {plan.badge}
                  </Box>
                ) : null}
                <Typography sx={{ fontSize: 14, color: "#6b7280" }}>{plan.title}</Typography>
                <Typography sx={{ mt: 1, fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em" }}>
                  {plan.price}
                  <Typography component="span" sx={{ fontSize: 15, color: "#6b7280", fontWeight: 500 }}>
                    {plan.cadence}
                  </Typography>
                </Typography>
                <Box sx={{ mt: 2, display: "grid", gap: 0.8 }}>
                  {plan.features.map((feature) => (
                    <Stack key={feature} direction="row" spacing={1} alignItems="center">
                      <CheckCircleOutlineIcon sx={{ color: "#22c55e", fontSize: 16 }} />
                      <Typography sx={{ fontSize: 13, color: "#374151" }}>{feature}</Typography>
                    </Stack>
                  ))}
                </Box>
                <Button
                  variant={plan.buttonVariant}
                  color={plan.buttonVariant === "contained" ? "primary" : "inherit"}
                  component={Link}
                  to="/register"
                  fullWidth
                  sx={{
                    mt: 2.4,
                    borderRadius: 2,
                    ...(plan.buttonVariant === "contained"
                      ? {
                          backgroundColor: "#6347f5",
                          "&:hover": { backgroundColor: "#5539d9" },
                        }
                      : {
                          borderColor: "rgba(17,24,39,0.22)",
                          color: "#111827",
                          "&:hover": { borderColor: "#111827" },
                        }),
                  }}
                >
                  {plan.cta}
                </Button>
                {plan.note ? <Typography sx={{ mt: 1.1, fontSize: 11, color: "#6b7280" }}>{plan.note}</Typography> : null}
              </Box>
            ))}
          </Box>
        </SectionFadeIn>

        <SectionFadeIn id="faq" visibleSections={visibleSections} ref={registerSection("faq")}>
          <Typography sx={{ fontSize: 32, fontWeight: 700, textAlign: "center", color: "#111827" }}>
            Frequently asked questions
          </Typography>
          <Typography sx={{ mt: 1, textAlign: "center", color: "#6b7280", fontSize: 16 }}>
            Common questions about onboarding and using Onyx PM.
          </Typography>
          <Box sx={{ mt: 3.4, maxWidth: 900, mx: "auto" }}>
            {faqItems.map((faq) => (
              <Accordion
                key={faq.q}
                elevation={0}
                sx={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 2, mb: 1.2, "&:before": { display: "none" }, background: "#fff" }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ "& .MuiAccordionSummary-content": { fontWeight: 600 } }}>
                  <Typography sx={{ color: "#111827", fontWeight: 600 }}>{faq.q}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography sx={{ color: "#4b5563", fontSize: 13, lineHeight: 1.6 }}>{faq.a}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </SectionFadeIn>
      </Container>
      <Box sx={{ mt: 8, bgcolor: "#1a1a1a", color: "#fff", pt: 6, pb: 4 }}>
      <Container
        maxWidth="lg"
        sx={{ px: { xs: 2, md: 3 }, py: { xs: 8, md: 10 }, maxWidth: "1200px !important" }}
      >
          <Box
            sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 2.5 }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700, mb: 1.4 }}>Product</Typography>
              <Stack spacing={1}>
                <MuiLink href="#features" underline="none" color="inherit" sx={{ fontSize: 13 }}>
                  Features
                </MuiLink>
                <MuiLink href="#pricing" underline="none" color="inherit" sx={{ fontSize: 13 }}>
                  Pricing
                </MuiLink>
                <MuiLink href="#faq" underline="none" color="inherit" sx={{ fontSize: 13 }}>
                  FAQ
                </MuiLink>
                <MuiLink component={Link} to="/login" underline="none" color="inherit" sx={{ fontSize: 13 }}>
                  Login
                </MuiLink>
              </Stack>
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, mb: 1.4 }}>Company</Typography>
              <Stack spacing={1}>
                <MuiLink href="#" underline="none" color="inherit" sx={{ fontSize: 13 }}>
                  About
                </MuiLink>
                <MuiLink href="#" underline="none" color="inherit" sx={{ fontSize: 13 }}>
                  Blog
                </MuiLink>
                <MuiLink href="#" underline="none" color="inherit" sx={{ fontSize: 13 }}>
                  Careers
                </MuiLink>
              </Stack>
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, mb: 1.4 }}>Legal</Typography>
              <Stack spacing={1}>
                <MuiLink href="#" underline="none" color="inherit" sx={{ fontSize: 13 }}>
                  Privacy Policy
                </MuiLink>
                <MuiLink href="#" underline="none" color="inherit" sx={{ fontSize: 13 }}>
                  Terms of Service
                </MuiLink>
              </Stack>
            </Box>
          </Box>
          <Divider sx={{ mt: 2.8, borderColor: "rgba(255,255,255,0.12)" }} />
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
            <Typography sx={{ fontSize: 12, color: "#9ca3af" }}>© 2026 Onyx PM. All rights reserved.</Typography>
            <Stack direction="row" spacing={1.2} sx={{ color: "#9ca3af", fontSize: 12 }}>
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

