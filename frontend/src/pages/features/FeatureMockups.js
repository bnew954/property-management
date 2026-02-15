import * as MuiIcons from "@mui/icons-material";
import { Box, Button, Chip, Typography } from "@mui/material";

const muted = "rgba(255,255,255,0.35)";
const dim = "rgba(255,255,255,0.2)";
const panelBg = "rgba(255,255,255,0.02)";
const rowBg = "rgba(255,255,255,0.03)";
const cardBorder = "1px solid rgba(255,255,255,0.06)";
const chipSx = {
  height: "20px",
  fontSize: "0.6rem",
  fontWeight: 600,
};

function Shell({ children }) {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        p: 2.5,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        color: "#fff",
      }}
    >
      {children}
    </Box>
  );
}

export function ListingsDashboard() {
  const listings = [
    "Harbor View 2BR",
    "Downtown Loft",
    "Sunset Studio",
    "Park Place 3BR",
  ];
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 600 }}>
        Dashboard
      </Typography>
      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)" }}>
        Listings overview
      </Typography>
      <Box sx={{ display: "flex", gap: 1.2, flex: 1, minHeight: 0 }}>
        <Box sx={{ width: 170, borderRight: cardBorder, pr: 1 }}>
          <Typography variant="caption" sx={{ color: muted, fontWeight: 600, display: "block", mb: 1 }}>
            LISTINGS
          </Typography>
          {listings.map((item, index) => (
            <Box
              key={item}
              sx={{
                p: 1,
                borderRadius: "6px",
                backgroundColor: index === 0 ? "rgba(124,92,252,0.15)" : "transparent",
                mb: 0.8,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: index === 0 ? "#7C5CFC" : muted,
                  fontWeight: index === 0 ? 700 : 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "block",
                }}
              >
                {item}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: "#fff", fontWeight: 700, display: "block" }}>
            Harbor View 2BR · $1,850/mo
          </Typography>
          <Box sx={{ mt: 1, height: "96px", borderRadius: "8px", border: cardBorder, backgroundColor: panelBg }} />
          <Box sx={{ display: "flex", gap: 0.6, mt: 1, flexWrap: "wrap" }}>
            <Chip size="small" label="2 Bed" sx={{ ...chipSx, backgroundColor: "rgba(255,255,255,0.05)", color: muted }} />
            <Chip size="small" label="1 Bath" sx={{ ...chipSx, backgroundColor: "rgba(255,255,255,0.05)", color: muted }} />
            <Chip size="small" label="850 sqft" sx={{ ...chipSx, backgroundColor: "rgba(255,255,255,0.05)", color: muted }} />
            <Chip size="small" label="Listed" sx={{ ...chipSx, backgroundColor: "rgba(39,202,64,0.15)", color: "#27ca40" }} />
          </Box>
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ display: "block", color: muted }}>
              3 beds • 1 bath • Updated 2 hours ago
            </Typography>
            <Typography variant="caption" sx={{ display: "block", color: muted, mt: 0.8 }}>
              Welcome package included · Walk-in closets · Roof deck access
            </Typography>
          </Box>
        </Box>
      </Box>
    </Shell>
  );
}

