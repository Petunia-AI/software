"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zernioApi } from "@/lib/api";
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
  PlusCircle,
} from "lucide-react";

// Plataformas disponibles en Zernio con metadata visual
const PLATFORM_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  twitter:      { label: "X / Twitter",     color: "text-gray-900",   bg: "bg-gray-100",   border: "border-gray-200" },
  facebook:     { label: "Facebook",         color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200" },
  instagram:    { label: "Instagram",        color: "text-pink-600",   bg: "bg-pink-50",    border: "border-pink-200" },
  linkedin:     { label: "LinkedIn",         color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200" },
  tiktok:       { label: "TikTok",           color: "text-gray-900",   bg: "bg-gray-100",   border: "border-gray-200" },
  youtube:      { label: "YouTube",          color: "text-red-600",    bg: "bg-red-50",     border: "border-red-200" },
  pinterest:    { label: "Pinterest",        color: "text-red-600",    bg: "bg-red-50",     border: "border-red-200" },
  telegram:     { label: "Telegram",         color: "text-sky-600",    bg: "bg-sky-50",     border: "border-sky-200" },
  reddit:       { label: "Reddit",           color: "text-orange-600", bg: "bg-orange-50",  border: "border-orange-200" },
  bluesky:      { label: "Bluesky",          color: "text-sky-600",    bg: "bg-sky-50",     border: "border-sky-200" },
  threads:      { label: "Threads",          color: "text-gray-900",   bg: "bg-gray-100",   border: "border-gray-200" },
  googlebusiness: { label: "Google Business", color: "text-green-700", bg: "bg-green-50",  border: "border-green-200" },
  whatsapp:     { label: "WhatsApp",         color: "text-green-700",  bg: "bg-green-50",   border: "border-green-200" },
  discord:      { label: "Discord",          color: "text-indigo-600", bg: "bg-indigo-50",  border: "border-indigo-200" },
  snapchat:     { label: "Snapchat",         color: "text-yellow-600", bg: "bg-yellow-50",  border: "border-yellow-200" },
};

// Plataformas con soporte de DMs / auto-respondedor
const DM_SUPPORTED = ["facebook", "instagram", "twitter", "telegram", "whatsapp", "reddit", "bluesky"];

interface ConnectedAccount {
  platform: string;
  accountId: string;
  username?: string;
}

interface ZernioStatus {
  connected: boolean;
  enabled: boolean;
  profile_id?: string;
  connected_platforms: ConnectedAccount[];
  autoresponder_enabled?: boolean;
  autoresponder_channels?: string[];
  available_platforms?: Record<string, string>;
}

interface ZernioConnectProps {
  status: ZernioStatus | undefined;
  onUpdate: () => void;
}

export function ZernioConnect({ status, onUpdate }: ZernioConnectProps) {
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [togglingAutoresponder, setTogglingAutoresponder] = useState(false);
  const [savingChannels, setSavingChannels] = useState(false);
  const [registeringWebhook, setRegisteringWebhook] = useState(false);

  const refreshMutation = useMutation({
    mutationFn: () => zernioApi.refresh(),
    onSuccess: (res) => {
      const accounts: ConnectedAccount[] = res.data.connected_platforms ?? [];
      toast.success(
        accounts.length > 0
          ? `${accounts.length} cuenta(s) vinculada(s) ✓`
          : "Sin cuentas vinculadas aún"
      );
      onUpdate();
    },
    onError: () => toast.error("Error al refrescar las cuentas"),
  });

  const disconnectAccountMutation = useMutation({
    mutationFn: (accountId: string) => zernioApi.disconnectAccount(accountId),
    onSuccess: () => {
      toast.success("Plataforma desconectada");
      onUpdate();
    },
    onError: () => toast.error("Error al desconectar"),
  });

  const disconnectAllMutation = useMutation({
    mutationFn: () => zernioApi.disconnect(),
    onSuccess: () => {
      toast.success("Zernio desconectado");
      onUpdate();
    },
    onError: () => toast.error("Error al desconectar Zernio"),
  });

  const handleConnectPlatform = async (platform: string) => {
    setConnectingPlatform(platform);
    try {
      const { data } = await zernioApi.connect(platform);
      window.open(data.url, "_blank", "noopener,noreferrer");
      toast.success(
        `Se abrió la página de autorización para ${PLATFORM_META[platform]?.label ?? platform}. Vincula tu cuenta y vuelve aquí.`,
        { duration: 7000 }
      );
      // Auto-refrescar cuando el usuario vuelve a esta pestaña
      const handler = () => {
        if (document.visibilityState === "visible") {
          document.removeEventListener("visibilitychange", handler);
          zernioApi.refresh().then(() => onUpdate()).catch(() => {});
        }
      };
      document.addEventListener("visibilitychange", handler);
      onUpdate();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || `Error al conectar ${platform}`);
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleToggleAutoresponder = async (enabled: boolean) => {
    setTogglingAutoresponder(true);
    try {
      await zernioApi.updateSettings(enabled, status?.autoresponder_channels);
      toast.success(enabled ? "Auto-respondedor activado ✓" : "Auto-respondedor desactivado");
      onUpdate();
    } catch {
      toast.error("Error al actualizar configuración");
    } finally {
      setTogglingAutoresponder(false);
    }
  };

  const handleToggleChannel = async (platform: string, checked: boolean) => {
    setSavingChannels(true);
    try {
      const current: string[] = status?.autoresponder_channels ?? [];
      const updated = checked
        ? [...current.filter((c) => c !== platform), platform]
        : current.filter((c) => c !== platform);
      await zernioApi.updateSettings(status?.autoresponder_enabled ?? true, updated);
      toast.success(
        checked
          ? `${PLATFORM_META[platform]?.label ?? platform} habilitado ✓`
          : `${PLATFORM_META[platform]?.label ?? platform} deshabilitado`
      );
      onUpdate();
    } catch {
      toast.error("Error al actualizar canales");
    } finally {
      setSavingChannels(false);
    }
  };

  const handleRegisterWebhook = async () => {
    setRegisteringWebhook(true);
    try {
      await zernioApi.registerWebhook();
      toast.success("Webhook registrado en Zernio ✓ Los mensajes llegarán en tiempo real.");
    } catch {
      toast.error("Error al registrar webhook");
    } finally {
      setRegisteringWebhook(false);
    }
  };

  const connectedAccounts: ConnectedAccount[] = status?.connected_platforms ?? [];
  const connectedPlatformNames = new Set(connectedAccounts.map((a) => a.platform));
  const availablePlatforms = Object.keys(PLATFORM_META);

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!status?.connected) {
    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
          >
            <Share2 size={28} className="text-white" />
          </div>
          <h3 className="font-semibold text-foreground mb-1 text-base">
            Conectar Redes Sociales
          </h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto leading-relaxed">
            Vincula cada red social por separado. Cada plataforma usa OAuth seguro — sin compartir contraseñas.
          </p>
        </div>

        {/* Grid de plataformas disponibles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {availablePlatforms.map((platform) => {
            const meta = PLATFORM_META[platform];
            const isConnecting = connectingPlatform === platform;
            return (
              <button
                key={platform}
                onClick={() => handleConnectPlatform(platform)}
                disabled={isConnecting || connectingPlatform !== null}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 ${meta.bg} ${meta.border} ${meta.color} hover:opacity-80`}
              >
                {isConnecting ? (
                  <Loader2 size={14} className="animate-spin flex-shrink-0" />
                ) : (
                  <PlusCircle size={14} className="flex-shrink-0" />
                )}
                <span className="truncate">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className="flex items-center justify-between p-4 bg-violet-50 border border-violet-200 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={18} className="text-violet-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-violet-900">Zernio conectado</p>
            <p className="text-xs text-violet-600 mt-0.5">
              {connectedAccounts.length > 0
                ? `${connectedAccounts.length} cuenta(s) vinculada(s)`
                : "Sin cuentas vinculadas — añade una plataforma abajo"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="flex items-center gap-1 text-xs text-violet-700 hover:text-violet-900 border border-violet-300 px-2.5 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 transition"
          >
            {refreshMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            Actualizar
          </button>
          <button
            onClick={() => disconnectAllMutation.mutate()}
            disabled={disconnectAllMutation.isPending}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition px-2.5 py-1.5 rounded-lg hover:bg-red-50"
          >
            {disconnectAllMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Unlink size={11} />}
            Desconectar todo
          </button>
        </div>
      </div>

      {/* Cuentas conectadas */}
      {connectedAccounts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Cuentas vinculadas
          </p>
          <div className="flex flex-wrap gap-2">
            {connectedAccounts.map((acc) => {
              const meta = PLATFORM_META[acc.platform.toLowerCase()] ?? {
                label: acc.platform,
                color: "text-foreground",
                bg: "bg-secondary",
                border: "border-border",
              };
              return (
                <div
                  key={acc.accountId}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${meta.border} ${meta.bg}`}
                >
                  <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                  {acc.username && (
                    <span className="text-xs text-muted-foreground">{acc.username}</span>
                  )}
                  <button
                    onClick={() => disconnectAccountMutation.mutate(acc.accountId)}
                    disabled={disconnectAccountMutation.isPending}
                    className="text-muted-foreground hover:text-red-500 transition ml-1"
                    title="Desconectar"
                  >
                    {disconnectAccountMutation.isPending ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Unlink size={10} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Añadir más plataformas */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Añadir plataforma
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {availablePlatforms
            .filter((p) => !connectedPlatformNames.has(p))
            .map((platform) => {
              const meta = PLATFORM_META[platform];
              const isConnecting = connectingPlatform === platform;
              return (
                <button
                  key={platform}
                  onClick={() => handleConnectPlatform(platform)}
                  disabled={isConnecting || connectingPlatform !== null}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all disabled:opacity-50 ${meta.bg} ${meta.border} ${meta.color} hover:opacity-80`}
                >
                  {isConnecting ? (
                    <Loader2 size={12} className="animate-spin flex-shrink-0" />
                  ) : (
                    <ExternalLink size={12} className="flex-shrink-0" />
                  )}
                  <span className="truncate">{meta.label}</span>
                </button>
              );
            })}
          {availablePlatforms.filter((p) => !connectedPlatformNames.has(p)).length === 0 && (
            <p className="text-xs text-muted-foreground col-span-3">Todas las plataformas están conectadas ✓</p>
          )}
        </div>
      </div>

      {/* Auto-respondedor */}
      {connectedAccounts.length > 0 && (
        <div className="border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-violet-600" />
              <p className="text-sm font-semibold text-foreground">Auto-respondedor IA</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={status?.autoresponder_enabled ?? false}
                disabled={togglingAutoresponder}
                onChange={(e) => handleToggleAutoresponder(e.target.checked)}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600" />
            </label>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Responde automáticamente comentarios y mensajes directos con el agente de ventas IA.
          </p>

          {status?.autoresponder_enabled && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Canales habilitados:</p>
              <div className="flex flex-wrap gap-2">
                {connectedAccounts
                  .filter((acc) => DM_SUPPORTED.includes(acc.platform))
                  .map((acc) => {
                    const platform = acc.platform;
                    const meta = PLATFORM_META[platform] ?? { label: platform, color: "text-foreground", bg: "bg-secondary", border: "border-border" };
                    const enabled = (status?.autoresponder_channels ?? []).includes(platform);
                    return (
                      <label
                        key={acc.accountId}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                          enabled
                            ? `${meta.bg} ${meta.border} ${meta.color}`
                            : "bg-secondary border-border text-muted-foreground opacity-60"
                        } ${savingChannels ? "pointer-events-none opacity-50" : ""}`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={enabled}
                          onChange={(e) => handleToggleChannel(platform, e.target.checked)}
                        />
                        {meta.label}
                        {acc.username && <span className="opacity-70">{acc.username}</span>}
                      </label>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Webhook */}
          {status?.autoresponder_enabled && (
            <button
              onClick={handleRegisterWebhook}
              disabled={registeringWebhook}
              className="flex items-center gap-1.5 text-xs text-violet-700 hover:text-violet-900 border border-violet-300 px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 transition"
            >
              {registeringWebhook ? <Loader2 size={12} className="animate-spin" /> : <Webhook size={12} />}
              Registrar webhook (tiempo real)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
