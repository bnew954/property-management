import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ApartmentIcon from "@mui/icons-material/Apartment";
import AssignmentIcon from "@mui/icons-material/Assignment";
import BuildIcon from "@mui/icons-material/Build";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DescriptionIcon from "@mui/icons-material/Description";
import FolderIcon from "@mui/icons-material/Folder";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import PaymentIcon from "@mui/icons-material/Payment";
import PeopleIcon from "@mui/icons-material/People";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../services/auth";
import { useUser } from "../services/userContext";
import { useThemeMode } from "../services/themeContext";
import NotificationBell from "./NotificationBell";

const drawerWidth = 240;

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
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
  const { mode, toggleTheme } = useThemeMode();
  const { role, user, clearUser, isOrgAdmin, organization } = useUser();
  const isDark = mode === "dark";
  const theme = useTheme();

  const visibleNavItems =
    role === "tenant"
      ? navItems.filter((item) => ["/dashboard", "/payments", "/maintenance"].includes(item.path))
      : navItems.filter((item) => !item.tenantOnly && item.path !== "/my-lease" && item.path !== "/pay-rent");

  const primaryNavItems = visibleNavItems.filter((item) => !item.utility);
  const utilityNavItems = visibleNavItems.filter((item) => item.utility);

  const pageTitle = (() => {
    if (location.pathname.startsWith("/dashboard")) return "Dashboard";
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
    if (path === "/dashboard") {
      return location.pathname.startsWith(path);
    }
    return location.pathname.startsWith(path);
  };

  const navItemSx = (active) => ({
    borderRadius: "6px",
    ml: 0.5,
    mr: 0.5,
    px: 2,
    py: 0.75,
    minHeight: 38,
    backgroundColor: active
      ? alpha(theme.palette.primary.main, isDark ? 0.1 : 0.08)
      : "transparent",
    borderLeft: active ? "2px solid" : "2px solid transparent",
    borderColor: active ? "primary.main" : "transparent",
    "&:hover": {
      backgroundColor: alpha(theme.palette.text.secondary, isDark ? 0.06 : 0.04),
      "& .MuiListItemIcon-root": { color: "text.primary" },
      "& .MuiTypography-root": { color: "text.primary" },
    },
    transition: "color 0.15s ease, background-color 0.15s ease",
  });

  const userRoleText = role === "tenant" ? "Tenant" : "Landlord";
  const firstName = (user?.first_name || "").trim();
  const fullName = firstName
    ? `${firstName} ${user?.last_name || ""}`.trim()
    : user?.username || "User";

  const orgName = organization?.name || "";

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
        transition: "background-color 0.3s ease, color 0.3s ease",
      }}
    >
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.default",
            color: "text.primary",
            transition: "background-color 0.3s ease, color 0.3s ease",
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Toolbar sx={{ minHeight: 60, px: 2.2, pb: 1.2, flexDirection: "column", alignItems: "flex-start" }}>
            <Typography variant="body1" sx={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              Onyx PM
            </Typography>
            {orgName ? (
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 11, mt: 0.3 }}>
                {orgName}
              </Typography>
            ) : null}
          </Toolbar>
          <List sx={{ py: 1.3, minHeight: 0 }}>
            {primaryNavItems.map((item) => {
              const active = isActive(item.path);
              return (
                <ListItem key={item.path} disablePadding sx={{ px: 0.6, py: 0.1 }}>
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    sx={{
                      ...navItemSx(active),
                      border:
                        item.accent === "green" && role === "tenant"
                          ? `1px solid ${alpha(theme.palette.success.main, 0.22)}`
                          : "1px solid transparent",
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: active
                          ? "text.primary"
                          : item.accent === "green" && role === "tenant"
                            ? "success.main"
                            : "text.secondary",
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
                        color: active
                          ? "text.primary"
                          : item.accent === "green" && role === "tenant"
                            ? "success.main"
                            : "text.secondary",
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          <Divider sx={{ borderColor: "divider" }} />
          <List sx={{ py: 0.8 }}>
            {utilityNavItems.map((item) => {
              const active = isActive(item.path);
              return (
                <ListItem key={item.path} disablePadding sx={{ px: 0.6, py: 0.1 }}>
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    sx={{
                      ...navItemSx(active),
                      border: "1px solid transparent",
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: active ? "text.primary" : "text.secondary",
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
                        color: active ? "text.primary" : "text.secondary",
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          <Divider sx={{ borderColor: "divider" }} />
          {isOrgAdmin ? (
            <>
              <List sx={{ py: 0.8 }}>
                <ListItem disablePadding sx={{ px: 0.6, py: 0.1 }}>
                  <ListItemButton
                    component={Link}
                    to="/settings"
                    sx={{
                      ...navItemSx(isActive("/settings")),
                      border: "1px solid transparent",
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: isActive("/settings") ? "text.primary" : "text.secondary",
                        minWidth: 32,
                        "& svg": { fontSize: 18 },
                      }}
                    >
                      <SettingsIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Settings"
                      primaryTypographyProps={{
                        fontSize: 13,
                        fontWeight: 400,
                        color: isActive("/settings") ? "text.primary" : "text.secondary",
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              </List>
              <Divider sx={{ borderColor: "divider" }} />
            </>
          ) : null}
          <Box sx={{ px: 1.8, py: 1.2, mt: "auto" }}>
            <Box sx={{ mb: 1.2, display: "flex", alignItems: "center", gap: 1.2 }}>
              <Avatar sx={{ width: 26, height: 26, bgcolor: "divider", fontSize: "0.75rem", color: "text.secondary" }}>
                {(user?.first_name || user?.username || "U").slice(0, 1).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500, color: "text.secondary", lineHeight: 1.1 }}>
                  {fullName}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary" }}>
                  {userRoleText}
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
                color: "text.secondary",
                fontSize: 12,
                px: 0.5,
                minHeight: 28,
                "&:hover": { color: "text.primary", backgroundColor: "transparent" },
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
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.2,
          }}
        >
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: "text.primary" }}>{pageTitle}</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleTheme}
              size="small"
              sx={{
                color: "text.secondary",
                transition: "color 0.2s ease, background-color 0.2s ease",
                "&:hover": {
                  color: "text.primary",
                  backgroundColor: "action.hover",
                },
              }}
            >
              {isDark ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
            <NotificationBell />
            <Avatar sx={{ width: 28, height: 28, bgcolor: "divider", fontSize: "0.75rem", color: "text.secondary" }}>
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



