import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  Paper,
  TextField,
  Autocomplete,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Avatar,
  Collapse,
  IconButton,
  Alert,
  useMediaQuery,
} from "@mui/material";
import {
  SwapVert,
  Search,
  DirectionsBus,
  Place,
  FiberManualRecord,
  AccessTime,
  Route as RouteIcon,
  ArrowForward,
  ExpandMore,
  ExpandLess,
  TransferWithinAStation,
  NearMe,
  Map as MapIcon,
  ArrowBack,
  Straighten,
  Timeline,
} from "@mui/icons-material";
import {
  getPlannerStops,
  searchTripRoutes,
} from "../../services/tripPlannerService";

/* ─── colour helpers ──────────────────────────────────────────── */
const ROUTE_COLOURS = [
  "#1976d2",
  "#388e3c",
  "#e64a19",
  "#7b1fa2",
  "#00838f",
  "#c62828",
  "#f9a825",
  "#4e342e",
];
const colour = (i) => ROUTE_COLOURS[i % ROUTE_COLOURS.length];

const typeChip = (t) => {
  const map = {
    express: { label: "Express", color: "error" },
    local: { label: "Local", color: "primary" },
    feeder: { label: "Feeder", color: "warning" },
  };
  return map[t] || { label: t, color: "default" };
};

/* ═══════════════════════════════════════════════════════════════ */
/*                       TRIP PLANNER PAGE                        */
/* ═══════════════════════════════════════════════════════════════ */

