import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  AppBar,
  Typography
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  MyLocation,
  AltRoute,
  Schedule,
  DirectionsBus,
  Analytics,
} from "@mui/icons-material";

const drawerWidth = 240;

export default function AdminLayout() {

  const location = useLocation();

  const menuItems = [
    { text: "Dashboard", path: "/admin", icon: <DashboardIcon /> },
    { text: "Live Tracking", path: "/admin/tracking", icon: <MyLocation /> },
    { text: "Routes", path: "/admin/routes", icon: <AltRoute /> },
    { text: "Schedules", path: "/admin/schedules", icon: <Schedule /> },
    { text: "Fleet", path: "/admin/fleet", icon: <DirectionsBus /> },
    { text: "Analytics", path: "/admin/analytics", icon: <Analytics /> },
  ];

  return (
    <Box sx={{ display: "flex" }}>

      {/* TOP BAR */}
      <AppBar position="fixed" sx={{ zIndex: 1201 }}>
        <Toolbar>
          <Typography variant="h6">
            DTC Smart Transport Control Panel
          </Typography>
        </Toolbar>
      </AppBar>

      {/* SIDEBAR */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box"
          }
        }}
      >

        <Toolbar />

        <List>

          {menuItems.map((item) => (

            <ListItemButton
              key={item.text}
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>

          ))}

        </List>

      </Drawer>

      {/* PAGE CONTENT */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          backgroundColor: "#f5f5f5",
          minHeight: "100vh"
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

    </Box>
  );
}