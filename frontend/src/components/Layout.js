import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ApartmentIcon from "@mui/icons-material/Apartment";
import AssignmentIcon from "@mui/icons-material/Assignment";
import BuildIcon from "@mui/icons-material/Build";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DescriptionIcon from "@mui/icons-material/Description";
import KeyIcon from "@mui/icons-material/Key";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import FolderIcon from "@mui/icons-material/Folder";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import PaymentIcon from "@mui/icons-material/Payment";
import PeopleIcon from "@mui/icons-material/People";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import {
  Avatar,
  Box,
  Collapse,
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
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../services/auth";
import { useUser } from "../services/userContext";
import { useThemeMode } from "../services/themeContext";
import NotificationBell from "./NotificationBell";

const drawerWidth = 240;

function BrandLogo({ isDark }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
        }}
      >
        <img
          src="/logo-icon.png"
          alt="Onyx PM"
          style={{
            width: 32,
            height: 32,
            display: "block",
            background: "transparent",
            filter: "brightness(1.1)",
            mixBlendMode: "screen",
          }}
        />
      </Box>
      <Typography
        variant="body1"
        sx={{
          fontSize: 15,
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          lineHeight: 1.1,
          color: isDark ? "#fff" : "text.primary",
        }}
      >
        ONYX
      </Typography>
      <Box
        component="span"
        sx={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 600,
          letterSpacing: "0.05em",
          backgroundColor: "rgba(124,92,252,0.15)",
          color: "#7c5cfc",
          px: "10px",
          py: "3px",
          borderRadius: "6px",
          fontSize: "70%",
          lineHeight: 1.4,
          marginTop: 0.1,
          textTransform: "uppercase",
        }}
      >
        PM
      </Box>
    </Box>
  );
}

const topNavItems = [{ label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> }];

const tenantNavItems = [
  { label: "Payments", path: "/payments", icon: <PaymentIcon /> },
  { label: "Maintenance", path: "/maintenance", icon: <BuildIcon /> },
];

