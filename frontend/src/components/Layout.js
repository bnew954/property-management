import ApartmentIcon from "@mui/icons-material/Apartment";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AssignmentIcon from "@mui/icons-material/Assignment";
import BuildIcon from "@mui/icons-material/Build";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DescriptionIcon from "@mui/icons-material/Description";
import FolderIcon from "@mui/icons-material/Folder";
import LogoutIcon from "@mui/icons-material/Logout";
import PaymentIcon from "@mui/icons-material/Payment";
import PeopleIcon from "@mui/icons-material/People";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import {
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../services/auth";
import { useUser } from "../services/userContext";
import NotificationBell from "./NotificationBell";

const drawerWidth = 240;

const navItems = [
  { label: "Dashboard", path: "/", icon: <DashboardIcon /> },
  { label: "Pay Rent", path: "/pay-rent", icon: <CreditCardIcon />, tenantOnly: true, accent: "green" },
  { label: "My Lease", path: "/my-lease", icon: <AssignmentIcon /> },
  { label: "Properties", path: "/properties", icon: <ApartmentIcon /> },
  { label: "Tenants", path: "/tenants", icon: <PeopleIcon /> },
  { label: "Screening", path: "/screenings", icon: <VerifiedUserIcon /> },
  { label: "Leases", path: "/leases", icon: <DescriptionIcon /> },
  { label: "Payments", path: "/payments", icon: <PaymentIcon /> },
  { label: "Accounting", path: "/accounting", icon: <AccountBalanceIcon />, landlordOnly: true },
  { label: "Maintenance", path: "/maintenance", icon: <BuildIcon /> },
  { label: "Documents", path: "/documents", icon: <FolderIcon /> },
  { label: "Messages", path: "/messages", icon: <ChatBubbleOutlineIcon />, utility: true },
];

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, user, clearUser } = useUser();

  const visibleNavItems =
    role === "tenant"
      ? navItems.filter((item) =>
          ["/", "/pay-rent", "/my-lease", "/payments", "/maintenance", "/documents", "/messages"].includes(item.path)
        )
      : navItems.filter(
          (item) =>
            item.path !== "/my-lease" &&
            item.path !== "/pay-rent" &&
            !item.tenantOnly
        );
  const primaryNavItems = visibleNavItems.filter((item) => !item.utility);
  const utilityNavItems = visibleNavItems.filter((item) => item.utility);

  const pageTitle = (() => {
    if (location.pathname === "/") return "Dashboard";
    if (location.pathname.startsWith("/properties")) return "Properties";
    if (location.pathname.startsWith("/tenants")) return "Tenants";
    if (location.pathname.startsWith("/screenings")) return "Screening";
    if (location.pathname.startsWith("/leases")) return "Leases";
    if (location.pathname.startsWith("/payments")) return "Payments";
    if (location.pathname.startsWith("/accounting")) return "Accounting";
    if (location.pathname.startsWith("/pay-rent")) return "Pay Rent";
    if (location.pathname.startsWith("/my-lease")) return "My Lease";
    if (location.pathname.startsWith("/maintenance")) return "Maintenance";
    if (location.pathname.startsWith("/documents")) return "Documents";
    if (location.pathname.startsWith("/templates")) return "Templates";
    if (location.pathname.startsWith("/messages")) return "Messages";
    return "Onyx";
  })();

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#0a0a0a" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            backgroundColor: "#0a0a0a",
            color: "#e0e0e0",
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Toolbar sx={{ minHeight: 60, alignItems: "center", px: 2.2 }}>
            <Typography
              variant="body1"
              sx={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#fff",
                lineHeight: 1.1,
              }}
            >
              Onyx PM
            </Typography>
          </Toolbar>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
          <List sx={{ py: 1.3, minHeight: 0 }}>
            {primaryNavItems.map((item) => {
              const active = isActive(item.path);
              return (
                <ListItem key={item.path} disablePadding sx={{ px: 0.6, py: 0.1 }}>
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    sx={{
                      borderRadius: 0.75,
                      ml: 0.5,
                      mr: 0.5,
                      px: 2,
                      py: 0.75,
                      backgroundColor: active ? "rgba(124,92,252,0.1)" : "transparent",
                      boxShadow: active ? "inset 2px 0 0 #7c5cfc" : "none",
                      border:
                        item.accent === "green" && role === "tenant"
                          ? "1px solid rgba(34,197,94,0.22)"
                          : "1px solid transparent",
                      "&:hover": {
                        backgroundColor: "rgba(255,255,255,0.04)",
                        "& .MuiListItemIcon-root": { color: "#fff" },
                        "& .MuiTypography-root": { color: "#fff" },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color:
                          active
                            ? "#ffffff"
                            : item.accent === "green" && role === "tenant"
                              ? "rgba(34,197,94,0.9)"
                              : "#878C9E",
                        minWidth: 32,
                        "& svg": { fontSize: 18 },
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: 13,
                        fontWeight: 400,
                        color:
                          active
                            ? "#ffffff"
                            : item.accent === "green" && role === "tenant"
                              ? "rgba(187,247,208,0.95)"
                              : "#878C9E",
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
          <List sx={{ py: 0.8 }}>
            {utilityNavItems.map((item) => {
              const active = isActive(item.path);
              return (
                <ListItem key={item.path} disablePadding sx={{ px: 0.6, py: 0.1 }}>
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    sx={{
                      borderRadius: 0.75,
                      ml: 0.5,
                      mr: 0.5,
                      px: 2,
                      py: 0.75,
                      backgroundColor: active ? "rgba(124,92,252,0.1)" : "transparent",
                      boxShadow: active ? "inset 2px 0 0 #7c5cfc" : "none",
                      border: "1px solid transparent",
                      "&:hover": {
                        backgroundColor: "rgba(255,255,255,0.04)",
                        "& .MuiListItemIcon-root": { color: "#fff" },
                        "& .MuiTypography-root": { color: "#fff" },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: active ? "#ffffff" : "#878C9E", minWidth: 32, "& svg": { fontSize: 18 } }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: 13,
                        fontWeight: 400,
                        color: active ? "#ffffff" : "#878C9E",
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
          <Box sx={{ px: 1.8, py: 1.2, mt: "auto" }}>
            <Box sx={{ mb: 1.2, display: "flex", alignItems: "center", gap: 1.2 }}>
              <Avatar sx={{ width: 26, height: 26, bgcolor: "#2a2a2a", fontSize: "0.75rem", color: "#a1a1aa" }}>
                {(user?.first_name || user?.username || "U").slice(0, 1).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500, color: "#a1a1aa", lineHeight: 1.1 }}>
                  {user?.first_name
                    ? `${user.first_name} ${user?.last_name || ""}`.trim()
                    : user?.username || "User"}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: 11, color: "#666" }}>
                  {role === "tenant" ? "Tenant" : "Landlord"}
                </Typography>
              </Box>
            </Box>
            <Button
              fullWidth
              variant="text"
              onClick={() => {
                logout();
                clearUser();
                navigate("/login", { replace: true });
              }}
              sx={{
                justifyContent: "flex-start",
                color: "#878C9E",
                fontSize: 12,
                px: 0.5,
                minHeight: 28,
                "&:hover": { color: "#fff", backgroundColor: "transparent" },
              }}
            >
              <LogoutIcon sx={{ fontSize: 16, mr: 0.8 }} />
              Logout
            </Button>
          </Box>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Box
          sx={{
            px: { xs: 2, md: 2.5 },
            py: 1.2,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.2,
          }}
        >
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{pageTitle}</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <NotificationBell />
            <Avatar sx={{ width: 28, height: 28, bgcolor: "#232323", fontSize: "0.75rem", color: "#d1d5db" }}>
              {(user?.first_name || user?.username || "U").slice(0, 1).toUpperCase()}
            </Avatar>
          </Box>
        </Box>
        <Box sx={{ p: { xs: 2, md: 2.5 }, minWidth: 0 }}>{children}</Box>
      </Box>
    </Box>
  );
}

export default Layout;
