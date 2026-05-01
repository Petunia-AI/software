"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

/**
 * Página pública de callback para Zernio OAuth.
 * Zernio redirige aquí después del OAuth. Como es una redirección cross-site,
 * el middleware no ve la cookie auth_token. Esta página es pública (no protegida),
 * lee los params y redirige a /settings preservando el estado de auth de localStorage.
 */
function ZernioCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Pequeño delay para que el browser restaure las cookies propias
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      params.set("zernio", "connected");

      const platform = searchParams.get("platform");
      const username = searchParams.get("username");
      const accountId = searchParams.get("accountId");
      if (platform) params.set("platform", platform);
      if (username) params.set("username", username);
      if (accountId) params.set("accountId", accountId);

      // Usar window.location para forzar recarga completa con cookies limpias
      window.location.href = `/settings?${params.toString()}`;
    }, 300);

    return () => clearTimeout(timer);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center mx-auto animate-pulse">
          <svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground">Vinculando cuenta...</p>
        <p className="text-xs text-muted-foreground">Regresando a Petunia</p>
      </div>
    </div>
  );
}

export default function ZernioCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ZernioCallbackContent />
    </Suspense>
  );
}
