import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import BuildIcon from "@mui/icons-material/Build";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DescriptionIcon from "@mui/icons-material/Description";
import KeyIcon from "@mui/icons-material/Key";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import GavelIcon from "@mui/icons-material/Gavel";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import ShareIcon from "@mui/icons-material/Share";
import FolderIcon from "@mui/icons-material/Folder";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import PaymentIcon from "@mui/icons-material/Payment";
import PeopleIcon from "@mui/icons-material/People";
import Receipt from "@mui/icons-material/Receipt";
import Person from "@mui/icons-material/Person";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import {
  Avatar,
  Chip,
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
import AiAgent from "./AiAgent";

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
    key: "marketing",
    label: "Marketing",
    headerIcon: <KeyIcon />,
    items: [
      { label: "Listings", path: "/listings", icon: <HomeWorkIcon /> },
      { label: "Syndication", path: "/syndication", icon: <ShareIcon />, comingSoon: true },
      { label: "Leads", path: "/leads", icon: <PeopleOutlineIcon /> },
    ],
  },
  {
    key: "leasingPipeline",
      label: "Leasing",
    headerIcon: <KeyIcon />,
    items: [
      { label: "Applications", path: "/applications", icon: <DescriptionIcon /> },
      { label: "Screening", path: "/screening", icon: <VerifiedUserIcon /> },
      { label: "Leases", path: "/leases", icon: <GavelIcon /> },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    headerIcon: <SettingsSuggestIcon />,
    items: [
      { label: "Tenants", path: "/tenants", icon: <PeopleIcon /> },
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
      { label: "Bills & Vendors", path: "/bills", icon: <Receipt /> },
      { label: "Accounting", path: "/accounting", icon: <AccountBalanceIcon /> },
    ],
  },
];

const getSectionTitle = (pathname) => {
  if (pathname.startsWith("/vendor-portal")) return "Vendor Portal";
  const marketing = ["/listings", "/syndication", "/leads"];
  const leasing = ["/applications", "/screening", "/leases"];
  const operations = ["/tenants", "/maintenance", "/documents", "/messages"];
  const finance = ["/payments", "/bills", "/accounting"];

  if (pathname === "/dashboard") return "Dashboard";
  if (marketing.some((path) => pathname.startsWith(path))) return "Marketing";
  if (leasing.some((path) => pathname.startsWith(path))) return "Leasing";
  if (operations.some((path) => pathname.startsWith(path))) return "Operations";
  if (finance.some((path) => pathname.startsWith(path))) return "Finance";
  if (pathname.startsWith("/properties")) return "Properties";
  if (pathname.startsWith("/settings")) return "Settings";
  return "";
};

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggleTheme } = useThemeMode();
  const { role, user, clearUser, organization, isVendor } = useUser();
  const isDark = mode === "dark";
  const theme = useTheme();
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const initial = {
      marketing: false,
      leasingPipeline: false,
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

  const pageTitle = getSectionTitle(location.pathname);

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

  const renderGroupNavItem = (item) => {
    const isComingSoon = !!item.comingSoon;
    const active = isComingSoon ? false : isActive(item.path);
    const mutedColor = "rgba(255,255,255,0.25)";

    return (
      <ListItem key={item.path} disablePadding sx={{ px: 0, py: 0 }}>
        <ListItemButton
          {...(!isComingSoon ? { component: Link, to: item.path } : { component: "div", disableRipple: true })}
          sx={{
            ...navItemSx(active),
            pl: "40px",
            ...(isComingSoon
              ? {
                  cursor: "default",
                  "& .MuiListItemIcon-root": { color: mutedColor },
                  "& .MuiTypography-root": { color: mutedColor },
                  "&:hover": {
                    backgroundColor: "transparent",
                    "& .MuiListItemIcon-root": { color: mutedColor },
                    "& .MuiTypography-root": { color: mutedColor },
                  },
                }
              : {}),
          }}
        >
          <ListItemIcon
            sx={{
              color: active ? "text.primary" : isComingSoon ? mutedColor : "text.secondary",
              minWidth: 24,
              "& svg": { fontSize: 24 },
            }}
          >
            {item.icon}
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
                <Typography
                  sx={{
                    ...subItemTextTypographyProps,
                    color: isComingSoon ? mutedColor : active ? "#fff" : "#878C9E",
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  {item.label}
                </Typography>
                {isComingSoon && (
                  <Chip
                    size="small"
                    label="Soon"
                    sx={{
                      ml: 1,
                      height: 16,
                      "& .MuiChip-label": {
                        px: 0.75,
                        fontSize: "0.55rem",
                      },
                      backgroundColor: "rgba(124,92,252,0.15)",
                      color: "#7C5CFC",
                    }}
                  />
                )}
              </Box>
            }
          />
        </ListItemButton>
      </ListItem>
    );
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

  const renderVendorNavItem = (path, Icon, label) => {
    const active = isActive(path);
    return (
      <ListItem disablePadding sx={{ px: 0, py: 0 }}>
        <ListItemButton onClick={() => navigate(path)} sx={navItemSx(active)}>
          <ListItemIcon
            sx={{
              color: active ? "text.primary" : "text.secondary",
              minWidth: 24,
              "& svg": { fontSize: 24 },
            }}
          >
            {Icon}
          </ListItemIcon>
          <ListItemText
            primary={label}
            primaryTypographyProps={{
              ...navTextTypographyProps,
              color: active ? "text.primary" : "text.secondary",
            }}
          />
        </ListItemButton>
      </ListItem>
    );
  };

  const vendorName = user?.vendor_profile?.name || user?.vendor_profile?.vendor_name || "";
  const userRoleText = isVendor ? "Vendor" : role === "tenant" ? "Tenant" : "Landlord";
  const firstName = (user?.first_name || "").trim();
  const fullName = firstName ? `${firstName} ${user?.last_name || ""}`.trim() : user?.username || "User";
  const orgName = isVendor
    ? `${vendorName ? `${vendorName} ` : ""}Vendor Portal`
    : organization?.name || "";

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
              {isVendor
                ? (
                  <>
                    {renderVendorNavItem("/vendor-portal", <DashboardIcon />, "Dashboard")}
                    {renderVendorNavItem("/vendor-portal/work-orders", <BuildIcon />, "Work Orders")}
                    {renderVendorNavItem("/vendor-portal/invoices", <Receipt />, "Invoices")}
                    {renderVendorNavItem("/vendor-portal/profile", <Person />, "Profile")}
                  </>
                )
                : role === "tenant"
                  ? [topNavItems[0], ...tenantNavItems].map((item) => renderNavItem(item))
                  : [topNavItems[0]].map((item) => renderNavItem(item))}
            </List>

            {role === "tenant" || isVendor ? null : (
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
                          {group.items.map((item) => renderGroupNavItem(item))}
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
      <AiAgent />
    </Box>
  );
}

export default Layout;
