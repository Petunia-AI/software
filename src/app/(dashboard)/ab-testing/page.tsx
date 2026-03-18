"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FlaskConical,
  Plus,
  Trash2,
  Trophy,
  TrendingUp,
  Users,
  MousePointer,
  DollarSign,
  Play,
  CheckCircle2,
  ArrowUpRight,
  X,
  Save,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Variant {
  id: string;
  name: string;
  headline: string | null;
  primaryText: string | null;
  imageUrl: string | null;
  callToAction: string | null;
  metaCampaignId: string | null;
  impressions: number;
  clicks: number;
  leads: number;
  spent: number;
  ctr: number;
  cpl: number | null;
}

interface AbTest {
  id: string;
  name: string;
  description: string | null;
  platform: string;
  status: "DRAFT" | "RUNNING" | "COMPLETED" | "CANCELLED";
  goalMetric: string;
  winnerVariantId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  variants: Variant[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  RUNNING: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  RUNNING: "En curso",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

const GOAL_LABELS: Record<string, string> = {
  leads: "Más leads",
  clicks: "Más clics",
  ctr: "Mayor CTR",
  cpl: "Menor CPL",
};

function fmt(n: number, dec = 0) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtUSD(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

function getWinner(test: AbTest): string | null {
  if (test.winnerVariantId) return test.winnerVariantId;
  if (test.variants.length < 2) return null;
  const goal = test.goalMetric;
  const sorted = [...test.variants].sort((a, b) => {
    if (goal === "leads") return b.leads - a.leads;
    if (goal === "clicks") return b.clicks - a.clicks;
    if (goal === "ctr") return b.ctr - a.ctr;
    if (goal === "cpl") return (a.cpl ?? 999) - (b.cpl ?? 999);
    return 0;
  });
  const hasData = sorted[0].impressions > 0;
  return hasData ? sorted[0].id : null;
}

// ─── Variant Card ──────────────────────────────────────────────────────────

function VariantCard({ variant, isWinner, goalMetric }: { variant: Variant; isWinner: boolean; goalMetric: string }) {
  const totalImpressions = variant.impressions;
  return (
    <div className={`relative bg-gray-50 border rounded-xl p-4 space-y-3 ${isWinner ? "border-emerald-300" : "border-gray-200"}`}>
      {isWinner && (
        <div className="absolute -top-3 left-4 flex items-center gap-1 bg-emerald-500/90 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
          <Trophy className="w-3 h-3" /> Ganador
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className={`text-sm font-bold ${isWinner ? "text-emerald-600" : "text-gray-900"}`}>{variant.name}</span>
        {variant.metaCampaignId && (
          <span className="text-xs text-gray-400 font-mono">Meta#{variant.metaCampaignId.slice(-6)}</span>
        )}
      </div>

      {variant.headline && <p className="text-xs text-gray-700 font-medium">{variant.headline}</p>}
      {variant.primaryText && (
        <p className="text-xs text-gray-500 line-clamp-2">{variant.primaryText}</p>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        {[
          { label: "Impresiones", value: fmt(variant.impressions), icon: Users, highlight: goalMetric === "impressions" },
          { label: "Clics", value: fmt(variant.clicks), icon: MousePointer, highlight: goalMetric === "clicks" },
          { label: "CTR", value: `${(variant.ctr * 100).toFixed(2)}%`, icon: TrendingUp, highlight: goalMetric === "ctr" },
          { label: "Leads", value: fmt(variant.leads), icon: ArrowUpRight, highlight: goalMetric === "leads" },
          { label: "Invertido", value: fmtUSD(variant.spent), icon: DollarSign, highlight: false },
          { label: "CPL", value: variant.cpl ? fmtUSD(variant.cpl) : "—", icon: DollarSign, highlight: goalMetric === "cpl" },
        ].map((m) => (
          <div key={m.label} className={`bg-white border border-gray-100 rounded-lg p-2 ${m.highlight ? "ring-1 ring-violet-500/30" : ""}`}>
            <p className="text-xs text-gray-500">{m.label}</p>
            <p className={`text-sm font-bold ${m.highlight ? "text-violet-600" : "text-gray-900"}`}>{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── New Test Form ─────────────────────────────────────────────────────────

function NewTestForm({ onSave, onCancel }: { onSave: (data: any) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("meta");
  const [goalMetric, setGoalMetric] = useState("leads");
  const [variants, setVariants] = useState([
    { name: "Variante A", headline: "", primaryText: "", callToAction: "LEARN_MORE" },
    { name: "Variante B", headline: "", primaryText: "", callToAction: "LEARN_MORE" },
  ]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name) { toast.error("Nombre requerido"); return; }
    setSaving(true);
    try {
      await onSave({ name, description, platform, goalMetric, variants });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Nuevo A/B Test</h2>
        <button onClick={onCancel}><X className="w-4 h-4 text-gray-400" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs text-gray-500 block mb-1">Nombre del test *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Test Titulares Julio 2026" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Plataforma</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400">
            <option value="meta">Meta Ads (Facebook/Instagram)</option>
            <option value="google">Google Ads</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Métrica de éxito</label>
          <select value={goalMetric} onChange={(e) => setGoalMetric(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400">
            {Object.entries(GOAL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-500">Variantes ({variants.length})</label>
          <button onClick={() => setVariants((v) => [...v, { name: `Variante ${String.fromCharCode(65 + v.length)}`, headline: "", primaryText: "", callToAction: "LEARN_MORE" }])} className="text-xs text-violet-600 hover:text-violet-700 transition">+ Agregar variante</button>
        </div>
        {variants.map((v, i) => (
          <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-violet-600">{v.name}</span>
              {variants.length > 2 && (
                <button onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))}><X className="w-3.5 h-3.5 text-gray-400" /></button>
              )}
            </div>
            <input value={v.headline} onChange={(e) => setVariants((prev) => prev.map((x, idx) => idx === i ? { ...x, headline: e.target.value } : x))} placeholder="Titular del anuncio…" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" />
            <textarea rows={2} value={v.primaryText} onChange={(e) => setVariants((prev) => prev.map((x, idx) => idx === i ? { ...x, primaryText: e.target.value } : x))} placeholder="Texto principal del anuncio…" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 transition">Cancelar</button>
        <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition">
          <Save className="w-4 h-4" />{saving ? "Creando…" : "Crear test"}
        </button>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AbTestingPage() {
  const [tests, setTests] = useState<AbTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ab-tests");
      if (res.ok) setTests(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: any) => {
    const res = await fetch("/api/ab-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast.success("Test creado");
      setShowForm(false);
      load();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al crear");
    }
  };

  const handleStatusChange = async (test: AbTest, status: string) => {
    const patch: any = { status };
    if (status === "RUNNING") patch.startedAt = new Date().toISOString();
    if (status === "COMPLETED") patch.endedAt = new Date().toISOString();

    const res = await fetch(`/api/ab-tests/${test.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) { toast.success("Estado actualizado"); load(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este A/B test?")) return;
    const res = await fetch(`/api/ab-tests/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Test eliminado"); load(); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-violet-600" />
            A/B Testing
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Compara variantes de anuncios y descubre qué funciona mejor
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition"
        >
          <Plus className="w-4 h-4" /> Nuevo A/B Test
        </button>
      </div>

      {showForm && (
        <NewTestForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tests.length === 0 && !showForm ? (
          <div className="text-center py-20 text-gray-400">
          <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium text-gray-500">Sin tests todavía</p>
          <p className="text-sm mt-1">Crea un A/B test para comparar variantes de tus anuncios.</p>
          <button onClick={() => setShowForm(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition">
            <Plus className="w-4 h-4" /> Crear primer test
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {tests.map((test) => {
            const winnerId = getWinner(test);
            return (
              <div key={test.id} className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                {/* Test header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[test.status]}`}>
                        {STATUS_LABELS[test.status]}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">{test.platform}</span>
                      <span className="text-xs text-gray-400">· {GOAL_LABELS[test.goalMetric]}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{test.name}</h3>
                    {test.description && <p className="text-xs text-gray-500 mt-0.5">{test.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {test.status === "DRAFT" && (
                      <button
                        onClick={() => handleStatusChange(test, "RUNNING")}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition"
                      >
                        <Play className="w-3 h-3" /> Iniciar test
                      </button>
                    )}
                    {test.status === "RUNNING" && (
                      <button
                        onClick={() => handleStatusChange(test, "COMPLETED")}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg transition"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Finalizar
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(test.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 border border-gray-200 hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-500 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Variants */}
                <div className="p-6">
                  <div className={`grid gap-4 ${test.variants.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}>
                    {test.variants.map((v) => (
                      <VariantCard
                        key={v.id}
                        variant={v}
                        isWinner={winnerId === v.id}
                        goalMetric={test.goalMetric}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
