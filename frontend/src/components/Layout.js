import ApartmentIcon from "@mui/icons-material/Apartment";
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

const drawerWidth = 240;

const navItems = [
  { label: "Dashboard", path: "/", icon: <DashboardIcon /> },
  { label: "Properties", path: "/properties", icon: <ApartmentIcon /> },
  { label: "Tenants", path: "/tenants", icon: <PeopleIcon /> },
  { label: "Leases", path: "/leases", icon: <DescriptionIcon /> },
  { label: "Payments", path: "/payments", icon: <PaymentIcon /> },
  { label: "Maintenance", path: "/maintenance", icon: <BuildIcon /> },
];

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#0a0e1a" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid rgba(99, 102, 241, 0.18)",
            backgroundColor: "#070b14",
            color: "#e2e8f0",
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Toolbar sx={{ minHeight: 72, alignItems: "center", px: 3 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                letterSpacing: 0.3,
                background: "linear-gradient(90deg, #38bdf8 0%, #6366f1 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              CloudProp
            </Typography>
          </Toolbar>
          <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.18)" }} />
          <List sx={{ py: 1.3, flexGrow: 1 }}>
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <ListItem key={item.path} disablePadding sx={{ px: 1.2, py: 0.2 }}>
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    sx={{
                      borderRadius: 2,
                      borderLeft: active ? "3px solid #6366f1" : "3px solid transparent",
                      backgroundColor: active ? "rgba(99, 102, 241, 0.14)" : "transparent",
                      "&:hover": {
                        backgroundColor: "rgba(99, 102, 241, 0.1)",
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: active ? "#38bdf8" : "#6b7280", minWidth: 38 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: active ? 700 : 500,
                        color: active ? "#eef2ff" : "#cbd5e1",
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.18)" }} />
          <Box sx={{ px: 2.3, py: 1.4 }}>
            <Box sx={{ mb: 1.2, display: "flex", alignItems: "center", gap: 1.2 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: "#6366f1", fontSize: "0.9rem" }}>A</Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#e5e7eb", lineHeight: 1.15 }}>
                  Admin
                </Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                  Superuser
                </Typography>
              </Box>
            </Box>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<LogoutIcon />}
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
              sx={{
                borderColor: "rgba(148,163,184,0.35)",
                color: "#cbd5e1",
                "&:hover": { borderColor: "#6366f1", bgcolor: "rgba(99,102,241,0.12)" },
              }}
            >
              Logout
            </Button>
          </Box>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2.5, md: 4 } }}>
        {children}
      </Box>
    </Box>
  );
}

export default Layout;
