"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Save, Plus, Trash2, RefreshCw, Check,
  Star, AlertCircle, ChevronUp, ChevronDown, Pencil, Eye,
  DollarSign, Sparkles, Zap,
} from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────
interface PlanConfig {
  id: string;
  name: string;
  price_usd: number;
  description: string;
  features: string[];
  limits: Record<string, unknown>;
  highlight: boolean;
  cta: string;
  updated_at: string | null;
}

// ── Plan color map ─────────────────────────────────────────────────────────
const PLAN_STYLE: Record<string, { grad: string; accent: string; ring: string }> = {
  starter:    { grad: "from-blue-500 to-indigo-600",   accent: "bg-blue-50 text-blue-700 border-blue-200",   ring: "ring-blue-200"   },
  pro:        { grad: "from-violet-500 to-purple-600", accent: "bg-violet-50 text-violet-700 border-violet-200", ring: "ring-violet-300" },
  enterprise: { grad: "from-amber-500 to-orange-600",  accent: "bg-amber-50 text-amber-700 border-amber-200",  ring: "ring-amber-200"  },
};

// ── Mini landing preview ───────────────────────────────────────────────────
function PlanPreview({ plan }: { plan: PlanConfig }) {
  const s = PLAN_STYLE[plan.id] ?? PLAN_STYLE.starter;
  return (
    <div
      className={`relative rounded-2xl border p-5 transition-all ${
        plan.highlight
          ? "border-violet-500 bg-violet-950/60 shadow-xl shadow-violet-900/40"
          : "border-white/10 bg-white/[0.04]"
      }`}
      style={{ background: plan.highlight ? undefined : "rgba(255,255,255,0.03)" }}
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-0.5 bg-violet-500 text-white text-[10px] font-bold rounded-full">
            MÁS POPULAR
          </span>
        </div>
      )}
      <div className="mb-3">
        <h3 className="font-bold text-white text-base">{plan.name}</h3>
        <p className="text-white/50 text-xs mt-0.5 line-clamp-2">{plan.description}</p>
      </div>
      <div className="mb-4">
        <span className="text-3xl font-bold text-white">${plan.price_usd}</span>
        <span className="text-white/40 text-sm ml-1">/mes</span>
      </div>
      <ul className="space-y-1.5 mb-4">
        {plan.features.slice(0, 5).map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-white/70">
            <Check size={11} className="text-violet-400 mt-0.5 flex-shrink-0" />
            {f}
          </li>
        ))}
        {plan.features.length > 5 && (
          <li className="text-xs text-white/40 pl-4">+{plan.features.length - 5} más...</li>
        )}
      </ul>
      <div
        className={`text-center py-2 rounded-lg text-xs font-semibold ${
          plan.highlight
            ? "bg-violet-600 text-white"
            : "border border-white/20 text-white/70"
        }`}
      >
        {plan.cta}
      </div>
    </div>
  );
}

