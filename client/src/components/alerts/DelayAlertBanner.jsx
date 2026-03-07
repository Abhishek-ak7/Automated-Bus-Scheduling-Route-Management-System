import { useState, useEffect, useCallback } from "react";
import { Box, Typography, Stack, IconButton, Slide, Chip } from "@mui/material";
import {
  Warning,
  Close,
  Schedule,
  DirectionsBus,
  NotificationsActive,
} from "@mui/icons-material";

/**
 * Google Transit / Uber-style delay alert banner + toast stack.
 *
 * Props:
 *  - alerts : array of alert objects from socket
 *      { busId, busNumber, routeCode, delayMinutes, eta,
 *        estimatedArrivalFormatted, severity, message }
 *  - variant : "dark" (for ArrivalBoard dark bg) | "light" (default, for TrackBus)
 *  - maxToasts : max visible toast count (default 3)
 */

const SEVERITY_CONFIG = {
  critical: {
    bg: "linear-gradient(135deg, #b71c1c, #d32f2f)",
    bgLight: "#fbe9e7",
    border: "#ef5350",
    icon: "🚨",
    color: "#fff",
    colorLight: "#c62828",
  },
  high: {
    bg: "linear-gradient(135deg, #e65100, #f57c00)",
    bgLight: "#fff3e0",
    border: "#ffa726",
    icon: "⚠️",
    color: "#fff",
    colorLight: "#e65100",
  },
  moderate: {
    bg: "linear-gradient(135deg, #f57f17, #fbc02d)",
    bgLight: "#fffde7",
    border: "#ffee58",
    icon: "⏱️",
    color: "#1a1a1a",
    colorLight: "#f57f17",
  },
};

/* ─── Single Toast ─── */
function DelayToast({ alert, onDismiss, variant = "light" }) {
  const [open, setOpen] = useState(false);
  const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.moderate;
  const isDark = variant === "dark";

  useEffect(() => {
    /* animate in */
    const t1 = setTimeout(() => setOpen(true), 50);
    /* auto-dismiss after 12 s */
    const t2 = setTimeout(() => {
      setOpen(false);
      setTimeout(() => onDismiss(alert._key), 400);
    }, 12000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [alert._key, onDismiss]);

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => onDismiss(alert._key), 400);
  };

  return (
    <Slide direction="down" in={open} mountOnEnter unmountOnExit>
      <Box
        sx={{
          mb: 1.5,
          background: isDark
            ? `rgba(0,0,0,0.7)`
            : sev.bgLight,
          backdropFilter: isDark ? "blur(16px)" : "none",
          border: `1px solid ${isDark ? sev.border + "60" : sev.border + "80"}`,
          borderRadius: 3,
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          minWidth: 320,
          maxWidth: 480,
        }}
      >
        {/* Severity icon */}
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            background: sev.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: 18 }}>{sev.icon}</Typography>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.3 }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 13,
                color: isDark ? "#fff" : sev.colorLight,
                lineHeight: 1.3,
              }}
            >
              Bus {alert.busNumber} delayed by {alert.delayMinutes} min
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Chip
              label={alert.routeCode}
              size="small"
              sx={{
                height: 18,
                fontSize: 10,
                fontWeight: 700,
                bgcolor: isDark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.1)",
                color: isDark ? "#60a5fa" : "#1565c0",
              }}
            />
            <Stack direction="row" alignItems="center" spacing={0.3}>
              <Schedule sx={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.5)" : "#666" }} />
              <Typography
                sx={{
                  fontSize: 11,
                  color: isDark ? "rgba(255,255,255,0.6)" : "#666",
                }}
              >
                Next arrival: <b>{alert.estimatedArrivalFormatted || `${alert.eta} min`}</b>
              </Typography>
            </Stack>
          </Stack>
        </Box>

        {/* Close */}
        <IconButton
          size="small"
          onClick={handleClose}
          sx={{ color: isDark ? "rgba(255,255,255,0.4)" : "#999" }}
        >
          <Close sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Slide>
  );
}

/* ─── Main component: manages alert stack ─── */
export default function DelayAlertBanner({ alerts = [], variant = "light", maxToasts = 3 }) {
  const [visibleAlerts, setVisibleAlerts] = useState([]);

  /* Add new alerts to visible stack */
  useEffect(() => {
    if (alerts.length === 0) return;
    const latest = alerts[alerts.length - 1];
    if (!latest) return;

    setVisibleAlerts((prev) => {
      /* de-dup by busId — replace existing alert for same bus */
      const filtered = prev.filter((a) => a.busId !== latest.busId);
      const updated = [...filtered, latest].slice(-maxToasts);
      return updated;
    });
  }, [alerts, maxToasts]);

  const handleDismiss = useCallback((key) => {
    setVisibleAlerts((prev) => prev.filter((a) => a._key !== key));
  }, []);

  if (visibleAlerts.length === 0) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pointerEvents: "none",
        "& > *": { pointerEvents: "auto" },
      }}
    >
      {visibleAlerts.map((alert) => (
        <DelayToast
          key={alert._key}
          alert={alert}
          variant={variant}
          onDismiss={handleDismiss}
        />
      ))}
    </Box>
  );
}
