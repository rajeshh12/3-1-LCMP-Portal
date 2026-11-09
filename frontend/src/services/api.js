import axios from "axios";

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api" });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("legal-portal-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((response) => response.data, (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem("legal-portal-token");
    if (location.pathname !== "/login") location.assign("/login");
  }
  return Promise.reject(new Error(error.response?.data?.error || "Could not connect to the portal service"));
});
