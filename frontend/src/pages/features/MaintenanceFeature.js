import BuildIcon from "@mui/icons-material/Build";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PlaylistAddCheckCircleIcon from "@mui/icons-material/PlaylistAddCheckCircle";
import FeaturePageTemplate from "./FeaturePageTemplate";

const maintenanceFeature = {
  title: "Maintenance & Operations",
  tagline: "Never lose track of a maintenance request again",
  icon: BuildIcon,
  benefits: [
    {
      title: "Tenant Submission Portal",
      description: "Let tenants submit requests with priority, photos, and access notes from a single self-service form.",
      Icon: DashboardIcon,
    },
    {
      title: "Status Tracking",
      description: "Follow each request through open, assigned, in-progress, and resolved states with timestamps.",
      Icon: PlaylistAddCheckCircleIcon,
    },
    {
      title: "Communication Thread",
      description: "Keep residents and technicians updated in one thread per ticket without fragmented messaging.",
      Icon: NotificationsActiveIcon,
    },
  ],
  steps: [
    { number: 1, title: "Tenant Submits Request", description: "A tenant raises an issue with category, photos, and urgency notes." },
    { number: 2, title: "Landlord Reviews", description: "Prioritize, acknowledge, and assign resources to the maintenance request." },
    { number: 3, title: "Assign & Track", description: "Update status and monitor progress with a complete operator workflow log." },
    { number: 4, title: "Mark Complete", description: "Close out the ticket only after resolution notes, cost, and completion details are saved." },
  ],
  highlights: [
    {
      title: "Request Dashboard with Priorities",
      description:
        "Sort and filter requests by urgency, property, tenant, and status from one operations board.",
    },
    {
      title: "Status Updates with Notifications",
      description:
        "Notify tenants automatically at each stage to reduce support overhead and improve communication.",
    },
    {
      title: "Full Request History",
      description:
        "Keep complete maintenance logs for recurring issues, warranty records, and operational reporting.",
    },
  ],
};

export default function MaintenanceFeature() {
  return <FeaturePageTemplate feature={maintenanceFeature} />;
}