export function ListingPagePreview() {
  return (
    <Shell>
      <Box sx={{ px: 1, py: 0.8, border: cardBorder, borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.03)" }}>
        <Typography variant="caption" sx={{ color: muted }}>
          onyx-pm.com/listing/harbor-view-2br
        </Typography>
      </Box>
      <Box sx={{ mt: 1.2 }}>
        <Typography variant="caption" sx={{ color: "#fff", fontWeight: 700 }}>
          Harbor View Apartments - 2BR
        </Typography>
        <Typography variant="caption" sx={{ color: "#27ca40", fontWeight: 700, display: "block" }}>
          $1,850/mo
        </Typography>
      </Box>
      <Box sx={{ mt: 1, height: "110px", borderRadius: "8px", border: cardBorder, backgroundColor: panelBg }} />
      <Box sx={{ mt: 1, display: "flex", gap: 0.6, flexWrap: "wrap" }}>
        <Chip size="small" label="2 Bed" sx={{ ...chipSx, backgroundColor: "rgba(255,255,255,0.05)", color: muted }} />
        <Chip size="small" label="1 Bath" sx={{ ...chipSx, backgroundColor: "rgba(255,255,255,0.05)", color: muted }} />
        <Chip size="small" label="850 sqft" sx={{ ...chipSx, backgroundColor: "rgba(255,255,255,0.05)", color: muted }} />
      </Box>
      <Box sx={{ mt: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography variant="caption" sx={{ color: muted }}>
          Open house Tue · 2:00 PM
        </Typography>
        <Button size="small" variant="contained" sx={{ borderRadius: "8px", minHeight: 28, backgroundColor: "#7C5CFC" }}>
          Apply Now
        </Button>
      </Box>
    </Shell>
  );
}

export function SyndicationDashboard() {
  const rows = [
    { platform: "Zillow", listings: "6", status: "Connected", color: "#27ca40" },
    { platform: "Apartments.com", listings: "6", status: "Connected", color: "#27ca40" },
    { platform: "Realtor.com", listings: "4", status: "Pending", color: "#ffbd2e" },
  ];
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Syndication Status
      </Typography>
      <Box sx={{ border: cardBorder, borderRadius: "8px", p: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="caption" sx={{ color: muted, width: "40%" }}>
            Platform
          </Typography>
          <Typography variant="caption" sx={{ color: muted, width: "25%" }}>
            Listings
          </Typography>
          <Typography variant="caption" sx={{ color: muted, width: "35%", textAlign: "right" }}>
            Status
          </Typography>
        </Box>
        {rows.map((row) => (
          <Box
            key={row.platform}
            sx={{
              mt: 0.7,
              display: "flex",
              justifyContent: "space-between",
              px: 1,
              py: 0.6,
              borderRadius: "6px",
              backgroundColor: rowBg,
            }}
          >
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", width: "40%" }}>
              {row.platform}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", width: "25%" }}>
              {row.listings}
            </Typography>
            <Chip
              size="small"
              label={row.status}
              sx={{ ...chipSx, backgroundColor: `rgba(${row.color === "#27ca40" ? "39,202,64" : "255,189,46"},0.2)`, color: row.color }}
            />
          </Box>
        ))}
      </Box>
      <Typography variant="caption" sx={{ color: muted }}>
        6 listings syndicated to 3 platforms
      </Typography>
    </Shell>
  );
}

export function LeadPipeline() {
  const stages = [
    { name: "Inquiry", count: 8, items: ["Alex R.", "Nina P.", "Devon K."] },
    { name: "Tour Scheduled", count: 3, items: ["Mia H.", "Noah S."] },
    { name: "Applied", count: 5, items: ["Liam V.", "Jules K."] },
    { name: "Leased", count: 12, items: ["Omar J.", "Tina C."] },
  ];
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Lead Pipeline
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 1, flex: 1 }}>
        {stages.map((stage) => (
          <Box key={stage.name} sx={{ border: cardBorder, borderRadius: "8px", p: 1, minWidth: 0 }}>
            <Chip
              size="small"
              label={`${stage.name} (${stage.count})`}
              sx={{ ...chipSx, mb: 1, backgroundColor: "rgba(124,92,252,0.18)", color: "#7C5CFC", width: "100%" }}
            />
            {stage.items.map((person) => (
              <Box
                key={person}
                sx={{
                  mt: 0.7,
                  px: 0.9,
                  py: 0.5,
                  borderRadius: "6px",
                  backgroundColor: rowBg,
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                <Typography variant="caption" sx={{ display: "block", color: "rgba(255,255,255,0.45)" }}>
                  {person}
                </Typography>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Shell>
  );
}

export function LeasingPipeline() {
  const rows = [
    { applicant: "Sarah Chen", unit: "Unit 101", date: "Feb 10", status: "Review" },
    { applicant: "James Wilson", unit: "Unit 204", date: "Feb 8", status: "Screening" },
    { applicant: "Maria Garcia", unit: "Unit 305", date: "Feb 5", status: "Approved" },
    { applicant: "Alex Kim", unit: "Unit 102", date: "Feb 1", status: "Lease Sent" },
  ];
  return (
    <Shell>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
          Applications
        </Typography>
        <Box sx={{ display: "flex", gap: 0.6 }}>
          <Chip size="small" label="Active" sx={{ ...chipSx, backgroundColor: "rgba(39,202,64,0.18)", color: "#27ca40" }} />
          <Chip size="small" label="Review" sx={{ ...chipSx, backgroundColor: "rgba(124,92,252,0.15)", color: "#7C5CFC" }} />
        </Box>
      </Box>
      <Box sx={{ border: cardBorder, borderRadius: "8px", p: 1 }}>
        {rows.map((row) => (
          <Box
            key={row.applicant}
            sx={{ display: "flex", justifyContent: "space-between", mb: 0.7, backgroundColor: rowBg, p: 0.7, borderRadius: "6px" }}
          >
            <Typography variant="caption" sx={{ width: "33%", color: "rgba(255,255,255,0.55)" }}>
              {row.applicant}
            </Typography>
            <Typography variant="caption" sx={{ width: "24%", color: dim }}>
              {row.unit}
            </Typography>
            <Typography variant="caption" sx={{ width: "20%", color: dim }}>
              {row.date}
            </Typography>
            <Chip
              size="small"
              label={row.status}
              sx={{
                ...chipSx,
                backgroundColor:
                  row.status === "Review"
                    ? "rgba(124,92,252,0.15)"
                    : row.status === "Screening"
                    ? "rgba(66,165,245,0.16)"
                    : row.status === "Approved"
                    ? "rgba(39,202,64,0.15)"
                    : "rgba(255,189,46,0.16)",
                color:
                  row.status === "Review"
                    ? "#7C5CFC"
                    : row.status === "Screening"
                    ? "#42a5f5"
                    : row.status === "Approved"
                    ? "#27ca40"
                    : "#ffbd2e",
              }}
            />
          </Box>
        ))}
      </Box>
    </Shell>
  );
}

export function ApplicationForm() {
  const steps = ["Personal", "Residence", "Employment", "References", "Review"];
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Multi-step Application Form
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.6, mt: 0.2 }}>
        {steps.map((step, index) => (
          <Box key={step} sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 0.4 }}>
              <Typography
                variant="caption"
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: index === 2 ? "#7C5CFC" : "rgba(255,255,255,0.1)",
                  color: index <= 2 ? "#fff" : "rgba(255,255,255,0.4)",
                  fontSize: "0.62rem",
                }}
              >
                {index + 1}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ display: "block", textAlign: "center", color: index === 2 ? "#fff" : muted }}>
              {step}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ mt: 0.8, border: cardBorder, borderRadius: "8px", p: 1.2 }}>
        <Typography variant="caption" sx={{ color: "#fff", fontWeight: 700 }}>
          Step 3 • Employment
        </Typography>
        <Box sx={{ mt: 0.8 }}>
          <Typography variant="caption" sx={{ color: muted, display: "block" }}>
            Employer Name
          </Typography>
          <Box sx={{ mt: 0.5, height: 20, borderRadius: "6px", border: cardBorder, backgroundColor: rowBg }} />
        </Box>
        <Box sx={{ mt: 0.7 }}>
          <Typography variant="caption" sx={{ color: muted, display: "block" }}>
            Job Title
          </Typography>
          <Box sx={{ mt: 0.5, height: 20, borderRadius: "6px", border: cardBorder, backgroundColor: rowBg }} />
        </Box>
        <Box sx={{ mt: 0.7 }}>
          <Typography variant="caption" sx={{ color: muted, display: "block" }}>
            Annual Income
          </Typography>
          <Box sx={{ mt: 0.5, height: 20, borderRadius: "6px", border: cardBorder, backgroundColor: rowBg }} />
        </Box>
        <Box sx={{ mt: 0.7 }}>
          <Typography variant="caption" sx={{ color: muted, display: "block" }}>
            Employment Duration
          </Typography>
          <Box sx={{ mt: 0.5, height: 20, borderRadius: "6px", border: cardBorder, backgroundColor: rowBg }} />
        </Box>
      </Box>
      <Button
        size="small"
        sx={{ mt: "auto", alignSelf: "flex-start", borderRadius: "8px", backgroundColor: "#7C5CFC", color: "#fff" }}
      >
        Next
      </Button>
    </Shell>
  );
}

export function LeaseWorkflow() {
  const steps = ["Created", "Document", "Sent", "Tenant Signed", "Landlord Sign", "Active"];
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Lease Workflow
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.4, mt: 0.4, width: "100%" }}>
        {steps.map((step, index) => (
          <Box key={step} sx={{ display: "flex", alignItems: "center", gap: 0.4, flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.5rem",
                backgroundColor: index <= 3 ? "#7C5CFC" : "rgba(255,255,255,0.14)",
                color: "#fff",
              }}
            >
              {index <= 3 ? "✓" : ""}
            </Typography>
            <Typography variant="caption" sx={{ color: index === 3 ? "#fff" : muted, whiteSpace: "nowrap" }}>
              {step}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ mt: 1, border: cardBorder, borderRadius: "8px", p: 1.2 }}>
        <Typography variant="caption" sx={{ color: "#fff", fontWeight: 700 }}>
          Lease #1042 · Unit 101 · Sarah Chen
        </Typography>
        <Typography variant="caption" sx={{ color: "#ffbd2e", mt: 0.8, display: "block" }}>
          Awaiting tenant signature
        </Typography>
      </Box>
      <Button
        size="small"
        sx={{ mt: "auto", alignSelf: "flex-start", borderRadius: "8px", backgroundColor: "#7C5CFC", color: "#fff", width: 120 }}
      >
        Send Reminder
      </Button>
    </Shell>
  );
}

