import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Chip,
  Divider,
  LinearProgress,
  Alert,
  InputAdornment,
  IconButton,
  Tooltip,
  Skeleton,
  Stack,
  Grow,
  Avatar,
  Button,
  CircularProgress,
  Fab,
} from "@mui/material";
import {
  DirectionsBus,
  Search,
  Refresh,
  Schedule,
  Warning,
  CheckCircle,
  NearMe,
  Place,
  ArrowForwardIos,
  WbSunny,
  NightsStay,
  WbTwilight,
  LocationOn,
  AcUnit,
  ElectricBolt,
  FiberManualRecord,
  SwapVert,
  MyLocation,
  Navigation,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Bolt,
  AccessTime,
  TripOrigin,
  Map as MapIcon,
} from "@mui/icons-material";
import { useSocket } from "../../hooks/useSocket";
import { useDelayAlerts } from "../../hooks/useDelayAlerts";
import {
  getAllStops,
  getArrivals,
  getNearbyStops,
  getMultiStopArrivals,
} from "../../services/stopService";
import DelayAlertBanner from "../../components/alerts/DelayAlertBanner";

/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════ */
const T = {
  bg: "#f7f8fa",
  surface: "#ffffff",
  border: "#ebedf0",
  hover: "#f0f2f5",
  primary: "#1a73e8",
  accent: "#d93025",
  text1: "#1a1a2e",
  text2: "#5f6368",
  text3: "#9aa0a6",
  success: "#0d9e3f",
  warn: "#e8710a",
  danger: "#d93025",
  shadow1: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadow2: "0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
  shadow3: "0 8px 28px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.04)",
  radius: "14px",
};

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */
const etaColor = (eta) => {
  if (eta <= 1) return T.danger;
  if (eta <= 3) return T.warn;
  if (eta <= 8) return T.success;
  return T.primary;
};
const etaPct = (eta) => {
  if (eta <= 1) return 100;
  if (eta >= 20) return 5;
  return Math.max(5, 100 - (eta / 20) * 100);
};
const timeNow = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12)
    return { text: "Good Morning", Icon: WbSunny, color: "#f59e0b" };
  if (h < 17)
    return { text: "Good Afternoon", Icon: WbSunny, color: "#ea580c" };
  if (h < 20)
    return { text: "Good Evening", Icon: WbTwilight, color: "#d97706" };
  return { text: "Good Night", Icon: NightsStay, color: "#6366f1" };
};
const busTypeBadge = (type) => {
  if (type === "AC") return { Icon: AcUnit, color: "#0284c7", bg: "#e0f2fe" };
  if (type === "ELECTRIC")
    return { Icon: ElectricBolt, color: "#16a34a", bg: "#dcfce7" };
  return { Icon: DirectionsBus, color: "#d97706", bg: "#fef3c7" };
};
const fmtDist = (km) => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};
const facilityIcon = (f) => {
  const map = { shelter: "🏠", bench: "🪑", toilet: "🚻", atm: "🏧" };
  return map[f] || "•";
};

/* ═══════════════════════════════════════════════════════
   ETA RING
   ═══════════════════════════════════════════════════════ */
