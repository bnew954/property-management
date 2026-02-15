import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Container,
  Fade,
  Grid,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircle from "@mui/icons-material/CheckCircle";
import PublicNavBar from "../../components/PublicNavBar";
import PublicFooter from "../../components/PublicFooter";
import * as Mockups from "./FeatureMockups";

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

      <PublicFooter />
    </Box>
  );
}
