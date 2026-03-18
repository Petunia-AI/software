"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Brain,
  Plus,
  Trash2,
  BookOpen,
  BarChart3,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
  Lightbulb,
  Globe,
  Megaphone,
  FileText,
  Sparkles,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
}

interface CampaignResult {
  id: string;
  campaignName: string;
  campaignType: string;
  platform: string;
  period: string | null;
  headline: string | null;
  primaryText: string | null;
  impressions: number | null;
  clicks: number | null;
  leads: number | null;
  spent: string | null;
  ctr: string | null;
  cpl: string | null;
  whatWorked: string | null;
  whatDidntWork: string | null;
  propertyType: string | null;
  targetCity: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KNOWLEDGE_CATEGORIES = [
  { value: "mercado", label: "Mercado local", icon: Globe, color: "text-blue-600", bg: "bg-blue-50" },
  { value: "propiedad", label: "Propiedades destacadas", icon: BookOpen, color: "text-green-600", bg: "bg-green-50" },
  { value: "contenido", label: "Contenido que funciona", icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50" },
  { value: "campana", label: "Aprendizajes de campañas", icon: Megaphone, color: "text-orange-600", bg: "bg-orange-50" },
  { value: "general", label: "Conocimiento general", icon: Lightbulb, color: "text-yellow-600", bg: "bg-yellow-50" },
];

const PLATFORMS = ["Instagram", "Facebook", "WhatsApp", "TikTok", "Email", "LinkedIn", "Orgánico"];
const CAMPAIGN_TYPES = ["meta", "google", "organic", "email", "whatsapp"];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<"knowledge" | "results">("knowledge");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
          <Brain className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Aprendizaje IA</h1>
          <p className="text-sm text-muted-foreground">Todo lo que Petunia sabe sobre tu negocio se inyecta en cada respuesta</p>
        </div>
      </div>

      {/* How it works banner */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
        <div className="text-sm text-violet-800 space-y-1">
          <p className="font-medium text-violet-700">¿Cómo funciona el aprendizaje?</p>
          <p className="text-violet-700/80">Cada vez que Petunia genera contenido o responde en el chat, primero lee tu base de conocimiento. Mientras más datos le des, más personalizado y preciso será cada output.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("knowledge")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "knowledge"
              ? "bg-white shadow-sm text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Base de Conocimiento
        </button>
        <button
          onClick={() => setActiveTab("results")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "results"
              ? "bg-white shadow-sm text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Resultados de Campañas
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "knowledge" ? <KnowledgeTab /> : <CampaignResultsTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Knowledge Tab
// ---------------------------------------------------------------------------

function KnowledgeTab() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "general", title: "", content: "" });
  const [error, setError] = useState("");

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/knowledge");
      if (res.ok) setEntries(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      setError("El título y el contenido son requeridos");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ai/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Error al guardar");
        return;
      }
      setForm({ category: "general", title: "", content: "" });
      setShowForm(false);
      await loadEntries();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/ai/knowledge?id=${id}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggle(entry: KnowledgeEntry) {
    setTogglingId(entry.id);
    try {
      const res = await fetch("/api/ai/knowledge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, isActive: !entry.isActive }),
      });
      if (res.ok) {
        setEntries((prev) =>
          prev.map((e) => e.id === entry.id ? { ...e, isActive: !e.isActive } : e)
        );
      }
    } finally {
      setTogglingId(null);
    }
  }

  const grouped = KNOWLEDGE_CATEGORIES.map((cat) => ({
    ...cat,
    items: entries.filter((e) => e.category === cat.value),
  }));

