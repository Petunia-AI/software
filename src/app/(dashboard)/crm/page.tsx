"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MessageCircle,
  Loader2,
  UserPlus,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  X,
  LayoutGrid,
  List,
  ChevronRight,
  Clock,
  GripVertical,
  ArrowRight,
  Calendar,
  StickyNote,
  ExternalLink,
  MoreHorizontal,
  TrendingUp,
  DollarSign,
  Trophy,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  notes: string | null;
  score: number;
  createdAt: string;
  property?: { title: string } | null;
  assignedTo?: { name: string } | null;
}

/* ── Pipeline stages config ── */

const pipelineStages = [
  { key: "NEW", label: "Nuevos", color: "bg-blue-500", lightBg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800/40", icon: UserPlus },
  { key: "CONTACTED", label: "Contactados", color: "bg-amber-500", lightBg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800/40", icon: Phone },
  { key: "QUALIFIED", label: "Calificados", color: "bg-[#4A154B]", lightBg: "bg-[#4A154B]/5 dark:bg-[#4A154B]/10", text: "text-[#4A154B] dark:text-[#611f69]", border: "border-[#4A154B]/20 dark:border-[#4A154B]/30", icon: TrendingUp },
  { key: "PROPOSAL", label: "Propuesta", color: "bg-orange-500", lightBg: "bg-orange-50 dark:bg-orange-950/20", text: "text-orange-700 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800/40", icon: DollarSign },
  { key: "NEGOTIATION", label: "Negociación", color: "bg-pink-500", lightBg: "bg-pink-50 dark:bg-pink-950/20", text: "text-pink-700 dark:text-pink-400", border: "border-pink-200 dark:border-pink-800/40", icon: MessageCircle },
  { key: "WON", label: "Ganados", color: "bg-green-500", lightBg: "bg-green-50 dark:bg-green-950/20", text: "text-green-700 dark:text-green-400", border: "border-green-200 dark:border-green-800/40", icon: Trophy },
  { key: "LOST", label: "Perdidos", color: "bg-red-500", lightBg: "bg-red-50 dark:bg-red-950/20", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-800/40", icon: AlertCircle },
];

const statusLabels: Record<string, string> = Object.fromEntries(pipelineStages.map((s) => [s.key, s.label]));

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  CONTACTED: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  QUALIFIED: "bg-[#611f69]/10 text-[#4A154B] dark:bg-[#4A154B]/15 dark:text-[#611f69]",
  PROPOSAL: "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
  NEGOTIATION: "bg-pink-100 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400",
  WON: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  LOST: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
};

const sourceLabels: Record<string, string> = {
  WEBSITE: "Website",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  WHATSAPP: "WhatsApp",
  REFERRAL: "Referido",
  FOLLOW_UP_BOSS: "Follow Up Boss",
  OTHER: "Otro",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function getScoreBadge(score: number) {
  if (score >= 70) return { label: `🔥 ${score}`, className: "bg-green-500/10 text-green-400 border-green-500/20" };
  if (score >= 45) return { label: `🌶 ${score}`, className: "bg-orange-500/10 text-orange-400 border-orange-500/20" };
  if (score >= 25) return { label: `${score}`, className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" };
  return { label: `${score}`, className: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [view, setView] = useState<"pipeline" | "table">("pipeline");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [fubSyncing, setFubSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; total: number; skipped: number } | null>(null);

  // Drag state
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    source: "OTHER",
    notes: "",
  });

  const loadLeads = useCallback(() => {
    fetch("/api/leads")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setLeads(data);
        else setLeads([]);
      })
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          source: form.source,
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        toast.success("Lead creado exitosamente");
        setShowNewDialog(false);
        setForm({ name: "", email: "", phone: "", source: "OTHER", notes: "" });
        loadLeads();
      } else {
        toast.error("Error al crear el lead");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setSaving(false);
  };

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    setUpdatingStatus(leadId);
    // Optimistic update
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => prev ? { ...prev, status: newStatus } : null);
    }
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        toast.error("Error al actualizar estado");
        loadLeads();
      } else {
        toast.success(`Movido a ${statusLabels[newStatus]}`);
      }
    } catch {
      toast.error("Error de conexión");
      loadLeads();
    }
    setUpdatingStatus(null);
  };

  const handleImportCSV = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/leads/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult(data);
        toast.success(`${data.imported} leads importados exitosamente`);
        loadLeads();
      } else {
        toast.error(data.error || "Error al importar");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setImporting(false);
  };

  // Drag & drop handlers
  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };
  const handleDragOver = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    setDragOverStage(stageKey);
  };
  const handleDragLeave = () => {
    setDragOverStage(null);
  };
  const handleDrop = (stageKey: string) => {
    if (draggedLead && draggedLead.status !== stageKey) {
      handleUpdateStatus(draggedLead.id, stageKey);
    }
    setDraggedLead(null);
    setDragOverStage(null);
  };

  const filtered = leads.filter((l) => {
    const matchSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.phone || "").includes(search);
    const matchSource = filterSource === "all" || l.source === filterSource;
    return matchSearch && matchSource;
  });

  const statsByStatus = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  const activeStages = pipelineStages.filter((s) => s.key !== "LOST");
  const lostCount = statsByStatus["LOST"] || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #4A154B 0%, #350d36 60%, #1a0a1a 100%)' }}>
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='0.03'%3E%3Cpath d='M36 18c0-9.94-8.06-18-18-18S0 8.06 0 18 18 36 36 18'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <Users className="h-5 w-5" />
              </div>
              <Badge className="bg-white/10 text-white/80 border-white/10 text-[10px] font-medium backdrop-blur-sm">
                Pipeline CRM
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">CRM Pipeline</h1>
            <p className="text-white/70 text-sm max-w-md">
              {leads.length} leads &middot; {statsByStatus["WON"] || 0} ganados &middot; {statsByStatus["NEGOTIATION"] || 0} en negociación
            </p>
          </div>
          <div className="hidden lg:flex gap-2">
            <Button
              size="sm"
              className="rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
              onClick={async () => {
                setFubSyncing(true);
                try {
                  const res = await fetch("/api/integrations/fub/sync", { method: "POST" });
                  const data = await res.json();
                  if (res.ok) {
                    toast.success(data.message || `${data.imported} leads importados de FUB`);
                    loadLeads();
                  } else {
                    toast.error(data.error || "Error al sincronizar");
                  }
                } catch {
                  toast.error("Error al sincronizar con Follow Up Boss");
                } finally {
                  setFubSyncing(false);
                }
              }}
              disabled={fubSyncing}
            >
              {fubSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {fubSyncing ? "Sincronizando..." : "Sync FUB"}
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
              onClick={() => setShowImportDialog(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-white text-[#4A154B] hover:bg-white/90 font-semibold"
              onClick={() => setShowNewDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo lead
            </Button>
          </div>
        </div>
      </div>

      {/* ── Mini Stats ── */}
      <div className="grid grid-cols-3 lg:grid-cols-7 gap-2">
        {pipelineStages.map((stage) => {
          const count = statsByStatus[stage.key] || 0;
          return (
            <div key={stage.key} className={`rounded-xl p-3 ${stage.lightBg} border ${stage.border}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${stage.text}`}>{stage.label}</span>
              </div>
              <p className={`text-xl font-bold ${stage.text}`}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lead..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-muted/40 border-0"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterSource("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filterSource === "all" ? "bg-primary text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            Todas
          </button>
          {Object.entries(sourceLabels).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setFilterSource(filterSource === k ? "all" : k)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filterSource === k ? "bg-primary text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1 p-1 rounded-xl bg-muted/40">
          <button
            onClick={() => setView("pipeline")}
            className={`p-2 rounded-lg transition-colors ${
              view === "pipeline" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Vista Pipeline"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("table")}
            className={`p-2 rounded-lg transition-colors ${
              view === "table" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Vista Tabla"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── PIPELINE VIEW ── */}
      {view === "pipeline" && (
        <div className="overflow-x-auto pb-4 -mx-2 px-2">
          <div className="flex gap-3" style={{ minWidth: `${activeStages.length * 260}px` }}>
            {activeStages.map((stage) => {
              const stageLeads = filtered.filter((l) => l.status === stage.key);
              const isDragOver = dragOverStage === stage.key;
              const StageIcon = stage.icon;
              return (
                <div
                  key={stage.key}
                  className={`flex-1 min-w-[240px] max-w-[320px] flex flex-col rounded-2xl border transition-all duration-200 ${
                    isDragOver
                      ? `${stage.border} ${stage.lightBg} shadow-lg scale-[1.01]`
                      : "border-border/40 bg-muted/10"
                  }`}
                  onDragOver={(e) => handleDragOver(e, stage.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(stage.key)}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between p-3 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                      <span className="text-xs font-bold tracking-tight">{stage.label}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stage.lightBg} ${stage.text}`}>
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-380px)] min-h-[120px]">
                    {stageLeads.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <StageIcon className="h-6 w-6 text-muted-foreground/20 mb-2" />
                        <p className="text-[11px] text-muted-foreground/40">Sin leads</p>
                      </div>
                    )}
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => handleDragStart(lead)}
                        onClick={() => setSelectedLead(lead)}
                        className={`group p-3 rounded-xl border border-border/40 bg-background hover:border-foreground/20 hover:shadow-md cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
                          draggedLead?.id === lead.id ? "opacity-40 scale-95" : ""
                        } ${selectedLead?.id === lead.id ? "ring-2 ring-foreground/20 shadow-md" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-7 w-7 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold">{getInitials(lead.name)}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">{lead.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {lead.email || lead.phone || "Sin contacto"}
                              </p>
                            </div>
                          </div>
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                        </div>

                        {lead.notes && (
                          <p className="text-[10px] text-muted-foreground/70 line-clamp-2 mb-2 leading-relaxed">
                            {lead.notes}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-md h-4 border-border/40">
                              {sourceLabels[lead.source] || lead.source}
                            </Badge>
                            {lead.property && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-md h-4 border-border/40">
                                {lead.property.title.length > 12 ? lead.property.title.slice(0, 12) + "…" : lead.property.title}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground/50 flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {timeAgo(lead.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lost leads collapsed section */}
          {lostCount > 0 && (
            <div className="mt-3 rounded-xl border border-red-200/50 dark:border-red-800/30 bg-red-50/30 dark:bg-red-950/10 p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                  {lostCount} leads perdidos
                </span>
                <button
                  onClick={() => setView("table")}
                  className="text-[10px] text-red-500/60 hover:text-red-500 ml-auto transition-colors"
                >
                  Ver en tabla →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {view === "table" && (
        <>
          <div className="rounded-2xl border border-border/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20">
                    <th className="text-left text-[11px] font-semibold text-muted-foreground p-4 uppercase tracking-wider">Lead</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground p-4 uppercase tracking-wider">Contacto</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground p-4 uppercase tracking-wider">Propiedad</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground p-4 uppercase tracking-wider">Fuente</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground p-4 uppercase tracking-wider">Estado</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground p-4 uppercase tracking-wider">Score</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground p-4 uppercase tracking-wider">Fecha</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground p-4 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer ${
                        selectedLead?.id === lead.id ? "bg-muted/40" : ""
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold">{getInitials(lead.name)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{lead.name}</p>
                            {lead.notes && (
                              <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{lead.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          {lead.email && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[160px]">{lead.email}</span>
                            </p>
                          )}
                          {lead.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" />
                              {lead.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-xs text-muted-foreground">{lead.property?.title || "—"}</p>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-[10px] rounded-full">{sourceLabels[lead.source] || lead.source}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={`text-[10px] rounded-full ${statusColors[lead.status]}`}>
                          {statusLabels[lead.status]}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {(() => { const s = getScoreBadge(lead.score ?? 0); return <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${s.className}`}>{s.label}</span>; })()}
                      </td>
                      <td className="p-4">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(lead.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {lead.phone && (
                            <>
                              <a href={`tel:${lead.phone}`} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Llamar">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              </a>
                              <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors" title="WhatsApp">
                                <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                              </a>
                            </>
                          )}
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Email">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground/20 mb-3" />
              {leads.length === 0 ? (
                <>
                  <p className="text-sm font-semibold text-foreground">Aún no tienes leads</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Importa desde CSV o crea tu primer lead manualmente.
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="rounded-xl bg-primary text-white" onClick={() => setShowNewDialog(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Crear lead
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowImportDialog(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar CSV
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">No se encontraron leads con ese filtro</p>
              )}
            </div>
          )}
        </>
      )}

      {/* ── LEAD DETAIL PANEL ── */}
      {selectedLead && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l border-border/40 shadow-2xl flex flex-col">
          {/* Panel header */}
          <div className="flex items-center justify-between p-5 border-b border-border/30">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                <span className="text-sm font-bold">{getInitials(selectedLead.name)}</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold truncate">{selectedLead.name}</h3>
                <Badge className={`text-[10px] rounded-full mt-0.5 ${statusColors[selectedLead.status]}`}>
                  {statusLabels[selectedLead.status]}
                </Badge>
              </div>
            </div>
            <button
              onClick={() => setSelectedLead(null)}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Contact info */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Contacto</p>
              <div className="space-y-2">
                {selectedLead.email && (
                  <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors group">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium truncate">{selectedLead.email}</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                  </a>
                )}
                {selectedLead.phone && (
                  <div className="flex gap-2">
                    <a href={`tel:${selectedLead.phone}`} className="flex-1 flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors group">
                      <div className="p-2 rounded-lg bg-[#4A154B]/5 dark:bg-[#4A154B]/10">
                        <Phone className="h-4 w-4 text-[#4A154B]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Teléfono</p>
                        <p className="text-sm font-medium">{selectedLead.phone}</p>
                      </div>
                    </a>
                    <a
                      href={`https://wa.me/${selectedLead.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center p-3 rounded-xl bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/40 transition-colors"
                      title="Abrir WhatsApp"
                    >
                      <MessageCircle className="h-5 w-5 text-green-600" />
                    </a>
                  </div>
                )}
                {!selectedLead.email && !selectedLead.phone && (
                  <p className="text-xs text-muted-foreground/50 italic">Sin información de contacto</p>
                )}
              </div>
            </div>

            {/* Pipeline progress */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Mover en Pipeline</p>
              <div className="grid grid-cols-2 gap-1.5">
                {pipelineStages.map((stage) => {
                  const isCurrent = selectedLead.status === stage.key;
                  const isUpdating = updatingStatus === selectedLead.id;
                  return (
                    <button
                      key={stage.key}
                      onClick={() => {
                        if (!isCurrent && !isUpdating) handleUpdateStatus(selectedLead.id, stage.key);
                      }}
                      disabled={isUpdating}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-all duration-200 ${
                        isCurrent
                          ? `${stage.lightBg} ${stage.text} ring-1 ${stage.border}`
                          : "bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isCurrent ? stage.color : "bg-muted-foreground/20"}`} />
                      <span className="text-xs font-medium">{stage.label}</span>
                      {isCurrent && <CheckCircle2 className="h-3 w-3 ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Detalles</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                  <span className="text-xs text-muted-foreground">Score IA</span>
                  {(() => { const s = getScoreBadge(selectedLead.score ?? 0); return <span className={`text-xs font-bold px-2 py-0.5 rounded border ${s.className}`}>{s.label} / 100</span>; })()}
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                  <span className="text-xs text-muted-foreground">Fuente</span>
                  <Badge variant="outline" className="text-[10px] rounded-full">{sourceLabels[selectedLead.source] || selectedLead.source}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                  <span className="text-xs text-muted-foreground">Propiedad</span>
                  <span className="text-xs font-medium">{selectedLead.property?.title || "Sin asignar"}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                  <span className="text-xs text-muted-foreground">Asignado a</span>
                  <span className="text-xs font-medium">{selectedLead.assignedTo?.name || "Sin asignar"}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                  <span className="text-xs text-muted-foreground">Creado</span>
                  <span className="text-xs font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(selectedLead.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedLead.notes && (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <StickyNote className="h-3 w-3" />
                  Notas
                </p>
                <div className="p-3 rounded-xl bg-muted/20 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {selectedLead.notes}
                </div>
              </div>
            )}
          </div>

          {/* Panel footer — quick actions */}
          <div className="border-t border-border/30 p-4">
            <div className="flex gap-2">
              {selectedLead.phone && (
                <a
                  href={`https://wa.me/${selectedLead.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full rounded-xl text-xs" size="sm">
                    <MessageCircle className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                    WhatsApp
                  </Button>
                </a>
              )}
              {selectedLead.email && (
                <a href={`mailto:${selectedLead.email}`} className="flex-1">
                  <Button variant="outline" className="w-full rounded-xl text-xs" size="sm">
                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                    Email
                  </Button>
                </a>
              )}
              {selectedLead.phone && (
                <a href={`tel:${selectedLead.phone}`} className="flex-1">
                  <Button variant="outline" className="w-full rounded-xl text-xs" size="sm">
                    <Phone className="h-3.5 w-3.5 mr-1.5" />
                    Llamar
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overlay when panel is open */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          onClick={() => setSelectedLead(null)}
        />
      )}

      {/* ── New Lead Dialog ── */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Nuevo Lead
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label>Nombre completo *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nombre del lead"
                className="rounded-xl bg-muted/30 border-0"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  className="rounded-xl bg-muted/30 border-0"
                />
              </div>
              <div className="grid gap-2">
                <Label>Teléfono</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+52 55 1234 5678"
                  className="rounded-xl bg-muted/30 border-0"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Fuente</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v ?? "OTHER" })}>
                <SelectTrigger className="rounded-xl bg-muted/30 border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sourceLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Notas</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notas sobre el lead..."
                rows={3}
                className="rounded-xl bg-muted/30 border-0"
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="w-full bg-primary text-white rounded-xl hover:bg-foreground/90"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" />Crear lead</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Import Dialog ── */}
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open);
        if (!open) setImportResult(null);
      }}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Leads
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                Importar desde archivo
              </p>
              <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-border/60 hover:border-foreground/30 hover:bg-muted/20 cursor-pointer transition-all">
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">Arrastra tu archivo CSV aquí</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    o haz clic para seleccionar · CSV, TSV · Máx. 5,000 registros
                  </p>
                </div>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportCSV(file);
                    e.target.value = "";
                  }}
                  disabled={importing}
                />
              </label>
              <div className="rounded-xl bg-muted/30 p-3">
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Columnas soportadas:</p>
                <div className="flex flex-wrap gap-1.5">
                  {["nombre/name", "email/correo", "telefono/phone", "fuente/source", "notas/notes"].map((col) => (
                    <span key={col} className="px-2 py-0.5 text-[10px] rounded-full bg-foreground/10 text-foreground font-mono">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {importing && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
                <Loader2 className="h-5 w-5 animate-spin text-foreground" />
                <p className="text-sm">Importando leads...</p>
              </div>
            )}
            {importResult && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Importación completada
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    {importResult.imported} importados · {importResult.skipped} omitidos · {importResult.total} total
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                Importación automática
              </p>
              <div className="space-y-2">
                {[
                  { icon: "📱", name: "Meta Ads", desc: "Facebook e Instagram Lead Forms", alwaysActive: false },
                  { icon: "💬", name: "WhatsApp", desc: "Nuevas conversaciones entrantes", alwaysActive: false },
                  { icon: "🌐", name: "Formulario Web", desc: "Captura de leads desde tu sitio web", alwaysActive: true },
                ].map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/40 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{integration.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{integration.name}</p>
                        <p className="text-[11px] text-muted-foreground">{integration.desc}</p>
                      </div>
                    </div>
                    <Badge
                      className={
                        integration.alwaysActive
                          ? "bg-green-100 text-green-700 text-[10px]"
                          : "bg-muted text-muted-foreground text-[10px]"
                      }
                    >
                      {integration.alwaysActive ? "Activo" : "Configurar"}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Configura los webhooks en Configuración → Integraciones para activar la importación automática.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