const landlordGroups = [
  {
    key: "leasing",
    label: "Leasing",
    headerIcon: <KeyIcon />,
    items: [
      { label: "Listings", path: "/listings", icon: <HomeWorkIcon /> },
      { label: "Applications", path: "/applications", icon: <AssignmentIcon /> },
      { label: "Screening", path: "/screenings", icon: <VerifiedUserIcon /> },
      { label: "Tenants", path: "/tenants", icon: <PeopleIcon /> },
      { label: "Leases", path: "/leases", icon: <DescriptionIcon /> },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    headerIcon: <SettingsSuggestIcon />,
    items: [
      { label: "Properties", path: "/properties", icon: <ApartmentIcon /> },
      { label: "Maintenance", path: "/maintenance", icon: <BuildIcon /> },
      { label: "Documents", path: "/documents", icon: <FolderIcon /> },
      { label: "Messages", path: "/messages", icon: <ChatBubbleOutlineIcon /> },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    headerIcon: <CurrencyExchangeIcon />,
    items: [
      { label: "Payments", path: "/payments", icon: <PaymentIcon /> },
      { label: "Accounting", path: "/accounting", icon: <AccountBalanceIcon /> },
    ],
  },
];

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggleTheme } = useThemeMode();
  const { role, user, clearUser, organization } = useUser();
  const isDark = mode === "dark";
  const theme = useTheme();
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const initial = {
      leasing: false,
      operations: false,
      finance: false,
    };

    const initialPath = location.pathname;
    landlordGroups.forEach((group) => {
      if (group.items.some((item) => initialPath.startsWith(item.path))) {
        initial[group.key] = true;
      }
    });

    return initial;
  });

  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname.startsWith(path);
    }
    return location.pathname.startsWith(path);
  };

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
    if (location.pathname.startsWith("/listings")) return "Listings";
    if (location.pathname.startsWith("/applications")) return "Applications";
    if (location.pathname.startsWith("/documents")) return "Documents";
    if (location.pathname.startsWith("/templates")) return "Templates";
    if (location.pathname.startsWith("/messages")) return "Messages";
    return "Onyx";
  })();

  const toggleGroup = (key) => {
    setExpandedGroups((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const navItemSx = (active) => ({
    borderRadius: "8px",
    minHeight: 44,
    pl: "16px",
    pr: "12px",
    py: "8px",
    mx: "8px",
    gap: "12px",
    alignItems: "center",
    backgroundColor: active ? alpha(theme.palette.primary.main, isDark ? 0.1 : 0.08) : "transparent",
    borderLeft: active ? "2px solid" : "2px solid transparent",
    borderColor: active ? "primary.main" : "transparent",
    "&:hover": {
      backgroundColor: alpha(theme.palette.text.secondary, isDark ? 0.06 : 0.04),
      "& .MuiListItemIcon-root": { color: "text.primary" },
      "& .MuiTypography-root": { color: "text.primary" },
    },
    transition: "color 0.15s ease, background-color 0.15s ease",
  });

  const groupHeaderSx = {
    minHeight: 44,
    borderRadius: "6px",
    pl: "16px",
    pr: "12px",
    py: "8px",
    mx: "8px",
    gap: "12px",
    alignItems: "center",
    "&:hover": { backgroundColor: alpha(theme.palette.text.secondary, isDark ? 0.06 : 0.04) },
  };

  const navTextTypographyProps = {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.2,
  };

  const groupHeaderTextSx = {
    fontSize: 14,
    fontWeight: 600,
    color: "#9ca3af",
  };

  const subItemTextTypographyProps = {
    fontSize: 13,
    fontWeight: 400,
    color: "#878C9E",
    lineHeight: 1.2,
  };

  const renderNavItem = (item) => {
    const active = isActive(item.path);
    return (
      <ListItem disablePadding sx={{ px: 0, py: 0 }}>
        <ListItemButton component={Link} to={item.path} sx={navItemSx(active)}>
          <ListItemIcon
            sx={{
              color: active ? "text.primary" : "text.secondary",
              minWidth: 24,
              "& svg": { fontSize: 24 },
            }}
          >
            {item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{
              ...navTextTypographyProps,
              color: active ? "text.primary" : "text.secondary",
            }}
          />
        </ListItemButton>
      </ListItem>
    );
  };

  const userRoleText = role === "tenant" ? "Tenant" : "Landlord";
  const firstName = (user?.first_name || "").trim();
  const fullName = firstName ? `${firstName} ${user?.last_name || ""}`.trim() : user?.username || "User";
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
          <Toolbar
            sx={{
              minHeight: 60,
              px: 2.2,
              pt: "16px",
              pb: 1.2,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BrandLogo isDark={isDark} />
            {orgName ? (
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 11, mt: 0.3, textAlign: "center", mb: 1.5 }}>
                {orgName}
              </Typography>
            ) : null}
          </Toolbar>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
            <List sx={{ py: 0, minHeight: 0 }}>
              {role === "tenant"
                ? [topNavItems[0], ...tenantNavItems].map((item) => renderNavItem(item))
                : [topNavItems[0]].map((item) => renderNavItem(item))}
            </List>

            {role === "tenant" ? null : (
              <>
                {landlordGroups.map((group) => {
                const isExpanded = expandedGroups[group.key];
                return (
                  <Box key={group.key}>
                    <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mx: "8px", my: 0.5 }} />
                    <List sx={{ py: 0, mt: 0 }}>
                      <ListItem disablePadding sx={{ px: 0, py: 0 }}>
                        <ListItemButton
                          disableRipple
                          onClick={() => toggleGroup(group.key)}
                          sx={groupHeaderSx}
                        >
                          <ListItemIcon
                            sx={{
                              color: "#6b7280",
                              minWidth: 24,
                              "& svg": { fontSize: 24 },
                            }}
                          >
                            {group.headerIcon}
                          </ListItemIcon>
                          <ListItemText
                            primary={group.label}
                            primaryTypographyProps={groupHeaderTextSx}
                            sx={{ mr: 0.7 }}
                          />
                          {isExpanded ? (
                            <ExpandLessIcon sx={{ fontSize: 20, color: "#6b7280" }} />
                          ) : (
                            <ExpandMoreIcon sx={{ fontSize: 20, color: "#6b7280" }} />
                          )}
                        </ListItemButton>
                      </ListItem>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <List disablePadding>
                          {group.items.map((item) => {
                            const active = isActive(item.path);
                            return (
                              <ListItem key={item.path} disablePadding sx={{ px: 0, py: 0 }}>
                                <ListItemButton
                                  component={Link}
                                  to={item.path}
                                  sx={{ ...navItemSx(active), pl: "40px" }}
                                >
                                  <ListItemIcon
                                    sx={{
                                      color: active ? "text.primary" : "text.secondary",
                                      minWidth: 24,
                                      "& svg": { fontSize: 24 },
                                    }}
                                  >
                                    {item.icon}
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={item.label}
                                    primaryTypographyProps={{
                                      ...subItemTextTypographyProps,
                                      color: active ? "#fff" : "#878C9E",
                                      fontWeight: active ? 500 : 400,
                                    }}
                                  />
                                </ListItemButton>
                              </ListItem>
                            );
                          })}
                        </List>
                      </Collapse>
                    </List>
                  </Box>
                );
              })}
              </>
            )}
          </Box>

          <Box sx={{ px: 1.8, py: 1.2, mt: "auto" }}>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mx: "8px" }} />
            <Box
              sx={{
                mt: 1.2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.2,
              }}
            >
              <Avatar sx={{ width: 26, height: 26, bgcolor: "divider", fontSize: "0.75rem", color: "text.secondary" }}>
                {(user?.first_name || user?.username || "U").slice(0, 1).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500, color: "#fff", lineHeight: 1.1 }}>
                  {fullName}
                </Typography>
              </Box>
              <IconButton
                aria-label="Logout"
                onClick={() => {
                  logout();
                  clearUser();
                  navigate("/login", { replace: true });
                }}
                size="small"
                sx={{
                  color: "#6b7280",
                  "&:hover": {
                    color: "#fff",
                    backgroundColor: "transparent",
                  },
                }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography sx={{ fontSize: 11, color: "#6b7280", mt: 0.6, pl: 2.6 }}>{userRoleText}</Typography>
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
