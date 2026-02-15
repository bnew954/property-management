import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Fade,
  Grid,
  Link as MuiLink,
  Stack,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircle from "@mui/icons-material/CheckCircle";
import PublicNavBar from "../../components/PublicNavBar";
import * as Mockups from "./FeatureMockups";

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
          backgroundColor: "rgba(255,255,255,0.05)",
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
    <Box sx={{ mt: 8, bgcolor: "#0a0a0f", color: "#fff", pt: 6, pb: 4 }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>
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

const mutedText = "rgba(255, 255, 255, 0.55)";
const ctaButtonSx = {
  backgroundColor: "#7c5cfc",
  color: "#fff",
  borderRadius: "8px",
  px: 4,
  py: 1.5,
  fontWeight: 600,
  "&:hover": {
    backgroundColor: "#6d50ea",
  },
};

const tabChipSx = {
  backgroundColor: "rgba(124,92,252,0.15)",
  color: "#7C5CFC",
  fontWeight: 600,
  fontSize: "0.6rem",
  height: 18,
};

const tabListSx = {
  backgroundColor: "rgba(255,255,255,0.05)",
  borderRadius: "50px",
  p: "4px",
  display: "inline-flex",
  gap: "4px",
};

const activeTabSx = {
  backgroundColor: "#7C5CFC",
  color: "#fff",
  fontWeight: 600,
  borderRadius: "50px",
  px: 3,
  py: 1,
};

const inactiveTabSx = {
  backgroundColor: "transparent",
  color: "rgba(255,255,255,0.5)",
  borderRadius: "50px",
  px: 3,
  py: 1,
  "&:hover": { backgroundColor: "rgba(255,255,255,0.08)" },
};

export default function FeaturePageTemplate({ feature }) {
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!feature) {
    return null;
  }

  const tabs = feature.tabs || [];

  if (tabs.length === 0) {
    return null;
  }

  const HeaderIcon = feature.icon;
  const activeTabData = tabs[Math.min(activeTab, tabs.length - 1)] || tabs[0];
  const MockupComponent = activeTabData?.mockupId ? Mockups[activeTabData.mockupId] : null;

  return (
    <Box sx={{ bgcolor: "#0a0a0f", color: "#fff", fontFamily: "Inter, Roboto, sans-serif" }}>
      <PublicNavBar />

      <Box sx={{ pt: 16, pb: 12, backgroundColor: "#0a0a0f" }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={5}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, color: "#7c5cfc" }}>
                <HeaderIcon sx={{ fontSize: 44 }} />
                <Typography variant="h3" sx={{ color: "#fff", fontWeight: 800 }}>
                  {feature.title}
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mt: 2, color: mutedText }}>
                {feature.tagline}
              </Typography>
              <Box sx={{ mt: 4 }}>
                {activeTabData?.bullets?.map((bullet) => (
                  <Box key={bullet} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1.5 }}>
                    <CheckCircle sx={{ color: "#7C5CFC", fontSize: 18, mt: 0.2, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: "#fff", fontWeight: 500 }}>
                      {bullet}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Button component={Link} to="/register" variant="contained" sx={{ ...ctaButtonSx, mt: 4 }}>
                Get Started Free
              </Button>
            </Grid>

            <Grid item xs={12} md={7}>
              <Box sx={{ mb: 3, overflowX: "auto" }}>
                <Box sx={tabListSx}>
                    {tabs.map((tab, index) => {
                    const isActive = activeTab === index;
                    return (
                      <Box
                        key={tab.label}
                        onClick={() => setActiveTab(index)}
                        role="button"
                        tabIndex={0}
                        sx={{
                          ...(isActive ? activeTabSx : inactiveTabSx),
                          display: "flex",
                          alignItems: "center",
                          gap: 0.6,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {isActive ? <Typography variant="body2">{tab.label}</Typography> : <Typography variant="body2">{tab.label}</Typography>}
                        {tab.comingSoon ? <Chip label="Coming Soon" size="small" sx={tabChipSx} /> : null}
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              <Box
                sx={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  height: "420px",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <Box sx={{ display: "flex", gap: 1, p: 1.5, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ff5f56" }} />
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ffbd2e" }} />
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#27ca40" }} />
                </Box>
                <Box sx={{ flex: 1, overflow: "hidden" }}>
                  <Fade in timeout={300} key={activeTabData?.mockupId || activeTab}>
                    <Box sx={{ height: "100%" }}>
                      {MockupComponent ? <MockupComponent /> : <Typography>Mockup missing</Typography>}
                    </Box>
                  </Fade>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ px: { xs: 2, md: 3 }, mt: 6, pb: 10 }}>
        <Typography variant="h5" sx={{ color: "#fff", fontWeight: 600, textAlign: "center", mb: 4 }}>
          Frequently Asked Questions
        </Typography>
        {feature.faqs?.map((faq) => (
          <Accordion
            key={faq.question}
            sx={{
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "12px !important",
              mb: 2,
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: "#7c5cfc" }} />}
              sx={{ "& .MuiAccordionSummary-content": { alignItems: "center" } }}
            >
              <Typography variant="subtitle1" sx={{ color: "#fff", fontWeight: 600 }}>
                {faq.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{ color: mutedText, lineHeight: 1.7 }}>
                {faq.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Container>

      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, mt: 6, pb: 12, textAlign: "center" }}>
        <Typography variant="h5" sx={{ color: "#fff", fontWeight: 600 }}>
          Ready to streamline your property management?
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, color: mutedText }}>
          Get started for free — no credit card required.
        </Typography>
        <Button component={Link} to="/register" variant="contained" sx={{ ...ctaButtonSx, mt: 3 }}>
          Get Started Free
        </Button>
      </Container>

      <FeatureFooter />
    </Box>
  );
}
