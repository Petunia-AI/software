"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth";
import { businessApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Building2, Sparkles, MessageSquare, Code2, Rocket,
  ArrowRight, ArrowLeft, Check, Zap, Globe, Phone, Instagram,
} from "lucide-react";

// ── Steps ──────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Tu negocio",      icon: Building2 },
  { id: 2, label: "Contexto IA",     icon: Sparkles },
  { id: 3, label: "Canales",         icon: MessageSquare },
  { id: 4, label: "Widget",          icon: Code2 },
  { id: 5, label: "Listo",           icon: Rocket },
];

const INDUSTRIES = [
  "SaaS / Software", "Fintech", "E-commerce", "Real Estate",
  "Educación", "Salud", "Servicios Profesionales", "Retail", "Otro",
];

// ── Page ───────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    name: "",
    industry: "",
    description: "",
    product_description: "",
    pricing_info: "",
    target_customer: "",
    value_proposition: "",
    webchat_enabled: true,
    whatsapp_enabled: false,
    instagram_enabled: false,
  });

  const set = (k: string) => (v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  const widgetCode = `<script
  src="${process.env.NEXT_PUBLIC_WIDGET_URL || "http://localhost:3000"}/widget.js"
  data-business-id="${user?.business_id ?? "TU_BUSINESS_ID"}"
  data-color="#635bff"
  data-name="Asistente"
></script>`;

  const handleFinish = async () => {
    setSaving(true);
    try {
      await businessApi.update(form as Record<string, unknown>);
      localStorage.setItem("onboarding_done", "1");
      toast.success("¡Todo listo! Bienvenido 🎉");
      router.push("/dashboard");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const canNext = (): boolean => {
    if (step === 1) return form.name.trim().length > 0 && form.industry.length > 0;
    return true;
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-[hsl(0,0%,98%)] flex flex-col">

      {/* ── Header ── */}
      <header className="border-b border-border bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Zap size={15} className="text-white" />
          </div>
          <span className="font-bold text-foreground">Agente de Ventas AI</span>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Saltar por ahora
        </button>
      </header>

      {/* ── Progress ── */}
      <div className="w-full h-1 bg-secondary">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* ── Step indicators ── */}
      <div className="flex items-center justify-center gap-2 pt-8 px-4">
        {STEPS.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              step === s.id
                ? "bg-primary text-white shadow-sm"
                : step > s.id
                  ? "bg-green-100 text-green-700"
                  : "bg-secondary text-muted-foreground"
            }`}>
              {step > s.id
                ? <Check size={11} />
                : <s.icon size={11} />
              }
              <span className="hidden sm:block">{s.label}</span>
            </div>
            {s.id < STEPS.length && (
              <div className="w-4 h-px bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <Step1
                key="step1"
                form={form}
                set={set}
                industries={INDUSTRIES}
              />
            )}
            {step === 2 && (
              <Step2 key="step2" form={form} set={set} />
            )}
            {step === 3 && (
              <Step3 key="step3" form={form} set={set} />
            )}
            {step === 4 && (
              <Step4
                key="step4"
                widgetCode={widgetCode}
                copied={copied}
                onCopy={() => {
                  navigator.clipboard.writeText(widgetCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              />
            )}
            {step === 5 && (
              <Step5 key="step5" name={form.name} />
            )}
          </AnimatePresence>

          {/* ── Navigation buttons ── */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setStep((p) => p - 1)}
              disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <ArrowLeft size={15} /> Anterior
            </button>

            {step < STEPS.length ? (
              <button
                onClick={() => setStep((p) => p + 1)}
                disabled={!canNext()}
                className="flex items-center gap-2 btn-primary px-6 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {step === 4 ? "Ya lo instalé" : "Siguiente"} <ArrowRight size={15} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex items-center gap-2 btn-primary px-6 py-2.5 text-sm"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    Ir al dashboard <Rocket size={15} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Business info ──────────────────────────────────────────────────
function Step1({ form, set, industries }: {
  form: Record<string, string | boolean>;
  set: (k: string) => (v: string | boolean) => void;
  industries: string[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div>
        <h2 className="text-2xl font-bold text-foreground">Cuéntanos sobre tu negocio</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Esto ayuda a tus agentes a entender el contexto en el que operan.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Nombre de la empresa <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className="input-stripe"
          placeholder="Ej: TechVentas LATAM"
          value={form.name as string}
          onChange={(e) => set("name")(e.target.value)}
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Industria <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {industries.map((ind) => (
            <button
              key={ind}
              onClick={() => set("industry")(ind)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${
                form.industry === ind
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Descripción breve
        </label>
        <textarea
          className="input-stripe resize-none"
          rows={3}
          placeholder="¿A qué se dedica tu empresa? ¿Qué problema resuelve?"
          value={form.description as string}
          onChange={(e) => set("description")(e.target.value)}
        />
      </div>
    </motion.div>
  );
}

// ── Step 2: AI Context ─────────────────────────────────────────────────────
function Step2({ form, set }: {
  form: Record<string, string | boolean>;
  set: (k: string) => (v: string | boolean) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div>
        <h2 className="text-2xl font-bold text-foreground">Contexto para los agentes IA</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Cuanto más detallado, mejores respuestas. Puedes editarlo después en Configuración.
        </p>
      </div>

      {[
        {
          key: "product_description",
          label: "¿Qué vendes?",
          placeholder: "Describe tu producto/servicio, características y beneficios principales...",
          hint: "Los agentes usarán esto para responder preguntas de producto.",
        },
        {
          key: "pricing_info",
          label: "Precios y planes",
          placeholder: "Plan Starter $199/mes · Plan Pro $599/mes · Enterprise desde $1,500/mes",
          hint: "El agente Cerrador usa esto para presentar propuestas.",
        },
        {
          key: "target_customer",
          label: "Cliente ideal (ICP)",
          placeholder: "Empresas B2B con 10-200 empleados, industria retail o fintech...",
          hint: "El Calificador usa esto para detectar si el lead encaja.",
        },
        {
          key: "value_proposition",
          label: "Propuesta de valor",
          placeholder: "Somos los únicos en LATAM que... En 30 días nuestros clientes logran...",
          hint: "El Cerrador usa esto en su pitch de ventas.",
        },
      ].map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-foreground mb-1.5">{field.label}</label>
          <textarea
            className="input-stripe resize-none"
            rows={2}
            placeholder={field.placeholder}
            value={form[field.key] as string}
            onChange={(e) => set(field.key)(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">{field.hint}</p>
        </div>
      ))}
    </motion.div>
  );
}

// ── Step 3: Channels ───────────────────────────────────────────────────────
function Step3({ form, set }: {
  form: Record<string, string | boolean>;
  set: (k: string) => (v: string | boolean) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div>
        <h2 className="text-2xl font-bold text-foreground">Activa tus canales</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Elige por dónde quieres que tus agentes respondan.
        </p>
      </div>

      {[
        {
          key: "webchat_enabled",
          icon: Globe,
          label: "Webchat",
          desc: "Widget embeddable en tu sitio web. Instalación en 1 línea de código.",
          badge: "INCLUIDO EN TODOS LOS PLANES",
          badgeColor: "bg-green-100 text-green-700",
          always: true,
        },
        {
          key: "whatsapp_enabled",
          icon: Phone,
          label: "WhatsApp Business",
          desc: "Conecta vía Twilio. Requiere plan Pro o superior.",
          badge: "PLAN PRO+",
          badgeColor: "bg-violet-100 text-violet-700",
          always: false,
        },
        {
          key: "instagram_enabled",
          icon: Instagram,
          label: "Instagram DMs",
          desc: "Responde mensajes directos vía Meta Graph API. Plan Pro+.",
          badge: "PLAN PRO+",
          badgeColor: "bg-pink-100 text-pink-700",
          always: false,
        },
      ].map((ch) => (
        <div
          key={ch.key}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            form[ch.key]
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40"
          }`}
          onClick={() => !ch.always && set(ch.key)(!(form[ch.key] as boolean))}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <ch.icon size={18} className="text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground text-sm">{ch.label}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ch.badgeColor}`}>
                    {ch.badge}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{ch.desc}</p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              form[ch.key] ? "border-primary bg-primary" : "border-border"
            }`}>
              {form[ch.key] && <Check size={11} className="text-white" />}
            </div>
          </div>
        </div>
      ))}

      {form.instagram_enabled && (
        <div className="p-4 rounded-xl bg-pink-50 border border-pink-200 text-xs text-pink-800 space-y-1">
          <p className="font-semibold text-sm">Instagram conectado</p>
          <p>Completa la configuración en <strong>Configuración → Instagram DMs</strong> después del onboarding. Necesitarás tu Page Access Token y los IDs de tu cuenta.</p>
        </div>
      )}
    </motion.div>
  );
}

