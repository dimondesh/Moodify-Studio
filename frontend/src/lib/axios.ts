// frontend/src/lib/axios.ts

import axios from "axios";
import { auth } from "./firebase"; // Убедитесь, что это правильный путь к вашему Firebase auth инстансу

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    console.log(
      "Axios Interceptor: Current Firebase User:",
      user ? user.uid : "No user"
    ); // Лог 1
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
        console.log(
          "Axios Interceptor: Token attached for request to:",
          config.url
        ); // Лог 2
      } catch (error) {
        console.error("Axios Interceptor: Error getting ID token:", error); // Лог 3
      }
    } else {
      console.log(
        "Axios Interceptor: No user, no token attached for request to:",
        config.url
      ); // Лог 4
    }
    return config;
  },
  (error) => {
    console.error("Axios Interceptor: Request error:", error); // Лог 5
    return Promise.reject(error);
  }
);

export { axiosInstance };
