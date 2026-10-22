"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import api from "./api";

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  isDeveloper?: boolean;
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
        // Logout yang disengaja menghapus cadangan otomatis form milik pengguna ini (komputer bersama).
        // Logout otomatis karena sesi habis (interceptor 401 di api.ts) sengaja TIDAK menghapusnya.
        const userId = useAuth.getState().user?.id;
        if (userId) {
          Object.keys(localStorage)
            .filter((key) => key.startsWith(`form-draft:${userId}:`))
            .forEach((key) => localStorage.removeItem(key));
        }
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        set({ user: null, token: null });
        window.location.href = "/login";
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // Don't persist isLoading state (Firefox fix)
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);
