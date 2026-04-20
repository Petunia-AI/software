"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { ayrshareApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Loader2,
  Unlink,
  RefreshCw,
  ExternalLink,
  Share2,
  Bot,
  Webhook,
} from "lucide-react";

// Plataformas que soporta Ayrshare
const PLATFORM_META: Record<string, { label: string; color: string; bg: string }> = {
  twitter:   { label: "X / Twitter",  color: "text-gray-900",   bg: "bg-gray-100" },
  facebook:  { label: "Facebook",     color: "text-blue-700",   bg: "bg-blue-50" },
  instagram: { label: "Instagram",    color: "text-pink-600",   bg: "bg-pink-50" },
  linkedin:  { label: "LinkedIn",     color: "text-blue-700",   bg: "bg-blue-50" },
  tiktok:    { label: "TikTok",       color: "text-gray-900",   bg: "bg-gray-100" },
  youtube:   { label: "YouTube",      color: "text-red-600",    bg: "bg-red-50" },
  pinterest: { label: "Pinterest",    color: "text-red-600",    bg: "bg-red-50" },
  telegram:  { label: "Telegram",     color: "text-sky-600",    bg: "bg-sky-50" },
  reddit:    { label: "Reddit",       color: "text-orange-600", bg: "bg-orange-50" },
  gmb:       { label: "Google Business", color: "text-green-700", bg: "bg-green-50" },
};

interface AyrshareStatus {
  connected: boolean;
  enabled: boolean;
  profile_key_set: boolean;
  connected_platforms: string[];
  autoresponder_enabled?: boolean;
}

interface AyrshareConnectProps {
  status: AyrshareStatus | undefined;
  onUpdate: () => void;
}

