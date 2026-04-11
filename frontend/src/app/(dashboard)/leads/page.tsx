"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { leadsApi } from "@/lib/api";
import { cn, timeAgo, getScoreColor, formatScore } from "@/lib/utils";
import { StageBadge, ChannelBadge } from "@/components/ui/badge";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import LeadDrawer, { type Lead } from "@/components/leads/lead-drawer";
import KanbanView from "@/components/leads/kanban-view";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, Mail, Phone, Building2, Star,
  Download, Upload, FileSpreadsheet, ChevronDown, CheckCircle2,
  AlertCircle, Loader2, LayoutGrid, List, Filter, X, DollarSign,
  ArrowUpRight, Award,
} from "lucide-react";

function KpiCard({
  title, value, subtitle, icon: Icon, gradient, delay = 0,
}: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; gradient: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className={cn("absolute inset-0 opacity-[0.04]", gradient)} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-black text-foreground mt-1 tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className={cn("p-2.5 rounded-xl", gradient)}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </motion.div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all",
            score >= 7 ? "bg-emerald-500" : score >= 4 ? "bg-amber-400" : "bg-red-400")}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
      <span className={cn("text-sm font-bold tabular-nums w-6", getScoreColor(score))}>
        {formatScore(score)}
      </span>
    </div>
  );
}

