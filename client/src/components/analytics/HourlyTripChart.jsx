import { Card, CardContent, Typography, Box } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

const BAR_COLORS = { completed: "#2e7d32", running: "#1976d2", total: "#bdbdbd" };

export default function HourlyTripChart({ data = [] }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200", height: "100%" }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Hourly Distribution — Today
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
          Trips by hour of day
        </Typography>

        <Box sx={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #eee" }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="completed" name="Completed" stackId="a" fill={BAR_COLORS.completed} radius={[0, 0, 0, 0]} />
              <Bar dataKey="running" name="Running" stackId="a" fill={BAR_COLORS.running} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
