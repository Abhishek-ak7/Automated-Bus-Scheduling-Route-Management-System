import { create } from "zustand";
import api from "../api/axios";

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem("dtc_token") || null,

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });

    localStorage.setItem("dtc_token", data.token);

    set({
      user: data.data,
      token: data.token,
    });
  },

  logout: () => {
    localStorage.removeItem("dtc_token");
    set({ user: null, token: null });
  },
}));
