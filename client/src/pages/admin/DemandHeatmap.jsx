import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Chip,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Divider,
  Avatar,
  Skeleton,
  Alert,
  Slider,
  LinearProgress,
} from "@mui/material";
import {
  Whatshot,
  Place,
  DirectionsBus,
  TrendingUp,
  Layers,
  FiberManualRecord,
  Schedule,
  Refresh,
  LocalFireDepartment,
  AddCircleOutline,
  EventNote,
  Speed,
} from "@mui/icons-material";
import {
  getHeatmapData,
  getHeatmapStats,
} from "../../services/heatmapService";

/* ─── constants ───────────────────────────────────────── */

const MAP_CENTER = [31.29, 75.64];
const MAP_ZOOM = 12;

const TILES = {
  default: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  dark: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};

const HOURS_MARKS = [
  { value: 1, label: "1h" },
  { value: 24, label: "24h" },
  { value: 72, label: "3d" },
  { value: 168, label: "7d" },
];

const SOURCE_FILTERS = [
  { value: "", label: "All" },
  { value: "arrival_check", label: "Arrivals" },
  { value: "trip_search", label: "Trip Search" },
  { value: "nearby_search", label: "Nearby" },
  { value: "map_tap", label: "Map Tap" },
];

function demandLevel(intensity) {
  if (intensity >= 0.7) return { label: "High", color: "#e53935", bg: "#ffebee", icon: "🔴" };
  if (intensity >= 0.35) return { label: "Medium", color: "#f9a825", bg: "#fff8e1", icon: "🟡" };
  return { label: "Low", color: "#43a047", bg: "#e8f5e9", icon: "🟢" };
}

/* ═══════════════════════════════════════════════════════════════ */
/*                  LEAFLET HEAT LAYER COMPONENT                  */
/* ═══════════════════════════════════════════════════════════════ */

function HeatLayer({ points, tileMode }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!points || points.length === 0) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    const data = points.map((p) => [p.lat, p.lng, p.intensity]);

    if (layerRef.current) {
      layerRef.current.setLatLngs(data);
    } else {
      layerRef.current = L.heatLayer(data, {
        radius: 35,
        blur: 25,
        maxZoom: 15,
        max: 1.0,
        minOpacity: 0.35,
        gradient: {
          0.0: "#00e676",
          0.35: "#ffeb3b",
          0.65: "#ff9800",
          1.0: "#e53935",
        },
      }).addTo(map);
    }

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [points, map]);

  useEffect(() => {
    if (layerRef.current) layerRef.current.redraw();
  }, [tileMode]);

  return null;
}

/* ═══════════════════════════════════════════════════════════════ */
/*                   DEMAND HEATMAP (ADMIN)                       */
/* ═══════════════════════════════════════════════════════════════ */

