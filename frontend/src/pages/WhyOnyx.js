import { useEffect } from "react";
import { Link } from "react-router-dom";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HandshakeIcon from "@mui/icons-material/Handshake";
import SpeedIcon from "@mui/icons-material/Speed";
import { Box, Button, Chip, Container, Typography } from "@mui/material";
import PublicFooter from "../components/PublicFooter";
import PublicNavBar from "../components/PublicNavBar";

const mutedText = "rgba(255,255,255,0.55)";

const comingSoonChipSx = {
  backgroundColor: "rgba(124,92,252,0.15)",
  color: "#7C5CFC",
  fontWeight: 700,
  fontSize: "0.6rem",
  height: 18,
  ml: 1,
};

const featureCardsSx = {
  backgroundColor: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: "16px",
  p: 4,
  height: "100%",
  display: "flex",
  flexDirection: "column",
  width: "100%",
};

export default function WhyOnyx() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Box sx={{ bgcolor: "#0a0a0f", color: "#fff", fontFamily: "Inter, Roboto, sans-serif" }}>
      <PublicNavBar />

      <Box sx={{ pt: "64px" }}>
        <Container
          maxWidth="lg"
          sx={{
            px: { xs: 2, md: 3 },
            maxWidth: "1200px !important",
            pt: 14,
            pb: 6,
          }}
        >
          <Box sx={{ textAlign: "center", maxWidth: 900, mx: "auto" }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Why&nbsp;
              <Box
                component="span"
                sx={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  lineHeight: 1,
                  verticalAlign: "middle",
                }}
              >
                ONYX
              </Box>{" "}
              <Box
                component="span"
                sx={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.5em",
                  backgroundColor: "rgba(124, 92, 252, 0.15)",
                  color: "#7c5cfc",
                  px: 2,
                  py: 0.5,
                  borderRadius: "6px",
                  verticalAlign: "middle",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  lineHeight: 1.4,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                PM
              </Box>
              <Box component="span" sx={{ ml: 0.5, verticalAlign: "middle" }}>
                ?
              </Box>
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mt: 2,
                color: mutedText,
                fontSize: 17,
                maxWidth: "700px",
                mx: "auto",
              }}
            >
              Free professional-grade tools powered by AI. No compromises.
            </Typography>
          </Box>
        </Container>

        <Container maxWidth="lg" sx={{ pt: 4, pb: 6 }}>
          <Box sx={{ display: "flex", gap: 4, flexDirection: { xs: "column", md: "row" }, alignItems: "stretch" }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={featureCardsSx}>
                <AutoAwesomeIcon
                  sx={{
                    fontSize: 36,
                    color: "#7C5CFC",
                    filter: "drop-shadow(0 0 8px rgba(124,92,252,0.6))",
                  }}
                />
                <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 700, color: "#fff" }}>
                  Native Agentic AI
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: mutedText, lineHeight: 1.7 }}>
                  Intelligence isn't a feature we bolt on — it's the foundation. Every workflow is designed with AI at its core.
                </Typography>
                <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#fff" }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: "#7c5cfc", flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: "#fff", fontWeight: 500 }}>
                      AI leasing agent
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#fff" }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: "#7c5cfc", flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: "#fff", fontWeight: 500 }}>
                      Intelligent bookkeeping
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#fff" }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: "#7c5cfc", flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: "#fff", fontWeight: 500 }}>
                      24/7 Maintenance triage
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", color: "#fff" }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: "#7c5cfc", flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: "#fff", fontWeight: 500 }}>
                      Revenue management
                    </Typography>
                    <Chip size="small" label="Coming Soon" sx={comingSoonChipSx} />
                  </Box>
                </Box>
              </Box>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Box sx={featureCardsSx}>
                <SpeedIcon
                  sx={{
                    fontSize: 36,
                    color: "#7C5CFC",
                    filter: "drop-shadow(0 0 8px rgba(124,92,252,0.6))",
                  }}
                />
                <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 700, color: "#fff" }}>
                  Modern Stack, Zero Legacy
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: mutedText, lineHeight: 1.7 }}>
                  Built in 2026 with Django, React, and Material UI. No decade-old codebases. No technical debt. We move fast.
                </Typography>
                <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#fff" }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: "#7c5cfc", flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: "#fff", fontWeight: 500 }}>
                      Dark-mode interface designed for daily use
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#fff" }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: "#7c5cfc", flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: "#fff", fontWeight: 500 }}>
                      Mobile-responsive across every screen
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#fff" }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: "#7c5cfc", flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: "#fff", fontWeight: 500 }}>
                      Real-time updates with no page refreshes
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#fff" }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: "#7c5cfc", flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: "#fff", fontWeight: 500 }}>
                      Intuitive navigation with zero learning curve
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Box sx={featureCardsSx}>
                <HandshakeIcon
                  sx={{
                    fontSize: 36,
                    color: "#7C5CFC",
                    filter: "drop-shadow(0 0 8px rgba(124,92,252,0.6))",
                  }}
                />
                <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 700, color: "#fff" }}>
                  Aligned Incentives
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: mutedText, lineHeight: 1.7 }}>
                  Our core platform is free. We earn revenue from optional services, priced transparently.
                </Typography>
                <Box sx={{ mt: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Typography variant="body2" sx={{ color: mutedText }}>
                      Core Platform
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#27ca40", fontWeight: 700 }}>
                      $0/mo
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Typography variant="body2" sx={{ color: mutedText }}>
                      Rent Payments
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#fff" }}>
                      2.9% + 30¢
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Typography variant="body2" sx={{ color: mutedText }}>
                      Tenant Screening
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#fff" }}>
                      $35/report
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Typography variant="body2" sx={{ color: mutedText }}>
                      Enterprise Accounting
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#fff" }}>
                      $3/unit/mo
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Container>

        <Container
          maxWidth="lg"
          sx={{
            px: { xs: 2, md: 3 },
            maxWidth: "1200px !important",
            pt: 4,
            textAlign: "center",
          }}
        >
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

      <PublicFooter />
    </Box>
  );
}

