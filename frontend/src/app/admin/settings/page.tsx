"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Bot, Key, Eye, EyeOff, Save, CheckCircle2, AlertCircle, Cpu, Phone, RefreshCw, ExternalLink, MessageSquare, Copy, Instagram } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

const MODEL_LABELS: Record<string, { label: string; badge: string; badgeColor: string }> = {
  "claude-sonnet-4-6":            { label: "Claude Sonnet 4.6",             badge: "RECOMENDADO", badgeColor: "bg-violet-100 text-violet-700" },
  "claude-opus-4-5":              { label: "Claude Opus 4.5",               badge: "MÁS POTENTE", badgeColor: "bg-amber-100 text-amber-700" },
  "claude-haiku-3-5":             { label: "Claude Haiku 3.5",              badge: "MÁS RÁPIDO",  badgeColor: "bg-green-100 text-green-700" },
  "claude-3-5-sonnet-20241022":   { label: "Claude 3.5 Sonnet (Oct 2024)",  badge: "ESTABLE",     badgeColor: "bg-blue-100 text-blue-700" },
  "claude-3-opus-20240229":       { label: "Claude 3 Opus",                 badge: "LEGACY",      badgeColor: "bg-slate-100 text-slate-600" },
  "claude-3-haiku-20240307":      { label: "Claude 3 Haiku",                badge: "LEGACY",      badgeColor: "bg-slate-100 text-slate-600" },
};

