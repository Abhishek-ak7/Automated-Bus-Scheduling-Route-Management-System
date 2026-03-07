import { Box, Typography, Stack, Tooltip } from "@mui/material";
import {
  DirectionsBus,
  FiberManualRecord,
  CheckCircle,
  RadioButtonUnchecked,
  Flag,
  Place,
} from "@mui/icons-material";

/**
 * Uber / BlaBlaCar / FlixBus-style horizontal route progress bar.
 *
 * Props:
 *  - stops            : [{ _id, stopName, stopCode, status, eta }]
 *  - currentStopIndex : index of last visited stop (-1 = hasn't started)
 *  - completionPct    : 0-100
 *  - compact          : boolean (for passenger view — hides some labels)
 */
export default function RouteProgressBar({
  stops = [],
  currentStopIndex = -1,
  completionPct = 0,
  compact = false,
}) {
  if (stops.length === 0) return null;

  /* colour palette */
  const c = {
    visited: "#2e7d32",
    current: "#1976d2",
    upcoming: "#bdbdbd",
    track: "#e0e0e0",
    trackDone: "#66bb6a",
    bus: "#1565c0",
  };

  /* next stop index */
  const nextIdx = currentStopIndex + 1;

  return (
    <Box sx={{ width: "100%", py: compact ? 1 : 2, px: compact ? 0 : 1, userSelect: "none" }}>

      {/* ── The horizontal progress track ── */}
      <Box sx={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>

        {stops.map((stop, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === stops.length - 1;
          const isVisited = idx <= currentStopIndex;
          const isNext = idx === nextIdx;
          const isUpcoming = idx > nextIdx;

          return (
            <Box
              key={stop._id || idx}
              sx={{
                display: "flex",
                alignItems: "center",
                flex: isLast ? "0 0 auto" : 1,
              }}
            >
              {/* ── Stop node ── */}
              <Tooltip
                title={
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="caption" fontWeight={700}>{stop.stopName}</Typography>
                    {stop.eta !== null && stop.eta !== undefined && !isVisited && (
                      <Typography variant="caption" display="block">
                        ETA: {stop.eta} min
                      </Typography>
                    )}
                    {isVisited && (
                      <Typography variant="caption" display="block" sx={{ color: "#a5d6a7" }}>
                        ✓ Passed
                      </Typography>
                    )}
                  </Box>
                }
                arrow
                placement="top"
              >
                <Box
                  sx={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    zIndex: 2,
                    cursor: "default",
                  }}
                >
                  {/* Bus icon riding above the current/next stop */}
                  {isNext && (
                    <DirectionsBus
                      sx={{
                        color: c.bus,
                        fontSize: compact ? 20 : 26,
                        position: "absolute",
                        top: compact ? -20 : -28,
                        animation: "busBounce 1.2s ease-in-out infinite",
                        "@keyframes busBounce": {
                          "0%, 100%": { transform: "translateY(0)" },
                          "50%": { transform: "translateY(-4px)" },
                        },
                      }}
                    />
                  )}

                  {/* The dot/icon for each stop */}
                  {isFirst ? (
                    <Place
                      sx={{
                        fontSize: compact ? 18 : 22,
                        color: isVisited ? c.visited : c.upcoming,
                      }}
                    />
                  ) : isLast ? (
                    <Flag
                      sx={{
                        fontSize: compact ? 18 : 22,
                        color: isVisited ? c.visited : c.upcoming,
                      }}
                    />
                  ) : isVisited ? (
                    <CheckCircle sx={{ fontSize: compact ? 14 : 18, color: c.visited }} />
                  ) : isNext ? (
                    <FiberManualRecord
                      sx={{
                        fontSize: compact ? 14 : 18,
                        color: c.current,
                        animation: "pulse 1.5s ease-in-out infinite",
                        "@keyframes pulse": {
                          "0%, 100%": { opacity: 1, transform: "scale(1)" },
                          "50%": { opacity: 0.6, transform: "scale(1.3)" },
                        },
                      }}
                    />
                  ) : (
                    <RadioButtonUnchecked
                      sx={{ fontSize: compact ? 12 : 16, color: c.upcoming }}
                    />
                  )}
                </Box>
              </Tooltip>

              {/* ── Connecting line segment ── */}
              {!isLast && (
                <Box
                  sx={{
                    flex: 1,
                    height: compact ? 3 : 4,
                    mx: 0.3,
                    borderRadius: 2,
                    bgcolor: c.track,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Filled portion */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: "100%",
                      borderRadius: 2,
                      bgcolor: c.trackDone,
                      width:
                        idx < currentStopIndex
                          ? "100%"
                          : idx === currentStopIndex
                          ? "50%"   /* bus is between this stop and next */
                          : "0%",
                      transition: "width 1s ease",
                    }}
                  />
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* ── Stop name labels ── */}
      {!compact && (
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            width: "100%",
            mt: 0.5,
          }}
        >
          {stops.map((stop, idx) => {
            const isLast = idx === stops.length - 1;
            const isVisited = idx <= currentStopIndex;
            const isNext = idx === nextIdx;

            return (
              <Box
                key={stop._id || idx}
                sx={{
                  flex: isLast ? "0 0 auto" : 1,
                  display: "flex",
                  justifyContent: "flex-start",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: 10,
                    fontWeight: isNext ? 700 : 500,
                    color: isVisited
                      ? c.visited
                      : isNext
                      ? c.current
                      : "text.disabled",
                    maxWidth: 70,
                    textAlign: "center",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {stop.stopName}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── Bottom summary ── */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mt: compact ? 0.5 : 1 }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
          {currentStopIndex + 1} of {stops.length} stops passed
        </Typography>
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{
            fontSize: 11,
            color: completionPct >= 80 ? c.visited : completionPct >= 40 ? "#ed6c02" : c.current,
          }}
        >
          {completionPct}% complete
        </Typography>
      </Stack>
    </Box>
  );
}