export default function TripPlanner() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:700px)");

  /* ── state ────────────────────────────────────────────────────── */
  const [stops, setStops] = useState([]);
  const [loadingStops, setLoadingStops] = useState(true);

  const [fromStop, setFromStop] = useState(null);
  const [toStop, setToStop] = useState(null);

  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const [expandedDirect, setExpandedDirect] = useState(null);
  const [expandedTransfer, setExpandedTransfer] = useState(null);

  /* ── load stops ───────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const data = await getPlannerStops();
        setStops(data);
      } catch {
        setError("Failed to load stops");
      } finally {
        setLoadingStops(false);
      }
    })();
  }, []);

  /* ── swap ──────────────────────────────────────────────────────── */
  const handleSwap = useCallback(() => {
    setFromStop((prev) => {
      setToStop(fromStop);
      return toStop;
    });
    setResults(null);
  }, [fromStop, toStop]);

  /* ── search ────────────────────────────────────────────────────── */
  const handleSearch = useCallback(async () => {
    if (!fromStop || !toStop) return;
    setError("");
    setSearching(true);
    setResults(null);
    setExpandedDirect(null);
    setExpandedTransfer(null);
    try {
      const data = await searchTripRoutes(fromStop._id, toStop._id);
      setResults(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Search failed — please try again.");
    } finally {
      setSearching(false);
    }
  }, [fromStop, toStop]);

  /* ── derived ───────────────────────────────────────────────────── */
  const totalResults =
    (results?.directRoutes?.count || 0) +
    (results?.transferRoutes?.count || 0);

  /* ═══════════════════════════════════════════════════════════════ */
  /*                            RENDER                              */
  /* ═══════════════════════════════════════════════════════════════ */

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f5f7fa",
        pb: 6,
      }}
    >
      {/* ── sticky nav ─────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          bgcolor: "#fff",
          borderBottom: "1px solid",
          borderColor: "grey.200",
          px: 2,
          py: 1.2,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton size="small" onClick={() => navigate(-1)}>
              <ArrowBack fontSize="small" />
            </IconButton>
            <NearMe sx={{ color: "primary.main", fontSize: 22 }} />
            <Typography variant="subtitle1" fontWeight={700}>
              Trip Planner
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Chip
              icon={<MapIcon sx={{ fontSize: 16 }} />}
              label="Live Map"
              size="small"
              variant="outlined"
              onClick={() => navigate("/live-map")}
            />
            <Chip
              icon={<AccessTime sx={{ fontSize: 16 }} />}
              label="Arrivals"
              size="small"
              variant="outlined"
              onClick={() => navigate("/arrivals")}
            />

          </Stack>
        </Stack>
      </Paper>

      {/* ── hero / search card ─────────────────────────────────── */}
      <Box sx={{ maxWidth: 720, mx: "auto", px: 2, mt: 3 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 4,
            border: "1px solid",
            borderColor: "grey.200",
            bgcolor: "#fff",
          }}
        >
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Where do you want to go?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Select your starting stop and destination — we'll find the best
            bus routes for you, including transfers.
          </Typography>

          <Stack spacing={2}>
            {/* FROM */}
            <Autocomplete
              options={stops}
              getOptionLabel={(o) => `${o.stopName} (${o.stopCode})`}
              value={fromStop}
              onChange={(_, v) => {
                setFromStop(v);
                setResults(null);
              }}
              loading={loadingStops}
              isOptionEqualToValue={(o, v) => o._id === v._id}
              filterOptions={(options, { inputValue }) => {
                const q = inputValue.toLowerCase();
                return options.filter(
                  (o) =>
                    o.stopName.toLowerCase().includes(q) ||
                    o.stopCode.toLowerCase().includes(q)
                );
              }}
              renderOption={(props, option) => (
                <li {...props} key={option._id}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <FiberManualRecord sx={{ fontSize: 10, color: "#43a047" }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {option.stopName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.stopCode}
                      </Typography>
                    </Box>
                  </Stack>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="From (Origin)"
                  placeholder="Search stop name or code…"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <FiberManualRecord
                          sx={{ fontSize: 12, color: "#43a047", mr: 0.5 }}
                        />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            {/* SWAP */}
            <Stack direction="row" justifyContent="center">
              <IconButton
                size="small"
                onClick={handleSwap}
                sx={{
                  border: "1px solid",
                  borderColor: "grey.300",
                  bgcolor: "#fff",
                  "&:hover": { bgcolor: "grey.100" },
                }}
              >
                <SwapVert fontSize="small" />
              </IconButton>
            </Stack>

            {/* TO */}
            <Autocomplete
              options={stops}
              getOptionLabel={(o) => `${o.stopName} (${o.stopCode})`}
              value={toStop}
              onChange={(_, v) => {
                setToStop(v);
                setResults(null);
              }}
              loading={loadingStops}
              isOptionEqualToValue={(o, v) => o._id === v._id}
              filterOptions={(options, { inputValue }) => {
                const q = inputValue.toLowerCase();
                return options.filter(
                  (o) =>
                    o.stopName.toLowerCase().includes(q) ||
                    o.stopCode.toLowerCase().includes(q)
                );
              }}
              renderOption={(props, option) => (
                <li {...props} key={option._id}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Place sx={{ fontSize: 16, color: "#e53935" }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {option.stopName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.stopCode}
                      </Typography>
                    </Box>
                  </Stack>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="To (Destination)"
                  placeholder="Search stop name or code…"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <Place
                          sx={{ fontSize: 16, color: "#e53935", mr: 0.5 }}
                        />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            {/* SEARCH BUTTON */}
            <Button
              variant="contained"
              size="large"
              startIcon={searching ? <CircularProgress size={18} color="inherit" /> : <Search />}
              disabled={!fromStop || !toStop || searching}
              onClick={handleSearch}
              sx={{ borderRadius: 3, py: 1.3, fontWeight: 700, textTransform: "none", fontSize: 16 }}
              fullWidth
            >
              {searching ? "Searching…" : "Find Routes"}
            </Button>
          </Stack>
        </Paper>

        {/* ── error ────────────────────────────────────────────── */}
        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
            {error}
          </Alert>
        )}

        {/* ── results ──────────────────────────────────────────── */}
        {results && (
          <Box sx={{ mt: 3 }}>
            {/* summary */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                {totalResults === 0
                  ? "No routes found"
                  : `${totalResults} route${totalResults > 1 ? "s" : ""} found`}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                {results.directRoutes?.count > 0 && (
                  <Chip
                    label={`${results.directRoutes.count} Direct`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
                {results.transferRoutes?.count > 0 && (
                  <Chip
                    label={`${results.transferRoutes.count} Transfer`}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Stack>

            {totalResults === 0 && (
              <Paper
                sx={{
                  p: 4,
                  textAlign: "center",
                  borderRadius: 4,
                  bgcolor: "#fff",
                  border: "1px solid",
                  borderColor: "grey.200",
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  No bus routes connect these two stops directly or with one
                  transfer. Try nearby stops or check the Live Map.
                </Typography>
              </Paper>
            )}

            {/* ── DIRECT ROUTES ──────────────────────────────────── */}
            {results.directRoutes?.data?.map((r, idx) => (
              <DirectRouteCard
                key={`d-${r.routeId}-${idx}`}
                route={r}
                index={idx}
                expanded={expandedDirect === idx}
                onToggle={() =>
                  setExpandedDirect((prev) => (prev === idx ? null : idx))
                }
              />
            ))}

            {/* ── TRANSFER ROUTES ────────────────────────────────── */}
            {results.transferRoutes?.data?.map((t, idx) => (
              <TransferRouteCard
                key={`t-${idx}`}
                transfer={t}
                index={idx}
                expanded={expandedTransfer === idx}
                onToggle={() =>
                  setExpandedTransfer((prev) => (prev === idx ? null : idx))
                }
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*                      DIRECT ROUTE CARD                         */
/* ═══════════════════════════════════════════════════════════════ */

function DirectRouteCard({ route: r, index, expanded, onToggle }) {
  const tc = typeChip(r.routeType);
  const bestBus = r.liveBuses?.[0];

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2,
        borderRadius: 4,
        border: "1px solid",
        borderColor: expanded ? "primary.main" : "grey.200",
        transition: "border-color .2s",
        overflow: "hidden",
        bgcolor: "#fff",
      }}
    >
      {/* header */}
      <Box
        onClick={onToggle}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1.5,
          cursor: "pointer",
          "&:hover": { bgcolor: "grey.50" },
        }}
      >
        {/* colour bar */}
        <Box
          sx={{
            width: 6,
            alignSelf: "stretch",
            borderRadius: 3,
            bgcolor: colour(index),
            flexShrink: 0,
          }}
        />

        {/* icon */}
        <Avatar
          sx={{
            bgcolor: colour(index) + "22",
            color: colour(index),
            width: 38,
            height: 38,
          }}
        >
          <DirectionsBus fontSize="small" />
        </Avatar>

        {/* text */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {r.routeCode}
            </Typography>
            <Chip label={tc.label} size="small" color={tc.color} sx={{ height: 20, fontSize: 11 }} />
            <Chip
              label="Direct"
              size="small"
              color="success"
              variant="outlined"
              sx={{ height: 20, fontSize: 11 }}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary" noWrap>
            {r.routeName}
          </Typography>
        </Box>

        {/* KPIs */}
        <Stack alignItems="flex-end" spacing={0.2} sx={{ flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <AccessTime sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography variant="body2" fontWeight={700}>
              {r.estimatedTime} min
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {r.totalStops} stop{r.totalStops > 1 ? "s" : ""}
            {r.estimatedDistance > 0 ? ` · ${r.estimatedDistance} km` : ""}
          </Typography>
        </Stack>

        <IconButton size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      {/* expanded detail */}
      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ px: 2.5, py: 2 }}>
          {/* live buses */}
          {r.liveBuses?.length > 0 ? (
            <>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: "block" }}>
                LIVE BUSES ON THIS ROUTE
              </Typography>
              <Stack spacing={1} sx={{ mb: 2 }}>
                {r.liveBuses.map((b) => (
                  <Stack
                    key={b.busId}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      px: 1.5,
                      py: 1,
                      bgcolor: "grey.50",
                      borderRadius: 2,
                    }}
                  >
                    <DirectionsBus sx={{ fontSize: 18, color: colour(index) }} />
                    <Typography variant="body2" fontWeight={600}>
                      {b.busNumber}
                    </Typography>
                    <Chip
                      label={b.busType}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: 10 }}
                    />
                    <Box sx={{ flex: 1 }} />
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {b.etaToOrigin} min
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      to pickup
                    </Typography>
                    {b.delay > 0 && (
                      <Chip
                        label={`+${b.delay} min`}
                        size="small"
                        color="error"
                        sx={{ height: 20, fontSize: 10 }}
                      />
                    )}
                  </Stack>
                ))}
              </Stack>
            </>
          ) : (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              No live buses currently running on this route.
            </Alert>
          )}

          {/* intermediate stops timeline */}
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: "block" }}>
            ROUTE STOPS
          </Typography>
          <Stack spacing={0}>
            {r.intermediateStops?.map((s, i) => {
              const isFirst = i === 0;
              const isLast = i === r.intermediateStops.length - 1;
              return (
                <Stack key={s._id || i} direction="row" alignItems="flex-start" spacing={1.5}>
                  {/* timeline dot + line */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      pt: 0.4,
                    }}
                  >
                    <FiberManualRecord
                      sx={{
                        fontSize: isFirst || isLast ? 14 : 10,
                        color: isFirst
                          ? "#43a047"
                          : isLast
                          ? "#e53935"
                          : "grey.400",
                      }}
                    />
                    {!isLast && (
                      <Box
                        sx={{
                          width: 2,
                          height: 22,
                          bgcolor: "grey.300",
                          mt: 0.2,
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={{ pb: isLast ? 0 : 0.5 }}>
                    <Typography
                      variant="body2"
                      fontWeight={isFirst || isLast ? 700 : 400}
                    >
                      {s.stopName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.stopCode}
                    </Typography>
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*                     TRANSFER ROUTE CARD                        */
/* ═══════════════════════════════════════════════════════════════ */

function TransferRouteCard({ transfer: t, index, expanded, onToggle }) {
  const leg1 = t.legs[0];
  const leg2 = t.legs[1];

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2,
        borderRadius: 4,
        border: "1px solid",
        borderColor: expanded ? "info.main" : "grey.200",
        transition: "border-color .2s",
        overflow: "hidden",
        bgcolor: "#fff",
      }}
    >
      {/* header */}
      <Box
        onClick={onToggle}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1.5,
          cursor: "pointer",
          "&:hover": { bgcolor: "grey.50" },
        }}
      >
        {/* colour bar */}
        <Box
          sx={{
            width: 6,
            alignSelf: "stretch",
            borderRadius: 3,
            background: `linear-gradient(180deg, ${colour(index)} 50%, ${colour(index + 3)} 50%)`,
            flexShrink: 0,
          }}
        />

        {/* icon */}
        <Avatar
          sx={{
            bgcolor: "#e3f2fd",
            color: "#1565c0",
            width: 38,
            height: 38,
          }}
        >
          <TransferWithinAStation fontSize="small" />
        </Avatar>

        {/* route codes */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
            <Chip
              label={leg1.routeCode}
              size="small"
              sx={{ bgcolor: colour(index) + "22", color: colour(index), fontWeight: 700, fontSize: 12 }}
            />
            <ArrowForward sx={{ fontSize: 14, color: "text.secondary" }} />
            <Chip
              label={leg2.routeCode}
              size="small"
              sx={{ bgcolor: colour(index + 3) + "22", color: colour(index + 3), fontWeight: 700, fontSize: 12 }}
            />
            <Chip
              label="1 Transfer"
              size="small"
              color="info"
              variant="outlined"
              sx={{ height: 20, fontSize: 11 }}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary" noWrap>
            Transfer at <b>{t.transferStop.stopName}</b>
          </Typography>
        </Box>

        {/* KPIs */}
        <Stack alignItems="flex-end" spacing={0.2} sx={{ flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <AccessTime sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography variant="body2" fontWeight={700}>
              {t.totalTime} min
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {leg1.stops + leg2.stops} stops
          </Typography>
        </Stack>

        <IconButton size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      {/* expanded detail */}
      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ px: 2.5, py: 2 }}>
          {[leg1, leg2].map((leg, li) => {
            const tc = typeChip(leg.routeType);
            const isLeg1 = li === 0;
            return (
              <Box key={li} sx={{ mb: li === 0 ? 2 : 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      bgcolor: colour(index + li * 3) + "22",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={900}
                      sx={{ color: colour(index + li * 3), fontSize: 10 }}
                    >
                      {li + 1}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700}>
                    {leg.routeCode}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {leg.routeName}
                  </Typography>
                  <Chip label={tc.label} size="small" color={tc.color} sx={{ height: 18, fontSize: 10 }} />
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1} sx={{ pl: 3 }}>
                  <FiberManualRecord
                    sx={{ fontSize: 10, color: isLeg1 ? "#43a047" : "#1565c0" }}
                  />
                  <Typography variant="body2">{leg.from.stopName}</Typography>
                  <ArrowForward sx={{ fontSize: 14, color: "text.secondary" }} />
                  <Typography variant="body2">{leg.to.stopName}</Typography>
                </Stack>
                <Stack direction="row" spacing={2} sx={{ pl: 3, mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {leg.stops} stop{leg.stops > 1 ? "s" : ""}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ~{leg.estimatedTime} min
                  </Typography>
                  {leg.estimatedDistance > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {leg.estimatedDistance} km
                    </Typography>
                  )}
                </Stack>

                {/* transfer indicator between legs */}
                {isLeg1 && (
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      mt: 1.5,
                      mb: 0.5,
                      px: 2,
                      py: 0.8,
                      bgcolor: "#fff3e0",
                      borderRadius: 2,
                      border: "1px dashed #ff9800",
                    }}
                  >
                    <TransferWithinAStation sx={{ fontSize: 18, color: "#e65100" }} />
                    <Typography variant="caption" fontWeight={600} color="#e65100">
                      Transfer at {t.transferStop.stopName} · ~5 min wait
                    </Typography>
                  </Stack>
                )}
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </Paper>
  );
}
