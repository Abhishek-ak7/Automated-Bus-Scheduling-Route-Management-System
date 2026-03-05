import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api"
});

export const getDashboardStats = async () => {
  const res = await API.get("/analytics/dashboard");
  return res.data;
};
