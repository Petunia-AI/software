import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/lib/api";

interface User {
  id: string;
  email: string;
  full_name: string;
  is_superuser: boolean;
  business_id: string;
  plan_tier?: string;   // "trial" | "starter" | "pro" | "enterprise"
  plan_name?: string;   // "Trial" | "Starter" | "Profesional" | "Premium"
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const res = await authApi.login(email, password);
        const { access_token } = res.data;
        localStorage.setItem("access_token", access_token);
        // Cookie para que el middleware de Next.js pueda verificar la sesión en SSR
        document.cookie = `auth_token=${access_token}; path=/; SameSite=Lax; max-age=2592000`;
        set({ token: access_token, isAuthenticated: true });
        await get().loadUser();
      },

      register: async (email, password, full_name) => {
        await authApi.register(email, password, full_name);
        await get().login(email, password);
      },

      logout: () => {
        localStorage.removeItem("access_token");
        // Limpiar cookie del middleware
        document.cookie = "auth_token=; path=/; max-age=0";
        set({ user: null, token: null, isAuthenticated: false });
      },

      loadUser: async () => {
        try {
          const res = await authApi.me();
          set({ user: res.data, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token }),
    }
  )
);
