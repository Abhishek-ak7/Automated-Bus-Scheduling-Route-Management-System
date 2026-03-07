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

/* Get nearby stops by lat/lng (public) */
export const getNearbyStops = async (lat, lng, radius = 3, limit = 8) => {
  const res = await api.get("/stops/nearby", {
    params: { lat, lng, radius, limit },
  });
  return res.data.data;
};

/* Get arrivals for multiple stops at once (public) */
export const getMultiStopArrivals = async (stopIds) => {
  const res = await api.get("/stops/multi-arrivals", {
    params: { stopIds: stopIds.join(",") },
  });
  return res.data.data;
};
