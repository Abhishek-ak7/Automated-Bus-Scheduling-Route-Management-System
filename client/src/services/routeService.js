import axios from "axios";

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