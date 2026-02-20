import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:50245/v1";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  const directToken = localStorage.getItem("token");
  if (directToken) return directToken;

  const persistedAuth = localStorage.getItem("auth-storage");
  if (!persistedAuth) return null;

  try {
    const parsed = JSON.parse(persistedAuth);
    const persistedToken = parsed?.state?.token || parsed?.token;
    if (typeof persistedToken === "string" && persistedToken) {
      localStorage.setItem("token", persistedToken);
      return persistedToken;
    }
  } catch {
    return null;
  }

  return null;
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // If the request data is FormData, remove Content-Type header
  // to let the browser set it automatically with boundary
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // Only redirect if not already on login page
      if (!window.location.pathname.includes("/login")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("auth-storage");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
