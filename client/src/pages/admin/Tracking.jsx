import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap
} from "react-leaflet";

import { useEffect, useState } from "react";
import { getRoute } from "../../services/routeService";
import { useSocket } from "../../hooks/useSocket";
import L from "leaflet";

/* ---------------- ICONS ---------------- */

const startIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/447/447031.png",
  iconSize: [35, 35],
  iconAnchor: [17, 35]
});

const stopIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/149/149060.png",
  iconSize: [22, 22],
  iconAnchor: [11, 22]
});

const endIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [38, 38],
  iconAnchor: [19, 38]
});

const busIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61231.png",
  iconSize: [42, 42],
  iconAnchor: [21, 21]
});

/* ------------ AUTO ZOOM COMPONENT ------------ */

function FitBounds({ coords }) {
  const map = useMap();

  useEffect(() => {
    if (coords.length > 0) {
      map.fitBounds(coords);
    }
  }, [coords, map]);

  return null;
}

/* ---------------- MAIN COMPONENT ---------------- */

export default function Tracking() {

  const socket = useSocket();

  const [routeCoords, setRouteCoords] = useState([]);
  const [stops, setStops] = useState([]);
  const [busPosition, setBusPosition] = useState(null);

  /* -------- LOAD ROUTE -------- */

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

  /* -------- LIVE BUS UPDATE -------- */

  useEffect(() => {

    if (!socket) return;

    socket.on("bus:location:update", (data) => {

      setBusPosition(prev => {

        if (!prev) {
          return { lat: data.lat, lng: data.lng };
        }

        /* smooth movement */
        return {
          lat: prev.lat + (data.lat - prev.lat) * 0.4,
          lng: prev.lng + (data.lng - prev.lng) * 0.4
        };

      });

    });

    return () => socket.off("bus:location:update");

  }, [socket]);

  return (
    <MapContainer
      center={[31.2536, 75.7050]}
      zoom={13}
      style={{ height: "650px", width: "100%", borderRadius: "10px" }}
      scrollWheelZoom={true}
    >

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* AUTO ZOOM */}
      <FitBounds coords={routeCoords} />

      {/* ROUTE SHADOW */}
      {routeCoords.length > 0 && (
        <Polyline
          positions={routeCoords}
          pathOptions={{
            color: "#0d47a1",
            weight: 7,
            opacity: 0.25
          }}
        />
      )}

      {/* ROUTE LINE */}
      {routeCoords.length > 0 && (
        <Polyline
          positions={routeCoords}
          pathOptions={{
            color: "#1976d2",
            weight: 5,
            opacity: 0.9
          }}
        />
      )}

      {/* STOPS */}
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
              <b>{stop.stopId.stopName}</b>
              <br />
              Stop #{index + 1}
            </Popup>
          </Marker>
        );

      })}

      {/* BUS */}
      {busPosition && (
        <Marker
          position={[busPosition.lat, busPosition.lng]}
          icon={busIcon}
        >
          <Popup>
            <b>🚍 Bus Live Location</b>
            <br />
            Lat: {busPosition.lat.toFixed(4)}
            <br />
            Lng: {busPosition.lng.toFixed(4)}
          </Popup>
        </Marker>
      )}

    </MapContainer>
  );
}