import { useEffect } from "react";
import { Link } from "react-router-dom";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BuildIcon from "@mui/icons-material/Build";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import PublicNavBar from "../components/PublicNavBar";

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

const mutedText = "rgba(255,255,255,0.55)";
const sectionChipSx = {
  backgroundColor: "rgba(124,92,252,0.15)",
  color: "#7C5CFC",
  fontWeight: 700,
  letterSpacing: 1,
};
const comingSoonChipSx = {
  ...sectionChipSx,
  fontWeight: 600,
};

const browserFrameStyle = {
  backgroundColor: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
  overflow: "hidden",
};

function BrowserChrome({ children, minHeight = "360px" }) {
  return (
    <Box sx={{ ...browserFrameStyle }}>
      <Box sx={{ display: "flex", gap: 1, p: 1.5, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ff5f56" }} />
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ffbd2e" }} />
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#27ca40" }} />
      </Box>
      <Box sx={{ p: 2, minHeight }}>{children}</Box>
    </Box>
  );
}

function WhyOnyxFooter() {
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

export default function WhyOnyx() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const aiFeatures = [
    { icon: AutoAwesomeIcon, text: "Auto-classification learns from your categorization patterns", comingSoon: false },
    { icon: CompareArrowsIcon, text: "Smart transaction matching during bank reconciliation", comingSoon: false },
    { icon: BuildIcon, text: "AI maintenance triage — categorize, prioritize, route", comingSoon: true },
    { icon: TrendingUpIcon, text: "Financial anomaly detection", comingSoon: true },
    { icon: SmartToyIcon, text: "AI lease assistant for tenant questions", comingSoon: true },
  ];

  return (
    <Box sx={{ bgcolor: "#0a0a0f", color: "#fff", fontFamily: "Inter, Roboto, sans-serif" }}>
      <PublicNavBar />

      <Box sx={{ pt: "64px" }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, maxWidth: "1200px !important", pt: 16, pb: 8 }}>
          <Box sx={{ textAlign: "center", maxWidth: 900, mx: "auto" }}>
            <Typography variant="h3" sx={{ fontWeight: 800, color: "#fff" }}>
              Why Onyx PM?
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, color: mutedText, fontSize: 17, maxWidth: "700px", mx: "auto" }}>
              The property management industry is stuck in the past. Clunky interfaces, expensive subscriptions, and zero intelligence. We built something better.
            </Typography>
          </Box>
        </Container>

        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, maxWidth: "1200px !important", py: 10 }}>
          <Stack spacing={12}>
            <Grid container spacing={6} alignItems="center">
              <Grid item xs={12} md={6}>
                <Chip label="PRICING" size="small" sx={sectionChipSx} />
                <Typography variant="h4" sx={{ mt: 2, fontWeight: 700, color: "#fff" }}>
                  100% Free. No, Really.
                </Typography>
                <Typography variant="body1" sx={{ mt: 2, color: mutedText, lineHeight: 1.7 }}>
                  Most property management software charges $1-3 per unit per month. That adds up fast — a 50-unit portfolio costs
                  $600-1,800/year just for basic software. Onyx PM is completely free. No subscriptions, no per-unit fees, no feature gates.
                  We make money only when you use optional paid services like tenant screening and payment processing — and even those are priced
                  at cost.
                </Typography>

                <Box
                  sx={{
                    mt: 3,
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 2,
                    p: 2,
                    backgroundColor: "rgba(255,255,255,0.02)",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, color: "rgba(255,255,255,0.6)", textDecoration: "line-through" }}
                  >
                    Buildium: $58-183/mo
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, color: "rgba(255,255,255,0.6)", textDecoration: "line-through" }}>
                    AppFolio: $1.40/unit/mo
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#22c55e", fontWeight: 700 }}>
                    Onyx PM: $0/mo — Free forever
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <BrowserChrome minHeight="390px">
                  <Grid container spacing={1.5} wrap="nowrap">
                    <Grid item xs={4}>
                      <Box
                        sx={{
                          border: "1px solid rgba(239,68,68,0.35)",
                          borderRadius: 2,
                          p: 1,
                          backgroundColor: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <Typography variant="caption" sx={{ color: "#ef4444", textDecoration: "line-through", fontWeight: 600 }}>
                          Basic $49/mo
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box
                        sx={{
                          border: "1px solid rgba(239,68,68,0.35)",
                          borderRadius: 2,
                          p: 1,
                          backgroundColor: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <Typography variant="caption" sx={{ color: "#ef4444", textDecoration: "line-through", fontWeight: 600 }}>
                          Pro $99/mo
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box
                        sx={{
                          border: "1px solid rgba(239,68,68,0.35)",
                          borderRadius: 2,
                          p: 1,
                          backgroundColor: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <Typography variant="caption" sx={{ color: "#ef4444", textDecoration: "line-through", fontWeight: 600 }}>
                          Enterprise $199/mo
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  <Box
                    sx={{
                      mt: 1.6,
                      border: "1px solid rgba(39,202,64,0.4)",
                      borderRadius: "12px",
                      px: 2,
                      py: 1.8,
                      backgroundColor: "rgba(39,202,64,0.06)",
                      textAlign: "center",
                    }}
                  >
                    <Typography sx={{ color: "#22c55e", fontSize: 28, fontWeight: 700 }}>
                      Onyx PM
                    </Typography>
                    <Typography sx={{ color: "#22c55e", mt: 0.5, fontWeight: 700, fontSize: 20 }}>
                      $0/mo
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
                      Free forever
                    </Typography>
                  </Box>
                </BrowserChrome>
              </Grid>
            </Grid>

            <Grid container spacing={6} alignItems="center" direction={{ xs: "column-reverse", md: "row-reverse" }}>
              <Grid item xs={12} md={6}>
                <BrowserChrome minHeight="440px">
                  <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.5)", mb: 1 }}>
                    UI Comparison
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                      gap: 1,
                      minHeight: 350,
                    }}
                  >
                    <Box
                      sx={{
                        border: "1px solid rgba(255,255,255,0.16)",
                        borderRadius: 2,
                        p: 1.2,
                        backgroundColor: "#121212",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "#9ca3af", fontWeight: 700, display: "block" }}>
                        Legacy PM Software
                      </Typography>
                      <Box sx={{ mt: 1, border: "1px solid #2d2d2d", p: 1, borderRadius: 1.5, height: "88%", overflow: "auto", fontSize: 10 }}>
                        <Grid container spacing={0.6}>
                          <Grid item xs={6}>
                            <Typography sx={{ color: "#9ca3af" }}>Tenant</Typography>
                            <Typography sx={{ color: "#ef4444", fontSize: 10 }}>John H.</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography sx={{ color: "#9ca3af" }}>Status</Typography>
                            <Typography sx={{ color: "#f59e0b", fontSize: 10 }}>Pending</Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography sx={{ color: "#9ca3af", fontSize: 10 }}>Unit 101</Typography>
                            <Typography sx={{ color: "#fff", fontSize: 10 }}>Rent Ledger | Violations | Work Orders</Typography>
                            <Typography sx={{ color: "#9ca3af", fontSize: 10 }}>
                              2.14 PM | 3 Alerts | 11 Clicks | 4 Tabs
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        border: "1px solid rgba(124,92,252,0.25)",
                        borderRadius: 2,
                        p: 1.2,
                        backgroundColor: "rgba(20,20,20,0.82)",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: "#7c5cfc", fontWeight: 700, display: "block", letterSpacing: "0.04em" }}
                      >
                        Onyx PM
                      </Typography>
                      <Box sx={{ mt: 1, border: "1px solid rgba(124,92,252,0.2)", p: 1, borderRadius: 1.5, height: "88%", backgroundColor: "rgba(255,255,255,0.02)" }}>
                        <Box sx={{ display: "grid", gap: 0.8 }}>
                          <Typography variant="caption" sx={{ color: "#7c5cfc" }}>
                            Properties
                          </Typography>
                          <Typography variant="h6" sx={{ color: "#fff", fontSize: 16, lineHeight: 1.2 }}>
                            Unit 101 active
                          </Typography>
                          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
                            Lease status: Active
                          </Typography>
                          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
                            Rent due: 04/18 · 2 days overdue
                          </Typography>
                          <Box sx={{ mt: 1, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 1, p: 0.8 }}>
                            <Typography variant="caption" sx={{ color: "#7c5cfc", fontWeight: 600 }}>
                              Smart cards · No nested menus
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </BrowserChrome>
              </Grid>
              <Grid item xs={12} md={6}>
                <Chip label="DESIGN" size="small" sx={sectionChipSx} />
                <Typography variant="h4" sx={{ mt: 2, fontWeight: 700, color: "#fff" }}>
                  Software You Actually Want to Use
                </Typography>
                <Typography variant="body1" sx={{ mt: 2, color: mutedText, lineHeight: 1.7 }}>
                  Property management software has a reputation for looking like it was built in 2005 — because most of it was.
                  Onyx PM features a modern dark-mode interface built with Material UI, responsive layouts that work on any device, and
                  intuitive workflows that don't require a training manual. Every screen is designed to show you what matters and get out of
                  your way.
                </Typography>
                <Box sx={{ mt: 3, display: "grid", gap: 1 }}>
                  {[
                    "Dark mode interface that's easy on the eyes",
                    "Mobile-responsive — manage properties from your phone",
                    "Intuitive navigation with zero learning curve",
                    "Real-time updates across all screens",
                  ].map((item) => (
                    <Box key={item} sx={{ display: "flex", alignItems: "center", gap: 1.1 }}>
                      <CheckCircleIcon sx={{ fontSize: 16, color: "#7c5cfc" }} />
                      <Typography sx={{ color: "#fff", fontSize: 14 }}>{item}</Typography>
                    </Box>
                  ))}
                </Box>
              </Grid>
            </Grid>

            <Grid container spacing={6} alignItems="center">
              <Grid item xs={12} md={6}>
                <Chip label="AI-POWERED" size="small" sx={sectionChipSx} />
                <Typography variant="h4" sx={{ mt: 2, fontWeight: 700, color: "#fff" }}>
                  Intelligence Built Into Every Workflow
                </Typography>
                <Typography variant="body1" sx={{ mt: 2, color: mutedText, lineHeight: 1.7 }}>
                  Onyx PM isn't just software with an AI chatbot bolted on. Intelligence is woven into the platform itself. Transactions
                  auto-classify based on rules you teach it. Import a bank statement and watch it categorize expenses automatically. Coming soon:
                  AI-powered maintenance triage, financial anomaly detection, and a lease assistant that answers tenant questions 24/7.
                </Typography>
                <Box sx={{ mt: 3, display: "grid", gap: 1 }}>
                  {aiFeatures.map((item) => (
                    <Box
                      key={item.text}
                      sx={{ display: "flex", alignItems: "center", gap: 1.1, flexWrap: "wrap" }}
                    >
                      <item.icon sx={{ fontSize: 18, color: "#7c5cfc" }} />
                      <Typography sx={{ color: "#fff", fontSize: 14 }}>{item.text}</Typography>
                      {item.comingSoon ? (
                        <Chip label="Coming Soon" size="small" sx={comingSoonChipSx} />
                      ) : null}
                    </Box>
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <BrowserChrome minHeight="360px">
                  <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                    Auto-Classification Rules
                  </Typography>
                  <Box
                    sx={{
                      mt: 2,
                      p: 1.2,
                      borderRadius: 2,
                      border: "1px solid rgba(255,255,255,0.08)",
                      backgroundColor: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                      Plumber - Fix kitchen sink · -$350
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "center", mt: 1.2, color: "#7c5cfc" }}>
                    <ArrowDownwardIcon sx={{ fontSize: 20 }} />
                  </Box>
                  <Box sx={{ p: 1.2, borderRadius: 2, border: "1px solid rgba(124,92,252,0.25)", backgroundColor: "rgba(124,92,252,0.08)" }}>
                    <Typography variant="caption" sx={{ color: "#e0e7ff", fontWeight: 600 }}>
                      Description contains &quot;plumber&quot; → 5020 Repairs &amp; Maintenance
                    </Typography>
                  </Box>
                  <Chip label="Auto-classified ✓" size="small" sx={{ mt: 1.5, backgroundColor: "rgba(34,197,94,0.18)", color: "#22c55e" }} />
                  <Typography variant="body2" sx={{ mt: 1.4, color: "#a7f3d0" }}>
                    3 rules matched 47 of 52 imported transactions
                  </Typography>
                </BrowserChrome>
              </Grid>
            </Grid>
          </Stack>
        </Container>

        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, maxWidth: "1200px !important", py: 10, textAlign: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: "#fff" }}>
            Ready to switch to modern property management?
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, color: mutedText }}>
            No migration needed. No credit card required. Start managing smarter today.
          </Typography>
          <Button
            component={Link}
            to="/register"
            variant="contained"
            sx={{
              mt: 3,
              backgroundColor: "#6347f5",
              "&:hover": { backgroundColor: "#5539d9" },
              fontWeight: 600,
            }}
          >
            Get Started Free
          </Button>
        </Container>
      </Box>

      <WhyOnyxFooter />
    </Box>
  );
}

