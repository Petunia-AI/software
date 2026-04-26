"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { leadsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { StageBadge, ChannelBadge } from "@/components/ui/badge";
import type { Lead } from "@/components/leads/lead-drawer";
import {
  DollarSign, Mail, Phone, Star, MoreHorizontal, ChevronDown, ChevronUp,
  Settings2, X, Eye, EyeOff, GripVertical,
} from "lucide-react";
import {
  UserCirclePlus, MagnifyingGlass, Star as PhStar, TreePalm,
  CalendarCheck, FileText, Handshake, Confetti, XCircle,
} from "@phosphor-icons/react";

const ALL_COLUMNS: { value: string; label: string; color: string; icon: React.ReactNode; textColor: string; count_bg: string }[] = [
  { value: "new",            label: "Nuevo",             color: "border-t-slate-400",   icon: <UserCirclePlus size={13} weight="duotone" />,  textColor: "text-slate-600",   count_bg: "bg-slate-100"  },
  { value: "qualifying",     label: "Calificando",       color: "border-t-blue-500",    icon: <MagnifyingGlass size={13} weight="duotone" />, textColor: "text-blue-600",    count_bg: "bg-blue-50"    },
  { value: "qualified",      label: "Calificado",        color: "border-t-violet-500",  icon: <PhStar size={13} weight="duotone" />,          textColor: "text-violet-600",  count_bg: "bg-violet-50"  },
  { value: "nurturing",      label: "Nurturing",         color: "border-t-amber-500",   icon: <TreePalm size={13} weight="duotone" />,        textColor: "text-amber-600",   count_bg: "bg-amber-50"   },
  { value: "demo_scheduled", label: "Demo agendada",     color: "border-t-purple-500",  icon: <CalendarCheck size={13} weight="duotone" />,   textColor: "text-purple-600",  count_bg: "bg-purple-50"  },
  { value: "proposal_sent",  label: "Propuesta enviada", color: "border-t-indigo-500",  icon: <FileText size={13} weight="duotone" />,        textColor: "text-indigo-600",  count_bg: "bg-indigo-50"  },
  { value: "negotiating",    label: "Negociando",        color: "border-t-orange-500",  icon: <Handshake size={13} weight="duotone" />,       textColor: "text-orange-600",  count_bg: "bg-orange-50"  },
  { value: "closed_won",     label: "Ganado",            color: "border-t-emerald-500", icon: <Confetti size={13} weight="duotone" />,        textColor: "text-emerald-600", count_bg: "bg-emerald-50" },
  { value: "closed_lost",    label: "Perdido",           color: "border-t-red-400",     icon: <XCircle size={13} weight="duotone" />,         textColor: "text-red-600",     count_bg: "bg-red-50"     },
];

const STORAGE_KEY = "kanban_visible_cols";

function loadVisibleCols(): Set<string> {
  if (typeof window === "undefined") return new Set(ALL_COLUMNS.map(c => c.value));
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: string[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return new Set(parsed);
    }
  } catch {}
  return new Set(ALL_COLUMNS.map(c => c.value));
}

interface KanbanViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export default function KanbanView({ leads, onSelectLead }: KanbanViewProps) {
  const qc = useQueryClient();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [collapsedCols, setCollapsedCols] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Set<string>>(loadVisibleCols);
  const [configOpen, setConfigOpen] = useState(false);
  const dragLeadRef = useRef<Lead | null>(null);

