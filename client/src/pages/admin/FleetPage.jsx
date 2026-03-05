import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function FleetPage() {

  const [buses, setBuses] = useState([]);

  const [busNumber, setBusNumber] = useState("");
  const [capacity, setCapacity] = useState("");

  const loadBuses = async () => {

    try {

      const res = await api.get("/buses");

      setBuses(res.data.data || []);

    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    loadBuses();
  }, []);

  const createBus = async () => {

    try {

      await api.post("/buses", {
        busNumber,
        capacity
      });

      setBusNumber("");
      setCapacity("");

      loadBuses();

    } catch (err) {
      console.log(err);
    }

  };

  return (
    <div>

      <h2>Fleet Manager</h2>

      <div style={{ marginBottom: "20px" }}>

        <input
          placeholder="Bus Number"
          value={busNumber}
          onChange={(e) => setBusNumber(e.target.value)}
        />

        <input
          placeholder="Capacity"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />

        <button onClick={createBus}>
          Add Bus
        </button>

      </div>

      <table border="1">

        <thead>
          <tr>
            <th>Bus Number</th>
            <th>Capacity</th>
          </tr>
        </thead>

        <tbody>

          {buses.map((bus) => (

            <tr key={bus._id}>
              <td>{bus.busNumber}</td>
              <td>{bus.capacity}</td>
            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}
