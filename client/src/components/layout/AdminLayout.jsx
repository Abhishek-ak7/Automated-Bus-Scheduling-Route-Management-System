import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  AppBar,
  Typography
} from "@mui/material";

const drawerWidth = 240;

export default function AdminLayout() {

  const location = useLocation();

  const menuItems = [
    { text: "Dashboard", path: "/admin" },
    { text: "Live Tracking", path: "/admin/tracking" },
    { text: "Routes", path: "/admin/routes" },
    { text: "Schedules", path: "/admin/schedules" },
    { text: "Fleet", path: "/admin/fleet" },
    { text: "Analytics", path: "/admin/analytics" }
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