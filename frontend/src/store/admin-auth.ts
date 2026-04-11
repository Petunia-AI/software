"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  is_superuser: boolean;
  business_id: string;
}

interface AdminAuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

// Axios instance exclusiva para admin — usa admin_token, NO access_token
export const adminAxios = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

adminAxios.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("admin_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminAxios.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin-auth-storage");
      document.cookie = "admin_auth_token=; path=/; max-age=0";
      window.location.href = "/admin/login";
    }
    return Promise.reject(error);
  }
);

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const res = await adminAxios.post("/auth/login", { email, password });
        const { access_token } = res.data;
        localStorage.setItem("admin_token", access_token);
        // Cookie separada para el middleware de Next.js
        document.cookie = `admin_auth_token=${access_token}; path=/; SameSite=Strict; max-age=604800`;
        set({ token: access_token, isAuthenticated: true });
        await get().loadUser();
      },

      logout: () => {
        localStorage.removeItem("admin_token");
        document.cookie = "admin_auth_token=; path=/; max-age=0";
        set({ user: null, token: null, isAuthenticated: false });
      },

      loadUser: async () => {
        try {
          const res = await adminAxios.get("/auth/me");
          const user: AdminUser = res.data;
          if (!user.is_superuser) {
            get().logout();
            throw new Error("No tienes permisos de Super Admin");
          }
          set({ user, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: "admin-auth-storage", // key de localStorage separada del cliente
      partialize: (state) => ({ token: state.token }),
    }
  )
);
