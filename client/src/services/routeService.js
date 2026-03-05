import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api"
});

export const getRoute = async (routeId) => {
  const res = await API.get(`/routes/${routeId}`);
  return res.data.data;
};
