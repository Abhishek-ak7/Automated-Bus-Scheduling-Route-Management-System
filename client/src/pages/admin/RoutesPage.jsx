import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  Card,
  CardContent,
  LinearProgress,
} from "@mui/material";
import {
  AltRoute,
  Search,
  Add,
  Refresh,
  Close,
  Place,
  FiberManualRecord,
  ArrowForward,
  Route as RouteIcon,
  LocalOffer,
  Speed,
  Schedule,
  DeleteOutline,
} from "@mui/icons-material";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import api from "../../api/axios";

const TYPE_COLORS = {
  express: { color: "#ef4444", bg: "#fef2f2", label: "Express" },
  local: { color: "#3b82f6", bg: "#eff6ff", label: "Local" },
  feeder: { color: "#10b981", bg: "#ecfdf5", label: "Feeder" },
};

function StopPicker({ stops, setStops }) {
  useMapEvents({
    click(e) {
      setStops([...stops, { lat: e.latlng.lat, lng: e.latlng.lng }]);
    },
  });
  return null;
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  // Form state
  const [routeName, setRouteName] = useState("");
  const [routeCode, setRouteCode] = useState("");
  const [routeType, setRouteType] = useState("local");
  const [stops, setStops] = useState([]);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const res = await api.get("/routes");
      setRoutes(res.data.data || []);
    } catch (err) {
      console.error(err);
      showSnack("Failed to load routes", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRoutes(); }, []);

  const showSnack = (message, severity = "success") => {
    setSnack({ open: true, message, severity });
  };

  const resetForm = () => {
    setRouteName("");
    setRouteCode("");
    setRouteType("local");
    setStops([]);
  };

  const handleCreate = async () => {
    if (!routeName.trim() || !routeCode.trim()) {
      showSnack("Route name and code are required", "error");
      return;
    }
    if (stops.length < 2) {
      showSnack("Click on the map to add at least 2 stops", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/routes", {
        routeName,
        routeCode,
        routeType,
        stops: stops.map((stop, i) => ({ sequence: i + 1, location: stop })),
      });
      showSnack("Route created successfully!");
      setDialogOpen(false);
      resetForm();
      loadRoutes();
    } catch (err) {
      showSnack(err?.response?.data?.message || "Failed to create route", "error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    let list = [...routes];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.routeName?.toLowerCase().includes(s) ||
          r.routeCode?.toLowerCase().includes(s)
      );
    }
    if (typeFilter !== "all") {
      list = list.filter((r) => r.routeType === typeFilter);
    }
    return list;
  }, [routes, search, typeFilter]);

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto" }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AltRoute sx={{ color: "#10b981", fontSize: 28 }} />
            <Typography variant="h5" fontWeight={800}>
              Route Management
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            Create and manage bus routes across the city network
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadRoutes} sx={{ border: "1px solid #e2e8f0" }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
              background: "linear-gradient(135deg, #10b981, #059669)",
              "&:hover": { background: "linear-gradient(135deg, #059669, #047857)" },
            }}
          >
            Create Route
          </Button>
        </Stack>
      </Stack>

      {/* Search & Filter */}
      <Paper
        elevation={0}
        sx={{ px: 2, py: 1.5, mb: 2.5, borderRadius: 3, border: "1px solid #e2e8f0" }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
          <TextField
            placeholder="Search routes by name or code…"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: "#94a3b8", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              flex: 1,
              maxWidth: 400,
              "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f8fafc" },
            }}
          />
          <Stack direction="row" spacing={1}>
            {["all", "local", "express", "feeder"].map((t) => (
              <Chip
                key={t}
                label={t === "all" ? "All Types" : TYPE_COLORS[t]?.label || t}
                onClick={() => setTypeFilter(t)}
                variant={typeFilter === t ? "filled" : "outlined"}
                color={typeFilter === t ? "primary" : "default"}
                sx={{ fontWeight: 600, fontSize: 12, borderRadius: 2 }}
              />
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {filtered.length} routes
          </Typography>
        </Stack>
      </Paper>

      {/* Routes Grid */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Paper
          elevation={0}
          sx={{ p: 6, textAlign: "center", borderRadius: 3, border: "1px solid #e2e8f0" }}
        >
          <AltRoute sx={{ fontSize: 48, color: "#cbd5e1", mb: 1 }} />
          <Typography variant="h6" color="text.secondary">No routes found</Typography>
          <Typography variant="body2" color="text.disabled">
            {search || typeFilter !== "all"
              ? "Try adjusting your filters"
              : "Click 'Create Route' to add your first route"}
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          {filtered.map((route) => {
            const typeConf = TYPE_COLORS[route.routeType] || TYPE_COLORS.local;
            return (
              <Card
                key={route._id}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: typeConf.color,
                    boxShadow: `0 4px 20px ${typeConf.color}15`,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                {/* Color accent */}
                <Box sx={{ height: 4, bgcolor: typeConf.color }} />
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                        <Chip
                          size="small"
                          label={route.routeCode}
                          sx={{
                            fontWeight: 800,
                            fontSize: 11,
                            bgcolor: typeConf.bg,
                            color: typeConf.color,
                            borderRadius: 1.5,
                          }}
                        />
                        <Chip
                          size="small"
                          label={typeConf.label}
                          variant="outlined"
                          sx={{
                            fontSize: 10,
                            height: 20,
                            fontWeight: 600,
                            borderColor: typeConf.color,
                            color: typeConf.color,
                          }}
                        />
                      </Stack>
                      <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ mt: 1 }}>
                        {route.routeName}
                      </Typography>
                    </Box>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: typeConf.bg,
                        borderRadius: 2,
                      }}
                    >
                      <RouteIcon sx={{ color: typeConf.color, fontSize: 20 }} />
                    </Avatar>
                  </Stack>

                  <Divider sx={{ my: 1.5 }} />

                  <Stack direction="row" spacing={3}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Place sx={{ fontSize: 16, color: "#94a3b8" }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {route.stops?.length || 0} Stops
                      </Typography>
                    </Stack>
                    {route.totalDistance && (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Speed sx={{ fontSize: 16, color: "#94a3b8" }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {route.totalDistance} km
                        </Typography>
                      </Stack>
                    )}
                    {route.estimatedDuration && (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Schedule sx={{ fontSize: 16, color: "#94a3b8" }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {route.estimatedDuration} min
                        </Typography>
                      </Stack>
                    )}
                  </Stack>

                  {route.isActive !== undefined && (
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1.5 }}>
                      <FiberManualRecord
                        sx={{
                          fontSize: 8,
                          color: route.isActive ? "#10b981" : "#ef4444",
                        }}
                      />
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        sx={{ color: route.isActive ? "#10b981" : "#ef4444" }}
                      >
                        {route.isActive ? "Active" : "Inactive"}
                      </Typography>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Create Route Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, maxHeight: "90vh" } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar sx={{ bgcolor: "#ecfdf5", width: 36, height: 36 }}>
                <AltRoute sx={{ color: "#10b981", fontSize: 20 }} />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Create New Route</Typography>
                <Typography variant="caption" color="text.secondary">
                  Define route details and mark stops on the map
                </Typography>
              </Box>
            </Stack>
            <IconButton size="small" onClick={() => setDialogOpen(false)}>
              <Close fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Route Name"
                placeholder="e.g. Jalandhar to Phagwara"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                fullWidth
                required
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
              <TextField
                label="Route Code"
                placeholder="e.g. RT-101"
                value={routeCode}
                onChange={(e) => setRouteCode(e.target.value.toUpperCase())}
                fullWidth
                required
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
              <FormControl fullWidth>
                <InputLabel>Route Type</InputLabel>
                <Select
                  value={routeType}
                  onChange={(e) => setRouteType(e.target.value)}
                  label="Route Type"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="local">Local — All stops</MenuItem>
                  <MenuItem value="express">Express — Limited stops</MenuItem>
                  <MenuItem value="feeder">Feeder — Connector route</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* Map */}
            <Paper
              elevation={0}
              sx={{ borderRadius: 2.5, overflow: "hidden", border: "1px solid #e2e8f0" }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  bgcolor: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Place sx={{ fontSize: 18, color: "#3b82f6" }} />
                    <Typography variant="body2" fontWeight={600}>
                      Click on the map to add stops
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Chip
                      size="small"
                      label={`${stops.length} stops marked`}
                      color={stops.length >= 2 ? "success" : "default"}
                      sx={{ fontWeight: 600, fontSize: 11 }}
                    />
                    {stops.length > 0 && (
                      <Tooltip title="Remove last stop">
                        <IconButton
                          size="small"
                          onClick={() => setStops(stops.slice(0, -1))}
                          sx={{ color: "#ef4444" }}
                        >
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {stops.length > 0 && (
                      <Tooltip title="Clear all stops">
                        <IconButton
                          size="small"
                          onClick={() => setStops([])}
                          sx={{ color: "#ef4444" }}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>
              </Box>
              <MapContainer
                center={[31.2536, 75.705]}
                zoom={13}
                style={{ height: 350, width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <StopPicker stops={stops} setStops={setStops} />
                {stops.map((stop, i) => (
                  <Marker key={i} position={[stop.lat, stop.lng]} />
                ))}
                {stops.length > 1 && (
                  <Polyline
                    positions={stops.map((s) => [s.lat, s.lng])}
                    pathOptions={{ color: "#3b82f6", weight: 4 }}
                  />
                )}
              </MapContainer>
            </Paper>
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none", fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Add />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
              background: "linear-gradient(135deg, #10b981, #059669)",
            }}
          >
            {saving ? "Creating…" : "Create Route"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnack({ ...snack, open: false })}
          severity={snack.severity}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