export function LeaseSigningView() {
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Digital Signing
      </Typography>
      <Box sx={{ mt: 0.5, border: cardBorder, borderRadius: "8px", p: 1, flex: 1, minHeight: 0 }}>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
          Residential Lease · Unit 101
        </Typography>
        <Box sx={{ mt: 0.8, height: "130px", borderRadius: "8px", border: cardBorder, backgroundColor: panelBg, p: 1 }}>
          <Typography variant="caption" sx={{ color: dim, display: "block" }}>
            Document text placeholder...
          </Typography>
          {Array.from({ length: 6 }).map((_, i) => (
            <Typography key={i} variant="caption" sx={{ display: "block", color: dim }}>
              Signature page section {i + 1}
            </Typography>
          ))}
        </Box>
        <Box sx={{ mt: 1.2 }}>
          <Typography variant="caption" sx={{ color: muted }}>
            Tenant Signature
          </Typography>
          <Box sx={{ mt: 0.5, borderBottom: "1px solid rgba(255,255,255,0.2)", p: 0.5 }} />
          <Typography variant="caption" sx={{ color: "#27ca40", mt: 0.4, display: "block" }}>
            Signed by Tenant: Feb 12, 2026
          </Typography>
        </Box>
      </Box>
      <Button
        size="small"
        sx={{ mt: 1, alignSelf: "flex-start", borderRadius: "8px", backgroundColor: "#7C5CFC", color: "#fff" }}
      >
        Sign Lease
      </Button>
    </Shell>
  );
}

