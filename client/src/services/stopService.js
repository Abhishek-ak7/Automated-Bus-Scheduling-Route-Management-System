import api from "../api/axios";

/* Get all stops */
export const getAllStops = async () => {
  const res = await api.get("/stops");
  return res.data.data;
};

/* Get arrivals for a specific stop (public) */
export const getArrivals = async (stopId) => {
  const res = await api.get(`/stops/${stopId}/arrivals`);
  return res.data;
};
