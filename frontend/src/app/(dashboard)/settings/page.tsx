"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { businessApi, metaApi, linkedinApi, tiktokApi, ayrshareApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { PageHeader } from "@/components/ui/page-header";
import { MetaConnect } from "@/components/meta-connect";
import { LinkedInConnect } from "@/components/linkedin-connect";
import { TikTokConnect } from "@/components/tiktok-connect";
import { AyrshareConnect } from "@/components/ayrshare-connect";
import toast from "react-hot-toast";
import { Save, Building2, Sparkles, MessageSquare, Check, Code2, Copy, ExternalLink, Smartphone, Phone, RefreshCw, Eye, EyeOff, CheckCircle2, Link2, Linkedin, Music2, Share2 } from "lucide-react";
import { motion } from "framer-motion";

const WIDGET_BASE = process.env.NEXT_PUBLIC_WIDGET_URL || "https://app.aipetunia.com";

function Section({ icon: Icon, title, subtitle, children, delay = 0 }: {
  icon: React.ElementType; title: string; subtitle?: string;
  children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card-stripe p-6"
    >
      <div className="flex items-start gap-3 mb-5 pb-4 border-b border-border">
        <div className="w-9 h-9 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-violet-600" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, hint }: {
  label: string; value: string;
  onChange: (v: string) => void;
  type?: "text" | "textarea"; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      {type === "textarea" ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} rows={3} className="input-stripe resize-none" />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} className="input-stripe" />
      )}
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${
          checked ? "bg-primary" : "bg-gray-200"
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 max-w-[1280px] mx-auto space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="card-stripe h-48 shimmer" />)}</div>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Manejar redirección de vuelta desde Meta OAuth
  useEffect(() => {
    const metaParam = searchParams.get("meta");
    if (!metaParam) return;
    if (metaParam === "connected") {
      const pages = searchParams.get("pages") || "0";
      const waPhones = searchParams.get("wa_phones") || "0";
      toast.success(
        `✅ Meta conectado. ${pages} página(s) encontrada(s)${
          parseInt(waPhones) > 0 ? ` y ${waPhones} número(s) de WhatsApp` : ""
        }.`,
        { duration: 5000 }
      );
      qc.invalidateQueries({ queryKey: ["meta-status"] });
      qc.invalidateQueries({ queryKey: ["business"] });
    } else if (metaParam === "error") {
      const reason = searchParams.get("reason") || "desconocido";
      if (reason !== "cancelled") {
        toast.error(`Error al conectar con Meta: ${reason}`);
      }
    }

    const linkedinParam = searchParams.get("linkedin");
    if (linkedinParam === "connected") {
      toast.success("✅ LinkedIn conectado correctamente", { duration: 5000 });
      qc.invalidateQueries({ queryKey: ["linkedin-status"] });
    } else if (linkedinParam === "error") {
      const reason = searchParams.get("reason") || "desconocido";
      if (reason !== "cancelled") toast.error(`Error al conectar con LinkedIn: ${reason}`);
    }

    const tiktokParam = searchParams.get("tiktok");
    if (tiktokParam === "connected") {
      toast.success("✅ TikTok conectado correctamente", { duration: 5000 });
      qc.invalidateQueries({ queryKey: ["tiktok-status"] });
    } else if (tiktokParam === "error") {
      const reason = searchParams.get("reason") || "desconocido";
      if (reason !== "cancelled") toast.error(`Error al conectar con TikTok: ${reason}`);
    }

    // Limpiar query params de la URL
    router.replace("/settings", { scroll: false });
  }, [searchParams, router, qc]);

  const { data: business, isLoading } = useQuery({
    queryKey: ["business"],
    queryFn: () => businessApi.get().then((r) => r.data),
  });

  const { data: metaStatus, refetch: refetchMeta } = useQuery({
    queryKey: ["meta-status"],
    queryFn: () => metaApi.getStatus().then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: linkedinStatus, refetch: refetchLinkedin } = useQuery({
    queryKey: ["linkedin-status"],
    queryFn: () => linkedinApi.getStatus().then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: tiktokStatus, refetch: refetchTiktok } = useQuery({
    queryKey: ["tiktok-status"],
    queryFn: () => tiktokApi.getStatus().then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: ayrshareStatus, refetch: refetchAyrshare } = useQuery({
    queryKey: ["ayrshare-status"],
    queryFn: () => ayrshareApi.getStatus().then((r) => r.data),
    staleTime: 30_000,
  });

  const [igSaved, setIgSaved] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [testingWa, setTestingWa] = useState(false);
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [showPageToken, setShowPageToken] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars

  const [form, setForm] = useState({
    name: "", industry: "", description: "",
    product_description: "", pricing_info: "",
    target_customer: "", value_proposition: "",
    whatsapp_enabled: false, webchat_enabled: true,
    instagram_enabled: false,
    messenger_enabled: false,
    whatsapp_phone: "",
    instagram_account_id: "", instagram_page_id: "",
    meta_phone_number_id: "",
    meta_wa_token: "",     // write-only: never populated from API
    meta_page_token: "",   // write-only: never populated from API
  });

  useEffect(() => {
    if (business) {
      const clean = Object.fromEntries(
        Object.entries(business).map(([k, v]) => [k, v ?? ""])
      );
      // meta_wa_token and meta_page_token are never returned by the API — keep the inputs empty
      setForm((prev) => ({ ...prev, ...clean, meta_wa_token: "", meta_page_token: "" }));
    }
  }, [business]);

  const mutation = useMutation({
    mutationFn: () => {
      // Don't send empty write-only tokens (would overwrite saved tokens with blank)
      const payload: Record<string, unknown> = { ...form };
      if (!payload.meta_wa_token)   delete payload.meta_wa_token;
      if (!payload.meta_page_token) delete payload.meta_page_token;
      return businessApi.update(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success("Configuración guardada");
    },
  });

  const set = (field: string) => (v: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: v }));

  const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000";
  const webhookUrl = `${API_BASE}/api/webhooks/whatsapp-meta`;

  const testWhatsApp = async () => {
    setTestingWa(true);
    try {
      const token = document.cookie.match(/token=([^;]+)/)?.[1] ?? localStorage.getItem("token") ?? "";
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/business/whatsapp/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${(await import("@/store/auth")).useAuthStore.getState().token}` },
      });
      const data = await res.json();
      if (res.ok) toast.success(data.message);
      else toast.error(data.detail || "Error al enviar mensaje de prueba");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setTestingWa(false);
    }
  };

  const widgetCode = `<script
  src="${WIDGET_BASE}/widget.js"
  data-business-id="${user?.business_id ?? "TU_BUSINESS_ID"}"
  data-color="#635bff"
  data-name="${form.name || "Asistente"}"
  data-position="right"
></script>`;

  const copyWidget = () => {
    navigator.clipboard.writeText(widgetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Código copiado");
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-[1280px] mx-auto space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card-stripe h-48 shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1280px] mx-auto">
      <PageHeader title="Configuración" subtitle="Define el contexto que usarán tus agentes de IA" />

      <div className="space-y-5">

        <Section icon={Building2} title="Información del negocio" delay={0}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre" value={form.name} onChange={set("name") as (v: string) => void} placeholder="Mi Empresa SA" />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Industria</label>
              <select
                value={form.industry}
                onChange={(e) => (set("industry") as (v: string) => void)(e.target.value)}
                className="input-stripe"
              >
                <option value="">Selecciona una industria...</option>
                <option value="Bienes Raíces">Bienes Raíces</option>
                <option value="SaaS / Software">SaaS / Software</option>
                <option value="Fintech">Fintech</option>
                <option value="E-commerce / Retail">E-commerce / Retail</option>
                <option value="Salud / Medicina">Salud / Medicina</option>
                <option value="Educación">Educación</option>
                <option value="Consultoría">Consultoría</option>
                <option value="Marketing / Publicidad">Marketing / Publicidad</option>
                <option value="Manufactura / Industria">Manufactura / Industria</option>
                <option value="Logística / Transporte">Logística / Transporte</option>
                <option value="Restaurantes / Gastronomía">Restaurantes / Gastronomía</option>
                <option value="Turismo / Hotelería">Turismo / Hotelería</option>
                <option value="Legal / Juridico">Legal / Jurídico</option>
                <option value="Seguros">Seguros</option>
                <option value="Automotriz">Automotriz</option>
                <option value="Construcción">Construcción</option>
                <option value="Energía / Utilities">Energía / Utilities</option>
                <option value="Telecomunicaciones">Telecomunicaciones</option>
                <option value="Recursos Humanos">Recursos Humanos</option>
                <option value="Agro / Alimentación">Agro / Alimentación</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <Field label="Descripción" value={form.description}
              onChange={set("description") as (v: string) => void} type="textarea"
              placeholder="¿A qué se dedica tu empresa?" />
          </div>
        </Section>

        <Section icon={Sparkles} title="Contexto para los agentes IA"
          subtitle="Cuanto más detallado, mejor responden" delay={0.08}>
          <div className="space-y-4">
            <Field label="Producto / Servicio" value={form.product_description}
              onChange={set("product_description") as (v: string) => void} type="textarea"
              placeholder="Describe qué vendes, características principales, beneficios..."
              hint="Los agentes usarán esto para responder preguntas de producto." />
            <Field label="Información de precios" value={form.pricing_info}
              onChange={set("pricing_info") as (v: string) => void} type="textarea"
              placeholder="Plan Starter $199/mes · Plan Pro $599/mes · Enterprise desde $1,500/mes"
              hint="El agente Cerrador usa esto para presentar propuestas." />
            <Field label="Cliente ideal (ICP)" value={form.target_customer}
              onChange={set("target_customer") as (v: string) => void} type="textarea"
              placeholder="Empresas B2B con 10-200 empleados, industria retail o fintech..."
              hint="El Calificador usa esto para detectar si el lead encaja." />
            <Field label="Propuesta de valor" value={form.value_proposition}
              onChange={set("value_proposition") as (v: string) => void} type="textarea"
              placeholder="Somos los únicos en LATAM que... En 30 días nuestros clientes logran..."
              hint="El Cerrador usa esto en su pitch de ventas." />
          </div>
        </Section>

        <Section icon={MessageSquare} title="Canales habilitados" delay={0.16}>
          <div className="space-y-3">
            <Toggle label="Webchat" desc="Widget de chat en tu sitio web"
              checked={form.webchat_enabled} onChange={set("webchat_enabled") as (v: boolean) => void} />
            <Toggle label="WhatsApp Business" desc="Responde automáticamente mensajes de WhatsApp vía Meta Cloud API"
              checked={form.whatsapp_enabled} onChange={set("whatsapp_enabled") as (v: boolean) => void} />
            <Toggle label="Instagram DMs" desc="Responde mensajes directos de Instagram vía Page Access Token"
              checked={form.instagram_enabled} onChange={set("instagram_enabled") as (v: boolean) => void} />
            <Toggle label="Facebook Messenger" desc="Responde mensajes de Messenger de tu página de Facebook"
              checked={form.messenger_enabled} onChange={set("messenger_enabled") as (v: boolean) => void} />
          </div>
        </Section>

        {/* Meta Connect — reemplaza config manual de Instagram + Messenger */}
        {(form.instagram_enabled || form.messenger_enabled || form.whatsapp_enabled) && (
          <Section icon={Link2} title="Conectar con Meta"
            subtitle="WhatsApp Business · Instagram DMs · Facebook Messenger" delay={0.18}>
            <MetaConnect
              status={metaStatus}
              onUpdate={() => {
                refetchMeta();
                qc.invalidateQueries({ queryKey: ["business"] });
              }}
            />
          </Section>
        )}

        {/* WhatsApp extra config — solo se muestra si WA está habilitado */}
        {form.whatsapp_enabled && (
          <Section icon={Smartphone} title="Configuración de WhatsApp Business"
            subtitle="Phone Number ID y token (si no se auto-configuró vía Meta)" delay={0.2}>
            <div className="space-y-5">

              {/* Phone */}
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1.5">Tu número de WhatsApp Business</p>
                  <input type="text" value={form.whatsapp_phone}
                    onChange={(e) => setForm((p) => ({ ...p, whatsapp_phone: e.target.value }))}
                    placeholder="+521234567890" className="input-stripe font-mono" />
                  <p className="text-xs text-muted-foreground mt-1">El número real con código de país.</p>
                </div>
              </div>

              {/* Phone Number ID */}
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1.5">
                    Phone Number ID{" "}
                    <a href="https://business.facebook.com/wa/manage/phone-numbers/" target="_blank" rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:underline inline-flex items-center gap-0.5">
                      Meta Business Manager <ExternalLink size={10} />
                    </a>
                  </p>
                  <input type="text" value={form.meta_phone_number_id}
                    onChange={(e) => setForm((p) => ({ ...p, meta_phone_number_id: e.target.value }))}
                    placeholder="123456789012345" className="input-stripe font-mono" />
                  <p className="text-xs text-muted-foreground mt-1">Solo necesario si configuraste WA manualmente (sin OAuth).</p>
                </div>
              </div>

              {/* WA Token */}
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1.5">Access Token</p>
                  {business?.meta_wa_token_set && !form.meta_wa_token && (
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-green-600">
                      <CheckCircle2 size={12} /> Token configurado
                    </div>
                  )}
                  <div className="relative">
                    <input type={showMetaToken ? "text" : "password"} value={form.meta_wa_token}
                      onChange={(e) => setForm((p) => ({ ...p, meta_wa_token: e.target.value }))}
                      placeholder={business?.meta_wa_token_set ? "••••••••••••••••" : "EAAxxxxxxxxxxxxxxxx..."}
                      className="input-stripe font-mono pr-10" />
                    <button type="button" onClick={() => setShowMetaToken(!showMetaToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showMetaToken ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Webhook URL */}
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1.5">
                    URL del Webhook <span className="text-xs text-green-600 font-normal">✓ Configurada por la plataforma</span>
                  </p>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                    <code className="text-xs font-mono text-foreground break-all flex-1">{webhookUrl}</code>
                    <button onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("URL copiada"); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium rounded-lg transition text-muted-foreground hover:text-foreground flex-shrink-0">
                      <Copy size={11} /> Copiar
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
                  className="btn-primary disabled:opacity-40">
                  {mutation.isPending
                    ? <><RefreshCw size={13} className="animate-spin" /> Guardando...</>
                    : <><Check size={13} /> Guardar WhatsApp</>}
                </button>
                <button onClick={testWhatsApp} disabled={testingWa || !form.whatsapp_phone}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-semibold disabled:opacity-40 transition">
                  {testingWa
                    ? <><RefreshCw size={13} className="animate-spin" /> Enviando...</>
                    : <><Phone size={13} /> Enviar mensaje de prueba</>}
                </button>
              </div>

            </div>
          </Section>
        )}

        {/* LinkedIn Connect */}
        <Section icon={Linkedin} title="Conectar con LinkedIn"
          subtitle="Publica contenido y responde comentarios automáticamente" delay={0.23}>
          <LinkedInConnect
            status={linkedinStatus}
            onUpdate={() => refetchLinkedin()}
          />
        </Section>

        {/* TikTok Connect */}
        <Section icon={Music2} title="Conectar con TikTok"
          subtitle="Publica videos y responde comentarios automáticamente" delay={0.25}>
          <TikTokConnect
            status={tiktokStatus}
            onUpdate={() => refetchTiktok()}
          />
        </Section>

        {/* Ayrshare — Auto Global OAuth */}
        <Section icon={Share2} title="Redes Sociales (Ayrshare)"
          subtitle="Vincula X/Twitter, Instagram, Facebook, LinkedIn, TikTok, YouTube y más en un click" delay={0.27}>
          <AyrshareConnect
            status={ayrshareStatus}
            onUpdate={() => refetchAyrshare()}
          />
        </Section>

        {/* Widget embed code */}
        <Section icon={Code2} title="Instalar el widget en tu web"
          subtitle="Copia y pega este código antes de cerrar </body>" delay={0.22}>

          {/* Business ID prominente */}
          <div className="mb-4 p-4 bg-violet-50 border border-violet-200 rounded-xl">
            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-1">Tu Business ID</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono font-bold text-violet-900 bg-white px-3 py-2 rounded-lg border border-violet-200 select-all">
                {user?.business_id ?? "Cargando..."}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(user?.business_id ?? "");
                  toast.success("Business ID copiado");
                }}
                className="flex items-center gap-1 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs rounded-lg transition-colors flex-shrink-0"
              >
                <Copy size={12} /> Copiar
              </button>
            </div>
            <p className="text-xs text-violet-600 mt-2">Usa este ID al instalar el plugin o el código en tu web.</p>
          </div>

          {/* Plataformas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">

            {/* WordPress */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🔌</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">WordPress</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">Instala el plugin en 2 clics</p>
                <a
                  href="https://github.com/Petunia-AI/gentes-de-ventas/raw/main/wordpress-plugin/petunia-chat.zip"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <ExternalLink size={11} /> Descargar .zip
                </a>
                <p className="text-xs text-muted-foreground mt-2">
                  Plugins → Añadir nuevo → Subir plugin → Activar → Ajustes → Petunia AI Chat
                </p>
              </div>
            </div>

            {/* Shopify */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🛍️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Shopify</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">Snippet para tu tema</p>
                <a
                  href="https://github.com/Petunia-AI/gentes-de-ventas/raw/main/shopify-integration/petunia-chat.liquid"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <ExternalLink size={11} /> Descargar .liquid
                </a>
                <p className="text-xs text-muted-foreground mt-2">
                  Online Store → Themes → Edit code → Snippets → Añadir petunia-chat → pegar en theme.liquid
                </p>
              </div>
            </div>

          </div>

          {/* Código HTML manual */}
          <p className="text-xs font-medium text-muted-foreground mb-2">O pégalo manualmente en tu HTML:</p>
          <div className="relative">
            <pre className="bg-slate-950 text-green-300 text-xs p-4 rounded-xl overflow-x-auto leading-relaxed font-mono border border-slate-800">
              {widgetCode}
            </pre>
            <button
              onClick={copyWidget}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors"
            >
              {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            El widget aparecerá como un botón flotante en tu sitio.
            Puedes cambiar el color, nombre y posición directamente en el código.
          </p>
        </Section>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="btn-primary w-full py-3 text-sm"
        >
          {mutation.isPending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Guardando...
            </span>
          ) : saved ? (
            <span className="flex items-center gap-2"><Check size={15} /> ¡Guardado!</span>
          ) : (
            <span className="flex items-center gap-2"><Save size={15} /> Guardar configuración</span>
          )}
        </button>
      </div>
    </div>
  );
}
