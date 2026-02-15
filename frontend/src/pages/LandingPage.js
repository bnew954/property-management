import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PaymentIcon from "@mui/icons-material/Payment";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Grid,
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
  const [isLogoHovered, setIsLogoHovered] = useState(false);
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
          "@keyframes float": {
            "0%,100%": {
              transform: "translateY(0px)",
              filter: "drop-shadow(0 0 20px rgba(124, 92, 252, 0.5))",
            },
            "50%": {
              transform: "translateY(-16px)",
              filter: "drop-shadow(0 0 35px rgba(124, 92, 252, 0.9))",
            },
          },
          "@keyframes shake": {
            "0%, 100%": { transform: "translateX(0) rotate(0deg)" },
            "10%": { transform: "translateX(-4px) rotate(-3deg)" },
            "20%": { transform: "translateX(4px) rotate(3deg)" },
            "30%": { transform: "translateX(-4px) rotate(-2deg)" },
            "40%": { transform: "translateX(4px) rotate(2deg)" },
            "50%": { transform: "translateX(-2px) rotate(-1deg)" },
            "60%": { transform: "translateX(2px) rotate(1deg)" },
            "70%, 100%": { transform: "translateX(0) rotate(0deg)" },
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
              pb: 6,
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
                  onMouseEnter={() => setIsLogoHovered(true)}
                  onMouseLeave={() => setIsLogoHovered(false)}
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
                    animation: isLogoHovered ? "shake 0.6s ease-in-out" : "float 3s ease-in-out infinite",
                    filter: isLogoHovered
                      ? "drop-shadow(0 0 40px rgba(255, 60, 60, 0.9)) brightness(1.3) hue-rotate(200deg)"
                      : "drop-shadow(0 0 20px rgba(124, 92, 252, 0.5))",
                    transition: "filter 0.3s ease",
                    cursor: "pointer",
                    willChange: "transform, opacity, filter",
                  }}
                />
                </Box>
              </Box>
              <Typography
                sx={{
                  fontSize: { xs: "2rem", md: "3rem", lg: "3.2rem" },
                  lineHeight: 1.05,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "#fff",
                  whiteSpace: "pre-line",
                }}
              >
                AI-Native Property Management Software
              </Typography>
              <Typography sx={{ mt: 2, maxWidth: 640, mx: "auto", color: "#878C9E", fontSize: 18, lineHeight: 1.45 }}>
                Modern interface, intelligent automation, and zero legacy baggage.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} justifyContent="center" sx={{ mt: 3 }}>
                <Button
                  component={Link}
                  to="/register"
                  size="medium"
                  variant="contained"
                sx={{
                    px: 2.2,
                    py: 1,
                    backgroundColor: "#6347f5",
                    "&:hover": { backgroundColor: "#5539d9" },
                    fontWeight: 600,
                  }}
                >
                  Get Started - It's Free
                </Button>
              </Stack>
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
                  width: "75%",
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
            Modern interface, intelligent automation, and zero legacy baggage.
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
          <Typography variant="h4" sx={{ color: "#fff", fontWeight: 700, textAlign: "center" }}>
            Simple, Transparent Pricing
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, mb: 6, textAlign: "center", color: "rgba(255,255,255,0.55)" }}>
            Start free. Scale when you're ready.
          </Typography>
          <Grid container spacing={0} justifyContent="center" alignItems="stretch">
            <Grid item xs={12} md={5} sx={{ display: "flex", width: "100%", flex: 1, justifyContent: "center" }}>
              <Box
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  p: 4,
                  width: "75%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                }}
              >
                <Chip
                  label="MOST POPULAR"
                  sx={{
                    backgroundColor: "rgba(124,92,252,0.15)",
                    color: "#7C5CFC",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    mt: 0,
                  }}
                />
                <Typography variant="h5" sx={{ mt: 1.5, color: "#fff", fontWeight: 700 }}>
                  Core
                </Typography>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.6, mt: 1 }}>
                  <Typography variant="h3" sx={{ color: "#fff", fontWeight: 800, lineHeight: 1 }}>
                    $0
                  </Typography>
                  <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.55)" }}>
                    /mo
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mt: 0.5, color: "rgba(255,255,255,0.55)" }}>
                  Free forever. No credit card required.
                </Typography>
                <Divider sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)", my: 2 }} />
                <Box sx={{ display: "grid", gap: 1, mb: 4 }}>
                  {[
                    "Marketing & Listings",
                    "Leasing & E-Signatures",
                    "Maintenance Management",
                    "Basic Accounting",
                  ].map((item) => (
                    <Box key={item} sx={{ display: "flex", alignItems: "center", gap: 1.1 }}>
                      <CheckCircleOutlineIcon sx={{ color: "#7C5CFC", fontSize: 18 }} />
                      <Typography variant="body2" sx={{ color: "#878C9E" }}>
                        {item}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Button
                  component={Link}
                  to="/register"
                  variant="contained"
                  sx={{
                    mt: "auto",
                    py: 1,
                    px: 3,
                    backgroundColor: "#7C5CFC",
                    "&:hover": { backgroundColor: "#6946e8" },
                    color: "#fff",
                    textAlign: "center",
                    display: "block",
                    mx: "auto",
                    fontSize: "0.85rem",
                  }}
                >
                  Get Started Free
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={5} sx={{ display: "flex", width: "100%", flex: 1, justifyContent: "center" }}>
              <Box
                sx={{
                  backgroundColor: "rgba(124, 92, 252, 0.06)",
                  border: "1px solid rgba(124, 92, 252, 0.2)",
                  borderRadius: "16px",
                  p: 4,
                  width: "75%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                }}
              >
                <Typography variant="h5" sx={{ mt: 1.5, color: "#fff", fontWeight: 700 }}>
                  Enterprise
                </Typography>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.6, mt: 1 }}>
                  <Typography variant="h3" sx={{ color: "#fff", fontWeight: 800, lineHeight: 1 }}>
                    $3
                  </Typography>
                  <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.55)" }}>
                    /unit/mo
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mt: 0.5, color: "rgba(255,255,255,0.55)" }}>
                  Full-service accounting and financial management.
                </Typography>
                <Divider sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)", my: 2 }} />
                <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600, mb: 2 }}>
                  Everything in Core, plus:
                </Typography>
                <Box sx={{ display: "grid", gap: 1, mb: 4 }}>
                  {[
                    "Full Double-Entry Accounting",
                    "Advanced Financial Reporting",
                    "Bank Import & Reconciliation",
                  ].map((item) => (
                    <Box key={item} sx={{ display: "flex", alignItems: "center", gap: 1.1 }}>
                      <CheckCircleOutlineIcon sx={{ color: "#7C5CFC", fontSize: 18 }} />
                      <Typography variant="body2" sx={{ color: "#878C9E" }}>
                        {item}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Button
                  component={Link}
                  to="/register"
                  variant="outlined"
                  sx={{
                    mt: "auto",
                    py: 1,
                    px: 3,
                    borderColor: "#7C5CFC",
                    color: "#7C5CFC",
                    "&:hover": { backgroundColor: "rgba(124,92,252,0.1)" },
                    textAlign: "center",
                    display: "block",
                    mx: "auto",
                    fontSize: "0.85rem",
                  }}
                >
                  Start Free Trial
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Typography
            variant="body2"
            sx={{ mt: 4, textAlign: "center", color: "rgba(255,255,255,0.55)" }}
          >
            All plans include free onboarding support. No contracts, cancel anytime.
          </Typography>
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






