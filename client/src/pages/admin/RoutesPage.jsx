import { useEffect, useState } from "react";
import api from "../../api/axios";

import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function StopPicker({ stops, setStops }) {

  useMapEvents({
    click(e) {

      const newStop = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      };

      setStops([...stops, newStop]);
    }
  });

  return null;
}

export default function RoutesPage() {

  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);

  const [routeName, setRouteName] = useState("");
  const [routeCode, setRouteCode] = useState("");

  const loadRoutes = async () => {

    const res = await api.get("/routes");

    setRoutes(res.data.data || []);
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const createRoute = async () => {

    await api.post("/routes", {
      routeName,
      routeCode,
      stops: stops.map((stop, i) => ({
        sequence: i + 1,
        location: stop
      }))
    });

    setRouteName("");
    setRouteCode("");
    setStops([]);

    loadRoutes();
  };

  return (
    <div>

      <h1 className="text-2xl font-bold mb-4">Routes Manager</h1>

      {/* Create Route Form */}

      <div className="mb-6">

        <input
          placeholder="Route Name"
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
        />

        <input
          placeholder="Route Code"
          value={routeCode}
          onChange={(e) => setRouteCode(e.target.value)}
        />

        <button onClick={createRoute}>
          Create Route
        </button>

      </div>

      {/* Map */}

      <MapContainer
        center={[31.2536, 75.7050]}
        zoom={13}
        style={{ height: "400px", width: "100%" }}
      >

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <StopPicker stops={stops} setStops={setStops} />

        {stops.map((stop, i) => (
          <Marker key={i} position={[stop.lat, stop.lng]} />
        ))}

        <Polyline
          positions={stops.map(s => [s.lat, s.lng])}
          color="blue"
        />

      </MapContainer>

      {/* Route Table */}

      <table border="1" style={{ marginTop: 20 }}>

        <thead>
          <tr>
            <th>Route Code</th>
            <th>Name</th>
            <th>Stops</th>
          </tr>
        </thead>

        <tbody>
          {routes.map(route => (

            <tr key={route._id}>

              <td>{route.routeCode}</td>
              <td>{route.routeName}</td>
              <td>{route.stops?.length}</td>

            </tr>

          ))}
        </tbody>

      </table>

    </div>
  );
}
