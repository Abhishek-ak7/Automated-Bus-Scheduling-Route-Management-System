import api from "../api/axios";

/**
 * Fetch the lightweight stop list for autocomplete dropdowns (public, no auth).
 */
export const getPlannerStops = async () => {
  const res = await api.get("/trip-planner/stops");
  return res.data.data;
};

/**
 * Search for route options between two stops.
 * @param {string} fromStopId
 * @param {string} toStopId
 * @returns {{ origin, destination, directRoutes, transferRoutes }}
 */
export const searchTripRoutes = async (fromStopId, toStopId) => {
  const res = await api.post("/trip-planner/search", { fromStopId, toStopId });
  return res.data;
};
