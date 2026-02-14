import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import PeopleIcon from "@mui/icons-material/People";
import FolderCopyIcon from "@mui/icons-material/FolderCopy";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import FeaturePageTemplate from "./FeaturePageTemplate";

const tenantsFeature = {
  title: "Tenant Management",
  tagline: "Everything about your tenants, organized and accessible",
  icon: PeopleIcon,
  benefits: [
    {
      title: "Tenant Profiles & Contact Info",
      description: "Store renter records with essential metadata so your team can access contacts and lease context instantly.",
      Icon: PersonSearchIcon,
    },
    {
      title: "In-App Messaging",
      description: "Keep tenant conversations in one thread with timestamps, attachments, and clear resolution tracking.",
      Icon: ChatBubbleOutlineIcon,
    },
    {
      title: "Document Storage",
      description: "Keep signed agreements, photos, and notices in a searchable tenant-specific document library.",
      Icon: FolderCopyIcon,
    },
  ],
  steps: [
    { number: 1, title: "Add Tenant", description: "Create tenant records with contact details, lease mapping, and notification preferences." },
    { number: 2, title: "Link to Lease", description: "Attach tenant records to active or upcoming lease agreements for one-click visibility." },
    { number: 3, title: "Communicate", description: "Send notices, reminders, and replies directly from the tenant communication thread." },
    { number: 4, title: "Track Documents", description: "Attach lease packets, renewals, and attachments without hunting across email inboxes." },
  ],
  highlights: [
    {
      title: "Tenant Directory",
      description:
        "A centralized directory for quick search and status checks across all properties and leases.",
    },
    {
      title: "Message Center",
      description:
        "Consolidate tenant requests, replies, and updates in a single conversation-first workflow.",
    },
    {
      title: "Document Management",
      description:
        "Organize tenant paperwork by category and version to keep records complete for audits and renewals.",
    },
  ],
};

export default function TenantsFeature() {
  return <FeaturePageTemplate feature={tenantsFeature} />;
}
