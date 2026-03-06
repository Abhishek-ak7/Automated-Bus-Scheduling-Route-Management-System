import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import { useEffect, useState } from "react";
import { useSocket } from "../../hooks/useSocket";
import { getRoute } from "../../services/routeService";

export default function TrackBus() {

  const socket = useSocket();

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

  }, [socket]);

  return (
    <MapContainer
      center={[31.2536, 75.7050]}
      zoom={13}
      style={{ height: "600px", width: "100%" }}
    >

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Polyline positions={routeCoords} color="blue" />

      {bus && (
        <Marker position={[bus.lat, bus.lng]} />
      )}

    </MapContainer>
  );
}
