import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  LinearProgress,
  Paper,
  Divider,
  Badge,
} from "@mui/material";
import {
  DirectionsBus,
  Route as RouteIcon,
  CheckCircle,
  Timer,
  Analytics,
  TrendingUp,
  TrendingDown,
  Add,
  Schedule,
  AltRoute,
  MyLocation,
  Whatshot,
  Refresh,
  CalendarMonth,
  PlayArrow,
  Warning,
  FiberManualRecord,
  ArrowForward,
  Speed,
  PeopleAlt,
} from "@mui/icons-material";
import { getDashboardStats } from "../../services/analyticsService";
import { getActiveTrips } from "../../services/tripService";
import { useAuthStore } from "../../store/authStore";

/* ── KPI Config ── */
const kpis = [
  {
    key: "activeBuses", label: "Active Buses", icon: DirectionsBus,
    color: "#3b82f6", bg: "#eff6ff",
    sub: (s) => `${s.totalBuses || 0} total fleet`,
  },
  {
    key: "tripsToday", label: "Trips Today", icon: RouteIcon,
    color: "#8b5cf6", bg: "#f5f3ff", trendKey: "trips",
    sub: (s) => `${s.completedTrips || 0} completed`,
  },
  {
    key: "onTimePercentage", label: "On-Time Rate", icon: CheckCircle,
    color: "#10b981", bg: "#ecfdf5", suffix: "%", trendKey: "onTime",
    sub: () => "vs yesterday",
  },
  {
    key: "avgDelay", label: "Avg Delay", icon: Timer,
    color: "#f59e0b", bg: "#fffbeb", suffix: " min", trendKey: "delay",
    invert: true, sub: () => "completed trips",
  },
];

