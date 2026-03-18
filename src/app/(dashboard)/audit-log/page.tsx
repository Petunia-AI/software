"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  User,
  Globe,
  Clock,
  RefreshCw,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string } | null;
}

interface AuditResponse {
  logs: AuditEntry[];
  total: number;
  page: number;
  pages: number;
  actions: string[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  "lead.created": "Lead creado",
  "lead.updated": "Lead actualizado",
  "lead.status_changed": "Estatus cambiado",
  "campaign.published": "Campaña publicada",
  "property.created": "Propiedad creada",
  "content.generated": "Contenido generado",
  "metrics.synced": "Métricas sincronizadas",
};

const ACTION_COLORS: Record<string, string> = {
  "lead.created": "bg-emerald-50 text-emerald-700",
  "lead.updated": "bg-blue-50 text-blue-700",
  "lead.status_changed": "bg-amber-50 text-amber-700",
  "campaign.published": "bg-violet-50 text-violet-700",
  "property.created": "bg-cyan-50 text-cyan-700",
  "content.generated": "bg-pink-50 text-pink-700",
  "metrics.synced": "bg-gray-100 text-gray-600",
};

const RESOURCE_ICONS: Record<string, string> = {
  lead: "👤",
  campaign: "📣",
  property: "🏠",
  content: "✍️",
  metrics: "📊",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function fullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async (p = 1, action = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (action) params.set("action", action);
      const res = await fetch(`/api/audit-logs?${params}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, actionFilter);
  }, [page, actionFilter, load]);

  const filtered = search
    ? (data?.logs ?? []).filter(
        (l) =>
          l.action.includes(search.toLowerCase()) ||
          l.resourceType.includes(search.toLowerCase()) ||
          l.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
          l.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
          l.ipAddress?.includes(search)
      )
    : (data?.logs ?? []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Audit Log
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Registro de todas las acciones realizadas en tu organización
          </p>
        </div>
        <button
          onClick={() => load(page, actionFilter)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-xl transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuario, IP, acción…"
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
          />
        </div>

        {/* Action filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 cursor-pointer"
          >
            <option value="">Todas las acciones</option>
            {(data?.actions ?? []).map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] ?? a}
              </option>
            ))}
          </select>
        </div>

        {/* Total badge */}
        {data && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            {data.total.toLocaleString()} eventos
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sin eventos de auditoría</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((log) => {
              const isExpanded = expandedId === log.id;
              const color = ACTION_COLORS[log.action] ?? "bg-gray-500/15 text-gray-400";
              const icon = RESOURCE_ICONS[log.resourceType] ?? "🔧";
              const hasDetails = log.details && Object.keys(log.details).length > 0;

              return (
                <div key={log.id}>
                  <button
                    onClick={() => hasDetails && setExpandedId(isExpanded ? null : log.id)}
                    className={`w-full text-left px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition ${
                      hasDetails ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    {/* Icon */}
                    <span className="text-xl w-7 shrink-0 text-center">{icon}</span>

                    {/* Action badge */}
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0 ${color}`}
                    >
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>

                    {/* User */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0 shrink-0">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[120px]">
                        {log.user?.name ?? log.user?.email ?? "Sistema"}
                      </span>
                    </div>

                    {/* Resource */}
                    {log.resourceId && (
                      <span className="text-xs text-gray-400 font-mono hidden sm:block truncate max-w-[100px]">
                        #{log.resourceId.slice(-8)}
                      </span>
                    )}

                    {/* IP */}
                    {log.ipAddress && (
                      <div className="hidden md:flex items-center gap-1 text-xs text-gray-400">
                        <Globe className="w-3 h-3" />
                        {log.ipAddress}
                      </div>
                    )}

                    {/* Time */}
                    <div
                      className="ml-auto text-xs text-gray-400 shrink-0"
                      title={fullDate(log.createdAt)}
                    >
                      {timeAgo(log.createdAt)}
                    </div>

                    {/* Expand indicator */}
                    {hasDetails && (
                      <span className="text-gray-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
                    )}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && hasDetails && (
                    <div className="px-5 pb-4 pt-0 bg-gray-50">
                      <pre className="text-xs text-gray-600 bg-gray-100 rounded-xl p-4 overflow-x-auto font-mono leading-relaxed">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Página {data.page} de {data.pages} · {data.total} eventos
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
              const p = Math.max(1, Math.min(data.pages - 4, page - 2)) + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-xl text-sm font-medium transition border ${
                    p === page
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white border-gray-200 hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page >= data.pages}
              className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
