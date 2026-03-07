import { useEffect, useState } from "react";
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
} from "@mui/material";
import {
  DirectionsBus,
  Route as RouteIcon,
  CheckCircle,
  Timer,
  Analytics,
  TrendingUp,
  TrendingDown,
} from "@mui/icons-material";
import { getDashboardStats } from "../../services/analyticsService";

const kpis = [
  { key: "activeBuses", label: "Active Buses", icon: DirectionsBus, color: "#1976d2", bg: "#e3f2fd", suffix: "", sub: (s) => `${s.totalBuses || 0} total fleet` },
  { key: "tripsToday", label: "Trips Today", icon: RouteIcon, color: "#7b1fa2", bg: "#f3e5f5", suffix: "", trendKey: "trips", sub: (s) => `${s.completedTrips || 0} completed` },
  { key: "onTimePercentage", label: "On-Time Rate", icon: CheckCircle, color: "#2e7d32", bg: "#e8f5e9", suffix: "%", trendKey: "onTime", sub: () => "vs yesterday" },
  { key: "avgDelay", label: "Avg Delay", icon: Timer, color: "#ed6c02", bg: "#fff3e0", suffix: " min", trendKey: "delay", invert: true, sub: () => "completed trips" },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await getDashboardStats();
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Operations Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Today&apos;s snapshot
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Analytics />}
          onClick={() => navigate("/admin/analytics")}
        >
          Full Analytics
        </Button>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" },
          gap: 2.5,
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
                border: "1px solid",
                borderColor: "grey.200",
                transition: "box-shadow .2s, transform .2s",
                "&:hover": { boxShadow: "0 8px 24px rgba(0,0,0,.08)", transform: "translateY(-2px)" },
              }}
            >
              <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
                      {kpi.label}
                    </Typography>
                    <Stack direction="row" alignItems="baseline" spacing={1}>
                      <Typography variant="h4" fontWeight={700}>
                        {value}{kpi.suffix}
                      </Typography>
                      {trend !== null && trend !== 0 && (
                        <Chip
                          size="small"
                          icon={trendPositive ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                          label={`${trend > 0 ? "+" : ""}${trend}%`}
                          sx={{
                            fontWeight: 700, fontSize: 11, height: 22,
                            bgcolor: trendPositive ? "#e8f5e9" : "#fbe9e7",
                            color: trendPositive ? "#2e7d32" : "#c62828",
                            "& .MuiChip-icon": { color: "inherit" },
                          }}
                        />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
                      {kpi.sub(stats || {})}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48, height: 48, borderRadius: 2,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      bgcolor: kpi.bg,
                    }}
                  >
                    <Icon sx={{ color: kpi.color, fontSize: 26 }} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
