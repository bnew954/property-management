import React, { useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import PublicFooter from '../components/PublicFooter';
import PublicNavBar from '../components/PublicNavBar';

export default function About() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const mutedText = 'rgba(255, 255, 255, 0.6)';


  const roadmap = [
    'Plaid bank integration â€” connect accounts and auto-import transactions',
    'AI maintenance triage â€” auto-categorize, prioritize, and route requests',
    'Listing syndication â€” push vacancies to Zillow, Apartments.com, and more',
    'Mobile app â€” manage your portfolio from anywhere',
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0f', color: '#fff' }}>
      <PublicNavBar />

      <Container maxWidth="lg" sx={{ pt: 16, pb: 10, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff' }}>
          Built Different. Built to Win.
        </Typography>
        <Typography
          variant="body1"
          sx={{
            mt: 2,
            color: mutedText,
            maxWidth: '700px',
            mx: 'auto',
          }}
        >
          Built from scratch with modern technology, AI-native intelligence, and a pricing model
          that puts landlords first.
        </Typography>
      </Container>

      <Container maxWidth="md" sx={{ py: 10 }}>
        <Grid container spacing={8} alignItems="center">
          <Grid item xs={12} md={6}>
            <Chip
              label="OUR MISSION"
              sx={{
                fontWeight: 700,
                color: '#7C5CFC',
                backgroundColor: 'rgba(124, 92, 252, 0.15)',
              }}
            />
            <Typography
              variant="h5"
              sx={{ mt: 2, fontWeight: 700, color: '#fff' }}
            >
              Professional Tools Should Be Accessible
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mt: 2,
                color: mutedText,
                lineHeight: 1.8,
              }}
            >
              Property management software has traditionally been expensive â€” especially for small and
              mid-size landlords who need the same core functionality as large operators. We built Onyx PM to
              change that equation.
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, color: mutedText, lineHeight: 1.8 }}>
              Our core platform is free. Not freemium with feature gates â€” genuinely free. Unlimited
              properties, unlimited units, full functionality. We offer optional premium services like advanced
              accounting and payment processing for landlords who need them, priced fairly and transparently.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} />
        </Grid>
      </Container>

      <Container maxWidth="md" sx={{ py: 10, textAlign: 'center' }}>
        <Chip
          label="OUR STORY"
          sx={{
            fontWeight: 700,
            color: '#7C5CFC',
            backgroundColor: 'rgba(124, 92, 252, 0.15)',
          }}
        />
        <Typography
          variant="h5"
          sx={{ mt: 2, color: '#fff', fontWeight: 700 }}
        >
          Made in Tennessee
        </Typography>
        <Typography
          variant="body1"
          sx={{
            mt: 2,
            color: mutedText,
            lineHeight: 1.8,
            maxWidth: '600px',
            mx: 'auto',
          }}
        >
          We&apos;re a fast growing team based in Tennessee, applying modern technology and AI to
          an industry that hasn&apos;t seen real innovation in years.
        </Typography>
        <Typography
          variant="body1"
          sx={{ mt: 2, color: mutedText, lineHeight: 1.8, maxWidth: '600px', mx: 'auto' }}
        >
          We&apos;re building in public, shipping fast, and just getting started.
        </Typography>
      </Container>

      <Container maxWidth="md" sx={{ py: 10 }}>
        <Typography
          variant="h5"
          sx={{ mb: 4, textAlign: 'center', color: '#fff', fontWeight: 700 }}
        >
          What&apos;s Next
        </Typography>
        <Box sx={{ maxWidth: 760, mx: 'auto' }}>
          {roadmap.map((item, index) => (
            <Box key={item} sx={{ display: 'flex', gap: 2, mb: index === roadmap.length - 1 ? 0 : 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#7C5CFC' }} />
                {index !== roadmap.length - 1 && (
                  <Box sx={{ mt: 1, width: '2px', flex: 1, backgroundColor: 'rgba(124,92,252,0.3)' }} />
                )}
              </Box>
              <Typography variant="body1" sx={{ color: mutedText }}>
                {item}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>

      <Container maxWidth="md" sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#fff' }}>
          Ready to try the future of property management?
        </Typography>
        <Button
          component={Link}
          to="/register"
          variant="contained"
          sx={{
            mt: 3,
            backgroundColor: '#7C5CFC',
            '&:hover': { backgroundColor: '#6b4af2' },
          }}
        >
          Get Started Free
        </Button>
      </Container>

      <PublicFooter />
    </Box>
  );
}
