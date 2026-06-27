import axios from "axios";
import Cookies from "js-cookie";

const API_BASE_URL = "/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to automatically add the Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get("parkshare_token") || localStorage.getItem("parkshare_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle authentication errors (e.g. 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear local session storage
      Cookies.remove("parkshare_token");
      Cookies.remove("parkshare_role");
      localStorage.removeItem("parkshare_token");
      localStorage.removeItem("parkshare_role");
      
      // If we are in browser and not on public pages, redirect to login
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (path !== "/login" && path !== "/signup" && path !== "/") {
          window.location.href = `/login?redirect=${encodeURIComponent(path)}`;
        }
      }
    }
    return Promise.reject(error);
  }
);
