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
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Badge,
} from "@mui/material";
import {
  DirectionsBus,
  Search,
  Add,
  FilterList,
  Refresh,
  Edit,
  AcUnit,
  ElectricBolt,
  AirlineSeatReclineNormal,
  FiberManualRecord,
  Close,
  CheckCircle,
  Build,
  Block,
} from "@mui/icons-material";
import api from "../../api/axios";

const STATUS_CONFIG = {
  active: { label: "Active", color: "#10b981", bg: "#ecfdf5", icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  maintenance: { label: "Maintenance", color: "#f59e0b", bg: "#fffbeb", icon: <Build sx={{ fontSize: 14 }} /> },
  inactive: { label: "Inactive", color: "#ef4444", bg: "#fef2f2", icon: <Block sx={{ fontSize: 14 }} /> },
};

const TYPE_CONFIG = {
  AC: { label: "AC", color: "#3b82f6", icon: <AcUnit sx={{ fontSize: 14 }} /> },
  "NON-AC": { label: "Non-AC", color: "#64748b", icon: <AirlineSeatReclineNormal sx={{ fontSize: 14 }} /> },
  ELECTRIC: { label: "Electric", color: "#10b981", icon: <ElectricBolt sx={{ fontSize: 14 }} /> },
};

const EMPTY_BUS = { busNumber: "", capacity: 40, busType: "NON-AC", status: "active" };

export default function FleetPage() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_BUS);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const [sortField, setSortField] = useState("busNumber");
  const [sortDir, setSortDir] = useState("asc");

  const loadBuses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/buses");
      setBuses(res.data.data || []);
    } catch (err) {
      console.error(err);
      showSnack("Failed to load buses", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBuses(); }, []);

  const showSnack = (message, severity = "success") => {
    setSnack({ open: true, message, severity });
  };

  const handleCreate = async () => {
    if (!form.busNumber.trim()) {
      showSnack("Bus number is required", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/buses", form);
      showSnack("Bus added successfully!");
      setDialogOpen(false);
      setForm(EMPTY_BUS);
      loadBuses();
    } catch (err) {
      showSnack(err?.response?.data?.message || "Failed to add bus", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let list = [...buses];

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.busNumber?.toLowerCase().includes(s) ||
          b.assignedRoute?.routeName?.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((b) => b.status === statusFilter);
    }
    if (typeFilter !== "all") {
      list = list.filter((b) => b.busType === typeFilter);
    }

    list.sort((a, b) => {
      let aVal = a[sortField] ?? "";
      let bVal = b[sortField] ?? "";
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [buses, search, statusFilter, typeFilter, sortField, sortDir]);

  const statusCounts = useMemo(() => {
    const counts = { all: buses.length, active: 0, maintenance: 0, inactive: 0 };
    buses.forEach((b) => { if (counts[b.status] !== undefined) counts[b.status]++; });
    return counts;
  }, [buses]);

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
            <DirectionsBus sx={{ color: "#3b82f6", fontSize: 28 }} />
            <Typography variant="h5" fontWeight={800}>
              Fleet Management
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            Manage your bus fleet — add vehicles, track status, and assign routes
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton
              onClick={loadBuses}
              sx={{ border: "1px solid #e2e8f0" }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setForm(EMPTY_BUS);
              setDialogOpen(true);
            }}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              "&:hover": { background: "linear-gradient(135deg, #2563eb, #4f46e5)" },
            }}
          >
            Add Bus
          </Button>
        </Stack>
      </Stack>

      {/* Status Filter Chips */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        {[
          { key: "all", label: "All Buses" },
          { key: "active", label: "Active" },
          { key: "maintenance", label: "Maintenance" },
          { key: "inactive", label: "Inactive" },
        ].map((item) => (
          <Chip
            key={item.key}
            label={`${item.label} (${statusCounts[item.key]})`}
            onClick={() => setStatusFilter(item.key)}
            variant={statusFilter === item.key ? "filled" : "outlined"}
            color={statusFilter === item.key ? "primary" : "default"}
            sx={{
              fontWeight: 600,
              fontSize: 12,
              borderRadius: 2,
            }}
          />
        ))}
      </Stack>

      {/* Search & Filter Bar */}
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1.5,
          mb: 2,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
          <TextField
            placeholder="Search by bus number or route…"
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
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Bus Type</InputLabel>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              label="Bus Type"
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="AC">AC</MenuItem>
              <MenuItem value="NON-AC">Non-AC</MenuItem>
              <MenuItem value="ELECTRIC">Electric</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Showing {filtered.length} of {buses.length} buses
          </Typography>
        </Stack>
      </Paper>

      {/* Buses Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: 3,
            border: "1px solid #e2e8f0",
          }}
        >
          <DirectionsBus sx={{ fontSize: 48, color: "#cbd5e1", mb: 1 }} />
          <Typography variant="h6" color="text.secondary">
            No buses found
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {search || statusFilter !== "all" || typeFilter !== "all"
              ? "Try adjusting your filters"
              : "Click 'Add Bus' to register your first vehicle"}
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
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>
                  <TableSortLabel
                    active={sortField === "busNumber"}
                    direction={sortField === "busNumber" ? sortDir : "asc"}
                    onClick={() => handleSort("busNumber")}
                  >
                    BUS NUMBER
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>TYPE</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>
                  <TableSortLabel
                    active={sortField === "capacity"}
                    direction={sortField === "capacity" ? sortDir : "asc"}
                    onClick={() => handleSort("capacity")}
                  >
                    CAPACITY
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>ASSIGNED ROUTE</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>DRIVER</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((bus) => {
                const st = STATUS_CONFIG[bus.status] || STATUS_CONFIG.active;
                const tp = TYPE_CONFIG[bus.busType] || TYPE_CONFIG["NON-AC"];

                return (
                  <TableRow
                    key={bus._id}
                    hover
                    sx={{
                      "&:hover": { bgcolor: "#f8fafc" },
                      cursor: "pointer",
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: "#eff6ff",
                            borderRadius: 2,
                          }}
                        >
                          <DirectionsBus sx={{ fontSize: 18, color: "#3b82f6" }} />
                        </Avatar>
                        <Typography variant="body2" fontWeight={700}>
                          {bus.busNumber}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={tp.icon}
                        label={tp.label}
                        sx={{
                          fontWeight: 600,
                          fontSize: 11,
                          color: tp.color,
                          bgcolor: `${tp.color}12`,
                          borderColor: `${tp.color}30`,
                          "& .MuiChip-icon": { color: tp.color },
                        }}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {bus.capacity} seats
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={st.icon}
                        label={st.label}
                        sx={{
                          fontWeight: 600,
                          fontSize: 11,
                          color: st.color,
                          bgcolor: st.bg,
                          "& .MuiChip-icon": { color: st.color },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {bus.assignedRoute ? (
                        <Typography variant="body2" fontWeight={500}>
                          {bus.assignedRoute.routeName}
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: 0.5 }}
                          >
                            ({bus.assignedRoute.routeCode})
                          </Typography>
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          Unassigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {bus.assignedDriver ? (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: "#6366f1" }}>
                            {bus.assignedDriver.name?.[0]}
                          </Avatar>
                          <Typography variant="body2" fontWeight={500}>
                            {bus.assignedDriver.name}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          No driver
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Bus Dialog */}
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
              <Avatar sx={{ bgcolor: "#eff6ff", width: 36, height: 36 }}>
                <DirectionsBus sx={{ color: "#3b82f6", fontSize: 20 }} />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Add New Bus
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Register a new vehicle to your fleet
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
            <TextField
              label="Bus Number"
              placeholder="e.g. DL1PC-1234"
              value={form.busNumber}
              onChange={(e) => setForm({ ...form, busNumber: e.target.value.toUpperCase() })}
              fullWidth
              required
              helperText="Unique identification number for the bus"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Seating Capacity"
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                fullWidth
                InputProps={{ inputProps: { min: 10, max: 100 } }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
              <FormControl fullWidth>
                <InputLabel>Bus Type</InputLabel>
                <Select
                  value={form.busType}
                  onChange={(e) => setForm({ ...form, busType: e.target.value })}
                  label="Bus Type"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="AC">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <AcUnit sx={{ fontSize: 16, color: "#3b82f6" }} /> <span>AC</span>
                    </Stack>
                  </MenuItem>
                  <MenuItem value="NON-AC">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <AirlineSeatReclineNormal sx={{ fontSize: 16 }} /> <span>Non-AC</span>
                    </Stack>
                  </MenuItem>
                  <MenuItem value="ELECTRIC">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <ElectricBolt sx={{ fontSize: 16, color: "#10b981" }} /> <span>Electric</span>
                    </Stack>
                  </MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <FormControl fullWidth>
              <InputLabel>Initial Status</InputLabel>
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                label="Initial Status"
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="active">Active — Ready for service</MenuItem>
                <MenuItem value="maintenance">Maintenance — Under repair</MenuItem>
                <MenuItem value="inactive">Inactive — Out of service</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
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
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            }}
          >
            {saving ? "Adding…" : "Add Bus"}
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
