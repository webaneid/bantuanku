import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "./api";

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  roles: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    phone?: string;
    whatsappNumber: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setHydrated: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      isHydrated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post("/auth/login", { email, password });
          const { user, accessToken } = response.data.data;

          // Save to localStorage first
          localStorage.setItem("token", accessToken);
          localStorage.setItem("user", JSON.stringify(user));

          // Then update state
          set({ user, token: accessToken, isLoading: false });

          // Small delay to ensure localStorage is written
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          await api.post("/auth/register", data);
          // After successful registration, automatically log in
          await new Promise(resolve => setTimeout(resolve, 100));
          const loginResponse = await api.post("/auth/login", {
            email: data.email,
            password: data.password,
          });
          const { user, accessToken } = loginResponse.data.data;

          // Save to localStorage first
          localStorage.setItem("token", accessToken);
          localStorage.setItem("user", JSON.stringify(user));

          // Then update state
          set({ user, token: accessToken, isLoading: false });

          // Small delay to ensure localStorage is written
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        set({ user: null, token: null });
        window.location.href = "/";
      },

      setUser: (user) => set({ user }),
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
