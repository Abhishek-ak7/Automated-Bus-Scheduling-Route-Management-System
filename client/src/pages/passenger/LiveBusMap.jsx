import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
  Marker,
  useMap,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import {
  Box,
  Typography,
  Stack,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Slide,
  Avatar,
  Divider,
  Skeleton,
  Fab,
  Button,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import {
  Search,
  DirectionsBus,
  Close,
  Place,
  Speed,
  FiberManualRecord,
  Route as RouteIcon,
  Layers,
  GpsFixed,
  AccessTime,
  Circle,
  Map as MapIcon,
  ArrowBack,
  MyLocation,
  Navigation,
  FilterList,
} from "@mui/icons-material";
import { io } from "socket.io-client";
import AnimatedBusMarker from "../../components/tracking/AnimatedBusMarker";
import { getAllRoutes } from "../../services/routeService";

/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS  (Google Maps / Uber / redBus inspired)
   ═══════════════════════════════════════════════════════ */
const T = {
  surface: "#ffffff",
  glass: "rgba(255,255,255,0.95)",
  border: "#e8eaed",
  primary: "#1a73e8",
  primaryDark: "#1557b0",
  accent: "#ea4335",
  green: "#0d9e3f",
  orange: "#f59e0b",
  text1: "#1a1a2e",
  text2: "#5f6368",
  text3: "#9aa0a6",
  shadow: "0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
  shadowLg: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
};

const ROUTE_COLORS = [
  "#1a73e8", "#ea4335", "#34a853", "#fbbc04", "#9334e6",
  "#e91e63", "#00bcd4", "#ff5722", "#607d8b", "#795548",
];

const TILES = {
  default: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attr: '&copy; <a href="https://carto.com">CARTO</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attr: '&copy; <a href="https://carto.com">CARTO</a>',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr: "&copy; Esri",
  },
};

/* ═══════════════════════════════════════════════════════
   UTIL: hex → rgba
   ═══════════════════════════════════════════════════════ */
const alpha = (hex, a) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
};

/* ═══════════════════════════════════════════════════════
   SVG BUS ICON — per-route colour, animated pulse ring
   ═══════════════════════════════════════════════════════ */
const busIconCache = {};
const makeBusIcon = (color = "#1a73e8", heading = 0) => {
  const key = `${color}-${Math.round(heading / 10) * 10}`;
  if (busIconCache[key]) return busIconCache[key];

  /*  NOTE: Avoid SVG <filter> + url(#id) inside L.divIcon — browsers
      resolve the fragment relative to the page URL, so the filter
      silently fails and the whole <g> disappears.
      Using CSS drop-shadow on the wrapper div instead.              */
  const html = `
    <div style="
      width:52px;height:52px;position:relative;
      filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52"
           style="transform:rotate(${heading}deg);transform-origin:center;">
        <!-- pulse ring -->
        <circle cx="26" cy="26" r="24" fill="${color}" opacity="0.10">
          <animate attributeName="r" values="20;25;20" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.12;0.04;0.12" dur="2s" repeatCount="indefinite"/>
        </circle>
        <!-- body -->
        <rect x="15" y="11" width="22" height="30" rx="6" fill="${color}" stroke="#fff" stroke-width="2.5"/>
        <!-- windshield -->
        <rect x="18" y="14" width="16" height="9" rx="3" fill="#fff" opacity="0.92"/>
        <!-- headlights -->
        <circle cx="20" cy="13" r="1.5" fill="#ffd700"/>
        <circle cx="32" cy="13" r="1.5" fill="#ffd700"/>
        <!-- stripe -->
        <line x1="37" y1="26" x2="37" y2="34" stroke="#fff" stroke-width="1.5" opacity="0.6"/>
        <!-- wheels -->
        <circle cx="19" cy="38" r="2.8" fill="#222" stroke="#fff" stroke-width="1.2"/>
        <circle cx="33" cy="38" r="2.8" fill="#222" stroke="#fff" stroke-width="1.2"/>
        <!-- direction arrow -->
        <polygon points="26,7 22,12 30,12" fill="#fff" opacity="0.85"/>
      </svg>
    </div>`;

  const icon = L.divIcon({
    html,
    className: "",
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -26],
  });
  busIconCache[key] = icon;
  return icon;
};