  return (
    <div className="space-y-6">
      {/* Add button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          <span className="text-gray-900 font-medium">{entries.filter((e) => e.isActive).length}</span> entradas activas de {entries.length} total
        </p>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-violet-600 hover:bg-violet-500 gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar conocimiento
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="bg-white border border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Nuevo conocimiento</CardTitle>
            <CardDescription>Petunia usará esto cada vez que genere contenido o responda preguntas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category */}
            <div>
              <label className="text-sm text-gray-500 mb-2 block">Categoría</label>
              <div className="flex flex-wrap gap-2">
                {KNOWLEDGE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setForm((f) => ({ ...f, category: cat.value }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      form.category === cat.value
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <cat.icon className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Título</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Zona más buscada en enero 2026"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              />
            </div>

            {/* Content */}
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Contenido</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Ej: El sector Polanco registró el mayor número de consultas en enero 2026, especialmente para departamentos de 2-3 recámaras entre $3M-$6M MXN..."
                rows={4}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => { setShowForm(false); setError(""); }}
                className="text-gray-400"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-violet-600 hover:bg-violet-500 gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries grouped by category */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <Brain className="w-12 h-12 text-gray-600 mx-auto" />
          <p className="text-gray-400 font-medium">Petunia aún no sabe nada sobre tu negocio</p>
          <p className="text-sm text-gray-500">Agrega conocimiento y cada respuesta será más precisa y personalizada</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((cat) => {
            if (cat.items.length === 0) return null;
            const CatIcon = cat.icon;
            return (
              <div key={cat.value}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-6 h-6 rounded-md ${cat.bg} flex items-center justify-center`}>
                    <CatIcon className={`w-3.5 h-3.5 ${cat.color}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                  <span className="text-xs text-gray-400">({cat.items.length})</span>
                </div>
                <div className="space-y-2">
                  {cat.items.map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                        entry.isActive
                          ? "border-gray-200 bg-white shadow-sm"
                          : "border-gray-100 bg-gray-50 opacity-50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{entry.title}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{entry.content}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggle(entry)}
                          disabled={togglingId === entry.id}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title={entry.isActive ? "Desactivar" : "Activar"}
                        >
                          {togglingId === entry.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : entry.isActive ? (
                            <Eye className="w-4 h-4 text-green-400" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deletingId === entry.id}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          {deletingId === entry.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campaign Results Tab
// ---------------------------------------------------------------------------

function CampaignResultsTab() {
  const [results, setResults] = useState<CampaignResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    campaignName: "",
    campaignType: "meta",
    platform: "Instagram",
    period: "",
    headline: "",
    primaryText: "",
    impressions: "",
    clicks: "",
    leads: "",
    spent: "",
    ctr: "",
    cpl: "",
    whatWorked: "",
    whatDidntWork: "",
    propertyType: "",
    targetCity: "",
  });

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/campaign-results");
      if (res.ok) setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadResults(); }, [loadResults]);

  async function handleSave() {
    if (!form.campaignName.trim()) {
      setError("El nombre de la campaña es requerido");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ai/campaign-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Error al guardar");
        return;
      }
      setForm({
        campaignName: "", campaignType: "meta", platform: "Instagram", period: "",
        headline: "", primaryText: "", impressions: "", clicks: "", leads: "",
        spent: "", ctr: "", cpl: "", whatWorked: "", whatDidntWork: "",
        propertyType: "", targetCity: "",
      });
      setShowForm(false);
      await loadResults();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/ai/campaign-results?id=${id}`, { method: "DELETE" });
      setResults((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  const Field = ({
    label, value, onChange, placeholder, type = "text", rows,
  }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; type?: string; rows?: number;
  }) => (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      {rows ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          <span className="text-gray-900 font-medium">{results.length}</span> resultados guardados · las últimas 5 campañas se inyectan al contexto de IA
        </p>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-violet-600 hover:bg-violet-500 gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar resultado
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="bg-white border border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Nuevo resultado de campaña</CardTitle>
            <CardDescription>Petunia aprenderá qué funcionó y qué no para mejorar futuras campañas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Nombre de la campaña *"
                value={form.campaignName}
                onChange={(v) => setForm((f) => ({ ...f, campaignName: v }))}
                placeholder="Ej: Campaña departamentos Polanco Q1"
              />
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tipo de campaña *</label>
                <select
                  value={form.campaignType}
                  onChange={(e) => setForm((f) => ({ ...f, campaignType: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                >
                  {CAMPAIGN_TYPES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Plataforma *</label>
                <select
                  value={form.platform}
                  onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <Field
                label="Período"
                value={form.period}
                onChange={(v) => setForm((f) => ({ ...f, period: v }))}
                placeholder="Ej: Enero 2026"
              />
              <Field
                label="Tipo de propiedad"
                value={form.propertyType}
                onChange={(v) => setForm((f) => ({ ...f, propertyType: v }))}
                placeholder="Ej: Departamento, Casa, etc."
              />
              <Field
                label="Ciudad objetivo"
                value={form.targetCity}
                onChange={(v) => setForm((f) => ({ ...f, targetCity: v }))}
                placeholder="Ej: Ciudad de México"
              />
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">Métricas</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label="Impresiones" value={form.impressions} onChange={(v) => setForm((f) => ({ ...f, impressions: v }))} placeholder="0" type="number" />
                <Field label="Clics" value={form.clicks} onChange={(v) => setForm((f) => ({ ...f, clicks: v }))} placeholder="0" type="number" />
                <Field label="Leads" value={form.leads} onChange={(v) => setForm((f) => ({ ...f, leads: v }))} placeholder="0" type="number" />
                <Field label="Gasto ($)" value={form.spent} onChange={(v) => setForm((f) => ({ ...f, spent: v }))} placeholder="0.00" type="number" />
                <Field label="CTR (%)" value={form.ctr} onChange={(v) => setForm((f) => ({ ...f, ctr: v }))} placeholder="0.00" type="number" />
                <Field label="CPL ($)" value={form.cpl} onChange={(v) => setForm((f) => ({ ...f, cpl: v }))} placeholder="0.00" type="number" />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Aprendizajes (lo más valioso)</p>
              <Field
                label="✅ ¿Qué funcionó?"
                value={form.whatWorked}
                onChange={(v) => setForm((f) => ({ ...f, whatWorked: v }))}
                placeholder="Ej: Las imágenes de vistas panorámicas tuvieron 3x más CTR que las fotos de interiores..."
                rows={3}
              />
              <Field
                label="❌ ¿Qué no funcionó?"
                value={form.whatDidntWork}
                onChange={(v) => setForm((f) => ({ ...f, whatDidntWork: v }))}
                placeholder="Ej: El copy con precio visible tuvo menor CTR que el que ocultaba el precio..."
                rows={3}
              />
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Creatividad (opcional)</p>
              <Field
                label="Headline"
                value={form.headline}
                onChange={(v) => setForm((f) => ({ ...f, headline: v }))}
                placeholder="Headline que usaste en el anuncio"
              />
              <Field
                label="Texto principal"
                value={form.primaryText}
                onChange={(v) => setForm((f) => ({ ...f, primaryText: v }))}
                placeholder="Texto principal del anuncio"
                rows={3}
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => { setShowForm(false); setError(""); }}
                className="text-gray-400"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-violet-600 hover:bg-violet-500 gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                Guardar resultado
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <BarChart3 className="w-12 h-12 text-gray-600 mx-auto" />
          <p className="text-gray-400 font-medium">Ningún resultado de campaña guardado aún</p>
          <p className="text-sm text-gray-500">Registra los resultados de tus campañas para que Petunia aprenda qué funciona en tu mercado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((result) => (
            <div
              key={result.id}
              className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{result.campaignName}</span>
                    <Badge className="bg-violet-50 text-violet-700 border-0 text-xs">{result.platform}</Badge>
                    <Badge className="bg-gray-100 text-gray-600 border-0 text-xs">{result.campaignType}</Badge>
                    {result.period && <span className="text-xs text-gray-500">{result.period}</span>}
                  </div>
                  {(result.targetCity || result.propertyType) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {[result.targetCity, result.propertyType].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(result.id)}
                  disabled={deletingId === result.id}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors shrink-0"
                >
                  {deletingId === result.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Metrics */}
              {(result.leads || result.impressions || result.ctr || result.cpl || result.spent) && (
                <div className="flex flex-wrap gap-3">
                  {result.leads != null && (
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{result.leads}</p>
                      <p className="text-xs text-gray-500">Leads</p>
                    </div>
                  )}
                  {result.impressions != null && (
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{Number(result.impressions).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Impresiones</p>
                    </div>
                  )}
                  {result.ctr != null && (
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{Number(result.ctr).toFixed(2)}%</p>
                      <p className="text-xs text-gray-500">CTR</p>
                    </div>
                  )}
                  {result.cpl != null && (
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">${Number(result.cpl).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">CPL</p>
                    </div>
                  )}
                  {result.spent != null && (
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">${Number(result.spent).toFixed(0)}</p>
                      <p className="text-xs text-gray-500">Gasto</p>
                    </div>
                  )}
                </div>
              )}

              {/* Learnings */}
              {(result.whatWorked || result.whatDidntWork) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {result.whatWorked && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-green-800">{result.whatWorked}</p>
                    </div>
                  )}
                  {result.whatDidntWork && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                      <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-800">{result.whatDidntWork}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
