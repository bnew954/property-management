import ApartmentIcon from "@mui/icons-material/Apartment";
import BuildIcon from "@mui/icons-material/Build";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PaymentIcon from "@mui/icons-material/Payment";
import PeopleIcon from "@mui/icons-material/People";
import {
  Box,
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
import { Link, useLocation } from "react-router-dom";

const drawerWidth = 240;

const navItems = [
  { label: "Dashboard", path: "/", icon: <DashboardIcon /> },
  { label: "Properties", path: "/properties", icon: <ApartmentIcon /> },
  { label: "Tenants", path: "/tenants", icon: <PeopleIcon /> },
  { label: "Payments", path: "/payments", icon: <PaymentIcon /> },
  { label: "Maintenance", path: "/maintenance", icon: <BuildIcon /> },
];

function Layout({ children }) {
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#f4f6fb" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid #e5e7eb",
            backgroundColor: "#0f172a",
            color: "#e2e8f0",
          },
        }}
      >
        <Toolbar sx={{ minHeight: 72, alignItems: "center", px: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
            CloudProp
          </Typography>
        </Toolbar>
        <Divider sx={{ borderColor: "#1e293b" }} />
        <List sx={{ py: 1 }}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <ListItem key={item.path} disablePadding sx={{ px: 1.2, py: 0.2 }}>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  sx={{
                    borderRadius: 2,
                    backgroundColor: active ? "rgba(59, 130, 246, 0.22)" : "transparent",
                    "&:hover": {
                      backgroundColor: active
                        ? "rgba(59, 130, 246, 0.3)"
                        : "rgba(148, 163, 184, 0.15)",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{ color: active ? "#93c5fd" : "#cbd5e1", minWidth: 38 }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: active ? 700 : 500,
                      color: active ? "#eff6ff" : "#e2e8f0",
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 4 }}>
        {children}
      </Box>
    </Box>
  );
}

export default Layout;
