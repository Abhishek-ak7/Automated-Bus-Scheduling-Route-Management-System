import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import { useEffect, useState } from "react";
import { Box, Typography, Stack } from "@mui/material";
import { DirectionsBus, FiberManualRecord } from "@mui/icons-material";
import { useSocket } from "../../hooks/useSocket";
import { useDelayAlerts } from "../../hooks/useDelayAlerts";
import { getRoute } from "../../services/routeService";
import TripProgressCard from "../../components/tracking/TripProgressCard";
import AnimatedBusMarker from "../../components/tracking/AnimatedBusMarker";
import DelayAlertBanner from "../../components/alerts/DelayAlertBanner";

export default function TrackBus() {

  const socket = useSocket();
  const { alerts } = useDelayAlerts(socket);

  const [bus, setBus] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);

  useEffect(() => {

    const loadRoute = async () => {

      const route = await getRoute("69a6994d48d98d5d872d3781");

      const coords = route.stops.map(stop => [
        stop.stopId.location.lat,
        stop.stopId.location.lng
      ]);

      setRouteCoords(coords);
    };

    loadRoute();

  }, []);

  useEffect(() => {

    if (!socket) return;

    socket.on("bus:location:update", (data) => {
      setBus(data);
    });

    return () => socket.off("bus:location:update");

  }, [socket]);

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", py: 2, px: { xs: 1, sm: 2 } }}>

      {/* ── Delay Alert Toasts ── */}
      <DelayAlertBanner alerts={alerts} variant="light" maxToasts={3} />

      {/* ── Header ── */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <DirectionsBus sx={{ fontSize: 28, color: "primary.main" }} />
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Track Your Bus
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <FiberManualRecord sx={{ fontSize: 8, color: bus ? "#2e7d32" : "#bdbdbd" }} />
            <Typography variant="caption" color="text.secondary">
              {bus ? "Live tracking active" : "Waiting for bus…"}
            </Typography>
          </Stack>
        </Box>
      </Stack>

      {/* ── Map ── */}
      <Box sx={{ borderRadius: 3, overflow: "hidden", border: "1px solid", borderColor: "grey.200" }}>
        <MapContainer
          center={[31.2536, 75.7050]}
          zoom={13}
          style={{ height: "400px", width: "100%" }}
        >

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Polyline positions={routeCoords} color="#1976d2" weight={4} />

          {bus && (
            <AnimatedBusMarker
              position={[bus.lat, bus.lng]}
              duration={2500}
              popupContent={
                `<b>🚍 ${bus?.progress?.busNumber || "Bus"}</b><br/>`
                + `Next: ${bus?.nextStop || "—"}<br/>`
                + `ETA: ${bus?.eta ?? "--"} min`
              }
            />
          )}

        </MapContainer>
      </Box>

      {/* ── Route Progress (compact mode for passengers) ── */}
      <Box sx={{ mt: 2 }}>
        <TripProgressCard progress={bus?.progress} bus={bus} compact />
      </Box>

    </Box>
  );
}
