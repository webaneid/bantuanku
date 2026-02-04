import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:50245/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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

// Helper function for making API requests
export async function apiRequest(url: string, options?: any) {
  const response = await api.get(url, options);
  return response.data;
}

export default api;
