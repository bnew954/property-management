import ApartmentIcon from "@mui/icons-material/Apartment";
import AssignmentIcon from "@mui/icons-material/Assignment";
import BuildIcon from "@mui/icons-material/Build";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DescriptionIcon from "@mui/icons-material/Description";
import LogoutIcon from "@mui/icons-material/Logout";
import PaymentIcon from "@mui/icons-material/Payment";
import PeopleIcon from "@mui/icons-material/People";
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

const drawerWidth = 240;

const navItems = [
  { label: "Dashboard", path: "/", icon: <DashboardIcon /> },
  { label: "My Lease", path: "/my-lease", icon: <AssignmentIcon /> },
  { label: "Properties", path: "/properties", icon: <ApartmentIcon /> },
  { label: "Tenants", path: "/tenants", icon: <PeopleIcon /> },
  { label: "Leases", path: "/leases", icon: <DescriptionIcon /> },
  { label: "Payments", path: "/payments", icon: <PaymentIcon /> },
  { label: "Maintenance", path: "/maintenance", icon: <BuildIcon /> },
];

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, user, clearUser } = useUser();

  const visibleNavItems =
    role === "tenant"
      ? navItems.filter((item) =>
          ["/", "/my-lease", "/payments", "/maintenance"].includes(item.path)
        )
      : navItems.filter((item) => item.path !== "/my-lease");

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
                fontSize: 15,
                fontWeight: 600,
                color: "#fff",
              }}
            >
              CloudProp
            </Typography>
          </Toolbar>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
          <List sx={{ py: 1.3, flexGrow: 1, minHeight: 0 }}>
            {visibleNavItems.map((item) => {
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
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 2.5 } }}>
        {children}
      </Box>
    </Box>
  );
}

export default Layout;
