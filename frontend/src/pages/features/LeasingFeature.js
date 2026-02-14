import ApartmentIcon from "@mui/icons-material/Apartment";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import LinkIcon from "@mui/icons-material/Link";
import RuleIcon from "@mui/icons-material/Rule";
import FeaturePageTemplate from "./FeaturePageTemplate";

const leasingFeature = {
  title: "Leasing & Applications",
  tagline: "From listing to signed lease in minutes, not weeks",
  icon: ApartmentIcon,
  benefits: [
    {
      title: "Public Listing Pages",
      description: "Publish property listings with clear details, photos, and built-in application links that drive lead conversion.",
      Icon: LinkIcon,
    },
    {
      title: "Multi-Step Application Forms",
      description: "Collect applicant details in a guided sequence and route incomplete submissions for follow-up before review.",
      Icon: FormatListBulletedIcon,
    },
    {
      title: "Digital Lease Signing",
      description: "Move applicants to e-sign documents and automate lease generation to reduce manual back-and-forth.",
      Icon: RuleIcon,
    },
  ],
  steps: [
    { number: 1, title: "Create Listing", description: "Create a property listing and publish it in seconds with all required details and requirements." },
    { number: 2, title: "Applicant Applies", description: "Prospects complete your custom application flow directly from the listing page." },
    { number: 3, title: "Review & Approve", description: "Screen and review each application against your criteria with a centralized approval process." },
    { number: 4, title: "Generate & Sign Lease", description: "Generate a lease and send it for signature to close occupancy quickly." },
  ],
  highlights: [
    {
      title: "Application Review Dashboard",
      description:
        "Track every application in one inbox with clear statuses, assignment rules, and quick access to documents and notes.",
    },
    {
      title: "Guided Lease Workflow Stepper",
      description:
        "Move every lease through a guided sequence from draft to execution, with automatic reminders and required-task tracking.",
    },
    {
      title: "Public Listing with Auto-Generated URLs",
      description:
        "Share a unique listing URL instantly for marketing campaigns and tenant outreach.",
    },
  ],
};

export default function LeasingFeature() {
  return <FeaturePageTemplate feature={leasingFeature} />;
}

