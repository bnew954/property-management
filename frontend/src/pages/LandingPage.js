import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PaymentIcon from "@mui/icons-material/Payment";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Container,
  Divider,
  Chip,
  Fade,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import BuildIcon from "@mui/icons-material/Build";
import DescriptionIcon from "@mui/icons-material/Description";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import PublicNavBar from "../components/PublicNavBar";

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
    title: "Listings & Marketing",
    body: "Publish listings, attract tenants, and fill vacancies faster",
    Icon: HomeWorkIcon,
    to: "/features/listings",
  },
  {
    title: "Leasing & Applications",
    body: "Streamline your entire leasing pipeline from application to signed lease",
    Icon: VerifiedUserIcon,
    to: "/features/leasing",
  },
  {
    title: "Payments & Rent Collection",
    body: "Collect rent online and keep your ledger accurate automatically",
    Icon: PaymentIcon,
    to: "/features/payments",
  },
  {
    title: "Screening & Compliance",
    body: "Screen applicants with secure, consent-based background checks",
    Icon: DescriptionIcon,
    to: "/features/screening",
  },
  {
    title: "Maintenance",
    body: "Track requests, assign work, and keep tenants informed",
    Icon: BuildIcon,
    to: "/features/maintenance",
  },
  {
    title: "Accounting",
    body: "Double-entry bookkeeping with reports and bank reconciliation",
    Icon: AccountBalanceIcon,
    to: "/features/accounting",
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

const sectionSeed = ["hero", "features", "pricing", "faq"];

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

const tabLabels = ["Marketing", "Leasing", "Accounting", "Maintenance"];

function MarketingMockup() {
  const stats = [
    { label: "Active Listings", value: "6", color: "#7C5CFC" },
    { label: "Applications", value: "12", color: "#22c55e" },
    { label: "Views This Month", value: "847", color: "#3b82f6" },
  ];

  return (
    <Box sx={{ width: "100%", height: "100%", p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.5)" }}>
        Listings & Marketing
      </Typography>
      <Box sx={{ display: "flex", gap: 2 }}>
        {stats.map((stat, i) => (
          <Box
            key={i}
            sx={{
              flex: 1,
              p: 2,
              borderRadius: "12px",
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
              {stat.label}
            </Typography>
            <Typography variant="h5" sx={{ color: stat.color, fontWeight: 700, mt: 0.5 }}>
              {stat.value}
            </Typography>
          </Box>
        ))}
      </Box>
      {[
        { unit: "Unit 101 · Downtown Loft", rent: "$1,800/mo", status: "Listed", views: "128" },
        { unit: "Unit 204 · Harbor View", rent: "$2,200/mo", status: "Pending", views: "94" },
        { unit: "Unit 305 · Sunset Studio", rent: "$1,250/mo", status: "Draft", views: "56" },
        { unit: "Unit 112 · Park Place", rent: "$2,000/mo", status: "Listed", views: "71" },
      ].map((listing, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 1.5,
            borderRadius: "8px",
            backgroundColor: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <Box>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
              {listing.unit}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", display: "block", mt: 0.4 }}>
              {listing.rent}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Chip label={listing.status} size="small" sx={{ backgroundColor: "rgba(124,92,252,0.15)", color: "#7C5CFC", fontSize: "0.6rem" }} />
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
              {listing.views} views
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function LeasingMockup() {
  return (
    <Box sx={{ width: "100%", height: "100%", p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.5)" }}>
        Leasing Pipeline
      </Typography>
      <Box sx={{ display: "flex", gap: 2 }}>
        {["Applied (5)", "Screening (3)", "Approved (2)", "Lease Signed (8)"].map((stage, i) => (
          <Box
            key={i}
            sx={{
              flex: 1,
              p: 1.5,
              borderRadius: "8px",
              backgroundColor: i === 3 ? "rgba(39,202,64,0.1)" : "rgba(255,255,255,0.03)",
              border: "1px solid",
              borderColor: i === 3 ? "rgba(39,202,64,0.2)" : "rgba(255,255,255,0.06)",
              textAlign: "center",
            }}
          >
            <Typography variant="caption" sx={{ color: i === 3 ? "#27ca40" : "rgba(255,255,255,0.5)", fontWeight: 600, fontSize: "0.7rem" }}>
              {stage}
            </Typography>
          </Box>
        ))}
      </Box>
      {[
        "Sarah Chen · Harbor View 2BR · Applied 2 days ago",
        "James Wilson · Downtown Loft · Screening in progress",
        "Maria Garcia · Sunset Studio · Approved, pending lease",
        "Alex Kim · Park Place 3BR · Lease sent for signing",
      ].map((item, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 1.5,
            borderRadius: "8px",
            backgroundColor: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
            {item}
          </Typography>
          <Chip
            label={["Review", "Pending", "Generate Lease", "Awaiting Signature"][i]}
            size="small"
            sx={{
              backgroundColor: "rgba(124,92,252,0.15)",
              color: "#7C5CFC",
              fontSize: "0.6rem",
              height: "22px",
            }}
          />
        </Box>
      ))}
    </Box>
  );
}

function AccountingMockup() {
  return (
    <Box sx={{ width: "100%", height: "100%", p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.5)" }}>
          Accounting · Transactions
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Chip
            label="Record Income"
            size="small"
            sx={{ backgroundColor: "rgba(39,202,64,0.15)", color: "#27ca40", fontSize: "0.6rem" }}
          />
          <Chip
            label="Record Expense"
            size="small"
            sx={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: "0.6rem" }}
          />
        </Box>
      </Box>
      {[
        { date: "Feb 14", memo: "Rent Payment - Unit 101", amount: "+$1,500.00", color: "#27ca40" },
        { date: "Feb 13", memo: "Plumber - Kitchen repair", amount: "-$350.00", color: "#ef4444" },
        { date: "Feb 10", memo: "Rent Payment - Unit 204", amount: "+$1,800.00", color: "#27ca40" },
        { date: "Feb 08", memo: "Insurance - Monthly premium", amount: "-$425.00", color: "#ef4444" },
        { date: "Feb 05", memo: "Rent Payment - Unit 102", amount: "+$1,200.00", color: "#27ca40" },
        { date: "Feb 01", memo: "Property Tax - Q1", amount: "-$1,200.00", color: "#ef4444" },
      ].map((txn, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 1.5,
            borderRadius: "8px",
            backgroundColor: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)", minWidth: "50px" }}>
              {txn.date}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
              {txn.memo}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: txn.color, fontWeight: 600 }}>
            {txn.amount}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function MaintenanceMockup() {
  return (
    <Box sx={{ width: "100%", height: "100%", p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.5)" }}>
          Maintenance Requests
        </Typography>
        <Chip
          label="3 Open"
          size="small"
          sx={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b", fontSize: "0.65rem" }}
        />
      </Box>
      {[
        { unit: "Unit 101", issue: "Leaking faucet in kitchen", priority: "High", status: "In Progress", statusColor: "#f59e0b" },
        { unit: "Unit 204", issue: "AC not cooling properly", priority: "Medium", status: "Open", statusColor: "#ef4444" },
        { unit: "Unit 305", issue: "Broken window latch", priority: "Low", status: "Open", statusColor: "#ef4444" },
        { unit: "Unit 102", issue: "Dishwasher replacement", priority: "Medium", status: "Completed", statusColor: "#27ca40" },
        { unit: "Unit 201", issue: "Paint touch-up hallway", priority: "Low", status: "Completed", statusColor: "#27ca40" },
      ].map((req, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 1.5,
            borderRadius: "8px",
            backgroundColor: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <Box>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
              {req.unit} · {req.issue}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Chip
              label={req.priority}
              size="small"
              sx={{
                backgroundColor: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.4)",
                fontSize: "0.6rem",
                height: "20px",
              }}
            />
            <Chip
              label={req.status}
              size="small"
              sx={{
                backgroundColor: `${req.statusColor}15`,
                color: req.statusColor,
                fontSize: "0.6rem",
                height: "20px",
              }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function LandingPage() {
  const [visibleSections, setVisibleSections] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const sectionRefs = useRef({});
  const heroParticles = useMemo(() => {
    const ambientCount = 80;
    const logoClusterCount = 30;

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
      <PublicNavBar />

      <Box sx={{ pt: "64px" }}>
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
              <Box
                sx={{
                  mb: 1.5,
                  mt: "40px",
                  display: "flex",
                  justifyContent: "center",
                  position: "relative",
                  zIndex: 1,
                }}
              >
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
              </Stack>
              <Typography sx={{ mt: 1.2, fontSize: 12, color: "#6b7280" }}>
                No credit card required. Unlimited units. Free forever.
              </Typography>
            </Box>

            <Box sx={{ width: "100%", maxWidth: 1080 }}>
              <Typography variant="h4" sx={{ textAlign: "center", fontWeight: 700, color: "#fff" }}>
                See the Platform in Action
              </Typography>
              <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
                <Box
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderRadius: "50px",
                    p: "4px",
                    display: "inline-flex",
                    gap: "4px",
                    overflowX: "auto",
                    maxWidth: "100%",
                  }}
                >
                  {tabLabels.map((tab, index) => (
                    <Box
                      key={tab}
                      component="button"
                      onClick={() => setActiveTab(index)}
                      sx={{
                        backgroundColor: activeTab === index ? "#7C5CFC" : "transparent",
                        color: activeTab === index ? "#fff" : "rgba(255,255,255,0.5)",
                        borderRadius: "50px",
                        px: 3,
                        py: 1,
                        fontWeight: activeTab === index ? 600 : 500,
                        cursor: "pointer",
                        border: "none",
                        transition: "all 0.2s",
                        fontSize: "0.875rem",
                        "&:hover": activeTab !== index ? { backgroundColor: "rgba(255,255,255,0.08)" } : undefined,
                      }}
                    >
                      {tab}
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box
                sx={{
                  mt: 4,
                  width: "100%",
                  maxWidth: "900px",
                  mx: "auto",
                  height: "440px",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <Box sx={{ display: "flex", gap: 1, p: 1.5, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ff5f56" }} />
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ffbd2e" }} />
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#27ca40" }} />
                </Box>
                <Box sx={{ height: "calc(100% - 32px)", overflow: "hidden" }}>
                  <Fade in={activeTab === 0} timeout={300} unmountOnExit>
                    <Box sx={{ height: "100%" }}>
                    <MarketingMockup />
                    </Box>
                  </Fade>
                  <Fade in={activeTab === 1} timeout={300} unmountOnExit>
                    <Box sx={{ height: "100%" }}>
                      <LeasingMockup />
                    </Box>
                  </Fade>
                  <Fade in={activeTab === 2} timeout={300} unmountOnExit>
                    <Box sx={{ height: "100%" }}>
                      <AccountingMockup />
                    </Box>
                  </Fade>
                  <Fade in={activeTab === 3} timeout={300} unmountOnExit>
                    <Box sx={{ height: "100%" }}>
                      <MaintenanceMockup />
                    </Box>
                  </Fade>
                </Box>
              </Box>
            </Box>
          </SectionFadeIn>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, py: { xs: 8, md: 10 }, maxWidth: "1200px !important" }}>
        <SectionFadeIn id="features" visibleSections={visibleSections} ref={registerSection("features")} sx={{ mb: { xs: 8, md: 10 } }}>
          <Typography sx={{ fontSize: { xs: 30, md: 36 }, fontWeight: 700, letterSpacing: "-0.01em", textAlign: "center", color: "#fff" }}>
            Built for the Future of Property Management
          </Typography>
          <Typography sx={{ mt: 1, textAlign: "center", color: "#878C9E", fontSize: 16 }}>
            Onyx PM is the first AI-native property management platform. Modern interface, intelligent automation, and zero legacy baggage — built from the ground up for how landlords actually work.
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
                  component={Link}
                  to={item.to}
                  sx={{
                    color: "inherit",
                    textDecoration: "none",
                    display: "block",
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
                  <Icon sx={{ color: "#7c5cfc", mb: 1.2, filter: "drop-shadow(0 0 8px rgba(124, 92, 252, 0.6))" }} />
                  <Typography sx={{ fontWeight: 600, color: "#fff", fontSize: 16 }}>{item.title}</Typography>
                  <Typography sx={{ mt: 0.8, color: "#878C9E", fontSize: 13, lineHeight: 1.5 }}>{item.body}</Typography>
                </Box>
              );
            })}
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
             <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", cursor: "pointer", marginBottom: "24px" }}>
               <BrandLogo textColor="#fff" onyxSize={18} iconSize={26} />
             </Link>
             <Stack spacing={0}>
                <MuiLink href="#features" underline="none" color="#fff" sx={{ fontSize: 13, mb: 1.5, display: "block", "&:last-child": { mb: 0 } }}>
                  Features
                </MuiLink>
                <MuiLink href="#pricing" underline="none" color="#fff" sx={{ fontSize: 13, mb: 1.5, display: "block", "&:last-child": { mb: 0 } }}>
                  Pricing
                </MuiLink>
                <MuiLink href="#faq" underline="none" color="#fff" sx={{ fontSize: 13, mb: 1.5, display: "block", "&:last-child": { mb: 0 } }}>
                  FAQ
                </MuiLink>
                <MuiLink component={Link} to="/login" underline="none" color="#fff" sx={{ fontSize: 13, mb: 1.5, display: "block", "&:last-child": { mb: 0 } }}>
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