export function PaymentsDashboard() {
  const cards = [
    { label: "Collected This Month", value: "$12,400", color: "#27ca40" },
    { label: "Outstanding", value: "$3,200", color: "rgba(255,255,255,0.6)" },
    { label: "Overdue", value: "$800", color: "#ff5f56" },
  ];
  const payments = [
    { name: "Sarah Chen", amount: "$1,500", date: "Mar 10", status: "posted" },
    { name: "Jules Park", amount: "$1,200", date: "Mar 09", status: "posted" },
    { name: "Noah Quinn", amount: "$1,500", date: "Mar 08", status: "posted" },
  ];
  return (
    <Shell>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1 }}>
        {cards.map((card) => (
          <Box
            key={card.label}
            sx={{ border: cardBorder, borderRadius: "8px", p: 1, backgroundColor: panelBg }}
          >
            <Typography variant="caption" sx={{ color: muted }}>
              {card.label}
            </Typography>
            <Typography variant="caption" sx={{ color: card.color, fontWeight: 700, display: "block" }}>
              {card.value}
            </Typography>
          </Box>
        ))}
      </Box>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700, mt: 0.2 }}>
        Recent Payments
      </Typography>
      <Box sx={{ mt: 0.8, border: cardBorder, borderRadius: "8px", p: 1 }}>
        {payments.map((payment) => (
          <Box
            key={payment.name}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mt: 0.6,
              backgroundColor: rowBg,
              borderRadius: "6px",
              p: 0.7,
            }}
          >
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", width: "35%" }}>
              {payment.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "#27ca40", width: "28%" }}>
              {payment.amount}
            </Typography>
            <Typography variant="caption" sx={{ color: dim, width: "20%" }}>
              {payment.date}
            </Typography>
            <Chip size="small" label={payment.status} sx={{ ...chipSx, backgroundColor: "rgba(39,202,64,0.15)", color: "#27ca40" }} />
          </Box>
        ))}
      </Box>
    </Shell>
  );
}

export function TenantPayPortal() {
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Pay Rent
      </Typography>
      <Box sx={{ mt: 1.2, border: cardBorder, borderRadius: "8px", p: 1 }}>
        <Typography variant="caption" sx={{ color: muted }}>
          Balance due
        </Typography>
        <Typography variant="caption" sx={{ color: "#27ca40", fontWeight: 700, fontSize: "1rem", display: "block", mt: 0.4 }}>
          $1,500.00
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", mt: 0.8, display: "block" }}>
          Harbor View - Unit 101
        </Typography>
        <Typography variant="caption" sx={{ color: muted, mt: 0.6, display: "block" }}>
          Payment method: card ending • 4242
        </Typography>
      </Box>
      <Button
        size="small"
        sx={{ mt: "auto", alignSelf: "flex-start", borderRadius: "8px", backgroundColor: "#7C5CFC", color: "#fff", width: 120 }}
      >
        Pay Now
      </Button>
    </Shell>
  );
}

