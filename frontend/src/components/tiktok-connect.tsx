"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { tiktokApi } from "@/lib/api";
import toast from "react-hot-toast";
import { CheckCircle2, Loader2, Unlink } from "lucide-react";

interface TikTokStatus {
  connected: boolean;
  username?: string;
  open_id?: string;
  token_expires_at?: string;
}

interface TikTokConnectProps {
  status: TikTokStatus | undefined;
  onUpdate: () => void;
}

export function TikTokConnect({ status, onUpdate }: TikTokConnectProps) {
  const [connecting, setConnecting] = useState(false);

  const disconnectMutation = useMutation({
    mutationFn: () => tiktokApi.disconnect(),
    onSuccess: () => {
      toast.success("TikTok desconectado");
      onUpdate();
    },
    onError: () => toast.error("Error al desconectar TikTok"),
  });

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data } = await tiktokApi.getConnectUrl();
      window.location.href = data.url;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || "Error al conectar con TikTok");
      setConnecting(false);
    }
  };

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!status?.connected) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-black">
          {/* TikTok icon */}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z"/>
          </svg>
        </div>
        <h3 className="font-semibold text-foreground mb-1 text-base">Conectar TikTok</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
          Publica videos y deja que los agentes respondan{" "}
          <strong>comentarios</strong> automáticamente en tu cuenta de TikTok.
        </p>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="inline-flex items-center gap-2.5 px-7 py-3 font-semibold rounded-xl text-white transition-all disabled:opacity-60 bg-black hover:bg-gray-900"
        >
          {connecting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z"/>
            </svg>
          )}
          {connecting ? "Conectando..." : "Continuar con TikTok"}
        </button>
        <p className="text-xs text-muted-foreground mt-3">
          Se solicitarán permisos de publicación y lectura de comentarios
        </p>
      </div>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────────────
  const expiresAt = status.token_expires_at ? new Date(status.token_expires_at) : null;
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <CheckCircle2 size={18} className="text-gray-700 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            TikTok conectado{status.username ? ` — @${status.username}` : ""}
          </p>
          {daysLeft !== null && (
            <p className={`text-xs mt-0.5 ${daysLeft < 7 ? "text-amber-600 font-medium" : "text-gray-600"}`}>
              Token expira en {daysLeft} días
            </p>
          )}
        </div>
        <button
          onClick={() => disconnectMutation.mutate()}
          disabled={disconnectMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 font-medium"
        >
          {disconnectMutation.isPending
            ? <Loader2 size={12} className="animate-spin" />
            : <Unlink size={12} />}
          Desconectar
        </button>
      </div>

      {/* Cuenta */}
      {status.open_id && (
        <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gray-700">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Cuenta TikTok</p>
            <p className="text-sm font-medium text-foreground truncate">
              {status.username ? `@${status.username}` : status.open_id}
            </p>
          </div>
          <CheckCircle2 size={14} className="text-gray-500 flex-shrink-0 ml-auto" />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Los agentes responderán automáticamente los comentarios en tus videos de TikTok.
      </p>
    </div>
  );
}
