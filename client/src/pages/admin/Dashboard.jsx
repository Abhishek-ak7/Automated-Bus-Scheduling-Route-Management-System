import { Grid, Card, CardContent, Typography } from "@mui/material";

export default function Dashboard() {
  return (
    <Grid container spacing={3}>
      
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6">Active Buses</Typography>
            <Typography variant="h4">12</Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6">Trips Today</Typography>
            <Typography variant="h4">48</Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6">On-Time %</Typography>
            <Typography variant="h4">87%</Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6">Avg Delay</Typography>
            <Typography variant="h4">4 min</Typography>
          </CardContent>
        </Card>
      </Grid>

    </Grid>
  );
}