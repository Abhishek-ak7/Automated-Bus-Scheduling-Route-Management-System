import axios from "axios";
import api from "../api/axios";

export const getRoute = async (id) => {

  const token = localStorage.getItem("dtc_token");

  const res = await axios.get(
    `http://localhost:5000/api/routes/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return res.data.data;

};

/* Get all routes (used by LiveBusMap) */
export const getAllRoutes = async () => {
  const res = await api.get("/routes");
  return res.data.data;
};