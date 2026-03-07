import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Box,
} from "@mui/material";

const typeColor = { express: "error", local: "primary", feeder: "warning" };

export default function RoutePerformanceTable({ data = [] }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Route Performance — Today
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
          Top routes ranked by trip volume
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Route</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Type</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Trips</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Completed</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">On-Time %</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Avg Delay</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Cancelled</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No route data for today yet
                  </TableCell>
                </TableRow>
              )}
              {data.map((r) => (
                <TableRow key={r._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {r.routeCode || "—"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.routeName || ""}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={r.routeType || "—"}
                      size="small"
                      color={typeColor[r.routeType] || "default"}
                      variant="outlined"
                      sx={{ fontSize: 11, height: 22 }}
                    />
                  </TableCell>
                  <TableCell align="center">{r.totalTrips}</TableCell>
                  <TableCell align="center">{r.completedTrips}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={r.onTimePct || 0}
                        sx={{
                          width: 60,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: "#eee",
                          "& .MuiLinearProgress-bar": {
                            bgcolor: r.onTimePct >= 80 ? "#2e7d32" : r.onTimePct >= 50 ? "#ed6c02" : "#c62828",
                            borderRadius: 3,
                          },
                        }}
                      />
                      <Typography variant="caption" fontWeight={600}>
                        {r.onTimePct}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      sx={{ color: r.avgDelay > 10 ? "error.main" : r.avgDelay > 5 ? "warning.main" : "success.main", fontWeight: 600 }}
                    >
                      {r.avgDelay} min
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {r.cancelledTrips > 0 ? (
                      <Chip label={r.cancelledTrips} size="small" color="error" sx={{ fontSize: 11, height: 22 }} />
                    ) : (
                      <Typography variant="body2" color="text.secondary">0</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
