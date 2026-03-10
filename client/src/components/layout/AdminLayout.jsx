import { useState, useMemo } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  AppBar,
  Typography,
  IconButton,
  Avatar,
  Stack,
  Tooltip,
  Divider,
  Menu,
  MenuItem,
  Badge,
  Breadcrumbs,
  Chip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  MyLocation,
  AltRoute,
  Schedule,
  DirectionsBus,
  Analytics,
  Whatshot,
  Menu as MenuIcon,
  ChevronLeft,
  Logout,
  Notifications,
  NavigateNext,
  Home,
  Circle,
} from "@mui/icons-material";
import { useAuthStore } from "../../store/authStore";

const FULL_WIDTH = 260;
const MINI_WIDTH = 72;

const menuItems = [
  { text: "Dashboard", path: "/admin", icon: <DashboardIcon /> },
  { text: "Live Tracking", path: "/admin/tracking", icon: <MyLocation /> },
  { text: "Routes", path: "/admin/routes", icon: <AltRoute /> },
  { text: "Schedules", path: "/admin/schedules", icon: <Schedule /> },
  { text: "Fleet", path: "/admin/fleet", icon: <DirectionsBus /> },
  { text: "Analytics", path: "/admin/analytics", icon: <Analytics /> },
  { text: "Demand Heatmap", path: "/admin/demand-heatmap", icon: <Whatshot /> },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(!isMobile);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const drawerWidth = open ? FULL_WIDTH : MINI_WIDTH;

  const currentPage = useMemo(() => {
    const match = menuItems.find((item) =>
      item.path === "/admin"
        ? location.pathname === "/admin"
        : location.pathname.startsWith(item.path)
    );
    return match || menuItems[0];
  }, [location.pathname]);

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate("/login");
  };

  const sidebarContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        color: "#fff",
      }}
    >
      {/* Brand */}
      <Box
        sx={{
          px: open ? 2.5 : 1,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "space-between" : "center",
          minHeight: 64,
        }}
      >
        {open ? (
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar
              sx={{
                width: 36, height: 36,
                bgcolor: "#3b82f6",
                fontSize: 14, fontWeight: 800,
              }}
            >
              DTC
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} lineHeight={1.2}>
                DTC Smart Transport
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: 10 }}>
                Control Panel
              </Typography>
            </Box>
          </Stack>
        ) : (
          <Avatar
            sx={{
              width: 36, height: 36,
              bgcolor: "#3b82f6",
              fontSize: 12, fontWeight: 800,
            }}
          >
            DTC
          </Avatar>
        )}
        {open && !isMobile && (
          <IconButton
            size="small"
            onClick={() => setOpen(false)}
            sx={{ color: "#64748b", "&:hover": { color: "#fff" } }}
          >
            <ChevronLeft fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      {/* Navigation */}
      <List sx={{ flex: 1, px: open ? 1.5 : 0.5, py: 1.5 }}>
        {menuItems.map((item) => {
          const isActive =
            item.path === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(item.path);

          return (
            <Tooltip key={item.text} title={!open ? item.text : ""} placement="right" arrow>
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={() => isMobile && setMobileOpen(false)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  px: open ? 2 : 1.5,
                  py: 1,
                  justifyContent: open ? "initial" : "center",
                  bgcolor: isActive ? "rgba(59,130,246,0.15)" : "transparent",
                  color: isActive ? "#60a5fa" : "#94a3b8",
                  "&:hover": {
                    bgcolor: isActive ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)",
                    color: "#fff",
                  },
                  transition: "all 0.15s ease",
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: open ? 36 : 0,
                    mr: open ? 1 : 0,
                    color: "inherit",
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{ fontSize: 13, fontWeight: isActive ? 700 : 500 }}
                  />
                )}
                {open && isActive && <Circle sx={{ fontSize: 8, color: "#3b82f6" }} />}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      {/* User Section */}
      <Box sx={{ px: open ? 2 : 1, py: 1.5 }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={open ? 1.5 : 0}
          justifyContent={open ? "flex-start" : "center"}
          sx={{
            p: open ? 1.5 : 0.5,
            borderRadius: 2,
            bgcolor: "rgba(255,255,255,0.05)",
            cursor: "pointer",
            "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
          }}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          <Avatar
            sx={{
              width: 32, height: 32,
              bgcolor: "#6366f1",
              fontSize: 13, fontWeight: 700,
            }}
          >
            {user?.name?.[0]?.toUpperCase() || "A"}
          </Avatar>
          {open && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2" fontWeight={600} noWrap
                sx={{ color: "#e2e8f0", fontSize: 12 }}
              >
                {user?.name || "Admin User"}
              </Typography>
              <Typography
                variant="caption" noWrap
                sx={{ color: "#64748b", fontSize: 10 }}
              >
                {user?.role || "admin"}
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f8fafc" }}>
      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: { width: 200, borderRadius: 2, boxShadow: "0 10px 40px rgba(0,0,0,0.12)" },
        }}
        transformOrigin={{ horizontal: "left", vertical: "bottom" }}
        anchorOrigin={{ horizontal: "left", vertical: "top" }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            {user?.name || "Admin"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.email || "admin@dtc.in"}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ color: "#ef4444", fontSize: 14, mt: 0.5 }}>
          <Logout fontSize="small" sx={{ mr: 1.5 }} /> Sign Out
        </MenuItem>
      </Menu>

      {/* SIDEBAR — Desktop */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            transition: "width 0.2s ease",
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              border: "none",
              transition: "width 0.2s ease",
              overflowX: "hidden",
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* SIDEBAR — Mobile */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            "& .MuiDrawer-paper": {
              width: FULL_WIDTH,
              boxSizing: "border-box",
              border: "none",
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          overflow: "auto",
        }}
      >
        {/* Top Bar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: "#fff",
            color: "#1e293b",
            borderBottom: "1px solid #e2e8f0",
            zIndex: 1100,
          }}
        >
          <Toolbar sx={{ minHeight: 56, px: { xs: 2, md: 3 } }}>
            {isMobile && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
            )}
            {!isMobile && !open && (
              <IconButton edge="start" onClick={() => setOpen(true)} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
            )}

            {/* Breadcrumbs */}
            <Breadcrumbs
              separator={<NavigateNext sx={{ fontSize: 16, color: "#94a3b8" }} />}
              sx={{ flex: 1 }}
            >
              <Chip
                component={Link}
                to="/admin"
                icon={<Home sx={{ fontSize: 16 }} />}
                label="Admin"
                size="small"
                clickable
                sx={{ fontWeight: 600, fontSize: 12, bgcolor: "transparent", "&:hover": { bgcolor: "#f1f5f9" } }}
              />
              {currentPage.path !== "/admin" && (
                <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontSize: 13 }}>
                  {currentPage.text}
                </Typography>
              )}
            </Breadcrumbs>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Tooltip title="Notifications">
                <IconButton size="small" sx={{ color: "#64748b" }}>
                  <Badge
                    badgeContent={3}
                    color="error"
                    sx={{ "& .MuiBadge-badge": { fontSize: 10, minWidth: 16, height: 16 } }}
                  >
                    <Notifications fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <Tooltip title="Account">
                <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                  <Avatar
                    sx={{
                      width: 30, height: 30,
                      bgcolor: "#6366f1",
                      fontSize: 12, fontWeight: 700,
                    }}
                  >
                    {user?.name?.[0]?.toUpperCase() || "A"}
                  </Avatar>
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>

        {/* Footer */}
        <Box sx={{ py: 1.5, px: 3, borderTop: "1px solid #e2e8f0", bgcolor: "#fff" }}>
          <Typography variant="caption" color="text.disabled" textAlign="center" display="block">
            DTC Smart Transport System &copy; {new Date().getFullYear()} — Admin Panel v2.0
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
