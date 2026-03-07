import { Card, CardContent, Typography, Box } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const getColor = (label) => {
  if (label.startsWith("0")) return "#2e7d32";
  if (label.startsWith("2")) return "#66bb6a";
  if (label.startsWith("5")) return "#ffa726";
  if (label.startsWith("10")) return "#ef5350";
  return "#c62828";
};

export default function DelayDistributionChart({ data = [] }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200", height: "100%" }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Delay Distribution
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
          How delays are spread across completed trips
        </Typography>

        <Box sx={{ width: "100%", height: 250 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #eee" }}
              />
              <Bar dataKey="count" name="Trips" radius={[4, 4, 0, 0]}>
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={getColor(entry.label)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
