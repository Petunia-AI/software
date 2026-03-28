"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Zap,
  Globe,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AnalyticsData {
  overview: {
    totalLeads: number;
    wonLeads: number;
    lostLeads: number;
    avgScore: number;
    maxScore: number;
  };
  pipeline: { status: string; count: number }[];
  sources: { source: string; count: number; pct: number }[];
  meta: {
    totals: { impressions: number; clicks: number; leads: number; spent: number };
    avgCpl: number | null;
    campaigns: {
      id: string;
      name: string;
      status: string;
      impressions: number | null;
      clicks: number | null;
      leads: number | null;
      spent: number;
      ctr: number;
      cpl: number;
      lastSyncAt: string | null;
    }[];
  };
  landingPages: {
    id: string;
    title: string;
    template: string;
    status: string;
    views: number;
    leads: number;
    conversionRate: number | null;
  }[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  QUALIFIED: "Calificado",
  PROPOSAL: "Propuesta",
  NEGOTIATION: "Negociación",
  WON: "Ganado",
};

const SOURCE_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  WHATSAPP: "WhatsApp",
  WEBSITE: "Sitio Web",
  REFERRAL: "Referido",
  FOLLOW_UP_BOSS: "Follow Up Boss",
  OTHER: "Otro",
};

const SOURCE_COLORS: Record<string, string> = {
  INSTAGRAM: "bg-pink-500",
  FACEBOOK: "bg-blue-600",
  WHATSAPP: "bg-green-500",
  WEBSITE: "bg-purple-500",
  REFERRAL: "bg-amber-500",
  FOLLOW_UP_BOSS: "bg-cyan-500",
  OTHER: "bg-gray-500",
};

