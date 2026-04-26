"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
  ArrowUpRight, Award, Trash2, CircleDot,
} from "lucide-react";
import {
  UsersThree, Star as PhStar, Confetti, CurrencyDollar,
} from "@phosphor-icons/react";

function KpiCard({
  title, value, subtitle, gradient, bar, glow, PhIcon, delay = 0,
}: {
  title: string; value: string | number; subtitle?: string;
  gradient: string; bar: string; glow: string;
  PhIcon: React.ElementType; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 160, damping: 22 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={`relative group overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-lg hover:shadow-2xl ${glow} transition-all duration-300 p-6`}
    >
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${bar} rounded-t-2xl`} />
      {/* Hover bg shimmer */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.05] transition-opacity duration-300`} />
      {/* Icon top-right */}
      <div className={`absolute top-4 right-4 w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
        <PhIcon size={17} weight="duotone" className="text-white" />
      </div>
      {/* Value */}
      <p className={`text-4xl font-black tracking-tight bg-gradient-to-r ${gradient} bg-clip-text text-transparent leading-none mb-2 mt-1`}>
        {value}
      </p>
      {/* Title */}
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
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
  const [confirmDelete, setConfirmDelete] = useState<Lead | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      if (selectedLead && confirmDelete?.id === selectedLead.id) setSelectedLead(null);
      setConfirmDelete(null);
    },
  });

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
      const created = res.data?.created ?? 0;
      const msg = res.data?.message ?? `${created} leads importados correctamente`;
      setImportResult({ ok: true, message: msg });
      // Limpiar filtros para que los leads importados sean visibles
      setFilterStage("");
      setFilterSource("");
      setFilterScore("");
      setSearch("");
      // Forzar refetch inmediato (no solo marcar stale)
      await qc.refetchQueries({ queryKey: ["leads"] });
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

          {/* ── Hero banner ── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl overflow-hidden mb-6"
            style={{ background: "linear-gradient(135deg, #6B8BFF 0%, #B8A0FF 50%, #FFBA9A 100%)", boxShadow: "0 8px 40px rgba(107,139,255,0.22)" }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4 pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-40 h-40 rounded-full bg-white/5 translate-y-1/2 pointer-events-none" />
            <div className="relative flex items-center justify-between px-8 py-6 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Users size={22} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <CircleDot size={10} className="text-emerald-300 animate-pulse" />
                    <span className="text-white/60 text-xs font-medium">Pipeline activo</span>
                  </div>
                  <h1 className="text-2xl font-black text-white">Leads</h1>
                  <p className="text-white/60 text-sm mt-0.5">Pipeline de ventas gestionado por IA</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden">
                  <button onClick={() => setView("table")}
                    className={cn("px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all",
                      view === "table" ? "bg-white/25 text-white" : "text-white/60 hover:text-white hover:bg-white/10")}>
                    <List size={13} /> Tabla
                  </button>
                  <button onClick={() => setView("kanban")}
                    className={cn("px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all",
                      view === "kanban" ? "bg-white/25 text-white" : "text-white/60 hover:text-white hover:bg-white/10")}>
                    <LayoutGrid size={13} /> Kanban
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
                <button onClick={() => fileInputRef.current?.click()} disabled={importing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white/80 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all">
                  {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  Importar
                </button>
                <div className="relative">
                  <button onClick={() => setExportOpen(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white/80 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all">
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
          </motion.div>

          {/* KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <KpiCard title="Total leads"  value={total}     PhIcon={UsersThree}   gradient="from-violet-500 to-purple-600"  bar="from-violet-400 to-purple-500"  glow="shadow-violet-500/20"  delay={0}    />
            <KpiCard title="Calificados" value={qualified}  PhIcon={PhStar}       gradient="from-emerald-500 to-teal-600"   bar="from-emerald-400 to-teal-400"   glow="shadow-emerald-500/20" delay={0.06} subtitle="Score ≥ 7" />
            <KpiCard title="Ganados"     value={won}        PhIcon={Confetti}     gradient="from-blue-500 to-indigo-600"    bar="from-blue-400 to-indigo-400"    glow="shadow-blue-500/20"    delay={0.12} />
            <KpiCard title="Pipeline"    value={pipeline > 0 ? `$${pipeline.toLocaleString()}` : "—"} PhIcon={CurrencyDollar} gradient="from-amber-400 to-orange-500" bar="from-amber-400 to-orange-400" glow="shadow-amber-500/20" delay={0.18} />
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
                      <th key={i} className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground first:px-5 last:w-16">{h}</th>
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
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedLead(lead); }}
                            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            title="Ver detalle"
                          >
                            <ArrowUpRight size={13} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setConfirmDelete(lead); }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                            title="Eliminar lead"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <LeadDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onDelete={(lead) => setConfirmDelete(lead)}
      />

      {/* Confirm delete modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              onClick={e => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={18} className="text-red-600" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Eliminar lead</p>
                  <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <div className="bg-accent/50 rounded-xl px-4 py-3 mb-5">
                <p className="font-semibold text-sm text-foreground">{confirmDelete.name || "Sin nombre"}</p>
                {confirmDelete.company && <p className="text-xs text-muted-foreground mt-0.5">{confirmDelete.company}</p>}
                {confirmDelete.email && <p className="text-xs text-muted-foreground">{confirmDelete.email}</p>}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteMutation.mutate(confirmDelete.id)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {deleteMutation.isPending
                    ? <><Loader2 size={14} className="animate-spin" /> Eliminando…</>
                    : <><Trash2 size={14} /> Eliminar</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