// ── Feature list editor ────────────────────────────────────────────────────
function FeatureEditor({
  features, onChange,
}: { features: string[]; onChange: (f: string[]) => void }) {
  function update(idx: number, val: string) {
    const next = [...features];
    next[idx] = val;
    onChange(next);
  }
  function remove(idx: number) { onChange(features.filter((_, i) => i !== idx)); }
  function add()               { onChange([...features, ""]); }
  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...features];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }
  function moveDown(idx: number) {
    if (idx === features.length - 1) return;
    const next = [...features];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {features.map((f, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            className="flex items-center gap-2"
          >
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveUp(idx)}   className="text-slate-300 hover:text-slate-600 transition-colors p-0.5"><ChevronUp size={12} /></button>
              <button onClick={() => moveDown(idx)} className="text-slate-300 hover:text-slate-600 transition-colors p-0.5"><ChevronDown size={12} /></button>
            </div>
            <Check size={13} className="text-violet-400 flex-shrink-0" />
            <input
              value={f}
              onChange={e => update(idx, e.target.value)}
              placeholder="Descripción de la característica..."
              className="flex-1 text-sm bg-slate-50 border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
            />
            <button onClick={() => remove(idx)} className="text-slate-300 hover:text-red-400 transition-colors p-1">
              <Trash2 size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <button
        onClick={add}
        className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium mt-1 transition-colors"
      >
        <Plus size={13} /> Agregar característica
      </button>
    </div>
  );
}

// ── Plan editor card ────────────────────────────────────────────────────────
function PlanEditor({
  plan, saving, onSave,
}: { plan: PlanConfig; saving: boolean; onSave: (data: Partial<PlanConfig>) => void }) {
  const [form, setForm] = useState<PlanConfig>({ ...plan });
  const [dirty, setDirty]   = useState(false);
  const [preview, setPreview] = useState(false);
  const s = PLAN_STYLE[plan.id] ?? PLAN_STYLE.starter;

  // Sync when plan updates from parent
  useEffect(() => { setForm({ ...plan }); setDirty(false); }, [plan]);

  function set<K extends keyof PlanConfig>(k: K, v: PlanConfig[K]) {
    setForm(f => ({ ...f, [k]: v }));
    setDirty(true);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className={`bg-gradient-to-r ${s.grad} p-5 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <CreditCard size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">{plan.name}</h3>
            <p className="text-white/60 text-xs capitalize">{plan.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreview(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors"
          >
            <Eye size={12} /> {preview ? "Editor" : "Preview"}
          </button>
          {dirty && (
            <button
              onClick={() => onSave(form)}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-800 text-xs font-bold transition-all hover:bg-white/90 disabled:opacity-60"
            >
              {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
              Guardar
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {preview ? (
          /* ── Preview mode ── */
          <div className="bg-[hsl(258,47%,8%)] rounded-2xl p-4">
            <p className="text-white/40 text-xs text-center mb-4">Vista previa en landing page</p>
            <PlanPreview plan={form} />
          </div>
        ) : (
          /* ── Edit mode ── */
          <div className="space-y-5">
            {/* Row 1: name + price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nombre del plan</label>
                <input
                  value={form.name}
                  onChange={e => set("name", e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  <DollarSign size={11} className="inline mr-1" />Precio USD / mes
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                  <input
                    type="number"
                    min={0}
                    value={form.price_usd}
                    onChange={e => set("price_usd", parseInt(e.target.value) || 0)}
                    className="w-full text-sm bg-slate-50 border border-border rounded-lg pl-7 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all font-bold tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Descripción corta</label>
              <input
                value={form.description}
                onChange={e => set("description", e.target.value)}
                className="w-full text-sm bg-slate-50 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
              />
            </div>

            {/* CTA + Highlight */}
            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Texto del botón (CTA)</label>
                <input
                  value={form.cta}
                  onChange={e => set("cta", e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Destacado</label>
                <button
                  onClick={() => set("highlight", !form.highlight)}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-sm font-semibold transition-all ${
                    form.highlight
                      ? "bg-violet-50 border-violet-300 text-violet-700"
                      : "bg-slate-50 border-border text-slate-500"
                  }`}
                >
                  <Star size={14} className={form.highlight ? "fill-violet-400 text-violet-400" : "text-slate-300"} />
                  {form.highlight ? "MÁS POPULAR ✓" : "Sin destacar"}
                </button>
              </div>
            </div>

            {/* Features */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Características ({form.features.length})
              </label>
              <FeatureEditor
                features={form.features}
                onChange={feats => { set("features", feats); }}
              />
            </div>

            {/* Last updated */}
            {plan.updated_at && (
              <p className="text-xs text-muted-foreground">
                Última actualización: {new Date(plan.updated_at).toLocaleString("es-MX")}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AdminPlanesPage() {
  const [plans, setPlans]   = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getPlans()
      .then(r => setPlans(r.data))
      .catch(() => toast.error("No se pudieron cargar los planes"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(planId: string, data: Partial<PlanConfig>) {
    setSavingId(planId);
    try {
      const r = await adminApi.updatePlan(planId, data);
      setPlans(prev => prev.map(p => p.id === planId ? r.data : p));
      toast.success("Plan actualizado — el home se refleja de inmediato");
    } catch {
      toast.error("Error al guardar el plan");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="metric-banner p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <CreditCard size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">Planes de suscripción</h1>
            <p className="text-white/60 text-sm">Edita precios, características y configuración. Los cambios se reflejan al instante en el home.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-white/70 bg-white/10 px-3 py-1.5 rounded-full">
            <Sparkles size={12} />
            Los cambios actualizan la landing page automáticamente
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/70 bg-white/10 px-3 py-1.5 rounded-full">
            <Zap size={12} />
            Sin redeploy necesario
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertCircle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          <strong>Nota:</strong> El precio aquí es solo visual (landing page). Para cambiar el precio real cobrado por Stripe, también actualiza el Price ID correspondiente en Stripe Dashboard y en las variables de entorno.
        </p>
      </div>

      {/* Plan editors */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-border h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {plans.map(plan => (
            <PlanEditor
              key={plan.id}
              plan={plan}
              saving={savingId === plan.id}
              onSave={(data) => handleSave(plan.id, data)}
            />
          ))}
        </div>
      )}

      {/* Live preview */}
      <div className="bg-[hsl(258,47%,8%)] rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-5">
          <Eye size={16} className="text-violet-400" />
          <h2 className="text-white font-semibold text-sm">Vista previa de la sección de precios</h2>
          <span className="text-white/40 text-xs ml-2">— así se ve en el home</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map(plan => (
            <PlanPreview key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </div>
  );
}