/* ═══════════════════════════════════════════════════════
   USER LOCATION — Google Maps blue pulsing dot
   ═══════════════════════════════════════════════════════ */
const userLocationIcon = L.divIcon({
  html: `
    <div style="position:relative;width:40px;height:40px;">
      <div style="
        position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:36px;height:36px;border-radius:50%;
        background:rgba(66,133,244,0.15);
        animation:userPulse 2s ease-out infinite;
      "></div>
      <div style="
        position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:16px;height:16px;border-radius:50%;
        background:#4285F4;border:3px solid #fff;
        box-shadow:0 1px 6px rgba(0,0,0,0.3);
      "></div>
    </div>
    <style>
      @keyframes userPulse {
        0% { transform:translate(-50%,-50%) scale(0.8); opacity:1; }
        100% { transform:translate(-50%,-50%) scale(2.2); opacity:0; }
      }
    </style>`,
  className: "",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

/* ═══════════════════════════════════════════════════════
   MAP HELPERS
   ═══════════════════════════════════════════════════════ */
function AutoFitBounds({ points, trigger }) {
  const map = useMap();
  const prevRef = useRef(null);
  useEffect(() => {
    if (!points || points.length === 0) return;
    const key = JSON.stringify(trigger);
    if (prevRef.current === key) return;
    prevRef.current = key;
    if (points.length === 1) {
      map.flyTo(points[0], 14, { duration: 1.2 });
    } else {
      map.flyToBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 15, duration: 1.2 });
    }
  }, [points, trigger, map]);
  return null;
}

function RecenterButton({ position, label }) {
  const map = useMap();
  return (
    <Tooltip title={label || "My location"} placement="left">
      <Fab
        size="small"
        onClick={() => position && map.flyTo(position, 15, { duration: 0.8 })}
        sx={{
          position: "absolute", bottom: 100, right: 14, zIndex: 1000,
          bgcolor: "#fff", color: T.primary, boxShadow: T.shadow,
          "&:hover": { bgcolor: "#f0f4ff" },
        }}
      >
        <MyLocation fontSize="small" />
      </Fab>
    </Tooltip>
  );
}

