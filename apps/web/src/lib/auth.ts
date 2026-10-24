import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  roles: string[];
}

export interface RegisterResult {
  id: string;
  email: string;
  name: string;
  emailVerificationRequired: boolean;
  verificationEmail?: "sent" | "cooldown" | "failed";
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
  }) => Promise<RegisterResult>;
  /** Menyimpan sesi hasil penukaran kode Google (token + user), sama seperti login password. */
  setSession: (user: User, accessToken: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  /** Gabungkan perubahan profil (nama, HP, WhatsApp) ke user di store & localStorage tanpa login ulang. */
  mergeUser: (patch: Partial<User>) => void;
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
          // axios dimuat saat dibutuhkan agar tidak ikut bundel awal semua halaman (Header memakai useAuth)
          const { default: api } = await import("./api");
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
          // Tidak ada auto-login: akun baru harus memverifikasi email dulu (ADR-0010)
          const { default: api } = await import("./api");
          const response = await api.post("/auth/register", data);
          set({ isLoading: false });
          return response.data.data as RegisterResult;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      setSession: async (user, accessToken) => {
        localStorage.setItem("token", accessToken);
        localStorage.setItem("user", JSON.stringify(user));
        set({ user, token: accessToken, isLoading: false });
        // Beri waktu localStorage tertulis sebelum navigasi (sama seperti login)
        await new Promise((resolve) => setTimeout(resolve, 50));
      },

      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        set({ user: null, token: null });
        window.location.href = "/";
      },

      setUser: (user) => set({ user }),
      mergeUser: (patch) =>
        set((state) => {
          if (!state.user) return state;
          const changed = (Object.keys(patch) as Array<keyof User>).some((key) => state.user![key] !== patch[key]);
          if (!changed) return state;
          const user = { ...state.user, ...patch };
          try {
            localStorage.setItem("user", JSON.stringify(user));
          } catch {
            // localStorage tidak tersedia: state tetap diperbarui
          }
          return { user };
        }),
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
