import { useEffect, useState } from "react";
import { Grid, Card, CardContent, Typography } from "@mui/material";
import { getDashboardStats } from "../../services/analyticsService";

export default function Dashboard() {

  const [stats, setStats] = useState({
    activeBuses: 0,
    tripsToday: 0,
    onTimePercentage: 0,
    avgDelay: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchStats();
  }, []);

  return (
    <Grid container spacing={3}>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6">Active Buses</Typography>
            <Typography variant="h4">{stats.activeBuses}</Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6">Trips Today</Typography>
            <Typography variant="h4">{stats.tripsToday}</Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6">On-Time %</Typography>
            <Typography variant="h4">{stats.onTimePercentage}%</Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6">Avg Delay</Typography>
            <Typography variant="h4">{stats.avgDelay} min</Typography>
          </CardContent>
        </Card>
      </Grid>

    </Grid>
  );
}
