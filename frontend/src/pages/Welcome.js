import { Link } from "react-router-dom";
import { Avatar, Box, Card, CardActionArea, Typography } from "@mui/material";
import AddHomeWorkIcon from "@mui/icons-material/AddHomeWork";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import SpeedIcon from "@mui/icons-material/Speed";
import { useUser } from "../services/userContext";

const quickActions = [
  {
    label: "Add Your First Property",
    description: "Start building your portfolio in a few clicks.",
    to: "/properties/new",
    icon: <AddHomeWorkIcon sx={{ fontSize: 16 }} />,
  },
  {
    label: "Invite a Team Member",
    description: "Add teammates and grant workspace access.",
    to: "/settings",
    icon: <PersonAddAlt1Icon sx={{ fontSize: 16 }} />,
  },
  {
    label: "Explore the Dashboard",
    description: "Review your property and lease metrics.",
    to: "/dashboard",
    icon: <SpeedIcon sx={{ fontSize: 16 }} />,
  },
];

function Welcome() {
  const { user } = useUser();
  const orgName = user?.organization?.name || "your workspace";
  const orgPlan = user?.organization?.plan || "free";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 4,
        background: "#f5f5f7",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 860, textAlign: "center" }}>
        <Typography
          sx={{
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            mb: 1.2,
            color: "#1a1a1a",
          }}
        >
          Welcome to Onyx PM!
        </Typography>
        <Typography sx={{ fontSize: 16, color: "#6b7280", mb: 1 }}>
          Welcome to Onyx PM! Your workspace {orgName ? `"${orgName}"` : "your workspace"} has been
          created. Start by adding your first property.
        </Typography>
        <Typography sx={{ fontSize: 14, color: "#6b7280", mb: 2.4 }}>
          Current plan: {orgPlan.toUpperCase()}
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
            mb: 0.4,
          }}
        >
          {quickActions.map((action) => (
            <Card
              key={action.label}
              variant="outlined"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 1.5,
                border: "1px solid rgba(0,0,0,0.08)",
                textAlign: "left",
                height: "100%",
              }}
            >
              <CardActionArea component={Link} to={action.to} sx={{ p: 2, textAlign: "left", display: "block" }}>
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: "rgba(124, 92, 252, 0.12)",
                    mb: 1,
                    color: "#7c5cfc",
                    fontSize: 16,
                  }}
                >
                  {action.icon}
                </Avatar>
                <Typography sx={{ color: "#1a1a1a", fontWeight: 600, fontSize: 13, mb: 0.4 }}>
                  {action.label}
                </Typography>
                <Typography sx={{ color: "#6b7280", fontSize: 12 }}>{action.description}</Typography>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export default Welcome;
