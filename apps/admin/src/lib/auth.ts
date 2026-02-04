import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "./api";

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email: string, password: string) => {
        // Force reset loading state first
        set({ isLoading: false });

        // Small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 50));

        set({ isLoading: true });
        try {
          const response = await api.post("/auth/login", { email, password });
          const { user, accessToken } = response.data.data;

          localStorage.setItem("token", accessToken);
          localStorage.setItem("user", JSON.stringify(user));

          set({ user, token: accessToken, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        set({ user: null, token: null });
        window.location.href = "/login";
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: "auth-storage",
      // Don't persist isLoading state (Firefox fix)
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);
