import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api"
});

/* Attach token for protected routes */
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("dtc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* 1. KPI cards */
export const getDashboardStats = async () => {
  const res = await API.get("/analytics/dashboard");
  return res.data;
};

/* 2. Hourly trip distribution */
export const getHourlyTrips = async () => {
  const res = await API.get("/analytics/trips/hourly");
  return res.data;
};

/* 3. Daily trip trend (last N days) */
export const getDailyTrips = async (days = 7) => {
  const res = await API.get(`/analytics/trips/daily?days=${days}`);
  return res.data;
};

/* 4. Fleet status breakdown */
export const getFleetStatus = async () => {
  const res = await API.get("/analytics/fleet/status");
  return res.data;
};

/* 5. Route performance */
export const getRoutePerformance = async (limit = 10) => {
  const res = await API.get(`/analytics/routes/performance?limit=${limit}`);
  return res.data;
};

/* 6. Delay distribution */
export const getDelayDistribution = async () => {
  const res = await API.get("/analytics/delays/distribution");
  return res.data;
};
