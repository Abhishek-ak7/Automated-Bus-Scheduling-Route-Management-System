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
  Card,
  CardContent,
  Paper,
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
  Route as RouteIcon,
  CalendarToday,
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

/* ── helpers ─────────────────────────────────────────── */
const etaColor = (eta) =>
  eta <= 1 ? "#d93025" : eta <= 3 ? "#e8710a" : eta <= 8 ? "#0d9e3f" : "#1a73e8";

const timeNow = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const busTypeBadge = (type) => {
  if (type === "AC") return { Icon: AcUnit, color: "#0284c7", bg: "#e0f2fe" };
  if (type === "ELECTRIC") return { Icon: ElectricBolt, color: "#16a34a", bg: "#dcfce7" };
  return { Icon: DirectionsBus, color: "#d97706", bg: "#fef3c7" };
};

const fmtDist = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

/* ── ETA Ring ────────────────────────────────────────── */
function EtaRing({ eta, size = 64 }) {
  const sw = 3.5, r = (size - sw * 2) / 2, C = 2 * Math.PI * r;
  const pct = eta <= 1 ? 1 : Math.max(0.05, 1 - eta / 25);
  const color = etaColor(eta);

  return (
    <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {eta <= 1 && (
        <Box sx={{
          position: "absolute", inset: -4, borderRadius: "50%",
          background: `radial-gradient(circle,${color}18 0%,transparent 70%)`,
          animation: "ring-glow 1.8s ease-in-out infinite",
        }} />
      )}
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease, stroke .5s" }}
        />
      </svg>
      <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {eta <= 1 ? (
          <>
            <NearMe sx={{ fontSize: 18, color, animation: "bounce .9s infinite" }} />
            <Typography sx={{ fontSize: 7, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: 0.5 }}>Now</Typography>
          </>
        ) : (
          <>
            <Typography sx={{ fontWeight: 800, fontSize: size * 0.34, lineHeight: 1, color, fontFeatureSettings: '"tnum"' }}>{eta}</Typography>
            <Typography sx={{ fontSize: 8, color: "#9aa0a6", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>min</Typography>
          </>
        )}
      </Box>
    </Box>
  );
}

/* ── Arrival Card ────────────────────────────────────── */
function ArrivalCard({ arrival: a, index, showStop, isFirst }) {
  const bt = busTypeBadge(a.busType);

  return (
    <Grow in timeout={250 + index * 70}>
      <Box sx={{
        px: 2.5, py: 2, display: "flex", alignItems: "center", gap: 2,
        position: "relative", transition: "background .2s", cursor: "default",
        "&:hover": { bgcolor: "#f8f9fa" },
        ...(a.eta <= 1 && {
          bgcolor: "#fef2f2",
          "&::before": {
            content: '""', position: "absolute", left: 0, top: 0, bottom: 0,
            width: 3, borderRadius: "0 4px 4px 0", bgcolor: "#d93025",
          },
        }),
      }}>
        <EtaRing eta={a.eta} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.5} mb={0.3}>
            {isFirst && (
              <Chip icon={<Bolt sx={{ fontSize: "12px !important" }} />} label="NEXT" size="small"
                sx={{ height: 18, fontSize: 9, fontWeight: 800, letterSpacing: 0.5, bgcolor: "#fef3c7", color: "#b45309", borderRadius: "5px", "& .MuiChip-icon": { color: "#b45309" } }}
              />
            )}
            {showStop && (
              <Stack direction="row" alignItems="center" spacing={0.3}>
                <TripOrigin sx={{ fontSize: 10, color: "#1a73e8" }} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#1a73e8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                  {a.stopName}
                </Typography>
              </Stack>
            )}
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.8} mb={0.4}>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {a.routeName}
            </Typography>
            <Chip label={a.routeCode} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: "#e8f0fe", color: "#1a73e8", borderRadius: "6px" }} />
          </Stack>
          <Typography sx={{ color: "#9aa0a6", fontSize: 12, fontWeight: 500, mb: 0.5 }}>Bus {a.busNumber}</Typography>
          <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip icon={<bt.Icon sx={{ fontSize: "12px !important" }} />} label={a.busType} size="small"
              sx={{ height: 20, fontSize: 10, fontWeight: 600, borderRadius: "6px", bgcolor: bt.bg, color: bt.color, "& .MuiChip-icon": { color: bt.color } }}
            />
            <Chip
              icon={a.delay > 0 ? <Warning sx={{ fontSize: "12px !important" }} /> : <CheckCircle sx={{ fontSize: "12px !important" }} />}
              label={a.delay > 0 ? `${a.delay} min late` : "On time"}
              size="small"
              sx={{
                height: 20, fontSize: 10, fontWeight: 600, borderRadius: "6px",
                bgcolor: a.delay > 0 ? "#fef2f2" : "#f0fdf4",
                color: a.delay > 0 ? "#d93025" : "#0d9e3f",
                "& .MuiChip-icon": { color: a.delay > 0 ? "#d93025" : "#0d9e3f" },
              }}
            />
          </Stack>
          <LinearProgress variant="determinate" value={a.eta <= 1 ? 100 : Math.max(5, 100 - (a.eta / 20) * 100)}
            sx={{ mt: 1, height: 3, borderRadius: 2, bgcolor: "#f0f0f0", "& .MuiLinearProgress-bar": { borderRadius: 2, bgcolor: etaColor(a.eta), transition: "transform 1s ease" } }}
          />
        </Box>
        <ArrowForwardIos sx={{ fontSize: 14, color: "#9aa0a6", opacity: 0.4 }} />
      </Box>
    </Grow>
  );
}