function EtaRing({ eta, size = 68 }) {
  const sw = 3.5;
  const r = (size - sw * 2) / 2;
  const C = 2 * Math.PI * r;
  const pct = eta <= 1 ? 1 : Math.max(0.05, 1 - eta / 25);
  const off = C * (1 - pct);
  const color = etaColor(eta);

  return (
    <Box
      sx={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {eta <= 1 && (
        <Box
          sx={{
            position: "absolute",
            inset: -5,
            borderRadius: "50%",
            background: `radial-gradient(circle,${color}15 0%,transparent 70%)`,
            animation: "ring-glow 1.8s ease-in-out infinite",
          }}
        />
      )}
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)", display: "block" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#f0f0f0"
          strokeWidth={sw}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeDasharray={C}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{
            transition:
              "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1), stroke .5s",
          }}
        />
      </svg>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {eta <= 1 ? (
          <>
            <NearMe
              sx={{ fontSize: 20, color, animation: "bounce .9s infinite" }}
            />
            <Typography
              sx={{
                fontSize: 7,
                fontWeight: 800,
                color,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                mt: 0.1,
              }}
            >
              Now
            </Typography>
          </>
        ) : (
          <>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: size * 0.34,
                lineHeight: 1,
                color,
                fontFeatureSettings: '"tnum"',
              }}
            >
              {eta}
            </Typography>
            <Typography
              sx={{
                fontSize: 8,
                color: T.text3,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              min
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════
   ARRIVAL CARD — used for both single-stop & multi-stop
   ═══════════════════════════════════════════════════════ */
function ArrivalCard({ arrival: a, index, showStop, isFirst }) {
  const bt = busTypeBadge(a.busType);
  const BtIcon = bt.Icon;
  const arriving = a.eta <= 1;

  return (
    <Grow in timeout={300 + index * 80}>
      <Box
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 2,
          display: "flex",
          alignItems: "center",
          gap: { xs: 1.5, sm: 2 },
          position: "relative",
          overflow: "hidden",
          transition: "background .2s",
          cursor: "default",
          "&:hover": { background: T.hover },
          ...(arriving && {
            background: "#fef2f2",
            "&::before": {
              content: '""',
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              borderRadius: "0 4px 4px 0",
              background: T.danger,
            },
          }),
        }}
      >
        <EtaRing eta={a.eta} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* first badge + stop name */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ mb: 0.2 }}
          >
            {isFirst && (
              <Chip
                icon={<Bolt sx={{ fontSize: "12px !important" }} />}
                label="NEXT"
                size="small"
                sx={{
                  height: 18,
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  bgcolor: "#fef3c7",
                  color: "#b45309",
                  borderRadius: "5px",
                  "& .MuiChip-icon": { color: "#b45309" },
                }}
              />
            )}
            {showStop && (
              <Stack direction="row" alignItems="center" spacing={0.3}>
                <TripOrigin sx={{ fontSize: 10, color: T.primary }} />
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: T.primary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 160,
                  }}
                >
                  {a.stopName}
                </Typography>
              </Stack>
            )}
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            spacing={0.8}
            sx={{ mb: 0.3 }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: { xs: 14, sm: 15 },
                color: T.text1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {a.routeName}
            </Typography>
            <Chip
              label={a.routeCode}
              size="small"
              sx={{
                height: 20,
                fontSize: 10,
                fontWeight: 700,
                bgcolor: "#e8f0fe",
                color: T.primary,
                borderRadius: "6px",
              }}
            />
          </Stack>

          <Typography
            sx={{ color: T.text3, fontSize: 12, fontWeight: 500, mb: 0.6 }}
          >
            Bus {a.busNumber}
          </Typography>

          <Stack
            direction="row"
            spacing={0.6}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <Chip
              icon={<BtIcon sx={{ fontSize: "12px !important" }} />}
              label={a.busType}
              size="small"
              sx={{
                height: 20,
                fontSize: 10,
                fontWeight: 600,
                borderRadius: "6px",
                bgcolor: bt.bg,
                color: bt.color,
                "& .MuiChip-icon": { color: bt.color },
              }}
            />
            {a.delay > 0 ? (
              <Chip
                icon={<Warning sx={{ fontSize: "12px !important" }} />}
                label={`${a.delay} min late`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: 10,
                  fontWeight: 600,
                  borderRadius: "6px",
                  bgcolor: "#fef2f2",
                  color: T.danger,
                  "& .MuiChip-icon": { color: T.danger },
                }}
              />
            ) : (
              <Chip
                icon={<CheckCircle sx={{ fontSize: "12px !important" }} />}
                label="On time"
                size="small"
                sx={{
                  height: 20,
                  fontSize: 10,
                  fontWeight: 600,
                  borderRadius: "6px",
                  bgcolor: "#f0fdf4",
                  color: T.success,
                  "& .MuiChip-icon": { color: T.success },
                }}
              />
            )}
          </Stack>

          <LinearProgress
            variant="determinate"
            value={etaPct(a.eta)}
            sx={{
              mt: 1,
              height: 3,
              borderRadius: 2,
              bgcolor: "#f0f0f0",
              "& .MuiLinearProgress-bar": {
                borderRadius: 2,
                bgcolor: etaColor(a.eta),
                transition: "transform 1s cubic-bezier(.4,0,.2,1)",
              },
            }}
          />
        </Box>

        <ArrowForwardIos sx={{ fontSize: 14, color: T.text3, opacity: 0.4 }} />
      </Box>
    </Grow>
  );
}

/* ═══════════════════════════════════════════════════════
   NEARBY STOP CARD with mini‑arrival preview
   ═══════════════════════════════════════════════════════ */
