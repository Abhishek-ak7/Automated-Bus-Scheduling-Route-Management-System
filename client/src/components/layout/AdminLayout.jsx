import { Outlet, Link } from "react-router-dom";
import { Box, Drawer, List, ListItem, ListItemText, Toolbar, AppBar, Typography } from "@mui/material";

const drawerWidth = 240;

export default function AdminLayout() {
  return (
    <Box sx={{ display: "flex" }}>
      
      <AppBar position="fixed" sx={{ zIndex: 1201 }}>
        <Toolbar>
          <Typography variant="h6">
            DTC Smart Transport Control Panel
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" },
        }}
      >
        <Toolbar />
        <List>
          <ListItem button component={Link} to="/admin">
            <ListItemText primary="Dashboard" />
          </ListItem>
          <ListItem button component={Link} to="/admin/tracking">
            <ListItemText primary="Live Tracking" />
          </ListItem>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>

    </Box>
  );
}