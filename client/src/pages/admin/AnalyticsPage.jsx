import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AnalyticsPage() {

  const [stats, setStats] = useState({
    activeBuses: 0,
    tripsToday: 0,
    onTimePercent: 0,
    avgDelay: 0
  });

  const loadStats = async () => {
    try {

      const res = await api.get("/analytics/dashboard");

      setStats(res.data.data);

    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div>

      <h2>Analytics Dashboard</h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "20px",
        marginTop: "20px"
      }}>

        <div style={card}>
          <h3>Active Buses</h3>
          <h1>{stats.activeBuses}</h1>
        </div>

        <div style={card}>
          <h3>Trips Today</h3>
          <h1>{stats.tripsToday}</h1>
        </div>

        <div style={card}>
          <h3>On-Time %</h3>
          <h1>{stats.onTimePercent}%</h1>
        </div>

        <div style={card}>
          <h3>Avg Delay</h3>
          <h1>{stats.avgDelay} min</h1>
        </div>

      </div>

    </div>
  );
}

const card = {
  background: "#fff",
  padding: "20px",
  borderRadius: "8px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  textAlign: "center"
};