export default function LeadsPage() {
  const [filterStage, setFilterStage] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterScore, setFilterScore] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "kanban">("table");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", filterStage],
    queryFn: () =>
      leadsApi.list({ stage: filterStage || undefined, limit: 500 }).then(r => r.data as Lead[]),
    refetchInterval: 20_000,
  });

  const filtered = leads.filter(l => {
    const s = search.toLowerCase();
    if (search && !(
      (l.name ?? "").toLowerCase().includes(s) ||
      (l.email ?? "").toLowerCase().includes(s) ||
      (l.company ?? "").toLowerCase().includes(s) ||
      (l.phone ?? "").toLowerCase().includes(s)
    )) return false;
    if (filterSource && l.source !== filterSource) return false;
    if (filterScore === "high" && l.qualification_score < 7) return false;
    if (filterScore === "mid" && (l.qualification_score < 4 || l.qualification_score >= 7)) return false;
    if (filterScore === "low" && l.qualification_score >= 4) return false;
    return true;
  });

  const total     = leads.length;
  const qualified = leads.filter(l => l.qualification_score >= 7).length;
  const won       = leads.filter(l => l.stage === "closed_won").length;
  const pipeline  = leads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);
  const hasActiveFilters = !!(search || filterSource || filterScore);

  async function handleExport(format: "csv" | "xlsx") {
    setExportOpen(false);
    const { url, token } = leadsApi.exportUrl(format, filterStage || undefined);
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) return;
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.${format}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await leadsApi.import(file);
      setImportResult({ ok: true, message: res.data.message });
      qc.invalidateQueries({ queryKey: ["leads"] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Error al importar";
      setImportResult({ ok: false, message: msg });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className={cn("flex-1", view === "kanban" ? "p-6" : "p-8")}>
        <div className={cn("mx-auto", view === "kanban" ? "max-w-full" : "max-w-[1280px]")}>

          {/* Header */}
          <div className="flex items-start justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-black text-foreground">Leads</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Pipeline de ventas gestionado por IA</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <button onClick={() => setView("table")}
                  className={cn("px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors",
                    view === "table" ? "bg-violet-600 text-white" : "hover:bg-accent text-muted-foreground")}>
                  <List size={13} /> Tabla
                </button>
                <button onClick={() => setView("kanban")}
                  className={cn("px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors",
                    view === "kanban" ? "bg-violet-600 text-white" : "hover:bg-accent text-muted-foreground")}>
                  <LayoutGrid size={13} /> Kanban
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
              <button onClick={() => fileInputRef.current?.click()} disabled={importing}
                className="btn-ghost text-xs flex items-center gap-1.5 h-[30px]">
                {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                Importar
              </button>
              <div className="relative">
                <button onClick={() => setExportOpen(v => !v)}
                  className="btn-ghost text-xs flex items-center gap-1.5 h-[30px]">
                  <Download size={13} />Exportar
                  <ChevronDown size={11} className={cn("transition-transform", exportOpen && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {exportOpen && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[180px]">
                      <button onClick={() => handleExport("csv")} className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent flex items-center gap-2.5">
                        <FileSpreadsheet size={14} className="text-green-600" /> Exportar CSV
                      </button>
                      <button onClick={() => handleExport("xlsx")} className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent flex items-center gap-2.5">
                        <FileSpreadsheet size={14} className="text-emerald-600" /> Exportar Excel (.xlsx)
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <KpiCard title="Total leads"  value={total}     icon={Users}       gradient="bg-gradient-to-br from-violet-600 to-purple-700" delay={0}    />
            <KpiCard title="Calificados" value={qualified}  subtitle="Score ≥ 7" icon={Star} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" delay={0.05} />
            <KpiCard title="Ganados"     value={won}        icon={Award}       gradient="bg-gradient-to-br from-blue-500 to-indigo-600"   delay={0.1}  />
            <KpiCard title="Pipeline"    value={pipeline > 0 ? `$${pipeline.toLocaleString()}` : "—"} icon={DollarSign} gradient="bg-gradient-to-br from-amber-500 to-orange-600" delay={0.15} />
          </div>

          {/* Import result */}
          <AnimatePresence>
            {importResult && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                onAnimationComplete={() => setTimeout(() => setImportResult(null), 4000)}
                className={cn("flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm font-medium",
                  importResult.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200")}>
                {importResult.ok ? <CheckCircle2 size={15} className="text-green-600 flex-shrink-0" /> : <AlertCircle size={15} className="text-red-600 flex-shrink-0" />}
                {importResult.message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar leads…" className="input-stripe pl-9 w-56" />
              {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={13} /></button>}
            </div>
            <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="input-stripe w-auto">
              <option value="">Todas las etapas</option>
              {[["new","Nuevo"],["qualifying","Calificando"],["qualified","Calificado"],
                ["nurturing","Nurturing"],["demo_scheduled","Demo agendada"],
                ["proposal_sent","Propuesta enviada"],["negotiating","Negociando"],
                ["closed_won","Ganado"],["closed_lost","Perdido"],
              ].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button onClick={() => setShowFilters(v => !v)}
              className={cn("btn-ghost text-xs flex items-center gap-1.5", showFilters && "bg-accent")}>
              <Filter size={13} />Filtros
              {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
            </button>
            {hasActiveFilters && (
              <button onClick={() => { setSearch(""); setFilterSource(""); setFilterScore(""); setFilterStage(""); }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X size={12} /> Limpiar
              </button>
            )}
            <span className="ml-auto text-sm text-muted-foreground font-medium">
              {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Extra filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-accent/40 border border-border flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Fuente:</label>
                    <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="input-stripe py-1 text-xs w-auto">
                      <option value="">Todas</option>
                      {["whatsapp","instagram","webchat","manual","referral"].map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Score:</label>
                    <select value={filterScore} onChange={e => setFilterScore(e.target.value)} className="input-stripe py-1 text-xs w-auto">
                      <option value="">Todos</option>
                      <option value="high">Alto (≥ 7)</option>
                      <option value="mid">Medio (4–7)</option>
                      <option value="low">Bajo (&lt; 4)</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* KANBAN */}
          {view === "kanban" && (
            <KanbanView leads={filtered} onSelectLead={setSelectedLead} />
          )}

          {/* TABLE */}
          {view === "table" && (
            <div className="rounded-2xl border border-border overflow-hidden shadow-sm bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/40">
                    {["Lead","Empresa","Etapa","Score BANT","Valor","Fuente","Último contacto",""].map((h,i) => (
                      <th key={i} className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground first:px-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading && Array.from({ length: 7 }).map((_,i) => <TableRowSkeleton key={i} cols={8} />)}

                  {!isLoading && filtered.length === 0 && (
                    <tr><td colSpan={8} className="py-20 text-center text-muted-foreground">
                      <Users size={36} className="mx-auto mb-3 opacity-20" />
                      <p className="font-semibold">Sin leads</p>
                      <p className="text-xs mt-1 opacity-70">
                        {hasActiveFilters || filterStage ? "Prueba con otros filtros" : "Los leads aparecerán cuando alguien interactúe con tus agentes"}
                      </p>
                    </td></tr>
                  )}

                  {!isLoading && filtered.map((lead, i) => (
                    <motion.tr key={lead.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      onClick={() => setSelectedLead(lead)}
                      className="hover:bg-accent/30 cursor-pointer group transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {(lead.name ?? "?")[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground leading-tight">
                              {lead.name || <span className="text-muted-foreground italic font-normal text-xs">Sin nombre</span>}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {!!(lead.email) && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail size={10} />{lead.email}</span>}
                              {!!(lead.phone) && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone size={10} />{lead.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {!!(lead.company) && <Building2 size={12} className="text-muted-foreground flex-shrink-0" />}
                          <span className="text-sm truncate max-w-[120px]">{lead.company || <span className="text-muted-foreground">—</span>}</span>
                        </div>
                        {!!(lead.position) && <p className="text-xs text-muted-foreground mt-0.5">{lead.position}</p>}
                      </td>
                      <td className="px-4 py-3.5"><StageBadge stage={lead.stage} /></td>
                      <td className="px-4 py-3.5"><ScoreBadge score={lead.qualification_score} /></td>
                      <td className="px-4 py-3.5">
                        {lead.estimated_value
                          ? <span className="text-sm font-semibold text-emerald-600">${lead.estimated_value.toLocaleString()}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3.5"><ChannelBadge channel={lead.source} /></td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {lead.last_contacted_at ? timeAgo(lead.last_contacted_at) : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <ArrowUpRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  );
}
