import FingerprintIcon from "@mui/icons-material/Fingerprint";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import LinkIcon from "@mui/icons-material/Link";
import AssignmentIcon from "@mui/icons-material/Assignment";
import FeaturePageTemplate from "./FeaturePageTemplate";

const screeningFeature = {
  title: "Screening & Background Checks",
  tagline: "Make confident leasing decisions with thorough screening",
  icon: VerifiedUserIcon,
  benefits: [
    {
      title: "Consent-Based Flow",
      description: "Request legally compliant tenant consent before pulling third-party background and credit data.",
      Icon: LinkIcon,
    },
    {
      title: "Background & Credit Checks",
      description: "Bundle checks into one workflow and store results next to applicant records for faster evaluation.",
      Icon: FingerprintIcon,
    },
    {
      title: "Integrated with Applications",
      description: "Use one submission pipeline from application to screening result to avoid duplicate data entry.",
      Icon: AssignmentIcon,
    },
  ],
  steps: [
    { number: 1, title: "Applicant Applies", description: "Collect required details and documents in one application package." },
    { number: 2, title: "Send Screening Request", description: "Launch consent and screening tasks immediately after application acceptance criteria are met." },
    { number: 3, title: "Tenant Consents", description: "Send secure consent links and track completion status in real time." },
    { number: 4, title: "Review Results", description: "Review background, credit, and criminal checks side-by-side before a final lease decision." },
  ],
  highlights: [
    {
      title: "Tokenized Consent Links",
      description:
        "Generate secure, one-time consent links and monitor delivery and completion without manual follow-up.",
    },
    {
      title: "Screening Dashboard",
      description:
        "Use a dedicated dashboard to manage active screenings, pending tokens, and completed results.",
    },
    {
      title: "Integrated with Leasing Pipeline",
      description:
        "Link screening statuses directly to application and lease workflows so leasing progress stays transparent.",
    },
  ],
};

export default function ScreeningFeature() {
  return <FeaturePageTemplate feature={screeningFeature} />;
}
