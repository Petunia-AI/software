"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { followupsApi } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, List, Plus, Phone, Mail, MessageSquare, Users,
  CheckSquare, Clock, AlertTriangle, CheckCircle2, ChevronLeft,
  ChevronRight, Bot, Zap, Trash2, Edit3, Check, X, Filter,
  TrendingUp, Bell, CircleDot,
} from "lucide-react";
import {
  PhoneCall, EnvelopeSimple, ChatCircle, UsersFour,
  CheckSquare as PhCheckSquare,
} from "@phosphor-icons/react";
import FollowUpDrawer from "@/components/followups/followup-drawer";
import type { FollowUp, FollowUpStats } from "@/types/followup";
import { FOLLOWUP_TYPES, PRIORITY_CONFIG, STATUS_CONFIG } from "@/types/followup";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_STYLE: Record<string, { icon: React.ReactNode; bg: string; iconColor: string; glow: string }> = {
  call:     { icon: <PhoneCall size={15} weight="duotone" />,     bg: "rgba(59,130,246,0.1)",   iconColor: "#3B82F6", glow: "rgba(59,130,246,0.35)" },
  email:    { icon: <EnvelopeSimple size={15} weight="duotone" />, bg: "rgba(139,92,246,0.1)",  iconColor: "#8B5CF6", glow: "rgba(139,92,246,0.35)" },
  whatsapp: { icon: <ChatCircle size={15} weight="duotone" />,    bg: "rgba(16,185,129,0.1)",  iconColor: "#10B981", glow: "rgba(16,185,129,0.35)" },
  meeting:  { icon: <UsersFour size={15} weight="duotone" />,     bg: "rgba(249,115,22,0.1)",  iconColor: "#F97316", glow: "rgba(249,115,22,0.35)" },
  task:     { icon: <PhCheckSquare size={15} weight="duotone" />, bg: "rgba(100,116,139,0.1)", iconColor: "#64748B", glow: "rgba(100,116,139,0.3)" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return `Hoy ${d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Mañana ${d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function isOverdue(fu: FollowUp) {
  return fu.status === "overdue" || (fu.status === "pending" && new Date(fu.scheduled_at) < new Date());
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color, onClick, active, gradStyle }: {
  label: string; value: number; icon: React.ReactNode;
  color: string; onClick?: () => void; active?: boolean;
  gradStyle?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        "stat-card text-left w-full transition-all",
        active && "ring-2 ring-violet-400/40 border-violet-300"
      )}
    >
      <div className="relative flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ background: gradStyle ?? "linear-gradient(135deg,#635BFF,#8B5CF6)" }}
        >
          <span className="text-white">{icon}</span>
        </div>
        {active && (
          <div className="w-2 h-2 rounded-full bg-violet-500 ring-2 ring-violet-200" />
        )}
      </div>
  <p className="text-2xl font-black text-foreground leading-none tabular-nums"
     style={{ background: gradStyle ?? "linear-gradient(135deg,#635BFF,#8B5CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
    </motion.button>
  );
}

// ─── Follow-up Row ────────────────────────────────────────────────────────────

function FollowUpRow({ fu, onComplete, onEdit, onCancel }: {
  fu: FollowUp;
  onComplete: (id: string) => void;
  onEdit: (fu: FollowUp) => void;
  onCancel: (id: string) => void;
}) {
  const overdue = isOverdue(fu);
  const statusCfg = STATUS_CONFIG[fu.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const prioCfg = PRIORITY_CONFIG[fu.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all group relative overflow-hidden",
        overdue && fu.status !== "completed"
          ? "border-red-200 bg-red-50/30 hover:border-red-300 hover:shadow-sm"
          : fu.status === "completed"
          ? "border-emerald-100 bg-emerald-50/20 hover:border-emerald-200"
          : "border-border bg-card hover:border-violet-200/60 hover:shadow-sm hover:bg-violet-50/10"
      )}
    >
      {/* Left accent border */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl",
        overdue && fu.status !== "completed" ? "bg-gradient-to-b from-red-400 to-red-600"
          : fu.status === "completed" ? "bg-gradient-to-b from-emerald-400 to-emerald-600"
          : fu.status === "cancelled" ? "bg-slate-200"
          : prioCfg.label === "Alta" ? "bg-gradient-to-b from-orange-400 to-red-500"
          : "bg-gradient-to-b from-violet-400 to-purple-600"
      )} />
      {/* Complete checkbox */}
      {fu.status !== "completed" && fu.status !== "cancelled" && (
        <button
          onClick={() => onComplete(fu.id)}
          className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 hover:border-violet-500 hover:bg-violet-50 flex-shrink-0 transition-all flex items-center justify-center group/cb"
        >
          <Check size={10} className="text-violet-500 opacity-0 group-hover/cb:opacity-100 transition-opacity" />
        </button>
      )}
      {fu.status === "completed" && (
        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <Check size={10} className="text-green-600" />
        </div>
      )}
      {fu.status === "cancelled" && (
        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
          <X size={10} className="text-slate-400" />
        </div>
      )}

      {/* Type icon */}
      {(() => {
        const ts = TYPE_STYLE[fu.followup_type] ?? TYPE_STYLE.task;
        return (
          <div className="relative flex-shrink-0">
            <motion.div
              whileHover={{ scale: 1.12 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: ts.bg, color: ts.iconColor, boxShadow: `0 0 0 1px ${ts.bg}` }}
            >
              {ts.icon}
            </motion.div>
            {overdue && fu.status !== "completed" && fu.status !== "cancelled" && (
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{ background: "rgba(239,68,68,0.2)", animationDuration: "1.8s" }}
              />
            )}
          </div>
        );
      })()}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={cn(
            "text-sm font-semibold truncate",
            fu.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
          )}>
            {fu.title}
          </p>
          {fu.is_ai_generated && (
            <span className="flex items-center gap-1 text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
              <Bot size={9} /> IA
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {fu.lead_name && (
            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
              {fu.lead_name}
              {fu.lead_company && ` · ${fu.lead_company}`}
            </span>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Prioridad */}
        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", prioCfg.color)}>
          {prioCfg.label}
        </span>

        {/* Fecha */}
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg",
          overdue && fu.status !== "completed" ? "text-red-600 bg-red-50" : "text-muted-foreground"
        )}>
          {overdue && fu.status !== "completed" ? <AlertTriangle size={11} /> : <Clock size={11} />}
          {formatDate(fu.scheduled_at)}
        </div>

        {/* Status */}
        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border hidden sm:inline-flex", statusCfg.color)}>
          {statusCfg.label}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {fu.status !== "completed" && fu.status !== "cancelled" && (
            <button onClick={() => onEdit(fu)} className="btn-ghost p-1.5" title="Editar">
              <Edit3 size={13} />
            </button>
          )}
          {fu.status !== "cancelled" && fu.status !== "completed" && (
            <button onClick={() => onCancel(fu.id)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50" title="Cancelar">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({ year, month, onChangeMonth }: {
  year: number; month: number; onChangeMonth: (y: number, m: number) => void;
}) {
  const { data: calData } = useQuery({
    queryKey: ["followup-calendar", year, month],
    queryFn: () => followupsApi.calendar(year, month).then(r => r.data),
  });

  const days: Record<string, FollowUp[]> = calData?.days ?? {};

  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  function prevMonth() {
    if (month === 1) onChangeMonth(year - 1, 12);
    else onChangeMonth(year, month - 1);
  }
  function nextMonth() {
    if (month === 12) onChangeMonth(year + 1, 1);
    else onChangeMonth(year, month + 1);
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Month header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h3 className="font-bold text-foreground">{MONTHS_ES[month - 1]} {year}</h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="btn-ghost p-1.5"><ChevronLeft size={15} /></button>
          <button onClick={nextMonth} className="btn-ghost p-1.5"><ChevronRight size={15} /></button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-2">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells before first day */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-24 border-b border-r border-border/40 bg-accent/20" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayFollowups: FollowUp[] = days[dayStr] ?? [];
          const isToday = dayStr === todayStr;

          return (
            <div
              key={day}
              className={cn(
                "h-24 border-b border-r border-border/40 p-1.5 transition-colors hover:bg-accent/30",
                isToday && "bg-violet-50/50"
              )}
            >
              <span className={cn(
                "text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full mb-1",
                isToday ? "bg-violet-600 text-white" : "text-foreground"
              )}>
                {day}
              </span>
              <div className="space-y-0.5 overflow-hidden">
                {dayFollowups.slice(0, 3).map(fu => (
                  <div
                    key={fu.id}
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded truncate flex items-center gap-1",
                      fu.status === "overdue" || isOverdue(fu)
                        ? "bg-red-100 text-red-700"
                        : fu.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-violet-100 text-violet-700"
                    )}
                    title={`${fu.title} — ${fu.lead_name || fu.lead_email}`}
                  >
                    <span className="flex-shrink-0">{TYPE_ICON[fu.followup_type]}</span>
                    <span className="truncate">{fu.lead_name || "Lead"}</span>
                  </div>
                ))}
                {dayFollowups.length > 3 && (
                  <p className="text-[9px] text-muted-foreground px-1">+{dayFollowups.length - 3} más</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabType = "all" | "today" | "overdue" | "week" | "completed";

const TABS: { key: TabType; label: string }[] = [
  { key: "all",       label: "Todos" },
  { key: "today",     label: "Hoy" },
  { key: "overdue",   label: "Vencidos" },
  { key: "week",      label: "Esta semana" },
  { key: "completed", label: "Completados" },
];

export default function SeguimientoPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [tab, setTab] = useState<TabType>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingFU, setEditingFU] = useState<FollowUp | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);

  // Stats
  const { data: stats } = useQuery<FollowUpStats>({
    queryKey: ["followup-stats"],
    queryFn: () => followupsApi.stats().then(r => r.data),
    refetchInterval: 30_000,
  });

  // List
  const listParams: Record<string, string | number | undefined> = {
    limit: 200,
    followup_type: typeFilter || undefined,
  };
  if (tab === "completed") listParams.status = "completed";
  else if (tab !== "all") listParams.period = tab;

  const { data: followupsRaw, isLoading } = useQuery<FollowUp[]>({
    queryKey: ["followups", tab, typeFilter],
    queryFn: () => followupsApi.list(listParams as Parameters<typeof followupsApi.list>[0]).then(r => r.data),
    refetchInterval: 60_000,
  });
  const followups: FollowUp[] = followupsRaw ?? [];

  const completeMutation = useMutation({
    mutationFn: (id: string) => followupsApi.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followups"] });
      qc.invalidateQueries({ queryKey: ["followup-stats"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => followupsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followups"] });
      qc.invalidateQueries({ queryKey: ["followup-stats"] });
    },
  });

  function openCreate() { setEditingFU(null); setDrawerOpen(true); }
  function openEdit(fu: FollowUp) { setEditingFU(fu); setDrawerOpen(true); }

  const overdueCnt = stats?.overdue ?? 0;
  const todayCnt   = stats?.today ?? 0;

  return (
    <div className="p-8 max-w-[1280px] mx-auto">

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
            <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center flex-shrink-0" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.3)" }}>
              <Bell size={28} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <CircleDot size={10} className="text-emerald-300 animate-pulse" />
                <span className="text-white/60 text-xs font-medium">Seguimientos activos</span>
              </div>
              <h1 className="text-3xl font-black text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.18)" }}>Seguimiento</h1>
              <p className="text-white/60 text-sm mt-0.5">Gestión con IA · Notificaciones automáticas</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-5">
            {overdueCnt > 0 && (
              <div className="flex items-center gap-2 bg-red-500/25 backdrop-blur-sm border border-red-300/30 rounded-xl px-3 py-1.5">
                <AlertTriangle size={13} className="text-red-200" />
                <span className="text-white text-xs font-bold">{overdueCnt} vencidos</span>
              </div>
            )}
            {todayCnt > 0 && (
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-1.5">
                <Clock size={13} className="text-amber-200" />
                <span className="text-white text-xs font-bold">{todayCnt} para hoy</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden">
              <button
                onClick={() => setView("list")}
                className={cn("px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all",
                  view === "list" ? "bg-white/25 text-white" : "text-white/60 hover:text-white hover:bg-white/10")}
              >
                <List size={13} /> Lista
              </button>
              <button
                onClick={() => setView("calendar")}
                className={cn("px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all",
                  view === "calendar" ? "bg-white/25 text-white" : "text-white/60 hover:text-white hover:bg-white/10")}
              >
                <Calendar size={13} /> Calendario
              </button>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl transition-all"
            >
              <Plus size={15} /> Nuevo seguimiento
            </button>
          </div>
        </div>
      </motion.div>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiCard
          label="Vencidos" value={overdueCnt}
          icon={<AlertTriangle size={15} />} color="bg-red-100 text-red-600"
          gradStyle="linear-gradient(135deg,#EF4444,#DC2626)"
          onClick={() => { setView("list"); setTab("overdue"); }}
          active={tab === "overdue"}
        />
        <KpiCard
          label="Para hoy" value={todayCnt}
          icon={<Clock size={15} />} color="bg-orange-100 text-orange-600"
          gradStyle="linear-gradient(135deg,#F97316,#EA580C)"
          onClick={() => { setView("list"); setTab("today"); }}
          active={tab === "today"}
        />
        <KpiCard
          label="Esta semana" value={stats?.this_week ?? 0}
          icon={<Calendar size={15} />} color="bg-blue-100 text-blue-600"
          gradStyle="linear-gradient(135deg,#3B82F6,#6366F1)"
          onClick={() => { setView("list"); setTab("week"); }}
          active={tab === "week"}
        />
        <KpiCard
          label="Total pendientes" value={stats?.total_pending ?? 0}
          icon={<Bell size={15} />} color="bg-violet-100 text-violet-600"
          gradStyle="linear-gradient(135deg,#635BFF,#8B5CF6)"
          onClick={() => { setView("list"); setTab("all"); }}
          active={tab === "all"}
        />
        <KpiCard
          label="Completados hoy" value={stats?.completed_today ?? 0}
          icon={<CheckCircle2 size={15} />} color="bg-green-100 text-green-600"
          gradStyle="linear-gradient(135deg,#10B981,#059669)"
          onClick={() => { setView("list"); setTab("completed"); }}
          active={tab === "completed"}
        />
      </div>

      {/* Alert vencidos */}
      <AnimatePresence>
        {overdueCnt > 0 && tab !== "overdue" && (
          <motion.button
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onClick={() => setTab("overdue")}
            className="w-full flex items-center gap-3 px-4 py-3.5 mb-4 rounded-xl text-sm font-semibold text-white text-left transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)", boxShadow: "0 4px 16px rgba(239,68,68,0.35)" }}
          >
            <AlertTriangle size={15} className="flex-shrink-0" />
            <span>
              Tienes <strong>{overdueCnt} seguimiento{overdueCnt > 1 ? "s" : ""} vencido{overdueCnt > 1 ? "s" : ""}</strong> que requieren atención inmediata.
            </span>
            <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-lg">Ver ahora →</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Vista calendario */}
      {view === "calendar" && (
        <CalendarView year={calYear} month={calMonth} onChangeMonth={(y, m) => { setCalYear(y); setCalMonth(m); }} />
      )}

      {/* Vista lista */}
      {view === "list" && (
        <div>
          {/* Tabs + filtros */}
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-1 bg-accent/50 rounded-xl p-1">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                    tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                  {t.key === "overdue" && overdueCnt > 0 && (
                    <span className="ml-1.5 bg-red-500 text-white text-[9px] rounded-full px-1.5 py-0.5">{overdueCnt}</span>
                  )}
                  {t.key === "today" && todayCnt > 0 && (
                    <span className="ml-1.5 bg-orange-500 text-white text-[9px] rounded-full px-1.5 py-0.5">{todayCnt}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Filtro tipo */}
            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-muted-foreground" />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTypeFilter("")}
                  className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                    typeFilter === "" ? "bg-violet-600 text-white" : "border border-border text-muted-foreground hover:bg-accent")}
                >Todos</button>
                {FOLLOWUP_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTypeFilter(typeFilter === t.value ? "" : t.value)}
                    className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                      typeFilter === t.value ? "bg-violet-600 text-white" : "border border-border text-muted-foreground hover:bg-accent")}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-accent animate-pulse rounded-xl" />
              ))}
            </div>
          ) : followups.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay seguimientos en esta vista</p>
              <p className="text-sm mt-1">
                {tab === "overdue" ? "¡Todo al día! 🎉" : "Crea el primero con el botón de arriba"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {followups.map(fu => (
                  <FollowUpRow
                    key={fu.id}
                    fu={fu}
                    onComplete={(id) => completeMutation.mutate(id)}
                    onEdit={openEdit}
                    onCancel={(id) => cancelMutation.mutate(id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Count */}
          {followups.length > 0 && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              {followups.length} seguimiento{followups.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* Drawer crear/editar */}
      <FollowUpDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingFU(null); }}
        editingFollowUp={editingFU}
      />
    </div>
  );
}
