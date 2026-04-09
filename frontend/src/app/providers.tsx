"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";

function CookieSync() {
  const token = useAuthStore((s) => s.token);
  useEffect(() => {
    if (token) {
      // Restaurar cookie desde zustand en caso de que haya expirado
      document.cookie = `auth_token=${token}; path=/; SameSite=Strict; max-age=604800`;
    }
  }, [token]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CookieSync />
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "12px",
            background: "#1e1e2e",
            color: "#fff",
            fontSize: "14px",
          },
        }}
      />
    </QueryClientProvider>
  );
}
