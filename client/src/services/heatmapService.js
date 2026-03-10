import api from "../api/axios";

/**
 * Get heatmap data (demand per stop with coordinates).
 * @param {number} hours  look-back window (default 24)
 * @param {string} source  optional filter
 */
export const getHeatmapData = async (hours = 24, source = "") => {
  const params = { hours };
  if (source) params.source = source;
  const res = await api.get("/heatmap", { params });
  return res.data;
};

/**
 * Get summary stats for the dashboard cards.
 */
export const getHeatmapStats = async (hours = 24) => {
  const res = await api.get("/heatmap/stats", { params: { hours } });
  return res.data;
};

/**
 * Manually log a demand event (e.g. when user taps a stop on the map).
 */
export const logDemandEvent = async (stopId, source = "map_tap") => {
  const res = await api.post("/heatmap/log", { stopId, source });
  return res.data;
};
