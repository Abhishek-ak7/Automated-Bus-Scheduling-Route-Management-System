import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Chip,
  Divider,
  LinearProgress,
} from "@mui/material";
import {
  DirectionsBus,
  Schedule,
  Speed,
  AltRoute,
} from "@mui/icons-material";
import RouteProgressBar from "./RouteProgressBar";

/**
 * Full trip progress card — combines header info + route progress bar.
 *
 * Props  (all from socket progress payload):
 *  - progress : { routeName, routeCode, routeType, busNumber, busType,
 *                 delayMinutes, actualStartTime, currentStopIndex,
 *                 totalStops, completionPct, stops }
 *  - bus      : { lat, lng, eta, nextStop }
 *  - compact  : boolean (passenger mode)
 */
export default function TripProgressCard({ progress, bus, compact = false }) {
  if (!progress) {
    return (
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "grey.200",
          p: 2,
          textAlign: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No active trip — waiting for bus…
        </Typography>
      </Card>
    );
  }

  const typeColor = { express: "error", local: "primary", feeder: "warning" };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "grey.200",
        overflow: "visible",
      }}
    >
      <CardContent sx={{ p: compact ? 2 : 2.5, "&:last-child": { pb: compact ? 2 : 2.5 } }}>

        {/* ── HEADER ── */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AltRoute sx={{ color: "primary.main", fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={700}>
                {progress.routeCode} — {progress.routeName}
              </Typography>
              <Chip
                label={progress.routeType}
                size="small"
                color={typeColor[progress.routeType] || "default"}
                variant="outlined"
                sx={{ fontSize: 10, height: 20 }}
              />
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <DirectionsBus sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography variant="caption" color="text.secondary">
                  {progress.busNumber} · {progress.busType}
                </Typography>
              </Stack>
              {progress.actualStartTime && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Schedule sx={{ fontSize: 14, color: "text.secondary" }} />
                  <Typography variant="caption" color="text.secondary">
                    Started {new Date(progress.actualStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Box>

          {/* Delay badge */}
          {progress.delayMinutes > 0 ? (
            <Chip
              label={`+${progress.delayMinutes} min late`}
              size="small"
              color="error"
              variant="filled"
              sx={{ fontWeight: 700, fontSize: 11 }}
            />
          ) : (
            <Chip
              label="On Time"
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: 11,
                bgcolor: "#e8f5e9",
                color: "#2e7d32",
              }}
            />
          )}
        </Stack>

        {/* ── Live info bar ── */}
        <Stack
          direction="row"
          spacing={2}
          divider={<Divider orientation="vertical" flexItem />}
          sx={{
            bgcolor: "#f5f5f5",
            borderRadius: 2,
            px: 2,
            py: 1,
            mb: 2,
          }}
        >
          <Box sx={{ textAlign: "center", flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Next Stop</Typography>
            <Typography variant="body2" fontWeight={700}>
              {bus?.nextStop || "—"}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center", flex: 1 }}>
            <Typography variant="caption" color="text.secondary">ETA</Typography>
            <Typography variant="body2" fontWeight={700} color="primary">
              {bus?.eta != null ? `${bus.eta} min` : "—"}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center", flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Progress</Typography>
            <Typography variant="body2" fontWeight={700}>
              {progress.completionPct}%
            </Typography>
          </Box>
        </Stack>

        {/* ── Completion bar (thin) ── */}
        <LinearProgress
          variant="determinate"
          value={progress.completionPct}
          sx={{
            height: 5,
            borderRadius: 3,
            bgcolor: "#e0e0e0",
            mb: 2,
            "& .MuiLinearProgress-bar": {
              borderRadius: 3,
              bgcolor:
                progress.completionPct >= 80
                  ? "#2e7d32"
                  : progress.completionPct >= 40
                  ? "#ed6c02"
                  : "#1976d2",
            },
          }}
        />

        {/* ── The star: Route Progress Bar ── */}
        <RouteProgressBar
          stops={progress.stops}
          currentStopIndex={progress.currentStopIndex}
          completionPct={progress.completionPct}
          compact={compact}
        />
      </CardContent>
    </Card>
  );
}
