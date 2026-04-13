"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { linkedinApi } from "@/lib/api";
import toast from "react-hot-toast";
import { CheckCircle2, Loader2, Unlink, Building2, User } from "lucide-react";

interface LinkedInStatus {
  connected: boolean;
  name?: string;
  person_urn?: string;
  org_id?: string;
  token_expires_at?: string;
}

interface LinkedInConnectProps {
  status: LinkedInStatus | undefined;
  onUpdate: () => void;
}

export function LinkedInConnect({ status, onUpdate }: LinkedInConnectProps) {
  const [connecting, setConnecting] = useState(false);

  const disconnectMutation = useMutation({
    mutationFn: () => linkedinApi.disconnect(),
    onSuccess: () => {
      toast.success("LinkedIn desconectado");
      onUpdate();
    },
    onError: () => toast.error("Error al desconectar LinkedIn"),
  });

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data } = await linkedinApi.getConnectUrl();
      window.location.href = data.url;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || "Error al conectar con LinkedIn");
      setConnecting(false);
    }
  };

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!status?.connected) {
    return (
      <div className="text-center py-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "#0A66C2" }}
        >
          {/* LinkedIn icon */}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        </div>
        <h3 className="font-semibold text-foreground mb-1 text-base">Conectar LinkedIn</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
          Publica contenido y deja que los agentes respondan{" "}
          <strong>comentarios</strong> en tus posts automáticamente.
        </p>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="inline-flex items-center gap-2.5 px-7 py-3 font-semibold rounded-xl text-white transition-all disabled:opacity-60"
          style={{ background: connecting ? "#004182" : "#0A66C2" }}
        >
          {connecting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          )}
          {connecting ? "Conectando..." : "Continuar con LinkedIn"}
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
      <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <CheckCircle2 size={18} className="text-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-900">
            LinkedIn conectado{status.name ? ` — ${status.name}` : ""}
          </p>
          {daysLeft !== null && (
            <p className={`text-xs mt-0.5 ${daysLeft < 7 ? "text-amber-600 font-medium" : "text-blue-700"}`}>
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

      {/* Identidades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {status.person_urn && (
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Perfil personal</p>
              <p className="text-sm font-medium text-foreground truncate">
                {status.name || status.person_urn.split(":").pop()}
              </p>
            </div>
            <CheckCircle2 size={14} className="text-blue-500 flex-shrink-0 ml-auto" />
          </div>
        )}
        {status.org_id && (
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Building2 size={14} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Página de empresa</p>
              <p className="text-sm font-medium text-foreground truncate">
                ID {status.org_id.split(":").pop()}
              </p>
            </div>
            <CheckCircle2 size={14} className="text-blue-500 flex-shrink-0 ml-auto" />
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Los agentes responderán automáticamente los comentarios en tus posts de LinkedIn.
      </p>
    </div>
  );
}
