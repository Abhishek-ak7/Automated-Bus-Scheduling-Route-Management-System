import { Card, CardContent, Typography, Box } from "@mui/material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = { total: "#7b1fa2", completed: "#2e7d32", onTime: "#1976d2" };

export default function DailyTripChart({ data = [], dayRange = 7 }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200", height: "100%" }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Trip Volume — Last {dayRange} Days
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
          Total vs completed vs on-time trips per day
        </Typography>

        <Box sx={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.total} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={COLORS.total} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.completed} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={COLORS.completed} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOnTime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.onTime} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={COLORS.onTime} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #eee" }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="total"
                name="Total Trips"
                stroke={COLORS.total}
                strokeWidth={2}
                fill="url(#gradTotal)"
              />
              <Area
                type="monotone"
                dataKey="completed"
                name="Completed"
                stroke={COLORS.completed}
                strokeWidth={2}
                fill="url(#gradCompleted)"
              />
              <Area
                type="monotone"
                dataKey="onTime"
                name="On-Time"
                stroke={COLORS.onTime}
                strokeWidth={2}
                fill="url(#gradOnTime)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
