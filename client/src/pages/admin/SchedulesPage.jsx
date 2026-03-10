import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  TextField,
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
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  Schedule as ScheduleIcon,
  Add,
  Refresh,
  Close,
  DirectionsBus,
  Route as RouteIcon,
  AccessTime,
  Loop,
  CalendarMonth,
  FiberManualRecord,
  Timer,
  Search,
} from "@mui/icons-material";
import api from "../../api/axios";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DAY_COLORS = {
  Mon: "#3b82f6",
  Tue: "#8b5cf6",
  Wed: "#10b981",
  Thu: "#f59e0b",
  Fri: "#ef4444",
  Sat: "#ec4899",
  Sun: "#06b6d4",
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  // Form state
  const [routeId, setRouteId] = useState("");
  const [busId, setBusId] = useState("");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("22:00");
  const [frequency, setFrequency] = useState(30);
  const [daysOfOperation, setDaysOfOperation] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [schedRes, routesRes, busesRes] = await Promise.all([
        api.get("/schedules").catch(() => ({ data: { data: [] } })),
        api.get("/routes"),
        api.get("/buses"),
      ]);
      setSchedules(schedRes.data.data || []);
      setRoutes(routesRes.data.data || []);
      setBuses(busesRes.data.data || []);
    } catch (err) {
      console.error(err);
      showSnack("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const showSnack = (message, severity = "success") => {
    setSnack({ open: true, message, severity });
  };

  const resetForm = () => {
    setRouteId("");
    setBusId("");
    setStartTime("06:00");
    setEndTime("22:00");
    setFrequency(30);
    setDaysOfOperation(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  };

  const handleCreate = async () => {
    if (!routeId || !busId) {
      showSnack("Please select both a route and a bus", "error");
      return;
    }
    if (daysOfOperation.length === 0) {
      showSnack("Please select at least one day of operation", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/schedules", {
        route: routeId,
        bus: busId,
        startTime,
        endTime,
        frequency,
        daysOfOperation,
      });
      showSnack("Schedule created successfully! Trips auto-generated.");
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      showSnack(err?.response?.data?.message || "Failed to create schedule", "error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return schedules;
    const s = search.toLowerCase();
    return schedules.filter(
      (sch) =>
        sch.route?.routeName?.toLowerCase().includes(s) ||
        sch.route?.routeCode?.toLowerCase().includes(s) ||
        sch.bus?.busNumber?.toLowerCase().includes(s)
    );
  }, [schedules, search]);

  const estimateTrips = () => {
    if (!startTime || !endTime || !frequency) return 0;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const totalMin = (eh * 60 + em) - (sh * 60 + sm);
    return totalMin > 0 ? Math.floor(totalMin / frequency) + 1 : 0;
  };

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
            <ScheduleIcon sx={{ color: "#8b5cf6", fontSize: 28 }} />
            <Typography variant="h5" fontWeight={800}>
              Schedule Management
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            Create and manage bus schedules — trips are auto-generated from your time settings
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadData} sx={{ border: "1px solid #e2e8f0" }}>
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
              background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
              "&:hover": { background: "linear-gradient(135deg, #7c3aed, #4f46e5)" },
            }}
          >
            Create Schedule
          </Button>
        </Stack>
      </Stack>

      {/* Stats Summary */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e2e8f0" }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ bgcolor: "#f5f3ff", width: 38, height: 38 }}>
              <ScheduleIcon sx={{ color: "#8b5cf6", fontSize: 20 }} />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Schedules</Typography>
              <Typography variant="h6" fontWeight={800}>{schedules.length}</Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e2e8f0" }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ bgcolor: "#ecfdf5", width: 38, height: 38 }}>
              <FiberManualRecord sx={{ color: "#10b981", fontSize: 16 }} />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Active</Typography>
              <Typography variant="h6" fontWeight={800}>
                {schedules.filter((s) => s.isActive !== false).length}
              </Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e2e8f0" }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ bgcolor: "#eff6ff", width: 38, height: 38 }}>
              <RouteIcon sx={{ color: "#3b82f6", fontSize: 20 }} />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Routes Covered</Typography>
              <Typography variant="h6" fontWeight={800}>
                {new Set(schedules.map((s) => s.route?._id)).size}
              </Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e2e8f0" }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ bgcolor: "#fffbeb", width: 38, height: 38 }}>
              <DirectionsBus sx={{ color: "#f59e0b", fontSize: 20 }} />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Buses Assigned</Typography>
              <Typography variant="h6" fontWeight={800}>
                {new Set(schedules.map((s) => s.bus?._id)).size}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Search */}
      <Paper
        elevation={0}
        sx={{ px: 2, py: 1.5, mb: 2.5, borderRadius: 3, border: "1px solid #e2e8f0" }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="Search by route, code, or bus number…"
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
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {filtered.length} schedules
          </Typography>
        </Stack>
      </Paper>

      {/* Schedules Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Paper
          elevation={0}
          sx={{ p: 6, textAlign: "center", borderRadius: 3, border: "1px solid #e2e8f0" }}
        >
          <ScheduleIcon sx={{ fontSize: 48, color: "#cbd5e1", mb: 1 }} />
          <Typography variant="h6" color="text.secondary">No schedules found</Typography>
          <Typography variant="body2" color="text.disabled">
            {search
              ? "Try different search terms"
              : "Click 'Create Schedule' to set up your first schedule"}
          </Typography>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ borderRadius: 3, border: "1px solid #e2e8f0" }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>ROUTE</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>BUS</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>TIMING</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>FREQUENCY</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>DAYS</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>STATUS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((sch) => (
                <TableRow key={sch._id} hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar
                        sx={{
                          width: 36, height: 36, borderRadius: 2,
                          bgcolor: "#f5f3ff", color: "#8b5cf6",
                          fontSize: 11, fontWeight: 800,
                        }}
                      >
                        {sch.route?.routeCode?.slice(0, 3) || "RT"}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {sch.route?.routeName || "Unknown Route"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sch.route?.routeCode || "—"}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={<DirectionsBus sx={{ fontSize: 14 }} />}
                      label={sch.bus?.busNumber || "Unassigned"}
                      sx={{ fontWeight: 600, fontSize: 11 }}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <AccessTime sx={{ fontSize: 14, color: "#64748b" }} />
                      <Typography variant="body2" fontWeight={600}>
                        {sch.startTime || "—"} — {sch.endTime || "—"}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={<Loop sx={{ fontSize: 14 }} />}
                      label={`Every ${sch.frequency || "—"} min`}
                      sx={{
                        fontWeight: 600, fontSize: 11,
                        bgcolor: "#eff6ff", color: "#3b82f6",
                        "& .MuiChip-icon": { color: "#3b82f6" },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.3} flexWrap="wrap" useFlexGap>
                      {(sch.daysOfOperation || DAYS).map((d) => (
                        <Chip
                          key={d}
                          label={d}
                          size="small"
                          sx={{
                            fontSize: 9,
                            height: 20,
                            fontWeight: 700,
                            bgcolor: `${DAY_COLORS[d]}15`,
                            color: DAY_COLORS[d],
                            borderRadius: 1,
                          }}
                        />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={<FiberManualRecord sx={{ fontSize: 8 }} />}
                      label={sch.isActive !== false ? "Active" : "Inactive"}
                      sx={{
                        fontWeight: 600, fontSize: 11,
                        bgcolor: sch.isActive !== false ? "#ecfdf5" : "#fef2f2",
                        color: sch.isActive !== false ? "#10b981" : "#ef4444",
                        "& .MuiChip-icon": {
                          color: sch.isActive !== false ? "#10b981" : "#ef4444",
                        },
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Schedule Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar sx={{ bgcolor: "#f5f3ff", width: 36, height: 36 }}>
                <ScheduleIcon sx={{ color: "#8b5cf6", fontSize: 20 }} />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Create Schedule</Typography>
                <Typography variant="caption" color="text.secondary">
                  Set timing and trips will be auto-generated
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
            {/* Route Selection */}
            <FormControl fullWidth required>
              <InputLabel>Select Route</InputLabel>
              <Select
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
                label="Select Route"
                sx={{ borderRadius: 2 }}
              >
                {routes.map((r) => (
                  <MenuItem key={r._id} value={r._id}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Chip
                        size="small"
                        label={r.routeCode}
                        sx={{
                          fontWeight: 700, fontSize: 10, height: 20,
                          bgcolor: "#f5f3ff", color: "#8b5cf6",
                        }}
                      />
                      <Typography variant="body2">{r.routeName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({r.stops?.length || 0} stops)
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Bus Selection */}
            <FormControl fullWidth required>
              <InputLabel>Select Bus</InputLabel>
              <Select
                value={busId}
                onChange={(e) => setBusId(e.target.value)}
                label="Select Bus"
                sx={{ borderRadius: 2 }}
              >
                {buses.map((b) => (
                  <MenuItem key={b._id} value={b._id}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <DirectionsBus sx={{ fontSize: 16, color: "#3b82f6" }} />
                      <Typography variant="body2" fontWeight={600}>{b.busNumber}</Typography>
                      <Chip
                        size="small"
                        label={b.busType}
                        sx={{ fontSize: 10, height: 18, fontWeight: 600 }}
                        variant="outlined"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {b.capacity} seats
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Time Settings */}
            <Stack direction="row" spacing={2}>
              <TextField
                label="Start Time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
              <TextField
                label="End Time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
              <TextField
                label="Frequency (min)"
                type="number"
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                fullWidth
                InputProps={{
                  inputProps: { min: 5, max: 120 },
                  endAdornment: <InputAdornment position="end">min</InputAdornment>,
                }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            </Stack>

            {/* Trip estimate */}
            <Alert
              severity="info"
              icon={<Timer sx={{ fontSize: 18 }} />}
              sx={{ borderRadius: 2, fontSize: 13 }}
            >
              This schedule will auto-generate approximately{" "}
              <strong>{estimateTrips()} trips</strong> per day
              ({startTime} to {endTime}, every {frequency} min)
            </Alert>

            {/* Days of Operation */}
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Days of Operation
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {DAYS.map((day) => {
                  const selected = daysOfOperation.includes(day);
                  return (
                    <Chip
                      key={day}
                      label={day}
                      onClick={() => {
                        if (selected) {
                          setDaysOfOperation(daysOfOperation.filter((d) => d !== day));
                        } else {
                          setDaysOfOperation([...daysOfOperation, day]);
                        }
                      }}
                      sx={{
                        fontWeight: 700,
                        fontSize: 12,
                        borderRadius: 2,
                        bgcolor: selected ? `${DAY_COLORS[day]}15` : "transparent",
                        color: selected ? DAY_COLORS[day] : "#94a3b8",
                        border: "1px solid",
                        borderColor: selected ? DAY_COLORS[day] : "#e2e8f0",
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: `${DAY_COLORS[day]}10`,
                        },
                      }}
                    />
                  );
                })}
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button
                  size="small"
                  onClick={() => setDaysOfOperation(["Mon", "Tue", "Wed", "Thu", "Fri"])}
                  sx={{ textTransform: "none", fontSize: 11, fontWeight: 600 }}
                >
                  Weekdays
                </Button>
                <Button
                  size="small"
                  onClick={() => setDaysOfOperation(["Sat", "Sun"])}
                  sx={{ textTransform: "none", fontSize: 11, fontWeight: 600 }}
                >
                  Weekends
                </Button>
                <Button
                  size="small"
                  onClick={() => setDaysOfOperation([...DAYS])}
                  sx={{ textTransform: "none", fontSize: 11, fontWeight: 600 }}
                >
                  All Days
                </Button>
              </Stack>
            </Box>
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
              background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
            }}
          >
            {saving ? "Creating…" : "Create Schedule"}
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