/* ── Quick Actions ── */
const quickActions = [
  { label: "Add New Bus", icon: <DirectionsBus />, path: "/admin/fleet", color: "#3b82f6", bg: "#eff6ff" },
  { label: "Create Schedule", icon: <Schedule />, path: "/admin/schedules", color: "#8b5cf6", bg: "#f5f3ff" },
  { label: "View Routes", icon: <AltRoute />, path: "/admin/routes", color: "#10b981", bg: "#ecfdf5" },
  { label: "Live Tracking", icon: <MyLocation />, path: "/admin/tracking", color: "#ef4444", bg: "#fef2f2" },
  { label: "Analytics", icon: <Analytics />, path: "/admin/analytics", color: "#f59e0b", bg: "#fffbeb" },
  { label: "Demand Map", icon: <Whatshot />, path: "/admin/demand-heatmap", color: "#ec4899", bg: "#fdf2f8" },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activeTrips, setActiveTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const [statsRes, tripsRes] = await Promise.all([
        getDashboardStats(),
        getActiveTrips().catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setActiveTrips(tripsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
    const timer = setInterval(() => fetchData(false), 30_000);
    return () => clearInterval(timer);
  }, [fetchData]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Loading dashboard…
          </Typography>
        </Stack>
      </Box>
    );
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto" }}>
      {/* ─── Welcome Banner ─── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          mb: 3,
          borderRadius: 3,
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #3b82f6 100%)",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute", top: -30, right: -30,
            width: 200, height: 200, borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }}
        />
        <Box
          sx={{
            position: "absolute", bottom: -50, right: 80,
            width: 140, height: 140, borderRadius: "50%",
            background: "rgba(255,255,255,0.03)",
          }}
        />
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
          spacing={2}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Box>
            <Typography variant="h5" fontWeight={800}>
              {greeting()}, {user?.name || "Admin"} 👋
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
              <CalendarMonth sx={{ fontSize: 16, opacity: 0.7 }} />
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {today}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.7, maxWidth: 500 }}>
              Here&apos;s your daily operations snapshot. Manage fleet, schedules, and monitor live performance.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh data">
              <IconButton
                onClick={() => fetchData(false)}
                disabled={refreshing}
                sx={{
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.2)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                }}
              >
                {refreshing ? <CircularProgress size={20} color="inherit" /> : <Refresh />}
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Analytics />}
              onClick={() => navigate("/admin/analytics")}
              sx={{
                bgcolor: "rgba(255,255,255,0.15)",
                color: "#fff",
                fontWeight: 600,
                textTransform: "none",
                backdropFilter: "blur(10px)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
              }}
            >
              Full Analytics
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* ─── KPI Cards ─── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4, 1fr)" },
          gap: 2,
          mb: 3,
        }}
      >
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const value = stats?.[kpi.key] ?? "–";
          const trend = kpi.trendKey ? stats?.trends?.[kpi.trendKey] : null;
          const trendPositive = kpi.invert ? trend < 0 : trend > 0;

          return (
            <Card
              key={kpi.key}
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: kpi.color,
                  boxShadow: `0 4px 20px ${kpi.color}15`,
                  transform: "translateY(-2px)",
                },
              }}
            >
              <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} gutterBottom>
                      {kpi.label}
                    </Typography>
                    <Stack direction="row" alignItems="baseline" spacing={1}>
                      <Typography variant="h4" fontWeight={800}>
                        {value}
                        {kpi.suffix || ""}
                      </Typography>
                      {trend != null && trend !== 0 && (
                        <Chip
                          size="small"
                          icon={
                            trendPositive ? (
                              <TrendingUp fontSize="small" />
                            ) : (
                              <TrendingDown fontSize="small" />
                            )
                          }
                          label={`${trend > 0 ? "+" : ""}${trend}%`}
                          sx={{
                            fontWeight: 700,
                            fontSize: 11,
                            height: 22,
                            bgcolor: trendPositive ? "#ecfdf5" : "#fef2f2",
                            color: trendPositive ? "#059669" : "#dc2626",
                            "& .MuiChip-icon": { color: "inherit" },
                          }}
                        />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
                      {kpi.sub(stats || {})}
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: kpi.bg,
                      borderRadius: 2.5,
                    }}
                  >
                    <Icon sx={{ color: kpi.color, fontSize: 24 }} />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* ─── Quick Actions ─── */}
      <Paper
        elevation={0}
        sx={{ p: 2.5, mb: 3, borderRadius: 3, border: "1px solid #e2e8f0" }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              Quick Actions
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Jump to common daily tasks
            </Typography>
          </Box>
        </Stack>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(6, 1fr)" },
            gap: 1.5,
          }}
        >
          {quickActions.map((action) => (
            <Button
              key={action.label}
              onClick={() => navigate(action.path)}
              sx={{
                p: 2,
                flexDirection: "column",
                borderRadius: 2.5,
                border: "1px solid #e2e8f0",
                bgcolor: "#fff",
                textTransform: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: action.color,
                  bgcolor: action.bg,
                  transform: "translateY(-2px)",
                  boxShadow: `0 4px 16px ${action.color}20`,
                },
              }}
            >
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: action.bg,
                  mb: 1,
                }}
              >
                {React.cloneElement(action.icon, {
                  sx: { color: action.color, fontSize: 20 },
                })}
              </Avatar>
              <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ fontSize: 11 }}>
                {action.label}
              </Typography>
            </Button>
          ))}
        </Box>
      </Paper>

      {/* ─── Bottom Grid: Active Trips + System Status ─── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
          gap: 2.5,
        }}
      >
        {/* Active Trips */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid #f1f5f9" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" alignItems="center" spacing={1}>
                <PlayArrow sx={{ color: "#10b981", fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  Active Trips
                </Typography>
                <Chip
                  size="small"
                  label={activeTrips.length}
                  sx={{
                    fontWeight: 700, fontSize: 11, height: 22,
                    bgcolor: "#ecfdf5", color: "#059669",
                  }}
                />
              </Stack>
              <Button
                size="small"
                endIcon={<ArrowForward sx={{ fontSize: 14 }} />}
                onClick={() => navigate("/admin/tracking")}
                sx={{ textTransform: "none", fontWeight: 600, fontSize: 12 }}
              >
                View All
              </Button>
            </Stack>
          </Box>
          <Box sx={{ flex: 1, overflow: "auto", maxHeight: 320 }}>
            {activeTrips.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <DirectionsBus sx={{ fontSize: 40, color: "#cbd5e1", mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No active trips right now
                </Typography>
              </Box>
            ) : (
              activeTrips.slice(0, 6).map((trip, idx) => (
                <Box
                  key={trip._id || idx}
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    borderBottom: "1px solid #f1f5f9",
                    cursor: "pointer",
                    transition: "bgcolor 0.15s",
                    "&:hover": { bgcolor: "#f8fafc" },
                  }}
                  onClick={() => navigate("/admin/tracking")}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar
                      sx={{
                        width: 36, height: 36, borderRadius: 2,
                        bgcolor: "#eff6ff", color: "#3b82f6",
                        fontSize: 12, fontWeight: 800,
                      }}
                    >
                      {trip.bus?.busNumber?.slice(-3) || "BUS"}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          Bus {trip.bus?.busNumber || "Unknown"}
                        </Typography>
                        <Chip
                          size="small"
                          label={trip.bus?.busType || "NON-AC"}
                          sx={{ fontSize: 10, height: 18, fontWeight: 600 }}
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {trip.route?.routeName || "Unknown Route"} ({trip.route?.routeCode || ""})
                      </Typography>
                    </Box>
                    <Stack alignItems="flex-end" spacing={0.3}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <FiberManualRecord
                          sx={{
                            fontSize: 8,
                            color: trip.delayMinutes > 5 ? "#ef4444" : "#10b981",
                          }}
                        />
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          sx={{
                            color: trip.delayMinutes > 5 ? "#ef4444" : "#10b981",
                          }}
                        >
                          {trip.delayMinutes > 0 ? `+${trip.delayMinutes}m late` : "On time"}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Box>
              ))
            )}
          </Box>
        </Paper>

        {/* System Status / Daily Checklist */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 2,
              background: "linear-gradient(135deg, #0f172a, #1e293b)",
              color: "#fff",
            }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              Daily Overview
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              System health & tasks
            </Typography>
          </Box>
          <Box sx={{ p: 2, flex: 1 }}>
            <Stack spacing={2}>
              {/* Fleet Readiness */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    Fleet Readiness
                  </Typography>
                  <Typography variant="caption" fontWeight={700} color="#3b82f6">
                    {stats?.activeBuses || 0}/{stats?.totalBuses || 0}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={
                    stats?.totalBuses
                      ? Math.round((stats.activeBuses / stats.totalBuses) * 100)
                      : 0
                  }
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: "#e2e8f0",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 4,
                      bgcolor: "#3b82f6",
                    },
                  }}
                />
              </Box>

              {/* Trip Completion */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    Trip Completion
                  </Typography>
                  <Typography variant="caption" fontWeight={700} color="#10b981">
                    {stats?.completedTrips || 0}/{stats?.tripsToday || 0}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={
                    stats?.tripsToday
                      ? Math.round((stats.completedTrips / stats.tripsToday) * 100)
                      : 0
                  }
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: "#e2e8f0",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 4,
                      bgcolor: "#10b981",
                    },
                  }}
                />
              </Box>

              {/* On-Time Performance */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    On-Time Performance
                  </Typography>
                  <Typography variant="caption" fontWeight={700} color="#8b5cf6">
                    {stats?.onTimePercentage ?? 0}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={stats?.onTimePercentage ?? 0}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: "#e2e8f0",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 4,
                      bgcolor: "#8b5cf6",
                    },
                  }}
                />
              </Box>

              <Divider />

              {/* Quick Stats */}
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "#fef2f2", borderRadius: 1.5 }}>
                    <Warning sx={{ fontSize: 16, color: "#ef4444" }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" fontWeight={600}>Delayed Trips</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Trips running behind schedule
                    </Typography>
                  </Box>
                  <Chip
                    label={stats?.delayedTrips ?? 0}
                    size="small"
                    sx={{
                      fontWeight: 700, fontSize: 12,
                      bgcolor: "#fef2f2", color: "#ef4444",
                    }}
                  />
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "#eff6ff", borderRadius: 1.5 }}>
                    <Speed sx={{ fontSize: 16, color: "#3b82f6" }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" fontWeight={600}>Avg Speed</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Fleet average today
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700} color="#3b82f6">
                    {stats?.avgSpeed ?? 28} km/h
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "#f5f3ff", borderRadius: 1.5 }}>
                    <PeopleAlt sx={{ fontSize: 16, color: "#8b5cf6" }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" fontWeight={600}>Active Trips</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Currently on route
                    </Typography>
                  </Box>
                  <Chip
                    label={activeTrips.length}
                    size="small"
                    sx={{
                      fontWeight: 700, fontSize: 12,
                      bgcolor: "#f5f3ff", color: "#8b5cf6",
                    }}
                  />
                </Stack>
              </Stack>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