export default function AdminSettingsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => adminApi.getSettings().then((r) => r.data),
  });

  const [apiKey, setApiKey]     = useState("");
  const [showKey, setShowKey]   = useState(false);
  const [model, setModel]       = useState<string>("");

  // Twilio
  const [twilioSid, setTwilioSid]         = useState("");
  const [twilioToken, setTwilioToken]     = useState("");
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [twilioFrom, setTwilioFrom]       = useState("");
  const [testingTwilio, setTestingTwilio] = useState(false);

  // Meta WhatsApp Business Cloud API
  const [metaVerifyToken, setMetaVerifyToken]   = useState("");
  const [metaAppSecret, setMetaAppSecret]       = useState("");
  const [showMetaSecret, setShowMetaSecret]     = useState(false);
  const [testMetaPhoneId, setTestMetaPhoneId]   = useState("");
  const [testMetaToken, setTestMetaToken]       = useState("");
  const [testingMeta, setTestingMeta]           = useState(false);

  // Instagram DMs + Facebook Messenger (shared verify token + app secret)
  const [igVerifyToken, setIgVerifyToken]       = useState("");
  const [igAppSecret, setIgAppSecret]           = useState("");
  const [showIgSecret, setShowIgSecret]         = useState(false);
  const [testPageId, setTestPageId]             = useState("");
  const [testPageToken, setTestPageToken]       = useState("");
  const [testingMessenger, setTestingMessenger] = useState(false);

  // Sync model with fetched data once
  const currentModel = model || data?.claude_model || "";

  const mutation = useMutation({
    mutationFn: (payload: {
      anthropic_api_key?: string;
      claude_model?: string;
      twilio_account_sid?: string;
      twilio_auth_token?: string;
      twilio_whatsapp_from?: string;
      meta_wa_verify_token?: string;
      meta_wa_app_secret?: string;
      instagram_verify_token?: string;
      instagram_app_secret?: string;
    }) => adminApi.updateSettings(payload).then((r) => r.data),
    onSuccess: (res) => {
      toast.success(res.message || "Configuración guardada");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      setApiKey("");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Error al guardar");
    },
  });

  const handleSave = () => {
    const payload: {
      anthropic_api_key?: string;
      claude_model?: string;
      twilio_account_sid?: string;
      twilio_auth_token?: string;
      twilio_whatsapp_from?: string;
      meta_wa_verify_token?: string;
      meta_wa_app_secret?: string;
      instagram_verify_token?: string;
      instagram_app_secret?: string;
    } = {};
    if (apiKey.trim())              payload.anthropic_api_key = apiKey.trim();
    if (currentModel !== data?.claude_model) payload.claude_model = currentModel;
    if (twilioSid.trim())           payload.twilio_account_sid = twilioSid.trim();
    if (twilioToken.trim())         payload.twilio_auth_token = twilioToken.trim();
    if (twilioFrom.trim())          payload.twilio_whatsapp_from = twilioFrom.trim();
    if (metaVerifyToken.trim())     payload.meta_wa_verify_token = metaVerifyToken.trim();
    if (metaAppSecret.trim())       payload.meta_wa_app_secret = metaAppSecret.trim();
    if (igVerifyToken.trim())       payload.instagram_verify_token = igVerifyToken.trim();
    if (igAppSecret.trim())         payload.instagram_app_secret = igAppSecret.trim();
    if (!Object.keys(payload).length) {
      toast("No hay cambios que guardar", { icon: "ℹ️" });
      return;
    }
    mutation.mutate(payload);
  };

  const handleTestMessenger = async () => {
    if (!testPageId.trim() || !testPageToken.trim()) {
      toast.error("Ingresa el Page ID y el Page Access Token para probar");
      return;
    }
    setTestingMessenger(true);
    try {
      const res = await adminApi.testMessenger(testPageId.trim(), testPageToken.trim());
      toast.success(res.data.message);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Error de conexión con Meta");
    } finally {
      setTestingMessenger(false);
    }
  };

  const handleTestTwilio = async () => {
    setTestingTwilio(true);
    try {
      const res = await adminApi.testTwilio();
      toast.success(res.data.message);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Error de conexión con Twilio");
    } finally {
      setTestingTwilio(false);
    }
  };

  const handleTestMeta = async () => {
    if (!testMetaPhoneId.trim() || !testMetaToken.trim()) {
      toast.error("Ingresa el Phone Number ID y el Access Token para probar");
      return;
    }
    setTestingMeta(true);
    try {
      const res = await adminApi.testMetaWA(testMetaPhoneId.trim(), testMetaToken.trim());
      toast.success(res.data.message);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Error de conexión con Meta");
    } finally {
      setTestingMeta(false);
    }
  };

  return (
    <div className="p-8 max-w-[760px] mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
          <Bot size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Configuración de IA</h1>
          <p className="text-sm text-muted-foreground">Gestiona la API key de Anthropic Claude y el modelo activo</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* ── API Key ─────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Key size={16} className="text-muted-foreground" />
              <h2 className="font-semibold text-foreground">API Key de Anthropic</h2>
            </div>

            {/* Estado actual */}
            <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-muted/50 border border-border">
              {data?.anthropic_api_key_set ? (
                <>
                  <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground font-mono">
                    {data.anthropic_api_key_masked}
                  </span>
                  <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    ACTIVA
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle size={15} className="text-amber-500 flex-shrink-0" />
                  <span className="text-sm text-amber-600">No hay API key configurada</span>
                </>
              )}
            </div>

            {/* Input nueva key */}
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Nueva API key <span className="text-muted-foreground/60">(deja vacío para no cambiar)</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Obtén tu key en{" "}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer"
                className="text-violet-600 hover:underline">
                console.anthropic.com
              </a>
            </p>
          </div>

          {/* ── Modelo ──────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Cpu size={16} className="text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Modelo de Claude</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(data?.available_models ?? []).map((m: string) => {
                const meta = MODEL_LABELS[m] ?? { label: m, badge: "", badgeColor: "" };
                const isSelected = currentModel === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModel(m)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "border-violet-500 bg-violet-50 ring-1 ring-violet-400/50"
                        : "border-border bg-background hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-sm font-medium ${isSelected ? "text-violet-700" : "text-foreground"}`}>
                        {meta.label}
                      </span>
                      {meta.badge && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${meta.badgeColor}`}>
                          {meta.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono mt-1 block">{m}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Meta WhatsApp Business Cloud API ─────────── */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-green-600" />
                <h2 className="font-semibold text-foreground">WhatsApp Business Cloud API</h2>
                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">META OFICIAL</span>
              </div>
              <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                Meta for Devs <ExternalLink size={10} />
              </a>
            </div>
            <p className="text-xs text-muted-foreground mb-5">
              Configuración a nivel plataforma. El webhook URL se registra UNA VEZ en tu Meta App y enruta mensajes a cada cliente por su Phone Number ID.
            </p>

            {/* Webhook URL */}
            <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-xs font-semibold text-foreground mb-1.5">URL del Webhook — pégala en Meta App Dashboard</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-foreground break-all flex-1">
                  {(typeof window !== "undefined" ? window.location.origin.replace(":3000", ":8000") : "https://tu-dominio.com")}/api/webhooks/whatsapp-meta
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin.replace(":3000", ":8000")}/api/webhooks/whatsapp-meta`
                    );
                    toast.success("URL copiada");
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium rounded-lg transition flex-shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <Copy size={11} /> Copiar
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Verify Token */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Verify Token{" "}
                  <span className="text-muted-foreground/60">(el que pegas en Meta al configurar el webhook)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={metaVerifyToken || data?.meta_wa_verify_token || ""}
                    onChange={(e) => setMetaVerifyToken(e.target.value)}
                    placeholder="agente_ventas_wa_verify"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition"
                  />
                  <button
                    onClick={() => {
                      const t = metaVerifyToken || data?.meta_wa_verify_token || "";
                      navigator.clipboard.writeText(t);
                      toast.success("Token copiado");
                    }}
                    className="flex items-center gap-1 px-2.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium rounded-xl transition text-muted-foreground hover:text-foreground"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              {/* App Secret */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  App Secret{" "}
                  <span className="text-muted-foreground/60">(Meta App → Configuración → Básica)</span>
                </label>
                <div className="relative">
                  <input
                    type={showMetaSecret ? "text" : "password"}
                    value={metaAppSecret}
                    onChange={(e) => setMetaAppSecret(e.target.value)}
                    placeholder={data?.meta_wa_app_secret_set ? "••••••••••••••••" : "Pega el App Secret aquí"}
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition"
                  />
                  <button type="button" onClick={() => setShowMetaSecret(!showMetaSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showMetaSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {data?.meta_wa_app_secret_set && (
                  <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 size={11} /> App Secret configurado
                  </p>
                )}
              </div>

              {/* Test connection */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-green-800">Verificar credenciales de un cliente</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testMetaPhoneId}
                    onChange={(e) => setTestMetaPhoneId(e.target.value)}
                    placeholder="Phone Number ID (ej: 123456789012345)"
                    className="flex-1 px-3 py-2 rounded-lg border border-green-200 bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-green-400"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testMetaToken}
                    onChange={(e) => setTestMetaToken(e.target.value)}
                    placeholder="Access Token del cliente"
                    className="flex-1 px-3 py-2 rounded-lg border border-green-200 bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-green-400"
                  />
                  <button
                    onClick={handleTestMeta}
                    disabled={testingMeta}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition"
                  >
                    {testingMeta ? <RefreshCw size={12} className="animate-spin" /> : <Phone size={12} />}
                    Verificar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Instagram DMs + Facebook Messenger ────────────── */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Instagram size={16} className="text-pink-500" />
                <h2 className="font-semibold text-foreground">Instagram DMs + Facebook Messenger</h2>
                <span className="text-[10px] font-bold bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">META PAGE TOKEN</span>
              </div>
              <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-pink-600 hover:underline">
                Meta for Devs <ExternalLink size={10} />
              </a>
            </div>
            <p className="text-xs text-muted-foreground mb-5">
              Cada cliente configura su propio <strong>Page Access Token</strong> en su panel.
              Aquí defines el Verify Token y App Secret globales de los webhooks.
            </p>

            {/* Webhook URLs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {[
                { label: "Instagram DMs",      path: "/api/webhooks/instagram" },
                { label: "Facebook Messenger", path: "/api/webhooks/messenger" },
              ].map(({ label, path }) => (
                <div key={path} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] font-mono text-foreground break-all flex-1">
                      {(typeof window !== "undefined" ? window.location.origin.replace(":3000", ":8000") : "https://tu-dominio.com")}{path}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin.replace(":3000", ":8000")}${path}`
                        );
                        toast.success("URL copiada");
                      }}
                      className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition text-muted-foreground hover:text-foreground"
                    >
                      <Copy size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {/* Verify Token */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Verify Token{" "}
                  <span className="text-muted-foreground/60">(para Instagram DMs y Messenger)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={igVerifyToken || data?.instagram_verify_token || ""}
                    onChange={(e) => setIgVerifyToken(e.target.value)}
                    placeholder="agente_ventas_ig_verify"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 transition"
                  />
                  <button
                    onClick={() => {
                      const t = igVerifyToken || data?.instagram_verify_token || "";
                      navigator.clipboard.writeText(t);
                      toast.success("Token copiado");
                    }}
                    className="p-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition text-muted-foreground hover:text-foreground"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              {/* App Secret */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  App Secret{" "}
                  <span className="text-muted-foreground/60">(Meta App → Configuración → Básica)</span>
                </label>
                <div className="relative">
                  <input
                    type={showIgSecret ? "text" : "password"}
                    value={igAppSecret}
                    onChange={(e) => setIgAppSecret(e.target.value)}
                    placeholder={data?.instagram_app_secret_set ? "••••••••••••••••" : "Pega el App Secret aquí"}
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 transition"
                  />
                  <button type="button" onClick={() => setShowIgSecret(!showIgSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showIgSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {data?.instagram_app_secret_set && (
                  <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 size={11} /> App Secret configurado
                  </p>
                )}
              </div>

              {/* Test connection */}
              <div className="p-4 bg-pink-50 border border-pink-200 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-pink-800">Verificar Page Access Token de un cliente</p>
                <input
                  type="text"
                  value={testPageId}
                  onChange={(e) => setTestPageId(e.target.value)}
                  placeholder="Facebook Page ID (ej: 123456789012345)"
                  className="w-full px-3 py-2 rounded-lg border border-pink-200 bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-pink-400"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testPageToken}
                    onChange={(e) => setTestPageToken(e.target.value)}
                    placeholder="Page Access Token del cliente"
                    className="flex-1 px-3 py-2 rounded-lg border border-pink-200 bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-pink-400"
                  />
                  <button
                    onClick={handleTestMessenger}
                    disabled={testingMessenger}
                    className="flex items-center gap-1.5 px-3 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition"
                  >
                    {testingMessenger ? <RefreshCw size={12} className="animate-spin" /> : <MessageSquare size={12} />}
                    Verificar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Twilio / WhatsApp (Sandbox/Legado) ───────────── */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-muted-foreground" />
                <h2 className="font-semibold text-foreground">WhatsApp via Twilio</h2>
                <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">SANDBOX / LEGADO</span>
              </div>
              {data?.twilio_account_sid_set && (
                <button onClick={handleTestTwilio} disabled={testingTwilio}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold hover:bg-green-100 disabled:opacity-60 transition">
                  {testingTwilio ? <RefreshCw size={12} className="animate-spin" /> : <Phone size={12} />}
                  {testingTwilio ? "Verificando..." : "Probar conexión"}
                </button>
              )}
            </div>

            {/* Estado */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                {data?.twilio_account_sid_set ? (
                  <><CheckCircle2 size={14} className="text-green-500" /><span className="text-xs font-mono text-muted-foreground">{data.twilio_account_sid_masked}</span><span className="ml-auto text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">SID ✓</span></>
                ) : (
                  <><AlertCircle size={14} className="text-amber-500" /><span className="text-xs text-amber-600">Account SID no configurado</span></>
                )}
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                {data?.twilio_auth_token_set ? (
                  <><CheckCircle2 size={14} className="text-green-500" /><span className="text-xs text-muted-foreground">Auth Token configurado</span><span className="ml-auto text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">TOKEN ✓</span></>
                ) : (
                  <><AlertCircle size={14} className="text-amber-500" /><span className="text-xs text-amber-600">Auth Token no configurado</span></>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Account SID <span className="text-muted-foreground/60">(deja vacío para no cambiar)</span></label>
                <input type="text" value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Auth Token <span className="text-muted-foreground/60">(deja vacío para no cambiar)</span></label>
                <div className="relative">
                  <input type={showTwilioToken ? "text" : "password"} value={twilioToken} onChange={(e) => setTwilioToken(e.target.value)}
                    placeholder="Pega tu Auth Token aquí"
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition" />
                  <button type="button" onClick={() => setShowTwilioToken(!showTwilioToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showTwilioToken ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Número Twilio WhatsApp</label>
                <input type="text" value={twilioFrom || data?.twilio_whatsapp_from?.replace("whatsapp:", "") || ""}
                  onChange={(e) => setTwilioFrom(e.target.value)}
                  placeholder="+14155238886"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition" />
                <p className="mt-1.5 text-xs text-muted-foreground">Número del Sandbox: <code className="bg-muted px-1 rounded">+14155238886</code> · Obtén credenciales en{" "}
                  <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline inline-flex items-center gap-0.5">console.twilio.com <ExternalLink size={10} /></a>
                </p>
              </div>
            </div>
          </div>

          {/* ── Guardar ─────────────────────────────────────────── */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium transition shadow-sm"
            >
              <Save size={15} />
              {mutation.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
