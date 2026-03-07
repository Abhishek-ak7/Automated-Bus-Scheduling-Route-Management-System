import api from "../api/axios";

/* Get progress for a specific bus's active trip */
export const getTripProgress = async (busId) => {
  const res = await api.get(`/trips/active/${busId}/progress`);
  return res.data;
};

/* Get all active/running trips */
export const getActiveTrips = async () => {
  const res = await api.get("/trips/active");
  return res.data;
};
