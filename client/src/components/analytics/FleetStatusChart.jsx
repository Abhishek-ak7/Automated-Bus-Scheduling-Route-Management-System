import { Card, CardContent, Typography, Box, Stack } from "@mui/material";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const STATUS_COLORS = {
  "On Route": "#1976d2",
  Active: "#2e7d32",
  Maintenance: "#ed6c02",
  Inactive: "#9e9e9e",
};

const TYPE_COLORS = {
  AC: "#1565c0",
  "NON-AC": "#558b2f",
  ELECTRIC: "#6a1b9a",
};

const renderLabel = ({ name, percent }) =>
  percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : "";

export default function FleetStatusChart({ data }) {
  if (!data) return null;

  const statusData = [
    { name: "On Route", value: data.onRoute || 0 },
    { name: "Active", value: Math.max(0, (data.byStatus?.active || 0) - (data.onRoute || 0)) },
    { name: "Maintenance", value: data.byStatus?.maintenance || 0 },
    { name: "Inactive", value: data.byStatus?.inactive || 0 },
  ].filter((d) => d.value > 0);

  const typeData = Object.entries(data.byType || {}).map(([name, value]) => ({ name, value }));

  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200", height: "100%" }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Fleet Overview
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
          {data.total} total buses
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center" justifyContent="center">
          {/* Status donut */}
          <Box sx={{ width: 200, height: 220 }}>
            <Typography variant="caption" fontWeight={600} textAlign="center" display="block">
              By Status
            </Typography>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  label={renderLabel}
                  labelLine={false}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#ccc"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          {/* Type donut */}
          {typeData.length > 0 && (
            <Box sx={{ width: 200, height: 220 }}>
              <Typography variant="caption" fontWeight={600} textAlign="center" display="block">
                By Type
              </Typography>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={typeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    label={renderLabel}
                    labelLine={false}
                  >
                    {typeData.map((entry) => (
                      <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || "#90a4ae"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