// ── Step 4: Widget install ─────────────────────────────────────────────────
function Step4({ widgetCode, copied, onCopy }: {
  widgetCode: string; copied: boolean; onCopy: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div>
        <h2 className="text-2xl font-bold text-foreground">Instala el widget</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Copia y pega este código antes de cerrar <code className="text-xs bg-secondary px-1 py-0.5 rounded">&lt;/body&gt;</code> en tu sitio.
        </p>
      </div>

      <div className="relative">
        <pre className="bg-slate-950 text-green-300 text-xs p-5 rounded-xl overflow-x-auto leading-relaxed font-mono border border-slate-800">
          {widgetCode}
        </pre>
        <button
          onClick={onCopy}
          className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors"
        >
          {copied ? <><Check size={12} /> Copiado!</> : <>Copiar</>}
        </button>
      </div>

      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
        <p className="text-sm font-semibold text-blue-800 mb-1">¿Usas WordPress, Webflow o Shopify?</p>
        <p className="text-xs text-blue-700">
          Pega el código en el HTML global de tu tema. En Shopify va en <code className="bg-blue-100 px-1 rounded">theme.liquid</code>,
          en Webflow en los scripts de &lt;/body&gt; del proyecto.
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        También puedes saltarte este paso y encontrar el código de instalación en <strong>Configuración → Instalar widget</strong>.
      </p>
    </motion.div>
  );
}

// ── Step 5: Done ───────────────────────────────────────────────────────────
function Step5({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="text-center py-8 space-y-5"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto shadow-2xl shadow-violet-500/40"
      >
        <Rocket size={36} className="text-white" />
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold text-foreground">
          ¡{name || "Tu empresa"} está lista! 🎉
        </h2>
        <p className="text-muted-foreground mt-2 max-w-sm mx-auto text-sm leading-relaxed">
          Tus agentes IA ya conocen tu negocio. En cuanto reciban el primer mensaje,
          empezarán a calificar y responder automáticamente.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
        {[
          { icon: "🤖", label: "5 agentes activos" },
          { icon: "⚡", label: "Respuesta < 3 seg" },
          { icon: "📊", label: "Analytics en vivo" },
        ].map((item) => (
          <div key={item.label} className="p-3 rounded-xl bg-secondary/50 border border-border">
            <div className="text-2xl mb-1">{item.icon}</div>
            <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
