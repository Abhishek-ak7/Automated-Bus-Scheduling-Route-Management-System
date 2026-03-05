import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function SchedulesPage() {

  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [routeId, setRouteId] = useState("");
  const [busId, setBusId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [departure, setDeparture] = useState("");

  const loadData = async () => {
    try {

      const routesRes = await api.get("/routes");
      const busesRes = await api.get("/buses");
      const driversRes = await api.get("/drivers");

      setRoutes(routesRes.data.data || []);
      setBuses(busesRes.data.data || []);
      setDrivers(driversRes.data.data || []);

    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createSchedule = async () => {

    try {

      await api.post("/trips", {
        route: routeId,
        bus: busId,
        driver: driverId,
        plannedStartTime: departure
      });

      alert("Trip Scheduled Successfully");

    } catch (err) {
      console.log(err);
    }

  };

  return (
    <div>

      <h2>Schedule Manager</h2>

      <div style={{ display: "grid", gap: "10px", maxWidth: "400px" }}>

        <select onChange={(e) => setRouteId(e.target.value)}>
          <option>Select Route</option>
          {routes.map(r => (
            <option key={r._id} value={r._id}>
              {r.routeName}
            </option>
          ))}
        </select>

        <select onChange={(e) => setBusId(e.target.value)}>
          <option>Select Bus</option>
          {buses.map(b => (
            <option key={b._id} value={b._id}>
              {b.busNumber}
            </option>
          ))}
        </select>

        <select onChange={(e) => setDriverId(e.target.value)}>
          <option>Select Driver</option>
          {drivers.map(d => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </select>

        <input
          type="datetime-local"
          onChange={(e) => setDeparture(e.target.value)}
        />

        <button onClick={createSchedule}>
          Create Schedule
        </button>

      </div>

    </div>
  );
}