export function AutoBookkeeping() {
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Journal Entry #1082 · Auto-Posted
      </Typography>
      <Typography variant="caption" sx={{ color: muted, mt: 0.7, display: "block" }}>
        Source: Rent Payment - Unit 101
      </Typography>
      <Box sx={{ mt: 0.8, border: cardBorder, borderRadius: "8px", p: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.6 }}>
          <Typography variant="caption" sx={{ color: muted, width: "45%" }}>
            Account
          </Typography>
          <Typography variant="caption" sx={{ color: muted, width: "25%", textAlign: "right" }}>
            Debit
          </Typography>
          <Typography variant="caption" sx={{ color: muted, width: "25%", textAlign: "right" }}>
            Credit
          </Typography>
        </Box>
        <Box sx={{ backgroundColor: rowBg, p: 0.7, borderRadius: "6px" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", width: "45%" }}>
              1020 Cash in Bank
            </Typography>
            <Typography variant="caption" sx={{ color: "#27ca40", width: "25%", textAlign: "right" }}>
              $1,500
            </Typography>
            <Typography variant="caption" sx={{ color: muted, width: "25%", textAlign: "right" }}>
              -
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", width: "45%" }}>
              4100 Rental Income
            </Typography>
            <Typography variant="caption" sx={{ color: muted, width: "25%", textAlign: "right" }}>
              -
            </Typography>
            <Typography variant="caption" sx={{ color: "#27ca40", width: "25%", textAlign: "right" }}>
              $1,500
            </Typography>
          </Box>
        </Box>
      </Box>
      <Chip label="Posted" size="small" sx={{ ...chipSx, mt: 0.8, backgroundColor: "rgba(39,202,64,0.15)", color: "#27ca40", width: "fit-content" }} />
    </Shell>
  );
}

export function RentLedger() {
  const rows = [
    { date: "Feb 1", description: "Monthly Rent", charge: "$1,500", payment: "-", balance: "$1,500" },
    { date: "Feb 5", description: "Online Payment", charge: "-", payment: "$1,500", balance: "$0" },
    { date: "Mar 1", description: "Monthly Rent", charge: "$1,500", payment: "-", balance: "$1,500" },
  ];
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Rent Ledger · Sarah Chen · Unit 101
      </Typography>
      <Box sx={{ mt: 1, border: cardBorder, borderRadius: "8px", p: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.8 }}>
          {['Date', 'Description', 'Charge', 'Payment', 'Balance'].map((column) => (
            <Typography key={column} variant="caption" sx={{ color: muted, width: '20%' }}>
              {column}
            </Typography>
          ))}
        </Box>
        {rows.map((row) => (
          <Box
            key={row.date}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mt: 0.6,
              backgroundColor: rowBg,
              borderRadius: "6px",
              p: 0.6,
            }}
          >
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", width: "20%" }}>
              {row.date}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", width: "20%" }}>
              {row.description}
            </Typography>
            <Typography variant="caption" sx={{ color: muted, width: "20%" }}>
              {row.charge}
            </Typography>
            <Typography variant="caption" sx={{ color: "#27ca40", width: "20%" }}>
              {row.payment}
            </Typography>
            <Typography variant="caption" sx={{ color: muted, width: "20%" }}>
              {row.balance}
            </Typography>
          </Box>
        ))}
      </Box>
    </Shell>
  );
}

export function ScreeningDashboard() {
  const rows = [
    { applicant: "Sarah Chen", unit: "Unit 101", status: "Completed", date: "Feb 10" },
    { applicant: "James Wilson", unit: "Unit 204", status: "Pending Consent", date: "Feb 11" },
    { applicant: "Maria Garcia", unit: "Unit 305", status: "In Progress", date: "Feb 12" },
  ];
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Screening Requests
      </Typography>
      <Box sx={{ mt: 1, border: cardBorder, borderRadius: "8px", p: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.8 }}>
          <Typography variant="caption" sx={{ color: muted, width: "32%" }}>
            Applicant
          </Typography>
          <Typography variant="caption" sx={{ color: muted, width: "26%" }}>
            Unit
          </Typography>
          <Typography variant="caption" sx={{ color: muted, width: "30%" }}>
            Status
          </Typography>
          <Typography variant="caption" sx={{ color: muted, width: "20%" }}>
            Date
          </Typography>
        </Box>
        {rows.map((row) => (
          <Box
            key={row.applicant}
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 0.7, borderRadius: "6px", backgroundColor: rowBg, mb: 0.6 }}
          >
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", width: "32%" }}>
              {row.applicant}
            </Typography>
            <Typography variant="caption" sx={{ color: muted, width: "26%" }}>
              {row.unit}
            </Typography>
            <Chip
              size="small"
              label={row.status}
              sx={{
                ...chipSx,
                backgroundColor:
                  row.status === "Completed"
                    ? "rgba(39,202,64,0.15)"
                    : row.status === "Pending Consent"
                    ? "rgba(255,189,46,0.15)"
                    : "rgba(66,165,245,0.15)",
                color:
                  row.status === "Completed"
                    ? "#27ca40"
                    : row.status === "Pending Consent"
                    ? "#ffbd2e"
                    : "#42a5f5",
                width: "30%",
              }}
            />
            <Typography variant="caption" sx={{ color: muted, width: "20%", textAlign: "right" }}>
              {row.date}
            </Typography>
          </Box>
        ))}
      </Box>
    </Shell>
  );
}

export function ConsentPortal() {
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Tenant Screening Authorization
      </Typography>
      <Box sx={{ border: cardBorder, borderRadius: "8px", p: 1, mt: 1 }}>
        <Typography variant="caption" sx={{ color: muted, display: "block" }}>
          Disclosure lines appear here
        </Typography>
        <Box sx={{ mt: 0.8, p: 0.8, borderRadius: "6px", backgroundColor: panelBg }}>
          <Typography variant="caption" sx={{ color: dim, display: "block" }}>
            You authorize background and credit checks...
          </Typography>
          <Typography variant="caption" sx={{ color: dim, display: "block", mt: 0.6 }}>
            I understand my information is used only for tenant screening.
          </Typography>
        </Box>
      </Box>
      <Box sx={{ mt: 0.8, display: "flex", gap: 0.6, alignItems: "center" }}>
        <MuiIcons.CheckCircle sx={{ fontSize: 14, color: "#7C5CFC" }} />
        <Typography variant="caption" sx={{ color: muted }}>I authorize background and credit check</Typography>
      </Box>
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" sx={{ color: muted, display: "block" }}>SSN</Typography>
        <Box sx={{ mt: 0.5, px: 1, py: 0.7, borderRadius: "6px", border: cardBorder, color: dim }}>
          ●●●-●●-●●●●
        </Box>
      </Box>
      <Button size="small" sx={{ mt: 1, alignSelf: "flex-start", borderRadius: "8px", backgroundColor: "#7C5CFC", color: "#fff" }}>
        Submit Consent
      </Button>
    </Shell>
  );
}