function ShowAllButton({ buses, routes }) {
  const map = useMap();
  const handleClick = () => {
    const pts = [];
    Object.values(buses).forEach((b) => { if (b.lat && b.lng) pts.push([b.lat, b.lng]); });
    routes.forEach((r) => {
      r.stops?.forEach((s) => {
        if (s.stopId?.location) pts.push([s.stopId.location.lat, s.stopId.location.lng]);
      });
    });
    if (pts.length > 0) map.flyToBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 14, duration: 1 });
  };
  return (
    <Tooltip title="Show all routes & buses" placement="left">
      <Fab
        size="small"
        onClick={handleClick}
        sx={{
          position: "absolute", bottom: 148, right: 14, zIndex: 1000,
          bgcolor: "#fff", color: T.text2, boxShadow: T.shadow,
          "&:hover": { bgcolor: "#f0f4ff" },
        }}
      >
        <FilterList fontSize="small" />
      </Fab>
    </Tooltip>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function LiveBusMap() {
  const isMobile = useMediaQuery("(max-width:768px)");
  const navigate = useNavigate();

  /* Direct socket (no auth needed for passenger live map) */
  const socketRef = useRef(null);

  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState({});
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedBus, setSelectedBus] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [tileMode, setTileMode] = useState("default");
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(!isMobile);
  const [userLocation, setUserLocation] = useState(null);
  const [initialFitDone, setInitialFitDone] = useState(false);
  const mapRef = useRef(null);

  /* ── Load routes ── */
  useEffect(() => {
    (async () => {
      try {
        const data = await getAllRoutes();
        setRoutes(data);
      } catch (e) {
        console.error("Failed to load routes:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── User location (watch for real-time) ── */
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  /* ── Socket: live bus positions (no auth required) ── */
  useEffect(() => {
    const sock = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000");
    socketRef.current = sock;

    sock.on("bus:location:update", (data) => {
      setBuses((prev) => ({
        ...prev,
        [data.busId]: { ...data, updatedAt: Date.now() },
      }));
    });
    return () => {
      sock.disconnect();
      socketRef.current = null;
    };
  }, []);

  /* ══════════════════════════════════════════
     AUTO-FIT on load — collects ALL known coords
     and flies map to show everything.
     This is the KEY fix: map will auto-center
     on routes in Punjab instead of staying on Delhi.
     ══════════════════════════════════════════ */
  const allBoundsPoints = useMemo(() => {
    const pts = [];
    routes.forEach((r) => {
      r.stops?.forEach((s) => {
        if (s.stopId?.location) pts.push([s.stopId.location.lat, s.stopId.location.lng]);
      });
    });
    Object.values(buses).forEach((b) => {
      if (b.lat && b.lng) pts.push([b.lat, b.lng]);
    });
    if (userLocation) pts.push(userLocation);
    return pts;
  }, [routes, buses, userLocation]);

  /* fire once when data arrives */
  useEffect(() => {
    if (!initialFitDone && allBoundsPoints.length > 0) setInitialFitDone(true);
  }, [allBoundsPoints, initialFitDone]);

  /* ── Derived data ── */
  const filteredRoutes = useMemo(() => {
    if (!searchText.trim()) return routes;
    const q = searchText.toLowerCase();
    return routes.filter(
      (r) => r.routeNumber?.toLowerCase().includes(q) || r.routeName?.toLowerCase().includes(q)
    );
  }, [routes, searchText]);

  const routeColorMap = useMemo(() => {
    const m = {};
    routes.forEach((r, i) => { m[r._id] = ROUTE_COLORS[i % ROUTE_COLORS.length]; });
    return m;
  }, [routes]);

  const selectedRouteObj = useMemo(
    () => routes.find((r) => r._id === selectedRoute),
    [routes, selectedRoute]
  );

  const routeStopCoords = useMemo(() => {
    if (!selectedRouteObj?.stops) return [];
    return selectedRouteObj.stops
      .filter((s) => s.stopId?.location)
      .map((s) => [s.stopId.location.lat, s.stopId.location.lng]);
  }, [selectedRouteObj]);

  const allRoutePolylines = useMemo(() => {
    if (selectedRoute) return [];
    return routes
      .filter((r) => r.stops?.length > 1)
      .map((r) => ({
        id: r._id,
        color: routeColorMap[r._id],
        coords: r.stops.filter((s) => s.stopId?.location).map((s) => [s.stopId.location.lat, s.stopId.location.lng]),
      }));
  }, [routes, selectedRoute, routeColorMap]);

  const busesOnRoute = useMemo(() => {
    const all = Object.values(buses);
    if (!selectedRoute) return all;
    return all.filter((b) => b.routeId === selectedRoute);
  }, [buses, selectedRoute]);

  const activeBusCount = Object.keys(buses).length;

  /* fit points for selected route (includes bus positions ON that route) */
  const selectedRouteFitPoints = useMemo(() => {
    const pts = [...routeStopCoords];
    if (selectedRoute) {
      Object.values(buses).forEach((b) => {
        if (b.routeId === selectedRoute && b.lat && b.lng) pts.push([b.lat, b.lng]);
      });
    }
    return pts;
  }, [routeStopCoords, selectedRoute, buses]);

  const handleSelectRoute = useCallback((id) => {
    setSelectedRoute((prev) => (prev === id ? null : id));
    setSelectedBus(null);
  }, []);

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */
  return (
    <Box sx={{ height: "100vh", width: "100%", position: "relative", overflow: "hidden" }}>

      {/* ── TOP BAR ── */}
      <Box
        sx={{
          position: "absolute",
          top: 12,
          left: isMobile ? 12 : panelOpen ? 380 : 12,
          right: 12,
          zIndex: 1100,
          transition: "left 0.3s ease",
          display: "flex",
          gap: 1,
          alignItems: "center",
        }}
      >
        {/* Back button */}
        <Paper elevation={0} sx={{ borderRadius: 20, boxShadow: T.shadow, bgcolor: T.glass, backdropFilter: "blur(12px)" }}>
          <Tooltip title="Back to Arrivals">
            <IconButton size="small" onClick={() => navigate("/arrivals")} sx={{ p: 1 }}>
              <ArrowBack fontSize="small" sx={{ color: T.text1 }} />
            </IconButton>
          </Tooltip>
        </Paper>

        {/* Search */}
        <Paper
          elevation={0}
          sx={{
            flex: 1, maxWidth: 420, borderRadius: 28, boxShadow: T.shadowLg,
            overflow: "hidden", display: "flex", alignItems: "center",
            bgcolor: T.glass, backdropFilter: "blur(12px)",
          }}
        >
          {!panelOpen && (
            <IconButton onClick={() => setPanelOpen(true)} sx={{ ml: 0.5 }}>
              <DirectionsBus sx={{ color: T.primary }} />
            </IconButton>
          )}
          <TextField
            fullWidth
            placeholder="Search route…"
            variant="standard"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              disableUnderline: true,
              startAdornment: panelOpen ? (
                <InputAdornment position="start"><Search sx={{ color: T.text3, ml: 1.5 }} /></InputAdornment>
              ) : null,
              sx: { py: 1.2, px: 1, fontSize: 15 },
            }}
          />
          {searchText && (
            <IconButton onClick={() => setSearchText("")} sx={{ mr: 0.5 }}><Close fontSize="small" /></IconButton>
          )}
        </Paper>

        {/* Live badge */}
        <Chip
          icon={
            <FiberManualRecord
              sx={{
                fontSize: "10px !important", color: "#fff !important",
                animation: activeBusCount > 0 ? "livePulse 1.5s infinite" : "none",
              }}
            />
          }
          label={`${activeBusCount} Live`}
          size="small"
          sx={{
            bgcolor: activeBusCount > 0 ? T.green : T.text3,
            color: "#fff", fontWeight: 700, fontSize: 12, px: 0.5,
            boxShadow: T.shadow, "& .MuiChip-icon": { ml: 0.5 },
            "@keyframes livePulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.3 } },
          }}
        />

        {/* Tile switcher */}
        <Paper elevation={0} sx={{ borderRadius: 20, boxShadow: T.shadow, bgcolor: T.glass, backdropFilter: "blur(12px)" }}>
          <Tooltip title="Change map style">
            <IconButton
              size="small"
              onClick={() => setTileMode((m) => (m === "default" ? "dark" : m === "dark" ? "satellite" : "default"))}
              sx={{ p: 1 }}
            >
              <Layers fontSize="small" sx={{ color: T.text2 }} />
            </IconButton>
          </Tooltip>
        </Paper>
      </Box>

      {/* ── SIDE PANEL ── */}
      <Slide direction="right" in={panelOpen} mountOnEnter unmountOnExit>
        <Paper
          elevation={0}
          sx={{
            position: "absolute", top: 0, left: 0,
            width: isMobile ? "88vw" : 360, height: "100%", zIndex: 1200,
            bgcolor: T.surface, borderRight: `1px solid ${T.border}`,
            boxShadow: T.shadowLg, display: "flex", flexDirection: "column", overflow: "hidden",
          }}
        >
          {/* Header */}
          <Box sx={{ p: 2, pb: 1.5, background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`, color: "#fff" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 40, height: 40 }}><MapIcon /></Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>Live Bus Map</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.85 }}>See all buses in real-time</Typography>
                </Box>
              </Stack>
              <IconButton onClick={() => setPanelOpen(false)} sx={{ color: "#fff" }}><Close fontSize="small" /></IconButton>
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
              <StatBadge icon={<DirectionsBus />} value={activeBusCount} label="Buses Live" />
              <StatBadge icon={<RouteIcon />} value={routes.length} label="Routes" />
              {userLocation && <StatBadge icon={<GpsFixed />} value="ON" label="GPS" />}
            </Stack>
          </Box>

          {/* Quick actions */}
          <Stack direction="row" spacing={1} sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${T.border}` }}>
            <Chip
              label="Trip Planner"
              size="small"
              variant="outlined"
              icon={<Navigation sx={{ fontSize: 14 }} />}
              onClick={() => navigate("/trip-planner")}
              sx={{ fontWeight: 600, fontSize: 12, borderColor: T.accent, color: T.accent }}
            />
            <Chip
              label="All Routes"
              size="small"
              variant={selectedRoute ? "outlined" : "filled"}
              onClick={() => { setSelectedRoute(null); setSelectedBus(null); }}
              sx={{ fontWeight: 600, fontSize: 12, ...(selectedRoute ? { borderColor: T.border, color: T.text2 } : { bgcolor: T.primary, color: "#fff" }) }}
            />
            {selectedRoute && (
              <Chip label="Clear filter" size="small" onDelete={() => { setSelectedRoute(null); setSelectedBus(null); }}
                sx={{ fontWeight: 600, fontSize: 12, borderColor: T.accent, color: T.accent }} variant="outlined" />
            )}
          </Stack>

          {/* Route list */}
          <Box sx={{ flex: 1, overflow: "auto", px: 1, py: 0.5 }}>
            {loading ? (
              <Stack spacing={1} sx={{ p: 1 }}>
                {[...Array(6)].map((_, i) => <Skeleton key={i} variant="rounded" height={56} sx={{ borderRadius: 2 }} />)}
              </Stack>
            ) : filteredRoutes.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 6, color: T.text3 }}>
                <RouteIcon sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
                <Typography variant="body2">No routes found</Typography>
              </Box>
            ) : (
              filteredRoutes.map((route) => {
                const isActive = selectedRoute === route._id;
                const color = routeColorMap[route._id];
                const busCount = Object.values(buses).filter((b) => b.routeId === route._id).length;
                return (
                  <Paper
                    key={route._id} elevation={0}
                    onClick={() => handleSelectRoute(route._id)}
                    sx={{
                      p: 1.5, mb: 0.5, cursor: "pointer", borderRadius: 2.5,
                      border: isActive ? `2px solid ${color}` : "2px solid transparent",
                      bgcolor: isActive ? alpha(color, 0.06) : "transparent",
                      transition: "all 0.2s ease",
                      "&:hover": { bgcolor: isActive ? alpha(color, 0.1) : "#f5f6f8", transform: "translateX(2px)" },
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar sx={{ bgcolor: color, width: 42, height: 42, fontSize: 13, fontWeight: 800 }}>
                        {route.routeNumber || "#"}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap sx={{ color: T.text1, lineHeight: 1.3 }}>
                          {route.routeName || `Route ${route.routeNumber}`}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography variant="caption" sx={{ color: T.text3 }}>{route.stops?.length || 0} stops</Typography>
                          {busCount > 0 && (
                            <>
                              <FiberManualRecord sx={{ fontSize: 4, color: T.text3 }} />
                              <Typography variant="caption" sx={{ color: T.green, fontWeight: 600 }}>
                                {busCount} bus{busCount > 1 ? "es" : ""} live
                              </Typography>
                            </>
                          )}
                        </Stack>
                      </Box>
                      {busCount > 0 && (
                        <Box sx={{ minWidth: 28, height: 28, borderRadius: "50%", bgcolor: alpha(color, 0.12), display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <DirectionsBus sx={{ fontSize: 16, color }} />
                        </Box>
                      )}
                    </Stack>

                    {isActive && route.stops?.length > 0 && (
                      <Box sx={{ mt: 1.5, ml: 2.5 }}>
                        {route.stops.map((s, i) => (
                          <Stack key={i} direction="row" alignItems="center" spacing={1} sx={{ py: 0.3 }}>
                            <Box sx={{ position: "relative", width: 16, display: "flex", flexDirection: "column", alignItems: "center" }}>
                              {i < route.stops.length - 1 && (
                                <Box sx={{ position: "absolute", top: 10, width: 2, height: 22, bgcolor: alpha(color, 0.25) }} />
                              )}
                              <Circle sx={{
                                fontSize: i === 0 || i === route.stops.length - 1 ? 10 : 7,
                                color: i === 0 || i === route.stops.length - 1 ? color : alpha(color, 0.4),
                                zIndex: 1,
                              }} />
                            </Box>
                            <Typography variant="caption" sx={{
                              color: i === 0 || i === route.stops.length - 1 ? T.text1 : T.text2,
                              fontWeight: i === 0 || i === route.stops.length - 1 ? 600 : 400,
                              fontSize: 11.5,
                            }}>
                              {s.stopId?.stopName || `Stop ${i + 1}`}
                            </Typography>
                          </Stack>
                        ))}
                      </Box>
                    )}
                  </Paper>
                );
              })
            )}
          </Box>

          {/* Footer */}
          <Box sx={{ p: 1.5, borderTop: `1px solid ${T.border}` }}>
            <Button
              fullWidth variant="outlined" startIcon={<ArrowBack />}
              onClick={() => navigate("/arrivals")}
              sx={{
                borderRadius: 2.5, textTransform: "none", fontWeight: 600, fontSize: 13,
                borderColor: T.border, color: T.text2,
                "&:hover": { borderColor: T.primary, color: T.primary, bgcolor: alpha(T.primary, 0.04) },
              }}
            >
              Back to Arrival Board
            </Button>
          </Box>
        </Paper>
      </Slide>

      {/* ── SELECTED BUS BOTTOM SHEET ── */}
      <Slide direction="up" in={!!selectedBus} mountOnEnter unmountOnExit>
        <Paper
          elevation={0}
          sx={{
            position: "absolute", bottom: 0,
            left: isMobile ? 0 : panelOpen ? 360 : 0, right: 0,
            zIndex: 1100, borderRadius: "20px 20px 0 0",
            boxShadow: T.shadowLg, bgcolor: T.surface, transition: "left 0.3s ease",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
            <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: T.border }} />
          </Box>
          <Box sx={{ p: 2, pt: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ bgcolor: routeColorMap[selectedBus?.routeId] || T.primary, width: 48, height: 48 }}>
                  <DirectionsBus />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {selectedBus?.progress?.busNumber || selectedBus?.busId || "Bus"}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <FiberManualRecord sx={{ fontSize: 8, color: T.green }} />
                    <Typography variant="caption" color="text.secondary">
                      Live &bull; {selectedBus?.updatedAt ? `${Math.round((Date.now() - selectedBus.updatedAt) / 1000)}s ago` : "now"}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
              <IconButton onClick={() => setSelectedBus(null)}><Close fontSize="small" /></IconButton>
            </Stack>
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap" }}>
              {selectedBus?.nextStop && <InfoBlock icon={<Place sx={{ color: T.accent }} />} label="Next Stop" value={selectedBus.nextStop} />}
              {selectedBus?.eta != null && <InfoBlock icon={<AccessTime sx={{ color: T.primary }} />} label="ETA" value={`${selectedBus.eta} min`} />}
              {selectedBus?.speed != null && <InfoBlock icon={<Speed sx={{ color: T.orange }} />} label="Speed" value={`${Math.round(selectedBus.speed)} km/h`} />}
              <InfoBlock icon={<Navigation sx={{ color: T.green }} />} label="Location" value={`${selectedBus?.lat?.toFixed(4)}, ${selectedBus?.lng?.toFixed(4)}`} />
            </Stack>
            {selectedBus?.progress && (
              <Box sx={{ mt: 1.5 }}>
                <Box sx={{ height: 6, borderRadius: 3, bgcolor: alpha(routeColorMap[selectedBus.routeId] || T.primary, 0.15), overflow: "hidden" }}>
                  <Box sx={{
                    width: `${Math.min(((selectedBus.progress.currentStopIndex || 0) / Math.max(selectedBus.progress.totalStops || 1, 1)) * 100, 100)}%`,
                    height: "100%", borderRadius: 3,
                    bgcolor: routeColorMap[selectedBus.routeId] || T.primary,
                    transition: "width 0.8s ease",
                  }} />
                </Box>
                <Typography variant="caption" sx={{ color: T.text3, mt: 0.3, display: "block" }}>
                  Stop {selectedBus.progress.currentStopIndex || 0} of {selectedBus.progress.totalStops || "?"}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Slide>

      {/* ═════════════════════════════════════
          THE MAP
         ═════════════════════════════════════ */}
      <MapContainer center={[28.6139, 77.209]} zoom={12} zoomControl={false} style={{ height: "100%", width: "100%" }} ref={mapRef}>
        <ZoomControl position="bottomright" />
        <TileLayer url={TILES[tileMode].url} attribution={TILES[tileMode].attr} />

        {/* Auto-fit: fly to all data on initial load */}
        {initialFitDone && <AutoFitBounds points={allBoundsPoints} trigger="initial" />}

        {/* Auto-fit: when a specific route is selected */}
        {selectedRoute && selectedRouteFitPoints.length > 0 && (
          <AutoFitBounds points={selectedRouteFitPoints} trigger={selectedRoute} />
        )}

        {/* FAB buttons */}
        {userLocation && <RecenterButton position={userLocation} label="My location" />}
        <ShowAllButton buses={buses} routes={routes} />

        {/* All route polylines (overview — dashed) */}
        {allRoutePolylines.map((rp) => (
          <Polyline key={rp.id} positions={rp.coords} pathOptions={{ color: rp.color, weight: 4, opacity: 0.5, dashArray: "8 6" }} />
        ))}

        {/* Selected route polyline (bold + glow) */}
        {routeStopCoords.length > 1 && (
          <>
            <Polyline positions={routeStopCoords} pathOptions={{ color: routeColorMap[selectedRoute] || T.primary, weight: 12, opacity: 0.12 }} />
            <Polyline positions={routeStopCoords} pathOptions={{ color: routeColorMap[selectedRoute] || T.primary, weight: 5, opacity: 0.9 }} />
          </>
        )}

        {/* Stop markers for selected route */}
        {selectedRouteObj?.stops?.map((s, i) => {
          if (!s.stopId?.location) return null;
          const pos = [s.stopId.location.lat, s.stopId.location.lng];
          const isTerminal = i === 0 || i === selectedRouteObj.stops.length - 1;
          const color = routeColorMap[selectedRoute] || T.primary;
          return (
            <CircleMarker key={i} center={pos} radius={isTerminal ? 8 : 5}
              pathOptions={{ color, fillColor: isTerminal ? color : "#fff", fillOpacity: 1, weight: isTerminal ? 3 : 2 }}>
              <Popup>
                <div style={{ fontFamily: "system-ui", minWidth: 120 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                    {isTerminal ? (i === 0 ? "🟢" : "🔴") : "📍"} {s.stopId.stopName || `Stop ${i + 1}`}
                  </div>
                  <div style={{ fontSize: 11, color: "#5f6368" }}>
                    {isTerminal ? (i === 0 ? "First stop (Origin)" : "Last stop (Destination)") : `Stop #${i + 1}`}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* User location — Google Maps blue pulsing dot */}
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup>
              <div style={{ fontFamily: "system-ui", textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>📍 You are here</div>
                <div style={{ fontSize: 11, color: "#5f6368", marginTop: 2 }}>
                  {userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Live bus markers — animated smooth glide */}
        {busesOnRoute.map((bus) => {
          const color = routeColorMap[bus.routeId] || T.primary;
          return (
            <AnimatedBusMarker
              key={bus.busId}
              position={[bus.lat, bus.lng]}
              icon={makeBusIcon(color, bus.heading || 0)}
              duration={2500}
              popupContent={`
                <div style="font-family:system-ui;min-width:180px;padding:4px 0;">
                  <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:#1a1a2e;">
                    🚍 ${bus.progress?.busNumber || bus.busId}
                  </div>
                  <div style="font-size:12px;color:#5f6368;line-height:1.6;">
                    ${bus.nextStop ? `<b>Next:</b> ${bus.nextStop}<br/>` : ""}
                    ${bus.eta != null ? `<b>ETA:</b> ${bus.eta} min<br/>` : ""}
                    ${bus.speed != null ? `<b>Speed:</b> ${Math.round(bus.speed)} km/h<br/>` : ""}
                    <b>Pos:</b> ${bus.lat?.toFixed(4)}, ${bus.lng?.toFixed(4)}
                  </div>
                </div>
              `}
            />
          );
        })}
      </MapContainer>

      {/* Mobile panel toggle */}
      {isMobile && !panelOpen && (
        <Fab size="medium" onClick={() => setPanelOpen(true)}
          sx={{ position: "absolute", bottom: 20, left: 16, zIndex: 1100, bgcolor: T.primary, color: "#fff", boxShadow: T.shadowLg, "&:hover": { bgcolor: T.primaryDark } }}>
          <RouteIcon />
        </Fab>
      )}

      {/* No-buses hint */}
      {!loading && activeBusCount === 0 && (
        <Paper elevation={0} sx={{
          position: "absolute", bottom: isMobile ? 70 : 20, left: "50%", transform: "translateX(-50%)",
          zIndex: 1050, px: 2.5, py: 1.2, borderRadius: 3,
          bgcolor: T.glass, backdropFilter: "blur(12px)", boxShadow: T.shadowLg,
          display: "flex", alignItems: "center", gap: 1,
        }}>
          <DirectionsBus sx={{ color: T.text3, fontSize: 20 }} />
          <Typography sx={{ color: T.text2, fontSize: 13, fontWeight: 500 }}>
            No buses running right now — start{" "}
            <code style={{ fontSize: 12, background: "#f0f0f0", padding: "1px 5px", borderRadius: 4 }}>node driver.js</code>{" "}
            to simulate
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */
function StatBadge({ icon, value, label }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.8}
      sx={{ bgcolor: "rgba(255,255,255,0.15)", borderRadius: 2, px: 1.5, py: 0.6 }}>
      <Box sx={{ opacity: 0.9, display: "flex", "& svg": { fontSize: 16 } }}>{icon}</Box>
      <Box>
        <Typography variant="body2" fontWeight={800} lineHeight={1}>{value}</Typography>
        <Typography variant="caption" sx={{ opacity: 0.7, fontSize: 10 }}>{label}</Typography>
      </Box>
    </Stack>
  );
}

function InfoBlock({ icon, label, value }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
      <Box sx={{ display: "flex" }}>{icon}</Box>
      <Box>
        <Typography variant="caption" sx={{ color: "#9aa0a6", fontSize: 10 }}>{label}</Typography>
        <Typography variant="body2" fontWeight={700} lineHeight={1.2}>{value}</Typography>
      </Box>
    </Stack>
  );
}
