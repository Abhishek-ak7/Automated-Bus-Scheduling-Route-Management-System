import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { Refresh, FiberManualRecord } from "@mui/icons-material";

/* Services */
import {
  getDashboardStats,
  getHourlyTrips,
  getDailyTrips,
  getFleetStatus,
  getRoutePerformance,
  getDelayDistribution,
} from "../../services/analyticsService";

/* Chart components */
import KpiCards from "../../components/analytics/KpiCards";
import DailyTripChart from "../../components/analytics/DailyTripChart";
import HourlyTripChart from "../../components/analytics/HourlyTripChart";
import FleetStatusChart from "../../components/analytics/FleetStatusChart";
import DelayDistributionChart from "../../components/analytics/DelayDistributionChart";
import RoutePerformanceTable from "../../components/analytics/RoutePerformanceTable";

const REFRESH_INTERVAL = 30_000; // 30 s auto-refresh

export default function AnalyticsPage() {
  /* ── state ── */
  const [stats, setStats] = useState(null);
  const [hourly, setHourly] = useState([]);
  const [daily, setDaily] = useState([]);
  const [fleet, setFleet] = useState(null);
  const [routePerf, setRoutePerf] = useState([]);
  const [delays, setDelays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [dayRange, setDayRange] = useState(7);

  /* ── fetch all ── */
  const fetchAll = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [s, h, d, f, r, dl] = await Promise.all([
        getDashboardStats(),
        getHourlyTrips(),
        getDailyTrips(dayRange),
        getFleetStatus(),
        getRoutePerformance(),
        getDelayDistribution(),
      ]);
      setStats(s.data);
      setHourly(h.data);
      setDaily(d.data);
      setFleet(f.data);
      setRoutePerf(r.data);
      setDelays(dl.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [dayRange]);

  /* initial + auto-refresh */
  useEffect(() => {
    fetchAll(true);
    const timer = setInterval(() => fetchAll(false), REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchAll]);

  /* ── header ── */
  const Header = () => (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ sm: "center" }}
      spacing={1}
      sx={{ mb: 3 }}
    >
      <Box>
        <Typography variant="h5" fontWeight={800}>
          Transport Analytics
        </Typography>
      </Box>

      <Stack direction="row" alignItems="center" spacing={1.5}>
        {/* Day range toggle */}
        <ToggleButtonGroup
          size="small"
          exclusive
          value={dayRange}
          onChange={(_, v) => v && setDayRange(v)}
          sx={{ "& .MuiToggleButton-root": { fontSize: 11, px: 1.5 } }}
        >
          <ToggleButton value={7}>7D</ToggleButton>
          <ToggleButton value={14}>14D</ToggleButton>
          <ToggleButton value={30}>30D</ToggleButton>
        </ToggleButtonGroup>

        {/* Live indicator */}
        <Chip
          size="small"
          icon={<FiberManualRecord sx={{ fontSize: 10, color: "#2e7d32" }} />}
          label={
            lastRefresh
              ? `Updated ${lastRefresh.toLocaleTimeString()}`
              : "Loading…"
          }
          variant="outlined"
          sx={{ fontSize: 11, height: 28 }}
        />

        {/* Manual refresh */}
        <Tooltip title="Refresh now">
          <IconButton
            size="small"
            onClick={() => fetchAll(false)}
            sx={{ border: "1px solid", borderColor: "grey.300" }}
          >
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );

  /* ── loading screen ── */
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Loading analytics…
          </Typography>
        </Stack>
      </Box>
    );
  }

  /* ── dashboard ── */
  return (
    <Box sx={{ maxWidth: 1400, mx: "auto" }}>
      <Header />

      {/* ROW 1 — KPI Cards */}
      <KpiCards stats={stats} />

      {/* ROW 2 — Daily trend + Hourly distribution */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "3fr 2fr" },
          gap: 2.5,
          mt: 3,
        }}
      >
        <DailyTripChart data={daily} dayRange={dayRange} />
        <HourlyTripChart data={hourly} />
      </Box>

      {/* ROW 3 — Fleet donut + Delay histogram */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "2fr 3fr" },
          gap: 2.5,
          mt: 3,
        }}
      >
        <FleetStatusChart data={fleet} />
        <DelayDistributionChart data={delays} />
      </Box>

      {/* ROW 4 — Route performance table */}
      <Box sx={{ mt: 3 }}>
        <RoutePerformanceTable data={routePerf} />
      </Box>
    </Box>
  );
}