export function ScreeningResults() {
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Screening Results · Sarah Chen
      </Typography>
      <Box sx={{ mt: 1, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1 }}>
        <Box sx={{ border: cardBorder, borderRadius: "8px", p: 1 }}>
          <Typography variant="caption" sx={{ color: muted }}>Credit Score</Typography>
          <Typography variant="caption" sx={{ color: "#27ca40", fontWeight: 700 }}>720</Typography>
        </Box>
        <Box sx={{ border: cardBorder, borderRadius: "8px", p: 1 }}>
          <Typography variant="caption" sx={{ color: muted }}>Background</Typography>
          <Typography variant="caption" sx={{ color: "#27ca40", fontWeight: 700 }}>Clear</Typography>
        </Box>
        <Box sx={{ border: cardBorder, borderRadius: "8px", p: 1 }}>
          <Typography variant="caption" sx={{ color: muted }}>Eviction History</Typography>
          <Typography variant="caption" sx={{ color: "#27ca40", fontWeight: 700 }}>None</Typography>
        </Box>
      </Box>
      <Box sx={{ mt: "auto", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", p: 0.8 }}>
        <Typography variant="caption" sx={{ color: "#fff", fontWeight: 700 }}>Approve Applicant</Typography>
      </Box>
    </Shell>
  );
}

export function ComplianceLog() {
  const events = [
    "Consent submitted: Feb 10, 2:34 PM",
    "Screening initiated: Feb 10, 2:35 PM",
    "Results received: Feb 10, 3:12 PM",
    "Applicant approved: Feb 11, 9:00 AM",
  ];
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Compliance Trail
      </Typography>
      <Box sx={{ border: cardBorder, borderRadius: "8px", p: 1, mt: 0.8 }}>
        {events.map((event) => (
          <Box key={event} sx={{ display: "flex", gap: 0.8, alignItems: "flex-start", mb: 0.8 }}>
            <MuiIcons.CheckCircle sx={{ color: "#27ca40", fontSize: 12, mt: "2px" }} />
            <Typography variant="caption" sx={{ color: muted }}>
              {event}
            </Typography>
          </Box>
        ))}
      </Box>
    </Shell>
  );
}

export function MaintenanceDashboard() {
  const requests = [
    { unit: "101", issue: "Leaking faucet", priority: "High", status: "Open" },
    { unit: "204", issue: "Heating issue", priority: "Medium", status: "In Progress" },
    { unit: "312", issue: "Garage door", priority: "Low", status: "Scheduled" },
  ];
  return (
    <Shell>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
          Maintenance Requests
        </Typography>
        <Chip size="small" label="3 Open" sx={{ ...chipSx, backgroundColor: "rgba(255,189,46,0.15)", color: "#ffbd2e" }} />
      </Box>
      <Box sx={{ mt: 1, border: cardBorder, borderRadius: "8px", p: 1 }}>
        {requests.map((request) => (
          <Box
            key={request.unit}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 0.6,
              borderRadius: "6px",
              backgroundColor: rowBg,
              mb: 0.6,
            }}
          >
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", width: "32%" }}>
              Unit {request.unit}
            </Typography>
            <Typography variant="caption" sx={{ color: muted, width: "33%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {request.issue}
            </Typography>
            <Chip
              size="small"
              label={request.priority}
              sx={{
                ...chipSx,
                backgroundColor:
                  request.priority === "High"
                    ? "rgba(255,95,86,0.16)"
                    : request.priority === "Medium"
                    ? "rgba(255,189,46,0.16)"
                    : "rgba(66,165,245,0.16)",
                color:
                  request.priority === "High"
                    ? "#ff5f56"
                    : request.priority === "Medium"
                    ? "#ffbd2e"
                    : "#42a5f5",
                width: "20%",
              }}
            />
            <Chip
              size="small"
              label={request.status}
              sx={{ ...chipSx, backgroundColor: "rgba(124,92,252,0.15)", color: "#7C5CFC", width: "20%" }}
            />
          </Box>
        ))}
      </Box>
    </Shell>
  );
}

