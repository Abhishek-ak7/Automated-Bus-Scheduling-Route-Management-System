import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import { useEffect, useState } from "react";
import { getRoute } from "../../services/routeService";
import { useSocket } from "../../hooks/useSocket";
import L from "leaflet";

/* custom icons */

const startIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
  iconSize: [32, 32]
});

const stopIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
  iconSize: [32, 32]
});

const endIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  iconSize: [32, 32]
});

const busIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61231.png",
  iconSize: [32, 32]
});

export default function Tracking() {

  const socket = useSocket();

  const [routeCoords, setRouteCoords] = useState([]);
  const [stops, setStops] = useState([]);
  const [bus, setBus] = useState(null);

  /* load route */
  useEffect(() => {

    const loadRoute = async () => {

      try {

        const route = await getRoute("69a6994d48d98d5d872d3781");

        const coords = route.stops.map(stop => [
          stop.stopId.location.lat,
          stop.stopId.location.lng
        ]);

        setRouteCoords(coords);
        setStops(route.stops);

      } catch (err) {
        console.log(err);
      }

    };

    loadRoute();

  }, []);

  /* live bus updates */
  useEffect(() => {

    if (!socket) return;

    socket.on("bus:location:update", (data) => {
      setBus(data);
    });

    return () => {
      socket.off("bus:location:update");
    };

  }, [socket]);

  return (
    <MapContainer
      center={[31.2536, 75.7050]}
      zoom={13}
      style={{ height: "600px", width: "100%" }}
      scrollWheelZoom={true}
    >

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* route polyline */}
      {routeCoords.length > 0 && (
        <Polyline positions={routeCoords} color="blue" />
      )}

      {/* stop markers */}
      {stops.map((stop, index) => {

        let icon = stopIcon;

        if (index === 0) icon = startIcon;
        if (index === stops.length - 1) icon = endIcon;

        return (
          <Marker
            key={index}
            position={[
              stop.stopId.location.lat,
              stop.stopId.location.lng
            ]}
            icon={icon}
          >
            <Popup>
              {stop.stopId.stopName}
            </Popup>
          </Marker>
        );

      })}

      {/* bus marker */}
      {bus && (
        <Marker
          position={[bus.lat, bus.lng]}
          icon={busIcon}
        >
          <Popup>
            🚍 Bus Live Location
          </Popup>
        </Marker>
      )}

    </MapContainer>
  );
}