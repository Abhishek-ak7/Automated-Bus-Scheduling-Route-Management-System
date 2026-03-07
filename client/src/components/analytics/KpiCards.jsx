import { Box, Card, CardContent, Typography, Chip, Stack } from "@mui/material";
import {
  DirectionsBus,
  Route as RouteIcon,
  CheckCircle,
  Timer,
  TrendingUp,
  TrendingDown,
  Schedule,
  Cancel,
} from "@mui/icons-material";

const kpiConfig = [
  {
    key: "activeBuses",
    label: "Active Buses",
    icon: DirectionsBus,
    color: "#1976d2",
    bg: "#e3f2fd",
    trendKey: null,
    suffix: "",
    sub: (s) => `${s.totalBuses || 0} total fleet`,
  },
  {
    key: "tripsToday",
    label: "Trips Today",
    icon: RouteIcon,
    color: "#7b1fa2",
    bg: "#f3e5f5",
    trendKey: "trips",
    suffix: "",
    sub: (s) => `${s.scheduledTrips || 0} scheduled · ${s.completedTrips || 0} done`,
  },
  {
    key: "onTimePercentage",
    label: "On-Time Rate",
    icon: CheckCircle,
    color: "#2e7d32",
    bg: "#e8f5e9",
    trendKey: "onTime",
    suffix: "%",
    sub: () => "≤ 5 min delay = on time",
  },
  {
    key: "avgDelay",
    label: "Avg Delay",
    icon: Timer,
    color: "#ed6c02",
    bg: "#fff3e0",
    trendKey: "delay",
    suffix: " min",
    sub: () => "completed trips today",
    invertTrend: true,
  },
];

function TrendBadge({ value, invert }) {
  if (value === 0 || value === undefined) return null;
  const isPositive = invert ? value < 0 : value > 0;
  return (
    <Chip
      size="small"
      icon={isPositive ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
      label={`${value > 0 ? "+" : ""}${value}%`}
      sx={{
        fontWeight: 700,
        fontSize: 11,
        height: 22,
        bgcolor: isPositive ? "#e8f5e9" : "#fbe9e7",
        color: isPositive ? "#2e7d32" : "#c62828",
        "& .MuiChip-icon": { color: "inherit" },
      }}
    />
  );
}

export default function KpiCards({ stats }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" },
        gap: 2.5,
      }}
    >
      {kpiConfig.map((kpi) => {
        const Icon = kpi.icon;
        const value = stats?.[kpi.key] ?? "–";
        const trend = kpi.trendKey ? stats?.trends?.[kpi.trendKey] : null;

        return (
          <Card
            key={kpi.key}
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: "grey.200",
              transition: "box-shadow .2s, transform .2s",
              "&:hover": {
                boxShadow: "0 8px 24px rgba(0,0,0,.08)",
                transform: "translateY(-2px)",
              },
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
                      {value}
                      {kpi.suffix}
                    </Typography>
                    <TrendBadge value={trend} invert={kpi.invertTrend} />
                  </Stack>
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
                    {kpi.sub(stats || {})}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
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
  );
}