export function RequestSubmission() {
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Submit Maintenance Request
      </Typography>
      <Box sx={{ border: cardBorder, borderRadius: "8px", p: 1, mt: 0.8 }}>
        <Typography variant="caption" sx={{ color: dim }}>Unit</Typography>
        <Box sx={{ mt: 0.5, height: 20, borderRadius: "6px", border: cardBorder, backgroundColor: rowBg }} />
        <Typography variant="caption" sx={{ color: dim, mt: 0.6, display: "block" }}>Priority</Typography>
        <Box sx={{ mt: 0.5, height: 20, borderRadius: "6px", border: cardBorder, backgroundColor: rowBg }} />
        <Typography variant="caption" sx={{ color: dim, mt: 0.6, display: "block" }}>Description</Typography>
        <Box sx={{ mt: 0.5, height: 46, borderRadius: "6px", border: cardBorder, backgroundColor: rowBg }} />
        <Box sx={{ mt: 0.6, border: "1px dashed rgba(255,255,255,0.25)", borderRadius: "6px", p: 0.8 }}>
          <Typography variant="caption" sx={{ color: dim }}>Photo upload area</Typography>
        </Box>
      </Box>
      <Button size="small" sx={{ mt: 1, alignSelf: "flex-start", borderRadius: "8px", backgroundColor: "#7C5CFC", color: "#fff" }}>
        Submit Request
      </Button>
    </Shell>
  );
}

