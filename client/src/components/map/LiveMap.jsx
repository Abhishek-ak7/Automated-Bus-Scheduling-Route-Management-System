import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect, useState } from "react";
import { useSocket } from "../../hooks/useSocket";
import L from "leaflet";

const busIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61231.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

export default function LiveMap() {
  const socket = useSocket();
  const [buses, setBuses] = useState({});

  useEffect(() => {
    if (!socket) return;

socket.on("bus:location:update", (data) => {
  setBuses((prev) => ({
    ...prev,
    [data.busId]: data,
  }));
});

    return () => {
      socket.off("bus:location:update");
    };
  }, [socket]);

  return (
    <MapContainer
      center={[31.2536, 75.7050]}
      zoom={13}
      style={{ height: "500px", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {Object.values(buses).map((bus) => (
        <Marker
          key={bus.busId}
          position={[bus.lat, bus.lng]}
          icon={busIcon}
        >
          <Popup>
            Bus ID: {bus.busId} <br />
            Speed: {bus.speed || 0}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