/* ── Nearby Stop Card ────────────────────────────────── */
function NearbyStopCard({ stop: s, index, onSelect, isSelected, upcomingBuses = [] }) {
  return (
    <Grow in timeout={200 + index * 60}>
      <Paper elevation={0} onClick={() => onSelect(s._id)}
        sx={{
          display: "flex", alignItems: "center", gap: 1.5, p: 2, borderRadius: 3,
          cursor: "pointer", border: `1.5px solid ${isSelected ? "#d93025" : "#ebedf0"}`,
          bgcolor: isSelected ? "#fce8e6" : "#fff",
          boxShadow: isSelected ? "0 0 0 1px rgba(217,48,37,0.2)" : "0 1px 3px rgba(0,0,0,0.06)",
          transition: "all .2s", "&:hover": { boxShadow: "0 4px 14px rgba(0,0,0,0.07)", transform: "translateY(-1px)" },
        }}
      >
        <Box sx={{ position: "relative", flexShrink: 0 }}>
          <Avatar sx={{ width: 44, height: 44, bgcolor: isSelected ? "#d93025" : "#fce8e6", borderRadius: 3 }}>
            <LocationOn sx={{ fontSize: 20, color: isSelected ? "#fff" : "#d93025" }} />
          </Avatar>
          <Chip label={fmtDist(s.distance)} size="small"
            sx={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", height: 16, fontSize: 9, fontWeight: 700, bgcolor: "#fff", color: "#5f6368", border: "1px solid #ebedf0", borderRadius: 2, "& .MuiChip-label": { px: 0.6 } }}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", mb: 0.3 }}>
            {s.stopName}
          </Typography>
          <Typography sx={{ fontSize: 11, color: "#9aa0a6", fontWeight: 500, mb: 0.5 }}>{s.stopCode}</Typography>
          {upcomingBuses.length > 0 ? (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {upcomingBuses.slice(0, 3).map((b, i) => (
                <Chip key={b.busId} icon={<AccessTime sx={{ fontSize: "11px !important" }} />}
                  label={`${b.routeCode} · ${b.eta <= 1 ? "Now" : b.eta + " min"}`} size="small"
                  sx={{ height: 20, fontSize: 10, fontWeight: 600, borderRadius: "6px", bgcolor: i === 0 ? "#f0fdf4" : "#f0f2f5", color: i === 0 ? "#0d9e3f" : "#5f6368", "& .MuiChip-icon": { color: i === 0 ? "#0d9e3f" : "#9aa0a6" } }}
                />
              ))}
              {upcomingBuses.length > 3 && <Typography sx={{ fontSize: 10, color: "#9aa0a6" }}>+{upcomingBuses.length - 3}</Typography>}
            </Stack>
          ) : (
            <Typography sx={{ fontSize: 10, color: "#9aa0a6" }}>No active buses</Typography>
          )}
        </Box>
        <ArrowForwardIos sx={{ fontSize: 13, color: "#9aa0a6", opacity: 0.3 }} />
      </Paper>
    </Grow>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function ArrivalBoard() {
  const socket = useSocket();
  const { alerts } = useDelayAlerts(socket);
  const navigate = useNavigate();
  const arrivalsRef = useRef(null);

  const [stops, setStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState("");
  const [stopInfo, setStopInfo] = useState(null);
  const [arrivals, setArrivals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [clock, setClock] = useState(timeNow());
  const [lastUpdated, setLastUpdated] = useState(null);

  const [userLoc, setUserLoc] = useState(null);
  const [geoStatus, setGeoStatus] = useState("idle");
  const [nearbyStops, setNearbyStops] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [showAllNearby, setShowAllNearby] = useState(false);
  const [upcomingBuses, setUpcomingBuses] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);

  useEffect(() => { const t = setInterval(() => setClock(timeNow()), 10_000); return () => clearInterval(t); }, []);

  useEffect(() => { getAllStops().then(setStops).catch(() => setError("Failed to load stops")); }, []);

  /* auto-geolocation */
  useEffect(() => {
    if (!navigator.geolocation) { setGeoStatus("denied"); return; }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoStatus("granted"); },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (!userLoc) return;
    setNearbyLoading(true);
    getNearbyStops(userLoc.lat, userLoc.lng, 5, 12).then(setNearbyStops).catch(() => {}).finally(() => setNearbyLoading(false));
  }, [userLoc]);

  useEffect(() => {
    if (!nearbyStops.length) return;
    const ids = nearbyStops.slice(0, 5).map((s) => s._id);
    setUpcomingLoading(true);
    getMultiStopArrivals(ids).then(setUpcomingBuses).catch(() => {}).finally(() => setUpcomingLoading(false));
  }, [nearbyStops]);

  useEffect(() => {
    if (!nearbyStops.length) return;
    const ids = nearbyStops.slice(0, 5).map((s) => s._id);
    const iv = setInterval(() => { getMultiStopArrivals(ids).then(setUpcomingBuses).catch(() => {}); }, 15_000);
    return () => clearInterval(iv);
  }, [nearbyStops]);

  const busesPerStop = useMemo(() => {
    const map = {};
    for (const b of upcomingBuses) { if (!map[b.stopId]) map[b.stopId] = []; map[b.stopId].push(b); }
    return map;
  }, [upcomingBuses]);

  const filteredStops = useMemo(() => {
    if (!searchQuery) return stops;
    const q = searchQuery.toLowerCase();
    return stops.filter((s) => s.stopName.toLowerCase().includes(q) || s.stopCode.toLowerCase().includes(q));
  }, [stops, searchQuery]);

  const fetchArrivals = useCallback(async (id) => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const data = await getArrivals(id);
      setStopInfo(data.stop); setArrivals(data.arrivals); setLastUpdated(new Date());
    } catch { setError("Failed to load arrivals"); }
    finally { setLoading(false); }
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
        const entry = { busId: data.busId, busNumber: data.busNumber, busType: data.busType, routeName: data.routeName, routeCode: data.routeCode, eta: data.eta, delay: data.delay, busLocation: data.busLocation };
        const updated = idx !== -1 ? prev.map((a, i) => (i === idx ? entry : a)) : [...prev, entry];
        return updated.sort((a, b) => a.eta - b.eta);
      });
      setLastUpdated(new Date());
    };
    socket.on("stop:eta:update", h);
    return () => socket.off("stop:eta:update", h);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const h = (d) => setArrivals((p) => p.filter((a) => a.busId !== d.busId));
    socket.on("trip:completed", h);
    return () => socket.off("trip:completed", h);
  }, [socket]);

  const selectStop = useCallback((id) => {
    setSelectedStop(id); setArrivals([]); setStopInfo(null); setLastUpdated(null);
    setTimeout(() => arrivalsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoStatus("granted"); },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const visibleNearby = showAllNearby ? nearbyStops : nearbyStops.slice(0, 4);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f6fa", margin:0, padding:0}}>
      <DelayAlertBanner alerts={alerts} variant="light" maxToasts={3} />

      {/* ═══════ HERO (RedBus-inspired) ═══════ */}
      <Box sx={{
        background: "linear-gradient(135deg, #d93025 0%, #b71c1c 40%, #880e4f 100%)",
        position: "relative", overflow: "hidden", pb: { xs: 10, md: 12 },
      }}>
        <Box sx={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.05)" }} />
        <Box sx={{ position: "absolute", bottom: -40, left: -40, width: 150, height: 150, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.04)" }} />
        <Box sx={{ position: "absolute", top: 40, right: "15%", width: 80, height: 80, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.03)" }} />

        {/* nav */}
        <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3, md: 4 }, pt: 2, pb: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.2}>
              <Avatar sx={{ width: 38, height: 38, bgcolor: "rgba(255,255,255,0.15)", borderRadius: 2.5 }}>
                <DirectionsBus sx={{ fontSize: 20, color: "#fff" }} />
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: 17, color: "#fff", lineHeight: 1.1 }}>DTC Live</Typography>
                <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Real-time bus arrivals</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              {selectedStop && (
                <Chip icon={<FiberManualRecord sx={{ fontSize: "8px !important", color: "#4ade80 !important" }} />}
                  label="LIVE" size="small"
                  sx={{ height: 22, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, bgcolor: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: "6px", "& .MuiChip-icon": { animation: "pulse-dot 1.5s infinite" } }}
                />
              )}
              <Tooltip title="Live Map"><IconButton onClick={() => navigate("/live-map")} sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#fff", width: 34, height: 34, "&:hover": { bgcolor: "rgba(255,255,255,0.22)" } }}><MapIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
              <Tooltip title="Trip Planner"><IconButton onClick={() => navigate("/trip-planner")} sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#fff", width: 34, height: 34, "&:hover": { bgcolor: "rgba(255,255,255,0.22)" } }}><RouteIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
              <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600, fontFeatureSettings: '"tnum"', display: { xs: "none", sm: "block" } }}>{clock}</Typography>
            </Stack>
          </Stack>
        </Box>

        {/* hero text */}
        <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3, md: 4 }, mt: { xs: 3, md: 4 } }}>
          <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: { xs: 26, sm: 34, md: 40 }, lineHeight: 1.15, letterSpacing: "-0.5px" }}>
            Track your bus
          </Typography>
          <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: { xs: 26, sm: 34, md: 40 }, lineHeight: 1.15, letterSpacing: "-0.5px", mb: 1 }}>
            in real-time
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: { xs: 14, sm: 16 }, fontWeight: 500, maxWidth: 420 }}>
            Live ETAs, GPS tracking & instant alerts for Delhi Transport buses
          </Typography>
        </Box>
      </Box>

      {/* ═══════ SEARCH CARD (RedBus style — overlaps hero) ═══════ */}
      <Box sx={{ maxWidth: 900, mx: "auto", px: { xs: 1.5, sm: 3 }, mt: { xs: -7, md: -9 }, position: "relative", zIndex: 5 }}>
        <Card elevation={0} sx={{ borderRadius: 4, boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="stretch">
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#9aa0a6", textTransform: "uppercase", letterSpacing: 1, mb: 0.8 }}>Your Stop</Typography>
                <TextField fullWidth size="small" placeholder="Search by name or code…"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: "#9aa0a6", fontSize: 20 }} /></InputAdornment> } }}
                  sx={{ mb: 1.5, "& .MuiOutlinedInput-root": { borderRadius: 2.5, bgcolor: "#f7f8fa", fontSize: 14, "& fieldset": { borderColor: "#ebedf0" }, "&:hover fieldset": { borderColor: "#d0d5dd" }, "&.Mui-focused fieldset": { borderColor: "#d93025", borderWidth: 1.5 } } }}
                />
                <TextField select fullWidth size="small" value={selectedStop} onChange={(e) => selectStop(e.target.value)} label="Choose your stop"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5, bgcolor: "#f7f8fa", fontSize: 14, "& fieldset": { borderColor: "#ebedf0" }, "&:hover fieldset": { borderColor: "#d0d5dd" }, "&.Mui-focused fieldset": { borderColor: "#d93025", borderWidth: 1.5 } }, "& .MuiInputLabel-root": { color: "#9aa0a6", fontSize: 13 }, "& .MuiInputLabel-root.Mui-focused": { color: "#d93025" } }}
                >
                  <MenuItem value=""><em>— Select a stop —</em></MenuItem>
                  {filteredStops.map((s) => (
                    <MenuItem key={s._id} value={s._id}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ width: "100%" }}>
                        <LocationOn sx={{ fontSize: 16, color: "#d93025" }} />
                        <span style={{ flex: 1, fontSize: 14 }}>{s.stopName}</span>
                        <Chip label={s.stopCode} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 600, bgcolor: "#f0f0f0", borderRadius: "5px" }} />
                      </Stack>
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: { sm: 200 } }}>
                <Box sx={{ bgcolor: "#f7f8fa", borderRadius: 2.5, border: "1px solid #ebedf0", px: 2, py: 1.5, mb: 1.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CalendarToday sx={{ fontSize: 16, color: "#d93025" }} />
                    <Box>
                      <Typography sx={{ fontSize: 11, color: "#9aa0a6", fontWeight: 600 }}>Today</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{today}</Typography>
                    </Box>
                  </Stack>
                </Box>
                {geoStatus !== "granted" ? (
                  <Button fullWidth variant="contained" startIcon={geoStatus === "loading" ? <CircularProgress size={16} color="inherit" /> : <MyLocation />}
                    onClick={requestLocation} disabled={geoStatus === "loading"}
                    sx={{ bgcolor: "#d93025", borderRadius: 2.5, textTransform: "none", fontWeight: 700, fontSize: 13, py: 1.3, boxShadow: "0 4px 14px rgba(217,48,37,0.3)", "&:hover": { bgcolor: "#b71c1c" } }}
                  >
                    {geoStatus === "loading" ? "Locating…" : "Find Nearby Stops"}
                  </Button>
                ) : (
                  <Button fullWidth variant="contained" startIcon={<Navigation />}
                    onClick={() => { setSelectedStop(""); setShowAllNearby(false); }}
                    sx={{ bgcolor: "#d93025", borderRadius: 2.5, textTransform: "none", fontWeight: 700, fontSize: 13, py: 1.3, boxShadow: "0 4px 14px rgba(217,48,37,0.3)", "&:hover": { bgcolor: "#b71c1c" } }}
                  >
                    Nearby Stops
                  </Button>
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* ═══════ QUICK ACTIONS ═══════ */}
      <Box sx={{ maxWidth: 900, mx: "auto", px: { xs: 1.5, sm: 3 }, mt: 3 }}>
        <Stack direction="row" spacing={1.5} sx={{ overflowX: "auto", pb: 1, "&::-webkit-scrollbar": { display: "none" } }}>
          {[
            { label: "Live Map", icon: <MapIcon sx={{ fontSize: 18 }} />, color: "#1a73e8", bg: "#e8f0fe", path: "/live-map" },
            { label: "Trip Planner", icon: <RouteIcon sx={{ fontSize: 18 }} />, color: "#00897b", bg: "#e0f2f1", path: "/trip-planner" },
            { label: "All Stops", icon: <Place sx={{ fontSize: 18 }} />, color: "#d93025", bg: "#fce8e6", action: () => { setSelectedStop(""); setSearchQuery(""); } },
          ].map((item) => (
            <Paper key={item.label} elevation={0} onClick={() => item.path ? navigate(item.path) : item.action?.()}
              sx={{
                display: "flex", alignItems: "center", gap: 1, px: 2.5, py: 1.5, borderRadius: 3,
                cursor: "pointer", border: "1px solid #ebedf0", bgcolor: "#fff", whiteSpace: "nowrap",
                transition: "all .2s", "&:hover": { boxShadow: "0 4px 14px rgba(0,0,0,0.07)", transform: "translateY(-1px)", borderColor: item.color },
              }}
            >
              <Avatar sx={{ width: 34, height: 34, bgcolor: item.bg, borderRadius: 2 }}>{item.icon}</Avatar>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{item.label}</Typography>
            </Paper>
          ))}
        </Stack>
      </Box>

      {/* ═══════ MAIN CONTENT GRID ═══════ */}
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 1.5, sm: 3, md: 4 }, py: 3 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "5fr 7fr" }, gap: { xs: 0, md: 3 }, alignItems: "start" }}>

          {/* LEFT: Nearby */}
          <Box sx={{ position: { md: "sticky" }, top: { md: 20 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Stack direction="row" alignItems="center" spacing={0.8}>
                <Avatar sx={{ width: 30, height: 30, borderRadius: 2, bgcolor: "#fef3c7" }}>
                  <Navigation sx={{ fontSize: 16, color: "#d97706" }} />
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e", lineHeight: 1.2 }}>Stops Near You</Typography>
                  {userLoc && <Typography sx={{ fontSize: 10, color: "#9aa0a6" }}>Within 5 km · {nearbyStops.length} found</Typography>}
                </Box>
              </Stack>
            </Stack>

            {geoStatus === "denied" && (
              <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #ebedf0", textAlign: "center", p: 3 }}>
                <Avatar sx={{ width: 48, height: 48, mx: "auto", mb: 1.5, bgcolor: "#fef3c7" }}>
                  <MyLocation sx={{ fontSize: 22, color: "#d97706" }} />
                </Avatar>
                <Typography sx={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e", mb: 0.5 }}>Enable location access</Typography>
                <Typography sx={{ fontSize: 12, color: "#9aa0a6", mb: 2, lineHeight: 1.5 }}>See nearby stops & live bus ETAs</Typography>
                <Button variant="contained" startIcon={<MyLocation sx={{ fontSize: 16 }} />} onClick={requestLocation}
                  sx={{ textTransform: "none", fontWeight: 600, fontSize: 13, borderRadius: 2.5, bgcolor: "#d93025", px: 3, "&:hover": { bgcolor: "#b71c1c" } }}
                >
                  Share Location
                </Button>
              </Card>
            )}

            {(nearbyLoading || geoStatus === "loading") && geoStatus !== "denied" && (
              <Stack spacing={1}>{[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 3 }} />)}</Stack>
            )}

            {geoStatus === "granted" && !nearbyLoading && nearbyStops.length > 0 && (
              <>
                <Stack spacing={1.2}>
                  {visibleNearby.map((s, i) => (
                    <NearbyStopCard key={s._id} stop={s} index={i} onSelect={selectStop}
                      isSelected={selectedStop === s._id} upcomingBuses={busesPerStop[s._id] || []}
                    />
                  ))}
                </Stack>
                {nearbyStops.length > 4 && (
                  <Button fullWidth size="small" onClick={() => setShowAllNearby((v) => !v)}
                    endIcon={showAllNearby ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    sx={{ mt: 1.5, textTransform: "none", fontWeight: 600, fontSize: 12, color: "#d93025", borderRadius: 2.5, border: "1px solid #ebedf0", "&:hover": { bgcolor: "#fce8e6" } }}
                  >
                    {showAllNearby ? "Show less" : `Show all ${nearbyStops.length} stops`}
                  </Button>
                )}
              </>
            )}

            {geoStatus === "granted" && !nearbyLoading && nearbyStops.length === 0 && (
              <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #ebedf0", p: 3, textAlign: "center" }}>
                <Typography sx={{ color: "#9aa0a6", fontSize: 13 }}>No stops found within 5 km</Typography>
              </Card>
            )}
          </Box>

          {/* RIGHT: Arrivals */}
          <Box>
            {geoStatus === "granted" && upcomingBuses.length > 0 && !selectedStop && (
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                  <Stack direction="row" alignItems="center" spacing={0.8}>
                    <Avatar sx={{ width: 30, height: 30, borderRadius: 2, bgcolor: "#dcfce7" }}>
                      <DirectionsBus sx={{ fontSize: 16, color: "#0d9e3f" }} />
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e", lineHeight: 1.2 }}>Upcoming Buses</Typography>
                      <Typography sx={{ fontSize: 10, color: "#9aa0a6" }}>{upcomingBuses.length} bus{upcomingBuses.length !== 1 ? "es" : ""} across nearby stops</Typography>
                    </Box>
                  </Stack>
                  <Chip icon={<FiberManualRecord sx={{ fontSize: "7px !important", color: "#0d9e3f !important" }} />}
                    label="Auto-refresh" size="small"
                    sx={{ height: 20, fontSize: 9, fontWeight: 600, bgcolor: "#f0fdf4", color: "#0d9e3f", borderRadius: "5px", "& .MuiChip-icon": { animation: "pulse-dot 1.5s infinite" } }}
                  />
                </Stack>
                <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #ebedf0", boxShadow: "0 4px 14px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                  <Box sx={{ px: 2.5, py: 1, bgcolor: "#f7f8fa", borderBottom: "1px solid #ebedf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#9aa0a6", textTransform: "uppercase", letterSpacing: 0.8 }}>Next Arrivals</Typography>
                    <Stack direction="row" alignItems="center" spacing={0.4}>
                      <SwapVert sx={{ fontSize: 13, color: "#9aa0a6" }} />
                      <Typography sx={{ fontSize: 10, color: "#9aa0a6", fontWeight: 500 }}>Sorted by ETA</Typography>
                    </Stack>
                  </Box>
                  {upcomingBuses.slice(0, 6).map((a, i) => (
                    <Box key={`${a.busId}-${a.stopId}`}>
                      {i > 0 && <Divider sx={{ borderColor: "#f4f4f5" }} />}
                      <ArrivalCard arrival={a} index={i} showStop isFirst={i === 0} />
                    </Box>
                  ))}
                  {upcomingBuses.length > 6 && (
                    <Box sx={{ px: 2.5, py: 1.2, bgcolor: "#f7f8fa", borderTop: "1px solid #ebedf0", textAlign: "center" }}>
                      <Typography sx={{ fontSize: 11, color: "#9aa0a6", fontWeight: 500 }}>+{upcomingBuses.length - 6} more buses nearby</Typography>
                    </Box>
                  )}
                </Card>
              </Box>
            )}

            {geoStatus === "granted" && upcomingLoading && !selectedStop && (
              <Box sx={{ mb: 3 }}>
                <Skeleton variant="text" width={200} sx={{ mb: 1, fontSize: 14 }} />
                {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={90} sx={{ mb: 1, borderRadius: 3 }} />)}
              </Box>
            )}

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2.5 }}>{error}</Alert>}

            {loading && (
              <Box sx={{ mb: 3 }}>
                <LinearProgress sx={{ borderRadius: 2, mb: 2, height: 2, bgcolor: "#eee", "& .MuiLinearProgress-bar": { bgcolor: "#d93025" } }} />
                {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={90} sx={{ mb: 1.5, borderRadius: 3 }} />)}
              </Box>
            )}

            <Box ref={arrivalsRef} />
            {stopInfo && !loading && (
              <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #ebedf0", p: 2, mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Stack direction="row" alignItems="center" spacing={1.2}>
                  <Avatar sx={{ width: 40, height: 40, bgcolor: "#fce8e6", borderRadius: 2.5 }}>
                    <Place sx={{ fontSize: 20, color: "#d93025" }} />
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{stopInfo.stopName}</Typography>
                    <Typography sx={{ fontSize: 11, color: "#9aa0a6" }}>{stopInfo.stopCode} · {arrivals.length} bus{arrivals.length !== 1 ? "es" : ""} approaching</Typography>
                  </Box>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  {lastUpdated && <Typography sx={{ color: "#9aa0a6", fontSize: 10 }}>{lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</Typography>}
                  <Tooltip title="Refresh"><IconButton onClick={() => fetchArrivals(selectedStop)} size="small" sx={{ color: "#9aa0a6", "&:hover": { color: "#d93025", bgcolor: "#fce8e6" } }}><Refresh sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                </Stack>
              </Card>
            )}

            {selectedStop && !loading && (
              <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #ebedf0", boxShadow: "0 4px 14px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                {arrivals.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 7, px: 3 }}>
                    <Avatar sx={{ width: 64, height: 64, mx: "auto", mb: 2, bgcolor: "#f7f8fa" }}>
                      <Schedule sx={{ fontSize: 28, color: "#9aa0a6", animation: "sway 3s ease-in-out infinite" }} />
                    </Avatar>
                    <Typography sx={{ color: "#5f6368", fontSize: 16, fontWeight: 600, mb: 0.3 }}>No buses right now</Typography>
                    <Typography sx={{ color: "#9aa0a6", fontSize: 13, maxWidth: 240, mx: "auto", lineHeight: 1.6 }}>
                      Buses will appear here automatically when trips are active
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ px: 2.5, py: 1.2, bgcolor: "#f7f8fa", borderBottom: "1px solid #ebedf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#9aa0a6", textTransform: "uppercase", letterSpacing: 0.8 }}>
                        Upcoming Arrivals · {arrivals.length} bus{arrivals.length !== 1 ? "es" : ""}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={0.4}>
                        <SwapVert sx={{ fontSize: 13, color: "#9aa0a6" }} />
                        <Typography sx={{ fontSize: 10, color: "#9aa0a6", fontWeight: 500 }}>By ETA</Typography>
                      </Stack>
                    </Box>
                    {arrivals.map((a, i) => (
                      <Box key={a.busId}>
                        {i > 0 && <Divider sx={{ borderColor: "#f4f4f5" }} />}
                        <ArrivalCard arrival={a} index={i} isFirst={i === 0} />
                      </Box>
                    ))}
                  </>
                )}
              </Card>
            )}

            {!selectedStop && stops.length > 0 && geoStatus === "idle" && (
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#9aa0a6", textTransform: "uppercase", letterSpacing: 1.2, mb: 1.5 }}>Popular Stops</Typography>
                <Stack spacing={1}>
                  {stops.slice(0, 6).map((s, i) => (
                    <Grow in key={s._id} timeout={250 + i * 70}>
                      <Paper elevation={0} onClick={() => selectStop(s._id)}
                        sx={{
                          display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: 3,
                          cursor: "pointer", border: "1px solid #ebedf0", bgcolor: "#fff",
                          transition: "all .2s", "&:hover": { boxShadow: "0 4px 14px rgba(0,0,0,0.07)", transform: "translateY(-1px)" },
                        }}
                      >
                        <Avatar sx={{ width: 36, height: 36, bgcolor: "#fce8e6", borderRadius: 2.5 }}>
                          <LocationOn sx={{ fontSize: 18, color: "#d93025" }} />
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ color: "#1a1a2e", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.stopName}</Typography>
                          <Typography sx={{ color: "#9aa0a6", fontSize: 11, fontWeight: 500 }}>{s.stopCode}</Typography>
                        </Box>
                        <ArrowForwardIos sx={{ fontSize: 13, color: "#9aa0a6", opacity: 0.4 }} />
                      </Paper>
                    </Grow>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ mt: 5, mb: 2, textAlign: "center" }}>
          <Divider sx={{ mb: 2, borderColor: "#ebedf0" }} />
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.8}>
            <DirectionsBus sx={{ fontSize: 14, color: "#9aa0a6" }} />
            <Typography sx={{ color: "#9aa0a6", fontSize: 11, fontWeight: 500 }}>DTC Bus Tracker · Powered by real-time data</Typography>
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
