"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageCircle, CheckCircle2, XCircle, Copy, ExternalLink,
  Eye, EyeOff, RefreshCw, Loader2, AlertCircle, Info,
  Smartphone, Zap, Shield, ArrowRight, ChevronDown,
  ChevronRight as ChevronRightIcon, Phone, Check, X, ToggleLeft, ToggleRight,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const BACKEND_BASE = API.replace("/api", "");
const WEBHOOK_URL = `${BACKEND_BASE}/api/webhooks/whatsapp-meta`;
const VERIFY_TOKEN = "agente_ventas_wa_verify";

function authHeaders() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    Authorization: t ? `Bearer ${t}` : "",
    "Content-Type": "application/json",
  };
}

interface Business {
  whatsapp_enabled: boolean;
  whatsapp_phone: string;
  meta_phone_number_id: string;
  meta_wa_token_set: boolean;
  meta_wa_business_id?: string;
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium rounded-lg transition text-slate-500 hover:text-slate-700 flex-shrink-0">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

function StepBadge({ n, done }: { n: number; done: boolean }) {
  return done ? (
    <span className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
      <Check className="w-4 h-4 text-white" />
    </span>
  ) : (
    <span className="w-7 h-7 rounded-full bg-violet-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
      {n}
    </span>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${ok ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {label}
    </span>
  );
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700">
        {title}
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
      </button>
      {open && <div className="px-4 py-4 text-sm text-slate-600 space-y-2">{children}</div>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WhatsAppIntegrationPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [testPhone, setTestPhone] = useState("");

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/business`, { headers: authHeaders() });
      if (r.ok) {
        const b: Business = await r.json();
        setBusiness(b);
        setEnabled(b.whatsapp_enabled ?? false);
        setPhone(b.whatsapp_phone ?? "");
        setPhoneNumberId(b.meta_phone_number_id ?? "");
        // token is write-only, never populated
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        whatsapp_enabled: enabled,
        whatsapp_phone: phone,
        meta_phone_number_id: phoneNumberId,
      };
      if (token) payload.meta_wa_token = token;

      const r = await fetch(`${API}/business`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Error al guardar");
      const b = await r.json();
      setBusiness(b);
      setToken(""); // clear after save
      showToast("Configuración guardada correctamente");
    } catch {
      showToast("Error al guardar la configuración", false);
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    if (!testPhone) return;
    setTesting(true);
    try {
      const r = await fetch(`${API}/business/whatsapp/test?phone=${encodeURIComponent(testPhone)}`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (r.ok) showToast(`Mensaje de prueba enviado a ${testPhone}`);
      else {
        const err = await r.json().catch(() => ({}));
        showToast(err.detail || "Error al enviar mensaje de prueba", false);
      }
    } catch {
      showToast("Error de conexión al enviar prueba", false);
    } finally {
      setTesting(false);
    }
  }

  const isConfigured = !!(business?.meta_phone_number_id && business?.meta_wa_token_set);
  const isActive = isConfigured && (business?.whatsapp_enabled ?? false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">WhatsApp Business</h1>
            <p className="text-slate-500 mt-1">Petunia responde mensajes de clientes automáticamente 24/7</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {isActive ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-green-100 text-green-700 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Activo
            </span>
          ) : isConfigured ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full">
              <span className="w-2 h-2 bg-yellow-400 rounded-full" /> Configurado / Pausado
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full">
              <span className="w-2 h-2 bg-slate-400 rounded-full" /> No configurado
            </span>
          )}
        </div>
      </div>

      {/* Status row */}
      <div className="flex flex-wrap gap-3">
        <StatusPill ok={isConfigured} label="Phone Number ID" />
        <StatusPill ok={business?.meta_wa_token_set ?? false} label="Access Token" />
        <StatusPill ok={!!(business?.whatsapp_phone)} label="Número registrado" />
        <StatusPill ok={isActive} label="Autorespuesta activa" />
      </div>

      {/* ── Cómo funciona ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Smartphone, color: "bg-green-100 text-green-700", title: "Cliente escribe", desc: "Tu cliente manda un mensaje a tu número de WhatsApp Business" },
          { icon: Zap, color: "bg-violet-100 text-violet-700", title: "Petunia procesa", desc: "La IA analiza el mensaje, califica al lead y genera una respuesta personalizada" },
          { icon: MessageCircle, color: "bg-blue-100 text-blue-700", title: "Respuesta automática", desc: "El cliente recibe una respuesta en segundos, directamente en WhatsApp" },
        ].map(({ icon: Icon, color, title, desc }) => (
          <div key={title} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="font-semibold text-slate-800 text-sm mb-1">{title}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Paso a paso de configuración ── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Configuración</h2>
          <p className="text-sm text-slate-500 mt-0.5">Sigue los pasos para conectar tu cuenta de WhatsApp Business</p>
        </div>

        <div className="px-6 py-5 space-y-8">
          {/* Paso 1 */}
          <div className="flex gap-4">
            <StepBadge n={1} done={false} />
            <div className="flex-1">
              <p className="font-semibold text-slate-800 mb-1">Crear una app en Meta for Developers</p>
              <p className="text-sm text-slate-500 mb-3">Ve a <a href="https://developers.facebook.com/apps/create/" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline inline-flex items-center gap-0.5">developers.facebook.com <ExternalLink className="w-3 h-3" /></a> → <strong>Crear app</strong> → tipo <strong>Business</strong> → agrega el producto <strong>WhatsApp</strong>.</p>
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-xs text-green-800 space-y-1">
                <p className="font-medium">Tip: usa una cuenta de Meta Business Suite con número verificado.</p>
                <p>Si aún no tienes número de WhatsApp Business, Meta te da un número de prueba gratuito para empezar.</p>
              </div>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="flex gap-4">
            <StepBadge n={2} done={false} />
            <div className="flex-1">
              <p className="font-semibold text-slate-800 mb-1">Copiar el Phone Number ID y el Access Token</p>
              <p className="text-sm text-slate-500 mb-3">
                En tu app de Meta → <strong>WhatsApp</strong> → <strong>Empezando</strong>. Copia:
              </p>
              <ul className="text-sm text-slate-600 space-y-1.5 list-disc list-inside mb-3">
                <li><strong>Phone Number ID</strong> — un número de 15 cifras (ej: <code className="bg-slate-100 px-1 rounded text-xs">123456789012345</code>)</li>
                <li><strong>Access Token temporal</strong> — empieza por <code className="bg-slate-100 px-1 rounded text-xs">EAAG...</code></li>
              </ul>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
                <strong>Para producción</strong>: crea un <em>System User Token permanente</em> en <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener noreferrer" className="underline">Meta Business Settings → System Users</a> para que el token no expire.
              </div>
            </div>
          </div>

          {/* Paso 3 — Webhook */}
          <div className="flex gap-4">
            <StepBadge n={3} done={false} />
            <div className="flex-1">
              <p className="font-semibold text-slate-800 mb-1">Configurar el Webhook en Meta</p>
              <p className="text-sm text-slate-500 mb-3">
                En tu app de Meta → <strong>WhatsApp</strong> → <strong>Configuración</strong> → sección <strong>Webhook</strong> → <strong>Editar</strong>. Ingresa:
              </p>
              <div className="space-y-2 mb-3">
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1">URL del Webhook</p>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <code className="text-xs font-mono text-slate-700 flex-1 break-all">{WEBHOOK_URL}</code>
                    <CopyButton value={WEBHOOK_URL} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1">Verify Token</p>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <code className="text-xs font-mono text-slate-700 flex-1">{VERIFY_TOKEN}</code>
                    <CopyButton value={VERIFY_TOKEN} />
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500">Después de verificar, suscríbete al evento <strong>messages</strong> bajo el número de teléfono.</p>
            </div>
          </div>

          {/* Paso 4 — Formulario */}
          <div className="flex gap-4">
            <StepBadge n={4} done={isConfigured} />
            <div className="flex-1">
              <p className="font-semibold text-slate-800 mb-3">Ingresar credenciales en Petunia</p>

              <div className="space-y-4">
                {/* Phone display */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tu número de WhatsApp Business</label>
                  <input type="text" value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+521234567890"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400" />
                  <p className="text-xs text-slate-400 mt-1">El número real con código de país (no el Phone Number ID).</p>
                </div>

                {/* Phone Number ID */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
                    Phone Number ID
                    <a href="https://business.facebook.com/wa/manage/phone-numbers/" target="_blank" rel="noopener noreferrer"
                      className="text-green-600 hover:underline inline-flex items-center gap-0.5">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </label>
                  <input type="text" value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="123456789012345"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>

                {/* Token */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Access Token</label>
                  {business?.meta_wa_token_set && !token && (
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-green-600">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Token guardado. Deja vacío para mantener el actual.
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type={showToken ? "text" : "password"}
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder={business?.meta_wa_token_set ? "••••••••••••• (ya configurado)" : "EAAGxxxxxxxxxxxxxxxxxx..."}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400 pr-10"
                    />
                    <button type="button" onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Enable toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Autorespuesta activa</p>
                    <p className="text-xs text-slate-500">Petunia responderá automáticamente mensajes entrantes</p>
                  </div>
                  <button onClick={() => setEnabled(!enabled)}
                    className={`w-12 h-6 rounded-full transition-colors flex items-center px-0.5 ${enabled ? "bg-green-500" : "bg-slate-300"}`}>
                    <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>

                <button onClick={save} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white font-semibold text-sm rounded-xl hover:bg-green-700 disabled:opacity-60 transition">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? "Guardando..." : "Guardar configuración"}
                </button>
              </div>
            </div>
          </div>

          {/* Paso 5 — Test */}
          {isConfigured && (
            <div className="flex gap-4">
              <StepBadge n={5} done={false} />
              <div className="flex-1">
                <p className="font-semibold text-slate-800 mb-1">Enviar mensaje de prueba</p>
                <p className="text-sm text-slate-500 mb-3">Verifica que Petunia puede enviar mensajes. El número debe haber iniciado conversación contigo primero (ventana de 24h).</p>
                <div className="flex gap-2">
                  <input type="text" value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+521234567890"
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400" />
                  <button onClick={testConnection} disabled={testing || !testPhone}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-700 disabled:opacity-50">
                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                    Probar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400" /> Preguntas frecuentes
          </h2>
        </div>
        <div className="px-6 py-5 space-y-3">
          <Accordion title="¿Necesito una cuenta de Meta Business verificada?">
            <p>Para pruebas no es obligatorio. Meta te da un número de prueba y puedes enviar mensajes a hasta 5 números registrados. Para producción (clientes reales), necesitas un número de teléfono propio verificado en Meta Business Manager.</p>
          </Accordion>
          <Accordion title="¿El token expira?">
            <p>El token temporal de la consola de desarrolladores expira en 24h. Para producción, crea un <strong>System User</strong> en tu Meta Business Manager y genera un token permanente. Así Petunia nunca se desconecta.</p>
          </Accordion>
          <Accordion title="¿Qué pasa si Petunia no sabe responder?">
            <p>El orquestador de Petunia tiene múltiples agentes: calificador, cerrador, soporte y seguimiento. Si detecta que el lead necesita atención humana, marca la conversación para intervención manual en el dashboard de Conversaciones.</p>
          </Accordion>
          <Accordion title="¿Puedo responder manualmente?">
            <p>Sí. Desde el módulo <strong>Conversaciones</strong>, activa el toggle "Control humano" en cualquier conversación. Petunia dejará de responder automáticamente hasta que desactives el control.</p>
          </Accordion>
          <Accordion title="¿Qué tipo de mensajes puede manejar?">
            <p>Actualmente texto. Los mensajes de imagen, audio y video se registran pero no se procesan con IA. En el dashboard verás todos los mensajes de la conversación.</p>
          </Accordion>
          <Accordion title="¿Cómo se ven las conversaciones?">
            <p>Todas las conversaciones de WhatsApp aparecen en el módulo <strong>Conversaciones</strong> del dashboard, con el historial completo, el agente que respondió y el puntaje de calificación del lead.</p>
          </Accordion>
        </div>
      </div>

      {/* ── Seguridad ── */}
      <div className="flex gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
        <Shield className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-slate-600">
          <strong className="text-slate-700">Seguridad:</strong> Petunia verifica la firma HMAC-SHA256 de cada webhook de Meta. El Access Token se almacena cifrado y nunca se devuelve en la API. Agrega tu <strong>App Secret</strong> en Variables de Entorno como <code className="bg-slate-200 px-1 rounded text-xs">META_WA_APP_SECRET</code> para activar la verificación de firma.
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-xl text-sm max-w-sm ${toast.ok ? "bg-green-600" : "bg-red-600"}`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-1 opacity-75 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}