const PIPELINE_COLORS = [
  "bg-gray-500",
  "bg-blue-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-orange-500",
  "bg-emerald-500",
];

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtUSD(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  count,
  color,
}: {
  label: string;
  value: number;
  max: number;
  count: number;
  color: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-24 truncate shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right shrink-0">{count}</span>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("/api/analytics", { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        setData(await res.json());
        setLastUpdated(new Date());
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/cron/sync-metrics", { method: "POST" });
      await load();
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Cargando analytics…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
          <BarChart3 className="w-7 h-7 text-violet-400" />
        </div>
        <div>
          <p className="text-gray-700 font-semibold text-lg">Sin datos de analytics todavía</p>
          <p className="text-gray-400 text-sm mt-1 max-w-sm">
            Conecta tus cuentas publicitarias para comenzar a rastrear campañas y métricas de leads.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          <a
            href="/settings"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition"
          >
            Conectar cuentas
          </a>
        </div>
      </div>
    );
  }

  const { overview, pipeline, sources, meta, landingPages } = data;
  const maxPipeline = Math.max(...pipeline.map((p) => p.count), 1);
  const maxSource = Math.max(...sources.map((s) => s.count), 1);
  const conversionRate =
    overview.totalLeads > 0
      ? Math.round((overview.wonLeads / overview.totalLeads) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-violet-600" />
            Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {lastUpdated
              ? `Actualizado ${lastUpdated.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`
              : "Datos en tiempo real"}
          </p>
        </div>
        <button
          onClick={triggerSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando…" : "Sync Métricas"}
        </button>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Leads"
          value={fmt(overview.totalLeads)}
          sub={`${overview.wonLeads} ganados · ${overview.lostLeads} perdidos`}
          icon={Users}
          accent="bg-violet-50 text-violet-600"
        />
        <StatCard
          label="Conversión"
          value={`${conversionRate}%`}
          sub="Leads → Ganados"
          icon={TrendingUp}
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Score Promedio"
          value={`${overview.avgScore}/100`}
          sub={`Máx: ${overview.maxScore}/100`}
          icon={Zap}
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="CPL Meta Ads"
          value={meta.avgCpl !== null ? fmtUSD(meta.avgCpl) : "—"}
          sub={`${fmt(meta.totals.leads)} leads · ${fmtUSD(meta.totals.spent)} invertidos`}
          icon={DollarSign}
          accent="bg-blue-50 text-blue-600"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline funnel */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Target className="w-4 h-4 text-violet-600" />
            Pipeline de Ventas
          </h2>
          <div className="space-y-3">
            {pipeline.map((p, i) => (
              <BarRow
                key={p.status}
                label={STATUS_LABELS[p.status] ?? p.status}
                value={p.count}
                max={maxPipeline}
                count={p.count}
                color={PIPELINE_COLORS[i] ?? "bg-gray-500"}
              />
            ))}
          </div>
          <div className="pt-2 border-t border-gray-100">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Conversión global</span>
              <span className="font-semibold text-emerald-600">{conversionRate}%</span>
            </div>
          </div>
        </div>

        {/* Source breakdown */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-600" />
            Fuente de Leads
          </h2>
          {sources.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {sources.map((s) => (
                <BarRow
                  key={s.source}
                  label={SOURCE_LABELS[s.source] ?? s.source}
                  value={s.count}
                  max={maxSource}
                  count={s.count}
                  color={SOURCE_COLORS[s.source] ?? "bg-gray-500"}
                />
              ))}
            </div>
          )}
        </div>

        {/* Meta Ads summary */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Meta Ads Totales
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Impresiones", value: fmt(meta.totals.impressions) },
              { label: "Clics", value: fmt(meta.totals.clicks) },
              { label: "Leads", value: fmt(meta.totals.leads) },
              {
                label: "Invertido",
                value: fmtUSD(meta.totals.spent),
              },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-gray-50 border border-gray-100 rounded-xl p-3"
              >
                <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                <p className="text-lg font-bold text-gray-900">{m.value}</p>
              </div>
            ))}
          </div>
          {meta.avgCpl !== null && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-600">Costo por Lead promedio</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{fmtUSD(meta.avgCpl)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Campaigns table */}
      {meta.campaigns.length > 0 && (
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Campañas Meta Ads
            </h2>
            <span className="text-xs text-gray-400">{meta.campaigns.length} campañas</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Campaña", "Estado", "Impresiones", "Clics", "CTR", "Leads", "Invertido", "CPL"].map(
                    (h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium bg-gray-50">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {meta.campaigns.map((c) => {
                  const ctrPct = (c.ctr * 100).toFixed(2);
                  const isGood = c.ctr > 0.01;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[160px]">{c.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            c.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700"
                              : c.status === "PAUSED"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {c.status === "ACTIVE" ? "Activa" : c.status === "PAUSED" ? "Pausada" : "Completada"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{fmt(c.impressions ?? 0)}</td>
                      <td className="px-4 py-3 text-gray-600">{fmt(c.clicks ?? 0)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`flex items-center gap-1 ${
                            isGood ? "text-emerald-600" : "text-red-500"
                          }`}
                        >
                          {isGood ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {ctrPct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{c.leads ?? 0}</td>
                      <td className="px-4 py-3 text-gray-600">{fmtUSD(c.spent)}</td>
                      <td className="px-4 py-3">
                        {c.cpl > 0 ? (
                          <span
                            className={`font-semibold ${
                              c.cpl < 20
                                ? "text-emerald-600"
                                : c.cpl < 50
                                ? "text-amber-600"
                                : "text-red-500"
                            }`}
                          >
                            {fmtUSD(c.cpl)}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Landing Pages */}
      {landingPages.length > 0 && (
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Landing Pages
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {landingPages.map((lp) => {
              const conv = lp.views > 0 ? ((lp.leads / lp.views) * 100).toFixed(1) : "0.0";
              return (
                <div key={lp.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
                  <div>
                    <p className="font-medium text-gray-900">{lp.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{lp.template}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-gray-500 text-xs">Vistas</p>
                      <p className="font-semibold text-gray-900">{fmt(lp.views)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 text-xs">Leads</p>
                      <p className="font-semibold text-gray-900">{lp.leads}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 text-xs">Conv.</p>
                      <p className={`font-semibold ${Number(conv) > 5 ? "text-emerald-600" : "text-gray-600"}`}>
                        {conv}%
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        lp.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {lp.status === "ACTIVE" ? "Activa" : "Borrador"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {overview.totalLeads === 0 && meta.campaigns.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium text-gray-500">Sin datos todavía</p>
          <p className="text-sm mt-1">Los analytics aparecerán aquí cuando tengas leads y campañas.</p>
        </div>
      )}
    </div>
  );
}