  function toggleColVisibility(value: string) {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(value)) {
        if (next.size <= 1) return prev; // keep at least 1
        next.delete(value);
      } else {
        next.add(value);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function showAll() {
    const all = new Set(ALL_COLUMNS.map(c => c.value));
    setVisibleCols(all);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...all]));
  }

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      leadsApi.updateStage(id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  // ── Drag handlers ──
  function onDragStart(e: React.DragEvent, lead: Lead) {
    setDraggingId(lead.id);
    dragLeadRef.current = lead;
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent, colValue: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverCol(colValue);
  }

  function onDrop(e: React.DragEvent, colValue: string) {
    e.preventDefault();
    const lead = dragLeadRef.current;
    if (lead && lead.stage !== colValue) {
      stageMutation.mutate({ id: lead.id, stage: colValue });
    }
    setDraggingId(null);
    setOverCol(null);
    dragLeadRef.current = null;
  }

  function onDragEnd() {
    setDraggingId(null);
    setOverCol(null);
    dragLeadRef.current = null;
  }

  function toggleCol(col: string) {
    setCollapsedCols(prev => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      return next;
    });
  }

  const COLUMNS = ALL_COLUMNS.filter(c => visibleCols.has(c.value));

  const groupedLeads = Object.fromEntries(
    ALL_COLUMNS.map(col => [
      col.value,
      leads.filter(l => l.stage === col.value),
    ])
  );

  const totalValue = leads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);
  const wonValue   = leads.filter(l => l.stage === "closed_won").reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);

  const hiddenCount = ALL_COLUMNS.length - visibleCols.size;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: Pipeline summary + config button */}
      <div className="flex items-center justify-between px-1 mb-3 flex-shrink-0 gap-4">
        <div className="flex items-center gap-4">
          {totalValue > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <DollarSign size={13} className="text-violet-500" />
              <span className="text-muted-foreground">Pipeline total:</span>
              <span className="font-bold text-foreground">${totalValue.toLocaleString()}</span>
            </div>
          )}
          {wonValue > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <Star size={13} className="text-emerald-500" />
              <span className="text-muted-foreground">Ganado:</span>
              <span className="font-bold text-emerald-600">${wonValue.toLocaleString()}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setConfigOpen(v => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
            configOpen
              ? "bg-violet-600 text-white border-violet-600"
              : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Settings2 size={13} />
          Personalizar
          {hiddenCount > 0 && (
            <span className={cn("px-1.5 py-0.5 rounded-full text-xs font-bold",
              configOpen ? "bg-white/20 text-white" : "bg-violet-100 text-violet-700")}>
              {hiddenCount} oculta{hiddenCount !== 1 ? "s" : ""}
            </span>
          )}
        </button>
      </div>

      {/* Column config panel */}
      <AnimatePresence>
        {configOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-3 flex-shrink-0"
          >
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-foreground">Columnas del tablero</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Activa o desactiva las etapas que quieres ver</p>
                </div>
                <div className="flex items-center gap-2">
                  {hiddenCount > 0 && (
                    <button onClick={showAll} className="text-xs text-violet-600 hover:text-violet-700 font-medium">
                      Mostrar todas
                    </button>
                  )}
                  <button onClick={() => setConfigOpen(false)} className="p-1 hover:bg-accent rounded-lg">
                    <X size={14} className="text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_COLUMNS.map(col => {
                  const isVisible = visibleCols.has(col.value);
                  const colLeads = groupedLeads[col.value] ?? [];
                  return (
                    <button
                      key={col.value}
                      onClick={() => toggleColVisibility(col.value)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                        isVisible
                          ? "bg-background border-border text-foreground hover:border-violet-400"
                          : "bg-muted/40 border-dashed border-border text-muted-foreground hover:border-violet-300"
                      )}
                    >
                      <span>{col.icon}</span>
                      <span>{col.label}</span>
                      {colLeads.length > 0 && (
                        <span className={cn("font-bold", isVisible ? col.textColor : "text-muted-foreground")}>
                          {colLeads.length}
                        </span>
                      )}
                      {isVisible
                        ? <Eye size={11} className="text-violet-500" />
                        : <EyeOff size={11} className="text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-4 flex-1 min-h-0">
        {COLUMNS.map(col => {
          const colLeads = groupedLeads[col.value] ?? [];
          const isOver = overCol === col.value;
          const isCollapsed = collapsedCols.has(col.value);
          const colValue = col.value;

          return (
            <div
              key={col.value}
              onDragOver={e => onDragOver(e, col.value)}
              onDrop={e => onDrop(e, col.value)}
              onDragLeave={() => setOverCol(null)}
              className={cn(
                "flex flex-col rounded-xl border-t-4 bg-card/60 border border-border min-w-[220px] w-[220px] flex-shrink-0 transition-all",
                col.color,
                isOver && "ring-2 ring-violet-400 bg-violet-50/30 scale-[1.01]"
              )}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm">{col.icon}</span>
                  <span className={cn("text-xs font-bold truncate", col.textColor)}>{col.label}</span>
                  <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full ml-0.5", col.count_bg, col.textColor)}>
                    {colLeads.length}
                  </span>
                </div>
                <button
                  onClick={() => toggleCol(colValue)}
                  className="p-0.5 hover:bg-accent rounded transition-colors flex-shrink-0"
                >
                  {isCollapsed
                    ? <ChevronDown size={13} className="text-muted-foreground" />
                    : <ChevronUp size={13} className="text-muted-foreground" />}
                </button>
              </div>

              {/* Column value */}
              {!isCollapsed && colLeads.some(l => l.estimated_value) && (
                <div className={cn("px-3 pb-2 text-xs font-semibold", col.textColor)}>
                  ${colLeads.reduce((s, l) => s + (l.estimated_value ?? 0), 0).toLocaleString()}
                </div>
              )}

              {/* Cards */}
              {!isCollapsed && (
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[60px]">
                  {colLeads.length === 0 && (
                    <div className={cn(
                      "h-16 rounded-lg border-2 border-dashed flex items-center justify-center text-xs transition-colors",
                      isOver ? "border-violet-400 bg-violet-50 text-violet-500" : "border-border text-muted-foreground/40"
                    )}>
                      {isOver ? "Soltar aquí" : "Vacío"}
                    </div>
                  )}

                  {colLeads.map(lead => (
                    <KanbanCard
                      key={lead.id}
                      lead={lead}
                      isDragging={draggingId === lead.id}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      onClick={() => onSelectLead(lead)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Kanban Card ─────────────────────────────────────────────────────────────

function KanbanCard({
  lead, isDragging, onDragStart, onDragEnd, onClick,
}: {
  lead: Lead;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, lead: Lead) => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const score = lead.qualification_score;
  const scoreColor = score >= 7 ? "text-emerald-600 bg-emerald-50" : score >= 4 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "bg-background border border-border rounded-xl p-3 cursor-grab active:cursor-grabbing",
        "hover:border-violet-300 hover:shadow-md transition-all group select-none",
        isDragging && "opacity-40 rotate-2 scale-95"
      )}
    >
      {/* Name + score */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-semibold text-sm text-foreground leading-tight truncate">
          {lead.name || <span className="text-muted-foreground italic font-normal text-xs">Sin nombre</span>}
        </p>
        <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0", scoreColor)}>
          {score.toFixed(1)}
        </span>
      </div>

      {/* Company */}
      {lead.company && (
        <p className="text-xs text-muted-foreground truncate mb-2">{lead.company}</p>
      )}

      {/* Score bar */}
      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mb-2">
        <div
          className={cn("h-full rounded-full",
            score >= 7 ? "bg-emerald-500" : score >= 4 ? "bg-amber-400" : "bg-red-400"
          )}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <ChannelBadge channel={lead.source} />
        <div className="flex items-center gap-2">
          {lead.estimated_value && (
            <span className="text-xs text-emerald-600 font-semibold">
              ${lead.estimated_value.toLocaleString()}
            </span>
          )}
          {(lead.email || lead.phone) && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {lead.email && <Mail size={10} className="text-muted-foreground" />}
              {lead.phone && <Phone size={10} className="text-muted-foreground" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