function NearbyStopCard({
  stop: s,
  index,
  onSelect,
  isSelected,
  upcomingBuses,
}) {
  const hasRoutes = s.routes && s.routes.length > 0;
  const buses = upcomingBuses || [];

  return (
    <Grow in timeout={200 + index * 60}>
      <Box
        onClick={() => onSelect(s._id)}
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          p: { xs: 1.5, sm: 2 },
          borderRadius: "12px",
          cursor: "pointer",
          bgcolor: isSelected ? "#e8f0fe" : T.surface,
          border: `1.5px solid ${isSelected ? T.primary : T.border}`,
          boxShadow: isSelected ? `0 0 0 1px ${T.primary}40` : T.shadow1,
          transition: "all .2s cubic-bezier(.4,0,.2,1)",
          "&:hover": {
            boxShadow: T.shadow2,
            borderColor: isSelected ? T.primary : "#d0d5dd",
            transform: "translateY(-1px)",
            "& .arrow": { opacity: 1, color: T.primary },
          },
          "&:active": { transform: "scale(.995)" },
        }}
      >
        {/* avatar + distance */}
        <Box sx={{ position: "relative", flexShrink: 0 }}>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              bgcolor: isSelected ? T.primary : "#e8f0fe",
              borderRadius: "12px",
            }}
          >
            <LocationOn
              sx={{ fontSize: 20, color: isSelected ? "#fff" : T.primary }}
            />
          </Avatar>
          <Chip
            label={fmtDist(s.distance)}
            size="small"
            sx={{
              position: "absolute",
              bottom: -6,
              left: "50%",
              transform: "translateX(-50%)",
              height: 16,
              fontSize: 9,
              fontWeight: 700,
              bgcolor: "#fff",
              color: T.text2,
              border: `1px solid ${T.border}`,
              borderRadius: "8px",
              "& .MuiChip-label": { px: 0.6 },
              boxShadow: T.shadow1,
            }}
          />
        </Box>

        {/* info */}
        <Box sx={{ flex: 1, minWidth: 0, pt: 0.2 }}>
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: 14,
              color: T.text1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              mb: 0.2,
            }}
          >
            {s.stopName}
          </Typography>

          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ mb: 0.5 }}
          >
            <Typography sx={{ fontSize: 11, color: T.text3, fontWeight: 500 }}>
              {s.stopCode}
            </Typography>
            {s.facilities &&
              s.facilities.length > 0 &&
              s.facilities.map((f) => (
                <Tooltip key={f} title={f} arrow>
                  <Typography
                    sx={{ fontSize: 11, lineHeight: 1, cursor: "default" }}
                  >
                    {facilityIcon(f)}
                  </Typography>
                </Tooltip>
              ))}
          </Stack>

          {/* mini-arrival previews — redBus style "Next bus in X min" */}
          {buses.length > 0 ? (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: "wrap", gap: 0.4 }}>
              {buses.slice(0, 3).map((b, bi) => (
                <Chip
                  key={b.busId}
                  icon={
                    <AccessTime
                      sx={{ fontSize: "11px !important" }}
                    />
                  }
                  label={`${b.routeCode} · ${b.eta <= 1 ? "Now" : b.eta + " min"}`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: 10,
                    fontWeight: 600,
                    borderRadius: "6px",
                    bgcolor: bi === 0 ? "#f0fdf4" : "#f0f2f5",
                    color: bi === 0 ? T.success : T.text2,
                    "& .MuiChip-icon": {
                      color: bi === 0 ? T.success : T.text3,
                    },
                  }}
                />
              ))}
              {buses.length > 3 && (
                <Typography
                  sx={{ fontSize: 10, color: T.text3, fontWeight: 500 }}
                >
                  +{buses.length - 3}
                </Typography>
              )}
            </Stack>
          ) : hasRoutes ? (
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.4 }}>
              {s.routes.slice(0, 4).map((r) => (
                <Chip
                  key={r._id}
                  label={r.routeCode || r.routeName}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 9,
                    fontWeight: 600,
                    bgcolor: "#f0f2f5",
                    color: T.text2,
                    borderRadius: "5px",
                    "& .MuiChip-label": { px: 0.5 },
                  }}
                />
              ))}
              {s.routes.length > 4 && (
                <Typography
                  sx={{ fontSize: 10, color: T.text3, alignSelf: "center" }}
                >
                  +{s.routes.length - 4}
                </Typography>
              )}
            </Stack>
          ) : (
            <Typography sx={{ fontSize: 10, color: T.text3 }}>
              No active buses
            </Typography>
          )}
        </Box>

        <ArrowForwardIos
          className="arrow"
          sx={{
            fontSize: 13,
            color: T.text3,
            opacity: 0,
            transition: "all .2s",
            mt: 1.5,
          }}
        />
      </Box>
    </Grow>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function ArrivalBoard() {
  const socket = useSocket();
  const { alerts } = useDelayAlerts(socket);

  const [stops, setStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState("");
  const [stopInfo, setStopInfo] = useState(null);
  const [arrivals, setArrivals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [clock, setClock] = useState(timeNow());
  const [lastUpdated, setLastUpdated] = useState(null);

  /* nearby */
  const [userLoc, setUserLoc] = useState(null);
  const [geoStatus, setGeoStatus] = useState("idle");
  const [nearbyStops, setNearbyStops] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [showAllNearby, setShowAllNearby] = useState(false);

  /* multi-stop upcoming buses */
  const [upcomingBuses, setUpcomingBuses] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);

  const greeting = useMemo(() => getGreeting(), [clock]);
  const arrivalsRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setClock(timeNow()), 10_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    getAllStops()
      .then(setStops)
      .catch(() => setError("Failed to load stops"));
  }, []);

  /* auto-geolocation */
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus("denied");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("granted");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  /* fetch nearby stops */
  useEffect(() => {
    if (!userLoc) return;
    setNearbyLoading(true);
    getNearbyStops(userLoc.lat, userLoc.lng, 5, 12)
      .then(setNearbyStops)
      .catch(() => {})
      .finally(() => setNearbyLoading(false));
  }, [userLoc]);

  /* fetch upcoming buses for top nearby stops */
  useEffect(() => {
    if (nearbyStops.length === 0) return;
    const topIds = nearbyStops.slice(0, 5).map((s) => s._id);
    setUpcomingLoading(true);
    getMultiStopArrivals(topIds)
      .then(setUpcomingBuses)
      .catch(() => {})
      .finally(() => setUpcomingLoading(false));
  }, [nearbyStops]);

  /* refresh upcoming buses every 15s */
  useEffect(() => {
    if (nearbyStops.length === 0) return;
    const topIds = nearbyStops.slice(0, 5).map((s) => s._id);
    const iv = setInterval(() => {
      getMultiStopArrivals(topIds)
        .then(setUpcomingBuses)
        .catch(() => {});
    }, 15_000);
    return () => clearInterval(iv);
  }, [nearbyStops]);

  /* per-stop bus grouping for nearby cards */
  const busesPerStop = useMemo(() => {
    const map = {};
    for (const b of upcomingBuses) {
      if (!map[b.stopId]) map[b.stopId] = [];
      map[b.stopId].push(b);
    }
    return map;
  }, [upcomingBuses]);

  const filteredStops = useMemo(() => {
    if (!searchQuery) return stops;
    const q = searchQuery.toLowerCase();
    return stops.filter(
      (s) =>
        s.stopName.toLowerCase().includes(q) ||
        s.stopCode.toLowerCase().includes(q)
    );
  }, [stops, searchQuery]);

  const fetchArrivals = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getArrivals(id);
      setStopInfo(data.stop);
      setArrivals(data.arrivals);
      setLastUpdated(new Date());
    } catch {
      setError("Failed to load arrivals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!socket || !selectedStop) return;
    socket.emit("watchStop", selectedStop);
    fetchArrivals(selectedStop);
    return () => socket.emit("unwatchStop", selectedStop);
  }, [socket, selectedStop, fetchArrivals]);

  useEffect(() => {
    if (!socket) return;
    const h = (data) => {
      setArrivals((prev) => {
        const idx = prev.findIndex((a) => a.busId === data.busId);
        const entry = {
          busId: data.busId,
          busNumber: data.busNumber,
          busType: data.busType,
          routeName: data.routeName,
          routeCode: data.routeCode,
          eta: data.eta,
          delay: data.delay,
          busLocation: data.busLocation,
        };
        const updated =
          idx !== -1
            ? prev.map((a, i) => (i === idx ? entry : a))
            : [...prev, entry];
        return updated.sort((a, b) => a.eta - b.eta);
      });
      setLastUpdated(new Date());
    };
    socket.on("stop:eta:update", h);
    return () => socket.off("stop:eta:update", h);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const h = (d) =>
      setArrivals((p) => p.filter((a) => a.busId !== d.busId));
    socket.on("trip:completed", h);
    return () => socket.off("trip:completed", h);
  }, [socket]);

  const selectStop = useCallback((id) => {
    setSelectedStop(id);
    setArrivals([]);
    setStopInfo(null);
    setLastUpdated(null);
    setTimeout(
      () =>
        arrivalsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      150
    );
  }, []);

  const handleStopChange = (e) => selectStop(e.target.value);

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("granted");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const visibleNearby = showAllNearby
    ? nearbyStops
    : nearbyStops.slice(0, 4);

  const navigate = useNavigate();

  /* ═════════════════════ RENDER ═════════════════════ */
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: T.bg,
        fontFamily: "'Inter','Segoe UI',sans-serif",
      }}
    >
      <DelayAlertBanner alerts={alerts} variant="light" maxToasts={3} />

      {/* ────── STICKY NAV ────── */}
      <Box
        sx={{
          bgcolor: T.surface,
          borderBottom: `1px solid ${T.border}`,
          boxShadow: T.shadow1,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ maxWidth: 620, mx: "auto", px: 2, py: 1.5 }}
        >
          <Stack direction="row" alignItems="center" spacing={1.2}>
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: T.primary,
                borderRadius: "10px",
              }}
            >
              <DirectionsBus sx={{ fontSize: 18 }} />
            </Avatar>
            <Box>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: T.text1,
                  lineHeight: 1.2,
                }}
              >
                DTC Live
              </Typography>
              <Typography
                sx={{ fontSize: 10, color: T.text3, fontWeight: 500 }}
              >
                Real-time arrivals
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {selectedStop && (
              <Chip
                icon={
                  <FiberManualRecord
                    sx={{
                      fontSize: "8px !important",
                      color: `${T.success} !important`,
                    }}
                  />
                }
                label="LIVE"
                size="small"
                sx={{
                  height: 22,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  bgcolor: "#f0fdf4",
                  color: T.success,
                  borderRadius: "6px",
                  "& .MuiChip-icon": {
                    animation: "pulse-dot 1.5s infinite",
                  },
                }}
              />
            )}
            <Tooltip title="Live Bus Map" arrow>
              <IconButton
                onClick={() => navigate("/live-map")}
                sx={{
                  bgcolor: T.primary,
                  color: "#fff",
                  width: 32,
                  height: 32,
                  "&:hover": { bgcolor: "#1557b0" },
                  boxShadow: "0 2px 6px rgba(26,115,232,0.35)",
                }}
              >
                <MapIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Typography
              sx={{
                fontSize: 12,
                color: T.text3,
                fontWeight: 600,
                fontFeatureSettings: '"tnum"',
              }}
            >
              {clock}
            </Typography>
          </Stack>
        </Stack>
      </Box>

      {/* ────── CONTENT ────── */}
      <Box
        sx={{ maxWidth: 620, mx: "auto", px: { xs: 1.5, sm: 2 }, py: 3 }}
      >
        {/* greeting */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.8}
          sx={{ mb: 0.5 }}
        >
          <greeting.Icon sx={{ fontSize: 16, color: greeting.color }} />
          <Typography
            sx={{ fontSize: 13, color: T.text2, fontWeight: 500 }}
          >
            {greeting.text}
          </Typography>
        </Stack>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: { xs: 24, sm: 28 },
            color: T.text1,
            letterSpacing: "-0.5px",
            lineHeight: 1.15,
            mb: 0.5,
          }}
        >
          Where are you headed?
        </Typography>
        <Typography sx={{ color: T.text3, fontSize: 13, mb: 3 }}>
          Find your stop or browse nearby arrivals
        </Typography>

        {/* ── LIVE MAP BANNER ── */}
        <Box
          onClick={() => navigate("/live-map")}
          sx={{
            background: "linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)",
            borderRadius: T.radius,
            p: { xs: 1.8, sm: 2 },
            mb: 3,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 2,
            boxShadow: "0 4px 16px rgba(26,115,232,0.25)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: "0 6px 24px rgba(26,115,232,0.35)",
            },
          }}
        >
          <Avatar
            sx={{
              bgcolor: "rgba(255,255,255,0.18)",
              width: 44,
              height: 44,
            }}
          >
            <MapIcon sx={{ color: "#fff", fontSize: 22 }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                lineHeight: 1.3,
              }}
            >
              See Live Buses on Map
            </Typography>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.8)",
                fontSize: 11.5,
                fontWeight: 500,
              }}
            >
              Track buses in real-time, Google Maps style
            </Typography>
          </Box>
          <ArrowForwardIos
            sx={{ color: "rgba(255,255,255,0.7)", fontSize: 16 }}
          />
        </Box>

        {/* ── SEARCH + SELECT ── */}
        <Box
          sx={{
            bgcolor: T.surface,
            borderRadius: T.radius,
            boxShadow: T.shadow2,
            border: `1px solid ${T.border}`,
            p: { xs: 2, sm: 2.5 },
            mb: 3,
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search stops…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: T.text3, fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              mb: 1.5,
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                bgcolor: T.bg,
                fontSize: 14,
                "& fieldset": { borderColor: T.border },
                "&:hover fieldset": { borderColor: "#d0d5dd" },
                "&.Mui-focused fieldset": {
                  borderColor: T.primary,
                  borderWidth: 1.5,
                },
              },
              "& input::placeholder": { color: T.text3, fontSize: 13 },
            }}
          />
          <TextField
            select
            fullWidth
            size="small"
            value={selectedStop}
            onChange={handleStopChange}
            label="Choose your stop"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                bgcolor: T.bg,
                fontSize: 14,
                "& fieldset": { borderColor: T.border },
                "&:hover fieldset": { borderColor: "#d0d5dd" },
                "&.Mui-focused fieldset": {
                  borderColor: T.primary,
                  borderWidth: 1.5,
                },
              },
              "& .MuiInputLabel-root": { color: T.text3, fontSize: 13 },
              "& .MuiInputLabel-root.Mui-focused": { color: T.primary },
              "& .MuiSvgIcon-root": { color: T.text3 },
            }}
          >
            <MenuItem value="">
              <em>— Select a stop —</em>
            </MenuItem>
            {filteredStops.map((s) => (
              <MenuItem key={s._id} value={s._id}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ width: "100%" }}
                >
                  <LocationOn sx={{ fontSize: 16, color: T.primary }} />
                  <span style={{ flex: 1, fontSize: 14 }}>{s.stopName}</span>
                  <Chip
                    label={s.stopCode}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: 10,
                      fontWeight: 600,
                      bgcolor: "#f0f0f0",
                      borderRadius: "5px",
                    }}
                  />
                </Stack>
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* ═══════════════════════════════════════════
           UPCOMING BUSES NEAR YOU — multi-stop board
           ═══════════════════════════════════════════ */}
        {geoStatus === "granted" &&
          upcomingBuses.length > 0 &&
          !selectedStop && (
            <Box sx={{ mb: 3 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1.5 }}
              >
                <Stack direction="row" alignItems="center" spacing={0.8}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "8px",
                      bgcolor: "#dcfce7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <DirectionsBus sx={{ fontSize: 15, color: T.success }} />
                  </Box>
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: T.text1,
                        lineHeight: 1.2,
                      }}
                    >
                      Upcoming Buses Near You
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: T.text3 }}>
                      {upcomingBuses.length} bus
                      {upcomingBuses.length !== 1 ? "es" : ""} across nearby
                      stops
                    </Typography>
                  </Box>
                </Stack>
                <Chip
                  icon={
                    <FiberManualRecord
                      sx={{
                        fontSize: "7px !important",
                        color: `${T.success} !important`,
                      }}
                    />
                  }
                  label="Auto-refresh"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: 9,
                    fontWeight: 600,
                    bgcolor: "#f0fdf4",
                    color: T.success,
                    borderRadius: "5px",
                    "& .MuiChip-icon": {
                      animation: "pulse-dot 1.5s infinite",
                    },
                  }}
                />
              </Stack>

              <Box
                sx={{
                  bgcolor: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radius,
                  boxShadow: T.shadow2,
                  overflow: "hidden",
                }}
              >
                {/* header bar */}
                <Box
                  sx={{
                    px: 2.5,
                    py: 1,
                    bgcolor: T.bg,
                    borderBottom: `1px solid ${T.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: T.text3,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                    }}
                  >
                    Next Arrivals
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={0.4}>
                    <SwapVert sx={{ fontSize: 13, color: T.text3 }} />
                    <Typography
                      sx={{ fontSize: 10, color: T.text3, fontWeight: 500 }}
                    >
                      Sorted by ETA
                    </Typography>
                  </Stack>
                </Box>

                {upcomingBuses.slice(0, 6).map((a, i) => (
                  <Box key={`${a.busId}-${a.stopId}`}>
                    {i > 0 && (
                      <Divider sx={{ borderColor: "#f4f4f5" }} />
                    )}
                    <ArrivalCard
                      arrival={a}
                      index={i}
                      showStop
                      isFirst={i === 0}
                    />
                  </Box>
                ))}

                {upcomingBuses.length > 6 && (
                  <Box
                    sx={{
                      px: 2.5,
                      py: 1.2,
                      bgcolor: T.bg,
                      borderTop: `1px solid ${T.border}`,
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      sx={{ fontSize: 11, color: T.text3, fontWeight: 500 }}
                    >
                      +{upcomingBuses.length - 6} more buses arriving nearby
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}

        {/* loading skeleton for upcoming */}
        {geoStatus === "granted" &&
          upcomingLoading &&
          !selectedStop && (
            <Box sx={{ mb: 3 }}>
              <Skeleton
                variant="text"
                width={200}
                sx={{ mb: 1, fontSize: 14 }}
              />
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  height={90}
                  sx={{ mb: 1, borderRadius: T.radius }}
                />
              ))}
            </Box>
          )}

        {/* ═══════════════════════════════════════════
           NEARBY STOPS
           ═══════════════════════════════════════════ */}
        <Box sx={{ mb: 3 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1.5 }}
          >
            <Stack direction="row" alignItems="center" spacing={0.8}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "8px",
                  bgcolor: "#fef3c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Navigation sx={{ fontSize: 15, color: "#d97706" }} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: T.text1,
                    lineHeight: 1.2,
                  }}
                >
                  Stops Near You
                </Typography>
                {userLoc && (
                  <Typography sx={{ fontSize: 10, color: T.text3 }}>
                    Within 5 km · {nearbyStops.length} found
                  </Typography>
                )}
              </Box>
            </Stack>
            {geoStatus !== "granted" && (
              <Button
                startIcon={
                  geoStatus === "loading" ? (
                    <CircularProgress size={14} />
                  ) : (
                    <MyLocation />
                  )
                }
                size="small"
                onClick={requestLocation}
                disabled={geoStatus === "loading"}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: 12,
                  borderRadius: "8px",
                  color: T.primary,
                  border: `1px solid ${T.border}`,
                  px: 1.5,
                  "&:hover": { bgcolor: "#e8f0fe", borderColor: T.primary },
                }}
              >
                {geoStatus === "loading" ? "Locating…" : "Enable Location"}
              </Button>
            )}
          </Stack>

          {/* denied */}
          {geoStatus === "denied" && (
            <Box
              sx={{
                bgcolor: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: T.radius,
                p: 3,
                textAlign: "center",
                boxShadow: T.shadow1,
              }}
            >
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  mx: "auto",
                  mb: 1.5,
                  bgcolor: "#fef3c7",
                }}
              >
                <MyLocation sx={{ fontSize: 22, color: "#d97706" }} />
              </Avatar>
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: T.text1,
                  mb: 0.3,
                }}
              >
                Location access needed
              </Typography>
              <Typography
                sx={{
                  fontSize: 12,
                  color: T.text3,
                  maxWidth: 260,
                  mx: "auto",
                  lineHeight: 1.5,
                  mb: 1.5,
                }}
              >
                Enable location to see bus stops and upcoming buses near you
              </Typography>
              <Button
                variant="contained"
                startIcon={<MyLocation sx={{ fontSize: 16 }} />}
                onClick={requestLocation}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: 13,
                  borderRadius: "10px",
                  bgcolor: T.primary,
                  px: 3,
                  boxShadow: "none",
                  "&:hover": { bgcolor: "#1557b0", boxShadow: T.shadow1 },
                }}
              >
                Share My Location
              </Button>
            </Box>
          )}

          {/* loading */}
          {(nearbyLoading || geoStatus === "loading") &&
            geoStatus !== "denied" && (
              <Stack spacing={1}>
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    variant="rounded"
                    height={80}
                    sx={{ borderRadius: "12px" }}
                  />
                ))}
              </Stack>
            )}

          {/* nearby cards */}
          {geoStatus === "granted" &&
            !nearbyLoading &&
            nearbyStops.length > 0 && (
              <>
                <Stack spacing={1}>
                  {visibleNearby.map((s, i) => (
                    <NearbyStopCard
                      key={s._id}
                      stop={s}
                      index={i}
                      onSelect={selectStop}
                      isSelected={selectedStop === s._id}
                      upcomingBuses={busesPerStop[s._id] || []}
                    />
                  ))}
                </Stack>

                {nearbyStops.length > 4 && (
                  <Button
                    fullWidth
                    size="small"
                    onClick={() => setShowAllNearby((v) => !v)}
                    endIcon={
                      showAllNearby ? (
                        <KeyboardArrowUp />
                      ) : (
                        <KeyboardArrowDown />
                      )
                    }
                    sx={{
                      mt: 1,
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: 12,
                      color: T.primary,
                      borderRadius: "10px",
                      border: `1px solid ${T.border}`,
                      "&:hover": { bgcolor: "#e8f0fe" },
                    }}
                  >
                    {showAllNearby
                      ? "Show less"
                      : `Show all ${nearbyStops.length} stops`}
                  </Button>
                )}
              </>
            )}

          {/* empty */}
          {geoStatus === "granted" &&
            !nearbyLoading &&
            nearbyStops.length === 0 && (
              <Box
                sx={{
                  bgcolor: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radius,
                  p: 3,
                  textAlign: "center",
                }}
              >
                <Typography sx={{ color: T.text3, fontSize: 13 }}>
                  No stops found within 5 km
                </Typography>
              </Box>
            )}
        </Box>

        {/* ── ERROR ── */}
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "10px" }}>
            {error}
          </Alert>
        )}

        {/* ── LOADING ── */}
        {loading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress
              sx={{
                borderRadius: 2,
                mb: 2,
                height: 2,
                bgcolor: "#eee",
                "& .MuiLinearProgress-bar": { bgcolor: T.primary },
              }}
            />
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={90}
                sx={{ mb: 1.5, borderRadius: T.radius }}
              />
            ))}
          </Box>
        )}

        {/* ── STOP INFO BANNER ── */}
        <Box ref={arrivalsRef} />
        {stopInfo && !loading && (
          <Box
            sx={{
              bgcolor: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: T.radius,
              boxShadow: T.shadow1,
              p: 2,
              mb: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.2}>
              <Avatar
                sx={{
                  width: 38,
                  height: 38,
                  bgcolor: "#e8f0fe",
                  borderRadius: "10px",
                }}
              >
                <Place sx={{ fontSize: 20, color: T.primary }} />
              </Avatar>
              <Box>
                <Typography
                  sx={{ fontWeight: 700, fontSize: 15, color: T.text1 }}
                >
                  {stopInfo.stopName}
                </Typography>
                <Typography sx={{ fontSize: 11, color: T.text3 }}>
                  {stopInfo.stopCode} · {arrivals.length} bus
                  {arrivals.length !== 1 ? "es" : ""} approaching
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              {lastUpdated && (
                <Typography sx={{ color: T.text3, fontSize: 10, mr: 0.5 }}>
                  {lastUpdated.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </Typography>
              )}
              <Tooltip title="Refresh">
                <IconButton
                  onClick={() => fetchArrivals(selectedStop)}
                  size="small"
                  sx={{
                    color: T.text3,
                    "&:hover": { color: T.primary, bgcolor: "#e8f0fe" },
                  }}
                >
                  <Refresh sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        )}

        {/* ── ARRIVALS LIST (single stop) ── */}
        {selectedStop && !loading && (
          <Box
            sx={{
              bgcolor: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: T.radius,
              boxShadow: T.shadow2,
              overflow: "hidden",
            }}
          >
            {arrivals.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 7, px: 3 }}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    mx: "auto",
                    mb: 2,
                    bgcolor: T.bg,
                  }}
                >
                  <Schedule
                    sx={{
                      fontSize: 28,
                      color: T.text3,
                      animation: "sway 3s ease-in-out infinite",
                    }}
                  />
                </Avatar>
                <Typography
                  sx={{
                    color: T.text2,
                    fontSize: 16,
                    fontWeight: 600,
                    mb: 0.3,
                  }}
                >
                  No buses right now
                </Typography>
                <Typography
                  sx={{
                    color: T.text3,
                    fontSize: 13,
                    maxWidth: 240,
                    mx: "auto",
                    lineHeight: 1.6,
                  }}
                >
                  Buses will appear here automatically when trips are active
                </Typography>
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    px: 2.5,
                    py: 1.2,
                    bgcolor: T.bg,
                    borderBottom: `1px solid ${T.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: T.text3,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                    }}
                  >
                    Upcoming Arrivals · {arrivals.length} bus
                    {arrivals.length !== 1 ? "es" : ""}
                  </Typography>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.4}
                  >
                    <SwapVert sx={{ fontSize: 13, color: T.text3 }} />
                    <Typography
                      sx={{ fontSize: 10, color: T.text3, fontWeight: 500 }}
                    >
                      By ETA
                    </Typography>
                  </Stack>
                </Box>
                {arrivals.map((a, i) => (
                  <Box key={a.busId}>
                    {i > 0 && (
                      <Divider sx={{ borderColor: "#f4f4f5" }} />
                    )}
                    <ArrivalCard
                      arrival={a}
                      index={i}
                      isFirst={i === 0}
                    />
                  </Box>
                ))}
              </>
            )}
          </Box>
        )}

        {/* ── QUICK SELECT fallback ── */}
        {!selectedStop &&
          stops.length > 0 &&
          geoStatus === "idle" && (
            <Box>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: T.text3,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  mb: 1.5,
                }}
              >
                Popular Stops
              </Typography>
              <Stack spacing={1}>
                {stops.slice(0, 6).map((s, i) => (
                  <Grow in key={s._id} timeout={250 + i * 70}>
                    <Box
                      onClick={() => selectStop(s._id)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: "12px",
                        cursor: "pointer",
                        bgcolor: T.surface,
                        border: `1px solid ${T.border}`,
                        boxShadow: T.shadow1,
                        transition: "all .2s cubic-bezier(.4,0,.2,1)",
                        "&:hover": {
                          boxShadow: T.shadow2,
                          borderColor: "#d0d5dd",
                          transform: "translateY(-1px)",
                          "& .arrow": { opacity: 1, color: T.primary },
                        },
                        "&:active": { transform: "scale(.99)" },
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: "#e8f0fe",
                          borderRadius: "10px",
                        }}
                      >
                        <LocationOn
                          sx={{ fontSize: 18, color: T.primary }}
                        />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            color: T.text1,
                            fontSize: 14,
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.stopName}
                        </Typography>
                        <Typography
                          sx={{
                            color: T.text3,
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                        >
                          {s.stopCode}
                        </Typography>
                      </Box>
                      <ArrowForwardIos
                        className="arrow"
                        sx={{
                          fontSize: 13,
                          color: T.text3,
                          opacity: 0,
                          transition: "all .2s",
                        }}
                      />
                    </Box>
                  </Grow>
                ))}
              </Stack>
            </Box>
          )}

        {/* footer */}
        <Box sx={{ mt: 5, mb: 2, textAlign: "center" }}>
          <Divider sx={{ mb: 2, borderColor: T.border }} />
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            spacing={0.8}
          >
            <DirectionsBus sx={{ fontSize: 14, color: T.text3 }} />
            <Typography
              sx={{ color: T.text3, fontSize: 11, fontWeight: 500 }}
            >
              DTC Bus Tracker · Powered by real-time data
            </Typography>
          </Stack>
        </Box>
      </Box>

      <style>{`
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.7)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        @keyframes ring-glow{0%,100%{opacity:.2;transform:scale(.96)}50%{opacity:.7;transform:scale(1.05)}}
        @keyframes sway{0%,100%{transform:translateX(0) rotate(0)}25%{transform:translateX(3px) rotate(2deg)}75%{transform:translateX(-3px) rotate(-2deg)}}
      `}</style>
    </Box>
  );
}
