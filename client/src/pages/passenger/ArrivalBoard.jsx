import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Alert,
  InputAdornment,
  IconButton,
  Tooltip,
  Fade,
  Paper,
  Skeleton,
} from "@mui/material";
import {
  DirectionsBus,
  AccessTime,
  Search,
  Refresh,
  MyLocation,
  Schedule,
  Circle,
  Warning,
  CheckCircle,
  NearMe,
} from "@mui/icons-material";
import { useSocket } from "../../hooks/useSocket";
import { getAllStops, getArrivals } from "../../services/stopService";

/* ────────────── helpers ────────────── */

function etaColor(eta) {
  if (eta <= 1) return "#d32f2f";
  if (eta <= 3) return "#f57c00";
  if (eta <= 8) return "#388e3c";
  return "#1565c0";
}

function etaProgress(eta) {
  if (eta <= 1) return 100;
  if (eta >= 20) return 5;
  return Math.max(5, 100 - (eta / 20) * 100);
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ────────────── component ────────────── */

export default function ArrivalBoard() {
  const socket = useSocket();

  const [stops, setStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState("");
  const [stopInfo, setStopInfo] = useState(null);
  const [arrivals, setArrivals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [clock, setClock] = useState(timeNow());
  const [lastUpdated, setLastUpdated] = useState(null);

  /* live clock */
  useEffect(() => {
    const t = setInterval(() => setClock(timeNow()), 10000);
    return () => clearInterval(t);
  }, []);

  /* load all stops on mount */
  useEffect(() => {
    getAllStops()
      .then(setStops)
      .catch(() => setError("Failed to load stops"));
  }, []);

  /* filtered stops for search */
  const filteredStops = useMemo(() => {
    if (!searchQuery) return stops;
    const q = searchQuery.toLowerCase();
    return stops.filter(
      (s) =>
        s.stopName.toLowerCase().includes(q) ||
        s.stopCode.toLowerCase().includes(q)
    );
  }, [stops, searchQuery]);

  /* fetch initial arrivals */
  const fetchArrivals = useCallback(async (stopId) => {
    if (!stopId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getArrivals(stopId);
      setStopInfo(data.stop);
      setArrivals(data.arrivals);
      setLastUpdated(new Date());
    } catch {
      setError("Failed to load arrivals");
    } finally {
      setLoading(false);
    }
  }, []);

  /* join / leave socket room */
  useEffect(() => {
    if (!socket || !selectedStop) return;
    socket.emit("watchStop", selectedStop);
    fetchArrivals(selectedStop);
    return () => socket.emit("unwatchStop", selectedStop);
  }, [socket, selectedStop, fetchArrivals]);

  /* real-time ETA updates */
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (data) => {
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
        let updated;
        if (idx !== -1) {
          updated = [...prev];
          updated[idx] = entry;
        } else {
          updated = [...prev, entry];
        }
        return updated.sort((a, b) => a.eta - b.eta);
      });
      setLastUpdated(new Date());
    };
    socket.on("stop:eta:update", handleUpdate);
    return () => socket.off("stop:eta:update", handleUpdate);
  }, [socket]);

  /* remove bus on trip complete */
  useEffect(() => {
    if (!socket) return;
    const handleComplete = (data) => {
      setArrivals((prev) => prev.filter((a) => a.busId !== data.busId));
    };
    socket.on("trip:completed", handleComplete);
    return () => socket.off("trip:completed", handleComplete);
  }, [socket]);

  const handleStopChange = (e) => {
    setSelectedStop(e.target.value);
    setArrivals([]);
    setStopInfo(null);
    setLastUpdated(null);
  };

  /* ────────────── render ────────────── */

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        py: 4,
        px: 2,
      }}
    >
      <Box sx={{ maxWidth: 800, mx: "auto" }}>

        {/* ═══ Header ═══ */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.5, mb: 1 }}>
            <Box
              sx={{
                width: 48, height: 48, borderRadius: "14px",
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <DirectionsBus sx={{ color: "#fff", fontSize: 28 }} />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.5px",
              }}
            >
              Live Arrivals
            </Typography>
          </Box>
          <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
            Real-time bus arrival information
          </Typography>
        </Box>

        {/* ═══ Clock + Live Badge ═══ */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AccessTime sx={{ color: "rgba(255,255,255,0.5)", fontSize: 18 }} />
            <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: "monospace" }}>
              {clock}
            </Typography>
          </Box>
          <Chip
            icon={
              <Circle
                sx={{
                  fontSize: "10px !important",
                  color: selectedStop ? "#4caf50 !important" : "#666 !important",
                }}
              />
            }
            label={selectedStop ? "LIVE" : "OFFLINE"}
            size="small"
            sx={{
              background: selectedStop ? "rgba(76,175,80,0.15)" : "rgba(255,255,255,0.08)",
              color: selectedStop ? "#4caf50" : "#666",
              fontWeight: 700, fontSize: 11, letterSpacing: "1px",
              "& .MuiChip-icon": { animation: selectedStop ? "pulse-dot 1.5s infinite" : "none" },
            }}
          />
        </Box>

        {/* ═══ Stop Selector Card ═══ */}
        <Card
          sx={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 3, mb: 3,
          }}
        >
          <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "1px", mb: 1.5,
              }}
            >
              Select Your Stop
            </Typography>

            <TextField
              fullWidth size="small" placeholder="Search stops..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: "rgba(255,255,255,0.3)" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 1.5,
                "& .MuiOutlinedInput-root": {
                  color: "#fff", background: "rgba(255,255,255,0.05)", borderRadius: 2,
                  "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                  "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
                },
                "& input::placeholder": { color: "rgba(255,255,255,0.3)" },
              }}
            />

            <TextField
              select fullWidth value={selectedStop} onChange={handleStopChange} label="Bus Stop"
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "#fff", background: "rgba(255,255,255,0.05)", borderRadius: 2,
                  "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                  "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
                },
                "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.4)" },
                "& .MuiInputLabel-root.Mui-focused": { color: "#3b82f6" },
                "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.4)" },
              }}
            >
              <MenuItem value=""><em>— Choose a stop —</em></MenuItem>
              {filteredStops.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <MyLocation sx={{ fontSize: 16, color: "#3b82f6" }} />
                    <span>{s.stopName}</span>
                    <Chip label={s.stopCode} size="small" sx={{ ml: "auto", fontSize: 11, height: 20 }} />
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </CardContent>
        </Card>

        {/* ═══ Error ═══ */}
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        {/* ═══ Loading ═══ */}
        {loading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress
              sx={{
                borderRadius: 2, mb: 2,
                "& .MuiLinearProgress-bar": { background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" },
                backgroundColor: "rgba(255,255,255,0.08)",
              }}
            />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={90}
                sx={{ mb: 1.5, bgcolor: "rgba(255,255,255,0.06)", borderRadius: 3 }}
              />
            ))}
          </Box>
        )}

        {/* ═══ Stop Header ═══ */}
        {stopInfo && !loading && (
          <Paper
            sx={{
              background: "linear-gradient(135deg, #1e40af, #7c3aed)",
              color: "#fff", p: 2.5, borderRadius: "16px 16px 0 0",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 20 }}>{stopInfo.stopName}</Typography>
              <Typography sx={{ opacity: 0.7, fontSize: 13 }}>Stop Code: {stopInfo.stopCode}</Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Chip
                label={`${arrivals.length} bus${arrivals.length !== 1 ? "es" : ""}`}
                sx={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 600, mb: 0.5 }}
              />
              {lastUpdated && (
                <Typography sx={{ opacity: 0.6, fontSize: 11 }}>
                  Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </Typography>
              )}
            </Box>
          </Paper>
        )}

        {/* ═══ Arrival Cards ═══ */}
        {selectedStop && !loading && (
          <Box
            sx={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderTop: stopInfo ? "none" : undefined,
              borderRadius: stopInfo ? "0 0 16px 16px" : 3,
              overflow: "hidden",
            }}
          >
            {arrivals.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 6, px: 3 }}>
                <Schedule sx={{ fontSize: 48, color: "rgba(255,255,255,0.15)", mb: 1 }} />
                <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }}>
                  No buses heading to this stop right now
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.25)", fontSize: 13, mt: 0.5 }}>
                  Buses will appear here when trips are active
                </Typography>
              </Box>
            ) : (
              arrivals.map((a, idx) => (
                <Fade in key={a.busId}>
                  <Box>
                    {idx > 0 && <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />}
                    <Box
                      sx={{
                        p: 2.5, display: "flex", alignItems: "center", gap: 2,
                        transition: "background 0.2s",
                        "&:hover": { background: "rgba(255,255,255,0.04)" },
                      }}
                    >
                      {/* Bus icon */}
                      <Box
                        sx={{
                          width: 56, height: 56, borderRadius: "14px",
                          background: `${etaColor(a.eta)}18`,
                          border: `1.5px solid ${etaColor(a.eta)}40`,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}
                      >
                        <DirectionsBus sx={{ fontSize: 22, color: etaColor(a.eta) }} />
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: etaColor(a.eta), mt: 0.2, lineHeight: 1 }}>
                          {a.busNumber}
                        </Typography>
                      </Box>

                      {/* Route info */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                          <Typography
                            sx={{
                              fontWeight: 600, fontSize: 15, color: "#fff",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}
                          >
                            {a.routeName}
                          </Typography>
                          <Chip
                            label={a.routeCode} size="small"
                            sx={{
                              height: 20, fontSize: 10, fontWeight: 700,
                              background: "rgba(59,130,246,0.15)", color: "#60a5fa", borderRadius: "6px",
                            }}
                          />
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                          <Chip
                            size="small" label={a.busType}
                            sx={{
                              height: 20, fontSize: 10, fontWeight: 600, borderRadius: "6px",
                              background: a.busType === "AC" ? "rgba(33,150,243,0.15)" : a.busType === "ELECTRIC" ? "rgba(76,175,80,0.15)" : "rgba(255,152,0,0.15)",
                              color: a.busType === "AC" ? "#42a5f5" : a.busType === "ELECTRIC" ? "#66bb6a" : "#ffa726",
                            }}
                          />
                          {a.delay > 0 ? (
                            <Chip
                              icon={<Warning sx={{ fontSize: "14px !important" }} />}
                              label={`${a.delay} min late`} size="small"
                              sx={{
                                height: 20, fontSize: 10, fontWeight: 600, borderRadius: "6px",
                                background: "rgba(239,83,80,0.12)", color: "#ef5350",
                                "& .MuiChip-icon": { color: "#ef5350" },
                              }}
                            />
                          ) : (
                            <Chip
                              icon={<CheckCircle sx={{ fontSize: "14px !important" }} />}
                              label="On time" size="small"
                              sx={{
                                height: 20, fontSize: 10, fontWeight: 600, borderRadius: "6px",
                                background: "rgba(76,175,80,0.12)", color: "#66bb6a",
                                "& .MuiChip-icon": { color: "#66bb6a" },
                              }}
                            />
                          )}
                        </Box>

                        <LinearProgress
                          variant="determinate" value={etaProgress(a.eta)}
                          sx={{
                            mt: 1, height: 3, borderRadius: 2,
                            backgroundColor: "rgba(255,255,255,0.06)",
                            "& .MuiLinearProgress-bar": {
                              borderRadius: 2,
                              background: `linear-gradient(90deg, ${etaColor(a.eta)}, ${etaColor(a.eta)}88)`,
                              transition: "transform 0.8s ease",
                            },
                          }}
                        />
                      </Box>

                      {/* ETA */}
                      <Box sx={{ textAlign: "center", minWidth: 70, flexShrink: 0 }}>
                        {a.eta <= 1 ? (
                          <Box>
                            <NearMe sx={{ fontSize: 28, color: "#d32f2f", animation: "bounce 1s infinite" }} />
                            <Typography sx={{ color: "#d32f2f", fontWeight: 800, fontSize: 13, mt: 0.3 }}>
                              Arriving
                            </Typography>
                          </Box>
                        ) : (
                          <Box>
                            <Typography
                              sx={{
                                fontWeight: 800, fontSize: 28, lineHeight: 1,
                                color: etaColor(a.eta), fontFamily: "monospace",
                              }}
                            >
                              {a.eta}
                            </Typography>
                            <Typography
                              sx={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}
                            >
                              min
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Fade>
              ))
            )}
          </Box>
        )}

        {/* ═══ Footer ═══ */}
        {selectedStop && !loading && (
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, px: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Circle sx={{ fontSize: 8, color: "#4caf50", animation: "pulse-dot 1.5s infinite" }} />
              <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                Live — updates every 3 seconds
              </Typography>
            </Box>
            <Tooltip title="Refresh arrivals">
              <IconButton onClick={() => fetchArrivals(selectedStop)} size="small" sx={{ color: "rgba(255,255,255,0.4)" }}>
                <Refresh sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* ═══ Quick Select chips ═══ */}
        {!selectedStop && stops.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "1px", mb: 1.5,
              }}
            >
              Quick Select
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {stops.slice(0, 8).map((s) => (
                <Chip
                  key={s._id} label={s.stopName}
                  icon={<MyLocation sx={{ fontSize: "14px !important" }} />}
                  onClick={() => { setSelectedStop(s._id); setArrivals([]); setStopInfo(null); }}
                  sx={{
                    background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(255,255,255,0.1)", fontWeight: 500, cursor: "pointer",
                    transition: "all 0.2s",
                    "& .MuiChip-icon": { color: "rgba(255,255,255,0.3)" },
                    "&:hover": {
                      background: "rgba(59,130,246,0.15)", borderColor: "#3b82f6", color: "#60a5fa",
                      "& .MuiChip-icon": { color: "#60a5fa" },
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </Box>
  );
}
