"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { metaApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Loader2,
  Unlink,
  MessageSquare,
  Instagram,
  Phone,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Wifi,
} from "lucide-react";

interface MetaPage {
  id: string;
  name: string;
  has_instagram: boolean;
  ig_id?: string;
  instagram_id?: string;
  instagram_username?: string;
}

interface WaPhone {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating?: string;
}

interface MetaStatus {
  connected: boolean;
  user_name?: string;
  pages: MetaPage[];
  selected_page_id?: string;
  selected_wa_phone_id?: string;
  wa_business_id?: string;
  wa_phones?: WaPhone[];
  token_expires_at?: string;
  instagram_enabled?: boolean;
  messenger_enabled?: boolean;
  wa_token_set?: boolean;
  page_token_set?: boolean;
}

interface MetaConnectProps {
  status: MetaStatus | undefined;
  onUpdate: () => void;
}

export function MetaConnect({ status, onUpdate }: MetaConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const selectPageMutation = useMutation({
    mutationFn: (page_id: string) => metaApi.selectPage(page_id),
    onSuccess: (_, page_id) => {
      const page = status?.pages?.find((p) => p.id === page_id);
      toast.success(`Página "${page?.name}" seleccionada ✓`);
      onUpdate();
    },
    onError: () => toast.error("Error al seleccionar la página"),
  });

  const selectWaMutation = useMutation({
    mutationFn: (phone_id: string) => metaApi.selectWhatsApp(phone_id),
    onSuccess: () => {
      toast.success("Número de WhatsApp configurado ✓");
      onUpdate();
    },
    onError: () => toast.error("Error al configurar WhatsApp"),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => metaApi.disconnect(),
    onSuccess: () => {
      toast.success("Cuenta de Meta desconectada");
      onUpdate();
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => metaApi.refreshToken(),
    onSuccess: () => {
      toast.success("Token renovado por 60 días más ✓");
      onUpdate();
    },
    onError: () =>
      toast.error("No se pudo renovar. Reconecta tu cuenta de Meta."),
  });

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data } = await metaApi.getConnectUrl();
      window.location.href = data.url;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(
        err?.response?.data?.detail || "Error al conectar con Meta"
      );
      setConnecting(false);
    }
  };

  const testChannel = async (channel: "wa" | "instagram" | "messenger") => {
    setTesting(channel);
    try {
      const { data } = await metaApi.testChannel(channel);
      toast.success(data.message);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || "Error en la prueba");
    } finally {
      setTesting(null);
    }
  };

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!status?.connected) {
    return (
      <div className="text-center py-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{
            background: "linear-gradient(135deg, #1877F2 0%, #E1306C 50%, #405DE6 100%)",
          }}
        >
          {/* Meta "M" icon */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 36 36"
            fill="white"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M18 3C9.716 3 3 9.716 3 18s6.716 15 15 15 15-6.716 15-15S26.284 3 18 3zm-3.75 21.375l-4.5-9.75 2.25-1.125 2.25 4.875 4.5-9 2.25 1.125-4.5 9-2.25-5.625z" />
          </svg>
        </div>
        <h3 className="font-semibold text-foreground mb-1 text-base">
          Conectar con Meta
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
          Un solo click para habilitar <strong>WhatsApp Business</strong>,{" "}
          <strong>Instagram DMs</strong> y <strong>Facebook Messenger</strong>{" "}
          — sin copiar tokens ni configurar webhooks.
        </p>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="inline-flex items-center gap-2.5 px-7 py-3 font-semibold rounded-xl text-white transition-all disabled:opacity-60"
          style={{ background: connecting ? "#1565D8" : "#1877F2" }}
          onMouseEnter={(e) =>
            !connecting &&
            ((e.currentTarget.style.background = "#1565D8"))
          }
          onMouseLeave={(e) =>
            !connecting &&
            ((e.currentTarget.style.background = "#1877F2"))
          }
        >
          {connecting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 36 36"
              fill="white"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M18 3C9.716 3 3 9.716 3 18s6.716 15 15 15 15-6.716 15-15S26.284 3 18 3zm-1.5 21.375l-4.5-9.75 2.25-1.125 2.25 4.875 4.5-9 2.25 1.125z" />
            </svg>
          )}
          {connecting ? "Conectando..." : "Continuar con Facebook"}
        </button>
        <p className="text-xs text-muted-foreground mt-3">
          Se solicitarán permisos de páginas, Instagram y WhatsApp
        </p>
      </div>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────────────
  const selectedPage = status.pages?.find(
    (p) => p.id === status.selected_page_id
  );
  const selectedPhone = status.wa_phones?.find(
    (p) => p.id === status.selected_wa_phone_id
  );

  const expiresAt = status.token_expires_at
    ? new Date(status.token_expires_at)
    : null;
  const daysLeft = expiresAt
    ? Math.ceil((expiresAt.getTime() - Date.now()) / 86400000)
    : null;
  const tokenWarning = daysLeft !== null && daysLeft < 14;

  return (
    <div className="space-y-5">
      {/* Connection badge */}
      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1877F2] flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">
              Conectado como {status.user_name}
            </p>
            {expiresAt && (
              <p
                className={`text-xs mt-0.5 ${
                  tokenWarning ? "text-amber-600" : "text-green-600"
                }`}
              >
                {tokenWarning && <AlertTriangle size={10} className="inline mr-1" />}
                Token expira el{" "}
                {expiresAt.toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {daysLeft !== null && ` (${daysLeft} días)`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tokenWarning && (
            <button
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 border border-amber-300 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 transition"
            >
              {refreshMutation.isPending ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <RefreshCw size={11} />
              )}
              Renovar
            </button>
          )}
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

      {/* ── Sección 1: Páginas de Facebook (Messenger + Instagram) ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-foreground">
            Página de Facebook
          </p>
          <span className="text-xs text-muted-foreground">
            Messenger + Instagram DMs
          </span>
        </div>

        {(!status.pages || status.pages.length === 0) ? (
          <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              No se encontraron páginas de Facebook en tu cuenta. Asegúrate
              de ser administrador de al menos una página.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {status.pages.map((page) => {
              const isSelected = page.id === status.selected_page_id;
              return (
                <button
                  key={page.id}
                  onClick={() => !isSelected && selectPageMutation.mutate(page.id)}
                  disabled={selectPageMutation.isPending}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                    isSelected
                      ? "border-violet-300 bg-violet-50 cursor-default"
                      : "border-border hover:border-violet-200 hover:bg-violet-50/40 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                      {page.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {page.name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare size={10} /> Messenger
                        </span>
                        {(page.has_instagram || page.ig_id) && (
                          <span className="flex items-center gap-1 text-xs text-pink-600">
                            <Instagram size={10} />
                            {page.instagram_username
                              ? `@${page.instagram_username}`
                              : "Instagram"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isSelected ? (
                    <div className="flex items-center gap-1.5 text-violet-700 text-xs font-semibold flex-shrink-0 ml-3">
                      <CheckCircle2 size={14} /> Activa
                    </div>
                  ) : (
                    <ChevronRight
                      size={15}
                      className="text-muted-foreground flex-shrink-0 ml-3"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Test buttons for page */}
        {status.selected_page_id && (
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => testChannel("messenger")}
              disabled={testing === "messenger"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition disabled:opacity-50"
            >
              {testing === "messenger" ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Wifi size={11} />
              )}
              Verificar Messenger
            </button>
            {selectedPage && (selectedPage.has_instagram || selectedPage.ig_id) && (
              <button
                onClick={() => testChannel("instagram")}
                disabled={testing === "instagram"}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100 transition disabled:opacity-50"
              >
                {testing === "instagram" ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Instagram size={11} />
                )}
                Verificar Instagram
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Sección 2: WhatsApp Business (números del WABA) ── */}
      {status.wa_business_id && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">
              Número de WhatsApp Business
            </p>
            <span className="text-xs text-muted-foreground">WhatsApp Cloud API</span>
          </div>

          {(!status.wa_phones || status.wa_phones.length === 0) ? (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              No se encontraron números en tu cuenta de WhatsApp Business.
            </div>
          ) : (
            <div className="space-y-2">
              {status.wa_phones.map((phone) => {
                const isSelected = phone.id === status.selected_wa_phone_id;
                return (
                  <button
                    key={phone.id}
                    onClick={() =>
                      !isSelected && selectWaMutation.mutate(phone.id)
                    }
                    disabled={selectWaMutation.isPending}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                      isSelected
                        ? "border-green-300 bg-green-50 cursor-default"
                        : "border-border hover:border-green-200 hover:bg-green-50/40 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Phone size={14} className="text-green-700" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {phone.display_phone_number}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {phone.verified_name}
                          {phone.quality_rating && (
                            <span
                              className={`ml-2 font-medium ${
                                phone.quality_rating === "GREEN"
                                  ? "text-green-600"
                                  : phone.quality_rating === "YELLOW"
                                  ? "text-amber-600"
                                  : "text-red-500"
                              }`}
                            >
                              · {phone.quality_rating}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {isSelected ? (
                      <div className="flex items-center gap-1.5 text-green-700 text-xs font-semibold flex-shrink-0">
                        <CheckCircle2 size={14} /> Activo
                      </div>
                    ) : (
                      <ChevronRight
                        size={15}
                        className="text-muted-foreground flex-shrink-0"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Test WA button */}
          {status.selected_wa_phone_id && (
            <div className="mt-3">
              <button
                onClick={() => testChannel("wa")}
                disabled={testing === "wa"}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition disabled:opacity-50"
              >
                {testing === "wa" ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Wifi size={11} />
                )}
                Enviar mensaje de prueba
              </button>
            </div>
          )}
        </div>
      )}

      {/* Si tiene WA token pero no WABA (manual) */}
      {!status.wa_business_id && status.wa_token_set && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
          <CheckCircle2 size={13} className="flex-shrink-0" />
          <span>
            WhatsApp configurado manualmente. La próxima vez que reconectes
            con Meta se auto-configurará desde tu cuenta de Business Manager.
          </span>
        </div>
      )}
    </div>
  );
}