export default function DemandHeatmap() {
  /* state */
  const [heatData, setHeatData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [hours, setHours] = useState(24);
  const [source, setSource] = useState("");
  const [tileMode, setTileMode] = useState("default");
  const [selectedStop, setSelectedStop] = useState(null);

  /* fetch data */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [heat, st] = await Promise.all([
        getHeatmapData(hours, source),
        getHeatmapStats(hours),
      ]);
      setHeatData(heat);
      setStats(st);
    } catch {
      setError("Failed to load heatmap data");
    } finally {
      setLoading(false);
    }
  }, [hours, source]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* auto-refresh every 30s */
  useEffect(() => {
    const t = setInterval(() => fetchData(), 30_000);
    return () => clearInterval(t);
  }, [fetchData]);

  const points = useMemo(() => heatData?.data || [], [heatData]);
  const topStop = stats?.topStops?.[0];

  /* ═══════════════════════════════════════════════════════════════ */

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto" }}>
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Whatshot sx={{ color: "#e53935", fontSize: 28 }} />
            <Typography variant="h5" fontWeight={800}>
              Transport Demand Heatmap
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            Analyze passenger demand across stops — identify hotspots, optimize
            routes &amp; fleet allocation.
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" spacing={1}>
          {!loading && heatData && (
            <Chip
              label={`${heatData.totalDemand} events`}
              size="small"
              color="error"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          )}
          <Tooltip title="Refresh now">
            <IconButton
              size="small"
              onClick={fetchData}
              disabled={loading}
              sx={{ border: "1px solid", borderColor: "grey.300" }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* ── INSIGHT CARDS ──────────────────────────────────────── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 2,
          mb: 2,
        }}
      >
        <InsightCard
          icon={<TrendingUp />}
          color="#1976d2"
          title="Total Demand"
          value={heatData?.totalDemand ?? "—"}
          sub={`last ${hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`}`}
        />
        <InsightCard
          icon={<Place />}
          color="#7b1fa2"
          title="Active Stops"
          value={heatData?.stopsCount ?? "—"}
          sub="with demand signals"
        />
        <InsightCard
          icon={<LocalFireDepartment />}
          color="#e53935"
          title="Peak Demand"
          value={heatData?.maxDemand ?? "—"}
          sub={topStop ? topStop.stopName : "—"}
        />
        <InsightCard
          icon={<Speed />}
          color="#00897b"
          title="Top Source"
          value={
            stats?.bySource
              ? Object.entries(stats.bySource).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace("_", " ") ?? "—"
              : "—"
          }
          sub={
            stats?.bySource
              ? `${Object.entries(stats.bySource).sort((a, b) => b[1] - a[1])[0]?.[1] ?? 0} events`
              : ""
          }
        />
      </Box>

      {/* ── CONTROLS BAR ───────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1.2,
          mb: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "grey.200",
          bgcolor: "#fff",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ md: "center" }}
          spacing={2}
        >
          {/* time slider */}
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 320, flex: 1, maxWidth: 440 }}>
            <Schedule sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="caption" fontWeight={600} sx={{ whiteSpace: "nowrap" }}>
              Time Range
            </Typography>
            <Slider
              value={hours}
              onChange={(_, v) => setHours(v)}
              min={1}
              max={168}
              step={null}
              marks={HOURS_MARKS}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => (v < 24 ? `${v}h` : `${Math.round(v / 24)}d`)}
              size="small"
              sx={{
                flex: 1,
                "& .MuiSlider-markLabel": {
                  fontSize: 10,
                  top: 22,
                },
              }}
            />
          </Stack>

          <Divider orientation="vertical" flexItem />

          {/* source filter */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              Source:
            </Typography>
            <ToggleButtonGroup
              value={source}
              exclusive
              onChange={(_, v) => v !== null && setSource(v)}
              size="small"
            >
              {SOURCE_FILTERS.map((f) => (
                <ToggleButton
                  key={f.value}
                  value={f.value}
                  sx={{ textTransform: "none", fontSize: 11, px: 1.2, py: 0.4 }}
                >
                  {f.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>

          <Box sx={{ flex: 1 }} />

          {/* tile switcher */}
          <Tooltip title="Change map style">
            <IconButton
              size="small"
              onClick={() =>
                setTileMode((m) =>
                  m === "default" ? "dark" : m === "dark" ? "satellite" : "default"
                )
              }
            >
              <Layers fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
        {loading && <LinearProgress sx={{ mt: 0.5, borderRadius: 2 }} />}
      </Paper>

      {/* ── MAP + SIDE PANEL ───────────────────────────────────── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 340px" },
          gap: 2,
          height: { xs: "auto", lg: 520 },
        }}
      >
        {/* MAP */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "grey.200",
            overflow: "hidden",
            position: "relative",
            height: { xs: 400, lg: "100%" },
          }}
        >
          {error && (
            <Alert
              severity="error"
              sx={{ position: "absolute", top: 10, left: 10, right: 10, zIndex: 1000, borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}

          <MapContainer
            center={MAP_CENTER}
            zoom={MAP_ZOOM}
            zoomControl={false}
            style={{ height: "100%", width: "100%" }}
          >
            <ZoomControl position="topright" />
            <TileLayer url={TILES[tileMode]} />
            <HeatLayer points={points} tileMode={tileMode} />

            {points.map((p) => {
              const dl = demandLevel(p.intensity);
              return (
                <CircleMarker
                  key={p.stopId}
                  center={[p.lat, p.lng]}
                  radius={8 + p.intensity * 14}
                  pathOptions={{
                    fillColor: dl.color,
                    fillOpacity: 0.85,
                    color: "#fff",
                    weight: 2,
                  }}
                  eventHandlers={{ click: () => setSelectedStop(p) }}
                >
                  <Popup>
                    <Box sx={{ minWidth: 170 }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {p.stopName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.stopCode}
                      </Typography>
                      <Divider sx={{ my: 0.5 }} />
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <FiberManualRecord sx={{ fontSize: 10, color: dl.color }} />
                        <Typography variant="body2" fontWeight={600}>
                          {dl.label} demand
                        </Typography>
                      </Stack>
                      <Typography variant="caption">
                        {p.count} events in last{" "}
                        {hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`}
                      </Typography>
                      <Divider sx={{ my: 0.5 }} />
                      <Typography variant="caption" color="text.secondary">
                        <b>Action:</b>{" "}
                        {dl.label === "High"
                          ? "Consider adding more buses"
                          : dl.label === "Medium"
                          ? "Monitor during peak hours"
                          : "Current service is sufficient"}
                      </Typography>
                    </Box>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>

          {/* legend */}
          <Paper
            elevation={0}
            sx={{
              position: "absolute",
              bottom: 16,
              left: 12,
              zIndex: 1000,
              px: 1.5,
              py: 1,
              borderRadius: 2.5,
              bgcolor: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(8px)",
              border: "1px solid",
              borderColor: "grey.200",
            }}
          >
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
              DEMAND LEVEL
            </Typography>
            <Stack spacing={0.3}>
              {[
                { color: "#e53935", label: "🔴 High — add buses" },
                { color: "#ff9800", label: "🟡 Medium — monitor" },
                { color: "#00e676", label: "🟢 Low — sufficient" },
              ].map((l) => (
                <Stack key={l.label} direction="row" alignItems="center" spacing={0.6}>
                  <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: l.color, border: "1px solid rgba(0,0,0,0.1)" }} />
                  <Typography variant="caption" sx={{ fontSize: 11 }}>{l.label}</Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Paper>

        {/* SIDE PANEL — stop ranking + actions */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "grey.200",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            height: { xs: 380, lg: "100%" },
          }}
        >
          {/* panel header */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              background: "linear-gradient(135deg, #e53935 0%, #c62828 100%)",
              color: "#fff",
            }}
          >
            <Typography variant="subtitle2" fontWeight={700}>
              Stop Ranking
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              Ordered by passenger demand — take action on red stops
            </Typography>
          </Box>

          {/* source breakdown */}
          {stats?.bySource && (
            <Box sx={{ px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "grey.100" }}>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {Object.entries(stats.bySource).map(([k, v]) => (
                  <Chip
                    key={k}
                    label={`${k.replace("_", " ")} (${v})`}
                    size="small"
                    variant={source === k ? "filled" : "outlined"}
                    color={source === k ? "error" : "default"}
                    onClick={() => setSource((prev) => (prev === k ? "" : k))}
                    sx={{ fontSize: 10, textTransform: "capitalize", height: 22 }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* stop list */}
          <Box sx={{ flex: 1, overflow: "auto", px: 1.5, py: 1 }}>
            {loading ? (
              <Stack spacing={1}>
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={50} sx={{ borderRadius: 2 }} />
                ))}
              </Stack>
            ) : points.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                No demand data for this period.
              </Typography>
            ) : (
              points.map((p, idx) => {
                const dl = demandLevel(p.intensity);
                const isSelected = selectedStop?.stopId === p.stopId;
                return (
                  <Paper
                    key={p.stopId}
                    elevation={0}
                    onClick={() => setSelectedStop(p)}
                    sx={{
                      mb: 0.8,
                      px: 1.5,
                      py: 1,
                      borderRadius: 2.5,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: isSelected ? dl.color : "transparent",
                      bgcolor: isSelected ? dl.bg : "grey.50",
                      transition: "all .15s",
                      "&:hover": { bgcolor: dl.bg },
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar
                        sx={{
                          width: 26,
                          height: 26,
                          fontSize: 11,
                          fontWeight: 900,
                          bgcolor: idx < 3 ? dl.color : "grey.300",
                          color: "#fff",
                        }}
                      >
                        {idx + 1}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {p.stopName}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            {p.stopCode}
                          </Typography>
                          <Typography variant="caption" sx={{ color: dl.color, fontWeight: 700, fontSize: 10 }}>
                            {dl.icon} {dl.label}
                          </Typography>
                        </Stack>
                      </Box>
                      <Stack alignItems="flex-end" spacing={0.2}>
                        <Typography variant="body2" fontWeight={700}>
                          {p.count}
                        </Typography>
                        <Box
                          sx={{
                            width: 46,
                            height: 4,
                            borderRadius: 2,
                            bgcolor: "grey.200",
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            sx={{
                              width: `${Math.round(p.intensity * 100)}%`,
                              height: "100%",
                              bgcolor: dl.color,
                              borderRadius: 2,
                            }}
                          />
                        </Box>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })
            )}
          </Box>
        </Paper>
      </Box>

      {/* ── ADMIN RECOMMENDATIONS ──────────────────────────────── */}
      {!loading && points.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "grey.200",
            bgcolor: "#fff",
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            <EventNote sx={{ fontSize: 18, verticalAlign: "text-bottom", mr: 0.5 }} />
            Recommended Actions
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
              gap: 1.5,
            }}
          >
            {points.slice(0, 3).map((p) => {
              const dl = demandLevel(p.intensity);
              return (
                <Paper
                  key={p.stopId}
                  variant="outlined"
                  sx={{ px: 2, py: 1.5, borderRadius: 2.5, borderColor: dl.color + "44" }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <FiberManualRecord sx={{ fontSize: 10, color: dl.color }} />
                    <Typography variant="body2" fontWeight={700}>
                      {p.stopName}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {p.count} requests ·{" "}
                    {dl.label === "High" && (
                      <>
                        <b style={{ color: "#e53935" }}>Add 2–3 extra buses</b> on routes
                        passing this stop during peak hours.
                      </>
                    )}
                    {dl.label === "Medium" && (
                      <>
                        <b style={{ color: "#f9a825" }}>Increase frequency</b> during
                        morning &amp; evening rush.
                      </>
                    )}
                    {dl.label === "Low" && (
                      <>
                        <b style={{ color: "#43a047" }}>Current allocation sufficient.</b>{" "}
                        Consider re-routing spare buses to busier stops.
                      </>
                    )}
                  </Typography>
                </Paper>
              );
            })}
          </Box>
        </Paper>
      )}
    </Box>
  );
}

/* ── Insight Card ─────────────────────────────────────── */

function InsightCard({ icon, color, title, value, sub }) {
  return (
    <Paper
      elevation={0}
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "grey.200",
        bgcolor: "#fff",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Avatar sx={{ bgcolor: color + "18", color, width: 38, height: 38 }}>
          {icon}
        </Avatar>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {title}
          </Typography>
          <Typography variant="h6" fontWeight={800} lineHeight={1.1} sx={{ textTransform: "capitalize" }}>
            {value}
          </Typography>
          {sub && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
              {sub}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