export function RequestManagement() {
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Unit 101 · Leaking faucet
      </Typography>
      <Box sx={{ mt: 0.8, border: cardBorder, borderRadius: "8px", p: 1 }}>
        <Chip size="small" label="High" sx={{ ...chipSx, backgroundColor: "rgba(255,95,86,0.15)", color: "#ff5f56" }} />
        <Chip
          size="small"
          label="In Progress"
          sx={{ ...chipSx, ml: 0.6, backgroundColor: "rgba(255,189,46,0.15)", color: "#ffbd2e" }}
        />
        <Typography variant="caption" sx={{ color: muted, mt: 1, display: "block" }}>Timeline</Typography>
        <Box sx={{ display: "flex", gap: 0.5, mt: 0.6 }}>
          {['Submitted', 'Reviewed', 'Assigned', 'In Progress', 'Complete'].map((step, index) => (
            <Box key={step} sx={{ flex: 1, textAlign: "center" }}>
              <Typography
                variant="caption"
                sx={{
                  color: index < 3 ? '#7C5CFC' : muted,
                  display: 'block',
                  fontWeight: 600,
                }}
              >
                {index + 1}
              </Typography>
              <Typography variant="caption" sx={{ color: muted, mt: 0.5 }}>
                {step}
              </Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="caption" sx={{ color: muted, mt: 1, display: "block" }}>Notes</Typography>
        <Box sx={{ mt: 0.5, p: 0.8, borderRadius: "6px", backgroundColor: rowBg }}>
          <Typography variant="caption" sx={{ color: dim }}>
            Tenant reports slow leak, parts requested.
          </Typography>
        </Box>
      </Box>
    </Shell>
  );
}

export function MaintenanceHistory() {
  const items = [
    "Dishwasher replacement · Unit 102 · Feb 8 · 3 days",
    "Paint hallway · Unit 201 · Feb 5 · 1 day",
    "Fix window latch · Unit 305 · Jan 28 · 2 days",
  ];
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Completed Requests
      </Typography>
      <Box sx={{ mt: 0.8, border: cardBorder, borderRadius: "8px", p: 1 }}>
        {items.map((item) => (
          <Typography key={item} variant="caption" sx={{ display: "block", mb: 0.8, color: dim }}>
            {item}
          </Typography>
        ))}
      </Box>
    </Shell>
  );
}


export function AccountingCOA() {
  const rows = [
    { name: '1000 Assets', value: '$75,800', strong: true },
    { name: '1010 Cash on Hand', value: '$2,400', indent: 1 },
    { name: '1020 Cash in Bank', value: '$45,200', indent: 1 },
    { name: '1100 Accounts Receivable', value: '$3,200', indent: 1 },
    { name: '2000 Liabilities', value: '$22,100', strong: true },
    { name: '4100 Rental Income', value: '$24,000', indent: 1 },
    { name: '4200 Application Fees', value: '$450', indent: 1 },
    { name: '5000 Expenses', value: '$2,350', strong: true },
    { name: '5020 Repairs', value: '$1,200', indent: 1 },
  ];
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Chart of Accounts
      </Typography>
      <Box sx={{ mt: 0.6, border: cardBorder, borderRadius: "8px", p: 1, overflow: "hidden" }}>
        {rows.map((row) => (
          <Box
            key={row.name}
            sx={{
              mt: 0.5,
              p: 0.6,
              borderRadius: "6px",
              backgroundColor: rowBg,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="caption" sx={{ color: row.strong ? '#fff' : muted, pl: row.indent ? row.indent * 1.5 : 0 }}>
              {row.name}
            </Typography>
            <Typography variant="caption" sx={{ color: muted }}>
              {row.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Shell>
  );
}

export function FinancialReports() {
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Profit & Loss · January 2026
      </Typography>
      <Box sx={{ mt: 0.8, border: cardBorder, borderRadius: "8px", p: 1 }}>
        <Typography variant="caption" sx={{ color: dim }}>Revenue</Typography>
        <Typography variant="caption" sx={{ color: '#27ca40', mt: 0.5, display: 'block' }}>Rental Income $24,000</Typography>
        <Typography variant="caption" sx={{ color: '#27ca40', display: 'block' }}>Application Fees $450</Typography>
        <Typography variant="caption" sx={{ color: '#fff', mt: 1, display: 'block' }}>Total Revenue $24,450</Typography>
      </Box>
      <Box sx={{ mt: 0.8, border: cardBorder, borderRadius: "8px", p: 1 }}>
        <Typography variant="caption" sx={{ color: dim }}>Expenses</Typography>
        <Typography variant="caption" sx={{ color: '#ff5f56', display: 'block', mt: 0.5 }}>Repairs -$1,200</Typography>
        <Typography variant="caption" sx={{ color: '#ff5f56', display: 'block' }}>Insurance -$800</Typography>
        <Typography variant="caption" sx={{ color: '#ff5f56', display: 'block' }}>Utilities -$350</Typography>
        <Typography variant="caption" sx={{ color: '#fff', mt: 1, display: 'block' }}>Total Expenses -$2,350</Typography>
      </Box>
      <Typography variant="caption" sx={{ color: '#27ca40', fontWeight: 700, mt: 1, display: 'block' }}>
        Net Income $22,100
      </Typography>
    </Shell>
  );
}

export function BankImport() {
  const rows = [
    { date: 'Jan 5', desc: 'Rent Payment', amt: '+$1,500', category: '4100 Rental Income', status: 'Approved ✓' },
    { date: 'Jan 8', desc: 'Plumber', amt: '-$350', category: '5020 Repairs', status: 'Pending' },
    { date: 'Jan 10', desc: 'Insurance', amt: '-$800', category: 'Auto: 5040 Insurance', status: 'Auto ✓' },
  ];
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Import Review · chase_jan2026.csv
      </Typography>
      <Typography variant="caption" sx={{ color: dim, mt: 0.6, display: 'block' }}>
        Parsed rows: 47 • Auto-classified: 3
      </Typography>
      <Box sx={{ mt: 0.8, border: cardBorder, borderRadius: '8px', p: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
          {['Date', 'Description', 'Amount', 'Category', 'Status'].map((column) => (
            <Typography key={column} variant="caption" sx={{ color: muted, width: column === 'Category' ? '30%' : '18%' }}>
              {column}
            </Typography>
          ))}
        </Box>
        {rows.map((row) => (
          <Box
            key={row.date + row.desc}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              backgroundColor: rowBg,
              borderRadius: '6px',
              p: 0.6,
              mb: 0.6,
            }}
          >
            <Typography variant="caption" sx={{ color: muted, width: '18%' }}>{row.date}</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', width: '22%' }}>{row.desc}</Typography>
            <Typography variant="caption" sx={{ color: row.amt.startsWith('+') ? '#27ca40' : '#ff5f56', width: '16%' }}>{row.amt}</Typography>
            <Typography variant="caption" sx={{ color: muted, width: '30%' }}>{row.category}</Typography>
            <Chip
              size="small"
              label={row.status}
              sx={{
                ...chipSx,
                backgroundColor: row.status.includes('Approved') || row.status.includes('Auto')
                  ? 'rgba(39,202,64,0.15)'
                  : 'rgba(255,189,46,0.15)',
                color: row.status.includes('Approved') || row.status.includes('Auto') ? '#27ca40' : '#ffbd2e',
                width: '18%',
              }}
            />
          </Box>
        ))}
      </Box>
    </Shell>
  );
}

export function ReconciliationView() {
  return (
    <Shell>
      <Typography variant="caption" sx={{ color: muted, fontWeight: 700 }}>
        Reconciliation · 1020 Cash in Bank · January 2026
      </Typography>
      <Box sx={{ mt: 0.8, border: cardBorder, borderRadius: '8px', p: 1 }}>
        <Typography variant="caption" sx={{ color: '#27ca40' }}>Statement $45,200</Typography>
        <Typography variant="caption" sx={{ color: '#27ca40', display: 'block' }}>Book $45,200</Typography>
        <Typography variant="caption" sx={{ color: '#27ca40', display: 'block' }}>Difference $0.00</Typography>
      </Box>
      <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
        <Box sx={{ border: cardBorder, borderRadius: '8px', p: 0.8 }}>
          <Typography variant="caption" sx={{ color: muted }}>Bank (12 matched)</Typography>
          {["Feb 1 · Rent Payment", "Feb 3 · Insurance", "Feb 5 · Plumber"].map((item) => (
            <Box key={item} sx={{ mt: 0.6, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MuiIcons.CheckCircle sx={{ color: '#27ca40', fontSize: 12 }} />
              <Typography variant="caption" sx={{ color: muted }}>{item}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ border: cardBorder, borderRadius: '8px', p: 0.8 }}>
          <Typography variant="caption" sx={{ color: muted }}>Book (12 matched)</Typography>
          {["Feb 1 · Rent Payment", "Feb 3 · Insurance", "Feb 5 · Plumber"].map((item) => (
            <Box key={item} sx={{ mt: 0.6, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MuiIcons.CheckCircle sx={{ color: '#27ca40', fontSize: 12 }} />
              <Typography variant="caption" sx={{ color: muted }}>{item}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Shell>
  );
}