export function AyrshareConnect({ status, onUpdate }: AyrshareConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [togglingAutoresponder, setTogglingAutoresponder] = useState(false);
  const [registeringWebhook, setRegisteringWebhook] = useState(false);
  const visibilityListenerRef = useRef<(() => void) | null>(null);

  const refreshMutation = useMutation({
    mutationFn: () => ayrshareApi.refresh(),
    onSuccess: (res) => {
      const platforms: string[] = res.data.connected_platforms ?? [];
      toast.success(
        platforms.length > 0
          ? `${platforms.length} red(es) vinculada(s) ✓`
          : "Sin redes vinculadas aún"
      );
      onUpdate();
    },
    onError: () => toast.error("Error al refrescar las redes"),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => ayrshareApi.disconnect(),
    onSuccess: () => {
      toast.success("Ayrshare desconectado");
      onUpdate();
    },
    onError: () => toast.error("Error al desconectar Ayrshare"),
  });

  const handleToggleAutoresponder = async (enabled: boolean) => {
    setTogglingAutoresponder(true);
    try {
      await ayrshareApi.updateSettings(enabled);
      toast.success(enabled ? "Auto-respondedor activado ✓" : "Auto-respondedor desactivado");
      onUpdate();
    } catch {
      toast.error("Error al actualizar configuración");
    } finally {
      setTogglingAutoresponder(false);
    }
  };

  const handleRegisterWebhook = async () => {
    setRegisteringWebhook(true);
    try {
      await ayrshareApi.registerWebhook();
      toast.success("Webhook registrado en Ayrshare ✓ Los mensajes llegarán en tiempo real.");
    } catch {
      toast.error("Error al registrar webhook");
    } finally {
      setRegisteringWebhook(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data } = await ayrshareApi.connect();
      // Abrir la URL JWT en una nueva pestaña para que el cliente vincule sus redes
      window.open(data.url, "_blank", "noopener,noreferrer");
      toast.success(
        "Se abrió la página de Ayrshare. Vincula tus redes — se actualizará automáticamente al volver.",
        { duration: 7000 }
      );
      onUpdate();

      // Auto-refrescar cuando el usuario vuelve a esta pestaña
      if (visibilityListenerRef.current) {
        document.removeEventListener("visibilitychange", visibilityListenerRef.current);
      }
      const handler = () => {
        if (document.visibilityState === "visible") {
          document.removeEventListener("visibilitychange", handler);
          visibilityListenerRef.current = null;
          ayrshareApi.refresh().then(() => onUpdate()).catch(() => {});
        }
      };
      visibilityListenerRef.current = handler;
      document.addEventListener("visibilitychange", handler);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || "Error al conectar con Ayrshare");
    } finally {
      setConnecting(false);
    }
  };

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!status?.connected) {
    return (
      <div className="text-center py-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
        >
          <Share2 size={28} className="text-white" />
        </div>
        <h3 className="font-semibold text-foreground mb-1 text-base">
          Conectar Redes Sociales
        </h3>
        <p className="text-sm text-muted-foreground mb-3 max-w-sm mx-auto leading-relaxed">
          Vincula <strong>X/Twitter, Instagram, Facebook, LinkedIn, TikTok, YouTube</strong> y
          más desde un solo lugar — sin configurar OAuth por separado.
        </p>

        {/* Chips de plataformas soportadas */}
        <div className="flex flex-wrap justify-center gap-1.5 mb-6 max-w-sm mx-auto">
          {["X/Twitter", "Instagram", "Facebook", "LinkedIn", "TikTok", "YouTube", "Pinterest", "Telegram"].map((p) => (
            <span key={p} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
              {p}
            </span>
          ))}
        </div>

        <button
          onClick={handleConnect}
          disabled={connecting}
          className="inline-flex items-center gap-2.5 px-7 py-3 font-semibold rounded-xl text-white transition-all disabled:opacity-60"
          style={{ background: connecting ? "#4f46e5" : "#6366f1" }}
          onMouseEnter={(e) => !connecting && ((e.currentTarget.style.background = "#4f46e5"))}
          onMouseLeave={(e) => !connecting && ((e.currentTarget.style.background = "#6366f1"))}
        >
          {connecting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <ExternalLink size={18} />
          )}
          {connecting ? "Preparando..." : "Conectar mis redes"}
        </button>
        <p className="text-xs text-muted-foreground mt-3">
          Se abrirá una nueva pestaña para vincular tus cuentas de forma segura
        </p>
      </div>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────────────
  const platforms: string[] = status.connected_platforms ?? [];

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className="flex items-center justify-between p-4 bg-violet-50 border border-violet-200 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={18} className="text-violet-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-violet-900">
              Ayrshare conectado
            </p>
            <p className="text-xs text-violet-600 mt-0.5">
              {platforms.length > 0
                ? `${platforms.length} red(es) vinculada(s)`
                : "Sin redes vinculadas aún — haz clic en «Vincular más redes»"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="flex items-center gap-1 text-xs text-violet-700 hover:text-violet-900 border border-violet-300 px-2.5 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 transition"
          >
            {refreshMutation.isPending ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <RefreshCw size={11} />
            )}
            Actualizar
          </button>
          <button
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition px-2.5 py-1.5 rounded-lg hover:bg-red-50"
          >
            {disconnectMutation.isPending ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Unlink size={11} />
            )}
            Desconectar
          </button>
        </div>
      </div>

      {/* Redes vinculadas */}
      {platforms.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Redes vinculadas
          </p>
          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => {
              const meta = PLATFORM_META[p.toLowerCase()] ?? {
                label: p,
                color: "text-foreground",
                bg: "bg-secondary",
              };
              return (
                <div
                  key={p}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border ${meta.bg}`}
                >
                  <CheckCircle2 size={12} className={meta.color} />
                  <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA para añadir más redes */}
      <div className="flex items-center justify-between p-3.5 bg-secondary/50 rounded-xl">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">¿Quieres vincular más redes?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Abre el portal de Ayrshare y añade más cuentas, luego haz clic en «Actualizar».
          </p>
        </div>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 border border-violet-300 px-3 py-2 rounded-lg bg-violet-50 hover:bg-violet-100 transition flex-shrink-0 ml-3"
        >
          {connecting ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
          Vincular más redes
        </button>
      </div>

      {/* Auto-respondedor */}
      <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
        status.autoresponder_enabled
          ? "bg-violet-50 border-violet-200"
          : "bg-secondary/50 border-border"
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            status.autoresponder_enabled ? "bg-violet-100" : "bg-secondary"
          }`}>
            <Bot size={16} className={status.autoresponder_enabled ? "text-violet-700" : "text-muted-foreground"} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Auto-respondedor de comentarios</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Los agentes IA responden automáticamente comentarios y mensajes en todas las redes
            </p>
          </div>
        </div>
        <button
          onClick={() => handleToggleAutoresponder(!status.autoresponder_enabled)}
          disabled={togglingAutoresponder}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-4 focus:outline-none ${
            status.autoresponder_enabled ? "bg-violet-600" : "bg-gray-200"
          }`}
        >
          {togglingAutoresponder ? (
            <Loader2 size={12} className="animate-spin absolute inset-0 m-auto text-white" />
          ) : (
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
              status.autoresponder_enabled ? "translate-x-5" : "translate-x-0"
            }`} />
          )}
        </button>
      </div>

      {/* Registrar webhook */}
      {status.autoresponder_enabled && (
        <div className="flex items-center justify-between p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-900">Activa las notificaciones en tiempo real</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Registra el webhook para que Ayrshare envíe los comentarios instantáneamente
            </p>
          </div>
          <button
            onClick={handleRegisterWebhook}
            disabled={registeringWebhook}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 border border-amber-300 px-3 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 transition flex-shrink-0 ml-3"
          >
            {registeringWebhook ? <Loader2 size={12} className="animate-spin" /> : <Webhook size={12} />}
            Registrar webhook
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {status.autoresponder_enabled
          ? "Los agentes están respondiendo comentarios y mensajes automáticamente."
          : "Activa el auto-respondedor para que los agentes respondan en todas las redes."}
      </p>
    </div>
  );
}
