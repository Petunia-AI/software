"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { leadsApi } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { StageBadge, ChannelBadge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  X, Mail, Phone, Building2, User, Briefcase, DollarSign,
  MessageSquare, Tag, Calendar, ChevronRight, Edit3, Save,
  CheckCircle, XCircle, Clock, ArrowRight, Zap, Target,
  TrendingUp, AlertCircle, Star, Trash2, BotMessageSquare,
  Loader2, Send, Reply, Inbox, CalendarDays, Sparkles,
  ExternalLink, Video, FileText,
} from "lucide-react";
import { followupsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface LeadEmail {
  id: string;
  direction: "inbound" | "outbound";
  from_email: string;
  from_name?: string;
  to_emails: string[];
  subject?: string;
  body_html?: string;
  body_text?: string;
  is_read: boolean;
  sent_at?: string;
  received_at?: string;
  created_at: string;
}

interface LeadMeeting {
  id: string;
  title: string;
  status: "scheduled" | "completed" | "cancelled";
  provider: "google" | "zoom" | "manual";
  start_time: string;
  meeting_url?: string;
  summary_text?: string;
  presentation_html?: string;
}

// ─── tipos ─────────────────────────────────────────────────────────────────

export interface Lead {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  stage: string;
  source: string;
  qualification_score: number;
  budget?: string;
  authority?: string;
  need?: string;
  timeline?: string;
  estimated_value?: number;
  notes?: string;
  tags?: string[];
  last_contacted_at?: string;
  next_followup_at?: string;
  created_at: string;
}

interface LeadDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onDelete?: (lead: Lead) => void;
}

// ─── constantes ────────────────────────────────────────────────────────────

const STAGES = [
  { value: "new",            label: "Nuevo",              color: "text-slate-500",   bg: "bg-slate-100" },
  { value: "qualifying",     label: "Calificando",        color: "text-blue-600",    bg: "bg-blue-50"   },
  { value: "qualified",      label: "Calificado",         color: "text-violet-600",  bg: "bg-violet-50" },
  { value: "nurturing",      label: "Nurturing",          color: "text-amber-600",   bg: "bg-amber-50"  },
  { value: "demo_scheduled", label: "Demo agendada",      color: "text-purple-600",  bg: "bg-purple-50" },
  { value: "proposal_sent",  label: "Propuesta enviada",  color: "text-indigo-600",  bg: "bg-indigo-50" },
  { value: "negotiating",    label: "Negociando",         color: "text-orange-600",  bg: "bg-orange-50" },
  { value: "closed_won",     label: "Ganado ✓",           color: "text-emerald-600", bg: "bg-emerald-50"},
  { value: "closed_lost",    label: "Perdido",            color: "text-red-600",     bg: "bg-red-50"    },
];

const BANT_FIELDS = [
  { key: "budget",    label: "Budget",    icon: DollarSign,    placeholder: "¿Tiene presupuesto asignado?",          hint: "Presupuesto disponible" },
  { key: "authority", label: "Authority", icon: User,          placeholder: "¿Es el decisor de compra?",             hint: "Nivel de autoridad" },
  { key: "need",      label: "Need",      icon: Target,        placeholder: "¿Cuál es su necesidad principal?",      hint: "Necesidad identificada" },
  { key: "timeline",  label: "Timeline",  icon: Clock,         placeholder: "¿En qué plazo necesita la solución?",   hint: "Urgencia y plazo" },
] as const;

// ─── helpers ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const pct = Math.min(Math.max(score / 10, 0), 1);
  const r = 32;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const color = score >= 7 ? "#10b981" : score >= 4 ? "#f59e0b" : "#ef4444";
  const label = score >= 7 ? "Alto" : score >= 4 ? "Medio" : "Bajo";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-[84px] h-[84px]">
        <svg width="84" height="84" className="-rotate-90">
          <circle cx="42" cy="42" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle
            cx="42" cy="42" r={r} fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black leading-none" style={{ color }}>{score.toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground font-medium">/10</span>
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

function BantBar({ value }: { value?: string }) {
  // Score por presencia de palabras clave positivas
  const positives = ["sí", "si", "confirmado", "aprobado", "tiene", "tenemos", "ahora", "urgente", "definit", "asignad"];
  const score = !value ? 0 : positives.some(w => value.toLowerCase().includes(w)) ? 1 : 0.5;
  const color = score === 1 ? "bg-emerald-500" : score === 0.5 ? "bg-amber-400" : "bg-slate-200";

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score * 100}%` }} />
      </div>
      <span className={cn("text-[10px] font-semibold",
        score === 1 ? "text-emerald-600" : score === 0.5 ? "text-amber-600" : "text-slate-400"
      )}>
        {score === 1 ? "✓" : score === 0.5 ? "~" : "—"}
      </span>
    </div>
  );
}

// ─── componente principal ──────────────────────────────────────────────────

export default function LeadDrawer({ lead, onClose, onDelete }: LeadDrawerProps) {
  const qc = useQueryClient();
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<Lead>>({});
  const [activeTab, setActiveTab] = useState<"info" | "bant" | "activity" | "emails" | "meetings">("info");
  const { token } = useAuthStore();
  const [leadEmails, setLeadEmails] = useState<LeadEmail[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [selectedLeadEmail, setSelectedLeadEmail] = useState<LeadEmail | null>(null);
  const [leadMeetings, setLeadMeetings] = useState<LeadMeeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [generatingPresentationId, setGeneratingPresentationId] = useState<string | null>(null);

  const fetchLeadEmails = useCallback(async (leadId: string) => {
    if (!token) return;
    setEmailsLoading(true);
    try {
      const r = await fetch(`${API}/email/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setLeadEmails(await r.json());
    } finally {
      setEmailsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "emails" && lead?.id) {
      fetchLeadEmails(lead.id);
    }
  }, [activeTab, lead?.id, fetchLeadEmails]);

  const fetchLeadMeetings = useCallback(async (leadId: string) => {
    if (!token) return;
    setMeetingsLoading(true);
    try {
      const r = await fetch(`${API}/meetings?lead_id=${leadId}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setLeadMeetings(await r.json());
    } finally {
      setMeetingsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "meetings" && lead?.id) {
      fetchLeadMeetings(lead.id);
    }
  }, [activeTab, lead?.id, fetchLeadMeetings]);

  async function generatePresentation(meetingId: string) {
    if (!token) return;
    setGeneratingPresentationId(meetingId);
    try {
      const r = await fetch(`${API}/meetings/${meetingId}/generate-presentation`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || "Error al generar presentación");
      }
      const updated: LeadMeeting = await r.json();
      setLeadMeetings(prev =>
        prev.map(m => m.id === meetingId ? { ...m, presentation_html: updated.presentation_html } : m)
      );
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingPresentationId(null);
    }
  }

  function downloadPresentation(meeting: LeadMeeting) {
    if (!meeting.presentation_html) return;
    const blob = new Blob([meeting.presentation_html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meeting.title.replace(/\s+/g, "_")}_presentacion.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const [followupDone, setFollowupDone] = useState(false);

  const followupMutation = useMutation({
    mutationFn: async () => {
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await followupsApi.create({
        lead_id: lead!.id,
        title: `Seguimiento AI — ${lead!.name ?? "Lead"}`,
        description: "Seguimiento automático iniciado desde el panel de leads.",
        followup_type: "ai_followup",
        priority: "high",
        scheduled_at: scheduledAt,
      });
      await leadsApi.updateStage(lead!.id, "nurturing");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["followups"] });
      setFollowupDone(true);
      setTimeout(() => { onClose(); router.push("/seguimiento"); }, 1200);
    },
  });

  // Sync form cuando cambia el lead
  if (lead && !editMode && Object.keys(form).length === 0) {
    // no-op, form se llena al hacer click en editar
  }

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Lead>) => leadsApi.update(lead!.id, data as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      setEditMode(false);
      setForm({});
    },
  });

  const stageMutation = useMutation({
    mutationFn: (stage: string) => leadsApi.updateStage(lead!.id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  function startEdit() {
    if (!lead) return;
    setForm({ ...lead });
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setForm({});
  }

  function saveEdit() {
    if (!lead) return;
    updateMutation.mutate(form);
  }

  const data = editMode ? { ...lead!, ...form } : lead;

  if (!data) return null;

  const currentStageIdx = STAGES.findIndex(s => s.value === data.stage);

  return (
    <AnimatePresence>
      {lead && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[520px] bg-background border-l border-border z-50 flex flex-col shadow-2xl"
          >
            {/* ── Header ── */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
              <div className="flex items-start gap-3 min-w-0">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md">
                  {(data.name ?? "?")[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  {editMode ? (
                    <input
                      value={form.name ?? ""}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="input-stripe text-base font-semibold py-1 mb-1 w-full"
                      placeholder="Nombre del lead"
                    />
                  ) : (
                    <h2 className="font-bold text-lg text-foreground truncate">
                      {data.name || <span className="italic text-muted-foreground font-normal">Sin nombre</span>}
                    </h2>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <StageBadge stage={data.stage} />
                    <ChannelBadge channel={data.source} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                {editMode ? (
                  <>
                    <button onClick={cancelEdit} className="btn-ghost p-1.5 text-xs">
                      <XCircle size={16} />
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={updateMutation.isPending}
                      className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                    >
                      <Save size={13} />
                      Guardar
                    </button>
                  </>
                ) : (
                  <button onClick={startEdit} className="btn-ghost p-1.5 text-xs" title="Editar">
                    <Edit3 size={15} />
                  </button>
                )}
                {onDelete && lead && (
                  <button
                    onClick={() => onDelete(lead)}
                    className="btn-ghost p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50"
                    title="Eliminar lead"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button onClick={onClose} className="btn-ghost p-1.5">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ── Score + Stage Pipeline ── */}
            <div className="px-6 py-4 bg-accent/30 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-6">
                {/* Score ring */}
                <div className="relative flex flex-col items-center">
                  <ScoreRing score={data.qualification_score} />
                  <span className="text-[10px] text-muted-foreground mt-1 font-medium">Score BANT</span>
                </div>

                {/* Stage pipeline mini */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium mb-2">Pipeline</p>
                  <div className="flex items-center gap-0.5 flex-wrap">
                    {STAGES.slice(0, 7).map((s, idx) => (
                      <button
                        key={s.value}
                        onClick={() => stageMutation.mutate(s.value)}
                        disabled={stageMutation.isPending}
                        title={s.label}
                        className={cn(
                          "h-2 flex-1 rounded-sm transition-all hover:scale-y-150 cursor-pointer",
                          idx <= currentStageIdx ? s.bg.replace("bg-", "bg-") : "bg-slate-100",
                          idx <= currentStageIdx && s.color.includes("violet") ? "bg-violet-400" :
                          idx <= currentStageIdx && s.color.includes("blue") ? "bg-blue-400" :
                          idx <= currentStageIdx && s.color.includes("emerald") ? "bg-emerald-400" :
                          idx <= currentStageIdx ? "bg-violet-300" : ""
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-semibold mt-1.5 text-foreground">
                    {STAGES[currentStageIdx]?.label ?? data.stage}
                  </p>

                  {/* Valor estimado */}
                  {data.estimated_value && (
                    <div className="flex items-center gap-1 mt-1">
                      <DollarSign size={11} className="text-emerald-500" />
                      <span className="text-xs font-bold text-emerald-600">
                        ${data.estimated_value.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex border-b border-border flex-shrink-0">
              {(["info", "bant", "activity", "emails", "meetings"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    activeTab === tab
                      ? "border-b-2 border-violet-500 text-violet-600"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === "info" ? "Info" :
                   tab === "bant" ? "BANT" :
                   tab === "activity" ? "Actividad" :
                   tab === "emails" ? <><Mail size={10} className="inline mr-0.5" />Emails{leadEmails.length > 0 && <span className="ml-1 text-[9px] font-bold bg-sky-500 text-white px-1 py-0.5 rounded-full">{leadEmails.length}</span>}</> :
                   <><CalendarDays size={10} className="inline mr-0.5" />Reuniones{leadMeetings.length > 0 && <span className="ml-1 text-[9px] font-bold bg-violet-500 text-white px-1 py-0.5 rounded-full">{leadMeetings.length}</span>}</>
                  }
                </button>
              ))}
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

              {/* ════ TAB INFO ════ */}
              {activeTab === "info" && (
                <>
                  {/* Contacto */}
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                      <User size={11} /> Contacto
                    </h3>
                    <div className="space-y-2">
                      <Field
                        icon={<Mail size={13} className="text-muted-foreground" />}
                        label="Email"
                        value={data.email}
                        editMode={editMode}
                        type="email"
                        onChange={v => setForm(f => ({ ...f, email: v }))}
                      />
                      <Field
                        icon={<Phone size={13} className="text-muted-foreground" />}
                        label="Teléfono"
                        value={data.phone}
                        editMode={editMode}
                        type="tel"
                        onChange={v => setForm(f => ({ ...f, phone: v }))}
                      />
                      <Field
                        icon={<Building2 size={13} className="text-muted-foreground" />}
                        label="Empresa"
                        value={data.company}
                        editMode={editMode}
                        onChange={v => setForm(f => ({ ...f, company: v }))}
                      />
                      <Field
                        icon={<Briefcase size={13} className="text-muted-foreground" />}
                        label="Cargo"
                        value={data.position}
                        editMode={editMode}
                        onChange={v => setForm(f => ({ ...f, position: v }))}
                      />
                    </div>
                  </section>

                  {/* Valor */}
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                      <DollarSign size={11} /> Oportunidad
                    </h3>
                    <div className="space-y-2">
                      <Field
                        icon={<DollarSign size={13} className="text-emerald-500" />}
                        label="Valor estimado"
                        value={data.estimated_value?.toString()}
                        editMode={editMode}
                        type="number"
                        prefix="$"
                        onChange={v => setForm(f => ({ ...f, estimated_value: v ? parseFloat(v) : undefined }))}
                      />
                      <Field
                        icon={<Calendar size={13} className="text-muted-foreground" />}
                        label="Próximo seguimiento"
                        value={data.next_followup_at ? new Date(data.next_followup_at).toISOString().slice(0,16) : undefined}
                        editMode={editMode}
                        type="datetime-local"
                        onChange={v => setForm(f => ({ ...f, next_followup_at: v }))}
                      />
                    </div>
                  </section>

                  {/* Cambio de etapa */}
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                      <ArrowRight size={11} /> Cambiar etapa
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {STAGES.map(s => (
                        <button
                          key={s.value}
                          onClick={() => stageMutation.mutate(s.value)}
                          disabled={stageMutation.isPending || data.stage === s.value}
                          className={cn(
                            "px-3 py-2 rounded-lg text-xs font-semibold border text-left transition-all",
                            data.stage === s.value
                              ? `${s.bg} ${s.color} border-current opacity-100 ring-2 ring-offset-1 ring-current/30`
                              : "border-border hover:border-violet-300 hover:bg-accent text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Notas */}
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                      <MessageSquare size={11} /> Notas
                    </h3>
                    {editMode ? (
                      <textarea
                        value={form.notes ?? ""}
                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        rows={4}
                        className="input-stripe w-full resize-none text-sm"
                        placeholder="Escribe tus notas aquí..."
                      />
                    ) : (
                      <div className={cn(
                        "rounded-lg p-3 text-sm",
                        data.notes ? "bg-accent/50 text-foreground" : "bg-accent/30 text-muted-foreground italic"
                      )}>
                        {data.notes || "Sin notas. Haz clic en editar para añadir."}
                      </div>
                    )}
                  </section>

                  {/* Tags */}
                  {(data.tags?.length ?? 0) > 0 && (
                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Tag size={11} /> Etiquetas
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {(data.tags as string[]).map(tag => (
                          <span key={tag} className="badge badge-violet text-xs">{tag}</span>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}

              {/* ════ TAB BANT ════ */}
              {activeTab === "bant" && (
                <>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 mb-2">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Score BANT Global</p>
                        <p className="text-3xl font-black text-violet-700">{data.qualification_score.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">/10</span></p>
                      </div>
                      <div className="w-16 h-16">
                        <ScoreRing score={data.qualification_score} />
                      </div>
                    </div>
                    <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all",
                          data.qualification_score >= 7 ? "bg-emerald-500" :
                          data.qualification_score >= 4 ? "bg-amber-400" : "bg-red-400"
                        )}
                        style={{ width: `${(data.qualification_score / 10) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {data.qualification_score >= 7
                        ? "✅ Lead muy calificado — prioridad alta"
                        : data.qualification_score >= 4
                        ? "⚠️ Lead en proceso de calificación"
                        : "❌ Lead sin calificar — necesita nurturing"}
                    </p>
                  </div>

                  {BANT_FIELDS.map(({ key, label, icon: Icon, placeholder, hint }) => (
                    <section key={key} className="border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3 bg-accent/40 border-b border-border">
                        <Icon size={14} className="text-violet-600" />
                        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{hint}</span>
                      </div>
                      <div className="px-4 py-3">
                        {editMode ? (
                          <textarea
                            value={(form as Record<string, string>)[key] ?? ""}
                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                            rows={2}
                            className="input-stripe w-full resize-none text-sm"
                            placeholder={placeholder}
                          />
                        ) : (
                          <>
                            <p className={cn(
                              "text-sm",
                              (data as unknown as Record<string, unknown>)[key] ? "text-foreground" : "text-muted-foreground italic"
                            )}>
                              {(data as unknown as Record<string, unknown>)[key] as string || placeholder}
                            </p>
                            <BantBar value={(data as unknown as Record<string, unknown>)[key] as string} />
                          </>
                        )}
                      </div>
                    </section>
                  ))}
                </>
              )}

              {/* ════ TAB ACTIVIDAD ════ */}
              {activeTab === "activity" && (
                <div className="space-y-3">
                  <ActivityItem
                    icon={<Star size={13} className="text-violet-500" />}
                    color="bg-violet-50 border-violet-200"
                    title="Lead creado"
                    time={data.created_at}
                  />
                  {data.last_contacted_at && (
                    <ActivityItem
                      icon={<MessageSquare size={13} className="text-blue-500" />}
                      color="bg-blue-50 border-blue-200"
                      title="Último contacto"
                      time={data.last_contacted_at}
                    />
                  )}
                  {data.next_followup_at && (
                    <ActivityItem
                      icon={<Calendar size={13} className="text-amber-500" />}
                      color="bg-amber-50 border-amber-200"
                      title="Próximo seguimiento"
                      time={data.next_followup_at}
                      future
                    />
                  )}
                  <div className="mt-4 p-4 rounded-xl border border-dashed border-border text-center">
                    <Clock size={24} className="mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">Historial de conversaciones próximamente</p>
                  </div>
                </div>
              )}

              {/* ════ TAB EMAILS ════ */}
              {activeTab === "emails" && (
                <div className="space-y-2">
                  {/* Compose quick action */}
                  {data.email && (
                    <button
                      onClick={() => router.push(`/email?compose=1&to=${encodeURIComponent(data.email!)}&lead=${data.id}`)}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #0EA5E9, #2563EB)" }}
                    >
                      <Send size={12} /> Enviar email a {data.name || data.email}
                    </button>
                  )}

                  {emailsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : leadEmails.length === 0 ? (
                    <div className="flex flex-col items-center py-10 gap-3 text-center">
                      <Inbox size={28} className="text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">No hay emails registrados con este lead.</p>
                    </div>
                  ) : selectedLeadEmail ? (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <div className="px-3 py-2.5 border-b border-border bg-slate-50 flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground truncate">{selectedLeadEmail.subject || "(sin asunto)"}</p>
                        <button onClick={() => setSelectedLeadEmail(null)} className="p-1 rounded-lg hover:bg-slate-100 text-muted-foreground transition-colors"><X size={13} /></button>
                      </div>
                      <div className="p-3 text-xs text-muted-foreground space-y-1">
                        <p><span className="font-semibold">De:</span> {selectedLeadEmail.from_name ? `${selectedLeadEmail.from_name} <${selectedLeadEmail.from_email}>` : selectedLeadEmail.from_email}</p>
                        <p><span className="font-semibold">Para:</span> {selectedLeadEmail.to_emails.join(", ")}</p>
                        <p><span className="font-semibold">Fecha:</span> {new Date(selectedLeadEmail.received_at || selectedLeadEmail.sent_at || selectedLeadEmail.created_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</p>
                      </div>
                      <div className="px-3 pb-3">
                        {selectedLeadEmail.body_html ? (
                          <div className="prose prose-xs max-w-none text-foreground text-xs border border-border rounded-lg p-3 bg-white max-h-48 overflow-y-auto"
                            dangerouslySetInnerHTML={{ __html: selectedLeadEmail.body_html }}
                          />
                        ) : (
                          <pre className="text-xs whitespace-pre-wrap font-sans text-foreground bg-white border border-border rounded-lg p-3 max-h-48 overflow-y-auto">{selectedLeadEmail.body_text}</pre>
                        )}
                      </div>
                    </div>
                  ) : (
                    leadEmails.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setSelectedLeadEmail(e)}
                        className="w-full text-left px-3 py-2.5 rounded-xl border border-border hover:bg-sky-50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className={`text-xs font-semibold truncate ${!e.is_read && e.direction === "inbound" ? "text-foreground" : "text-muted-foreground"}`}>
                            {e.direction === "inbound" ? (e.from_name || e.from_email) : `→ ${e.to_emails[0] || ""}`}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border flex-shrink-0 ${
                            e.direction === "inbound" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-green-50 text-green-700 border-green-200"
                          }`}>{e.direction === "inbound" ? "Recibido" : "Enviado"}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{e.subject || "(sin asunto)"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(e.received_at || e.sent_at || e.created_at).toLocaleDateString("es-MX", { month: "short", day: "numeric", year: "2-digit" })}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* ════ TAB REUNIONES ════ */}
              {activeTab === "meetings" && (
                <div className="space-y-3">
                  {/* Ir al módulo de reuniones */}
                  <button
                    onClick={() => router.push(`/meetings`)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
                  >
                    <CalendarDays size={12} /> Agendar nueva reunión
                  </button>

                  {meetingsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : leadMeetings.length === 0 ? (
                    <div className="flex flex-col items-center py-10 gap-3 text-center">
                      <CalendarDays size={28} className="text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">No hay reuniones registradas con este lead.</p>
                    </div>
                  ) : (
                    leadMeetings.map(meeting => (
                      <div key={meeting.id} className="rounded-xl border border-border overflow-hidden">
                        {/* Header de la reunión */}
                        <div className="px-3 py-2.5 bg-slate-50 border-b border-border flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {meeting.provider === "google" ? <Video size={13} className="text-green-600 flex-shrink-0" /> :
                             meeting.provider === "zoom"   ? <Video size={13} className="text-blue-600 flex-shrink-0" /> :
                             <CalendarDays size={13} className="text-slate-500 flex-shrink-0" />}
                            <p className="text-xs font-semibold text-foreground truncate">{meeting.title}</p>
                          </div>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium border flex-shrink-0",
                            meeting.status === "completed" ? "bg-green-50 text-green-700 border-green-200" :
                            meeting.status === "cancelled" ? "bg-red-50 text-red-700 border-red-200" :
                            "bg-blue-50 text-blue-700 border-blue-200"
                          )}>
                            {meeting.status === "completed" ? "Completada" : meeting.status === "cancelled" ? "Cancelada" : "Agendada"}
                          </span>
                        </div>

                        <div className="p-3 space-y-2">
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(meeting.start_time).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>

                          {/* Resumen si existe */}
                          {meeting.summary_text && (
                            <p className="text-[10px] text-muted-foreground bg-slate-50 rounded-lg p-2 leading-relaxed line-clamp-3">
                              {meeting.summary_text}
                            </p>
                          )}

                          {/* Presentación */}
                          {meeting.presentation_html ? (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg flex-1">
                                <FileText size={10} /> Presentación lista
                              </div>
                              <button
                                onClick={() => downloadPresentation(meeting)}
                                className="text-[10px] px-2 py-1 rounded-lg border border-border hover:bg-accent transition-colors font-medium flex items-center gap-1"
                                title="Descargar presentación HTML"
                              >
                                <ExternalLink size={10} /> Descargar
                              </button>
                            </div>
                          ) : meeting.status === "completed" ? (
                            <button
                              onClick={() => generatePresentation(meeting.id)}
                              disabled={generatingPresentationId === meeting.id}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[10px] font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white transition-all disabled:opacity-60"
                            >
                              {generatingPresentationId === meeting.id ? (
                                <><Loader2 size={10} className="animate-spin" /> Generando presentación...</>
                              ) : (
                                <><Sparkles size={10} /> Generar presentación para el cliente</>
                              )}
                            </button>
                          ) : (
                            <p className="text-[10px] text-muted-foreground italic">Disponible al completar la reunión</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* ── Footer acciones rápidas ── */}
            <div className="border-t border-border px-6 py-4 flex flex-col gap-2 flex-shrink-0 bg-background">
              {/* Botón principal: Comenzar seguimiento AI */}
              <button
                onClick={() => followupMutation.mutate()}
                disabled={followupMutation.isPending || followupDone}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  followupDone
                    ? "bg-emerald-500 text-white cursor-default"
                    : "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg"
                }`}
              >
                {followupDone ? (
                  <><CheckCircle size={15} /> ¡Seguimiento creado!</>
                ) : followupMutation.isPending ? (
                  <><Clock size={15} className="animate-spin" /> Creando seguimiento...</>
                ) : (
                  <><BotMessageSquare size={15} /> Comenzar seguimiento AI</>
                )}
              </button>
              <div className="flex items-center gap-2">
              {data.email && (
                <button
                  onClick={() => router.push(`/email?compose=1&to=${encodeURIComponent(data.email!)}&lead=${data.id}`)}
                  className="btn-secondary text-xs flex items-center gap-1.5 flex-1 justify-center"
                >
                  <Mail size={13} />
                  Email
                </button>
              )}
              {data.phone && (
                <a href={`tel:${data.phone}`} className="btn-secondary text-xs flex items-center gap-1.5 flex-1 justify-center">
                  <Phone size={13} />
                  Llamar
                </a>
              )}
              {data.phone && (
                <a
                  href={`https://wa.me/${data.phone?.replace(/\D/g, "")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn-secondary text-xs flex items-center gap-1.5 flex-1 justify-center"
                >
                  <Zap size={13} className="text-green-500" />
                  WhatsApp
                </a>
              )}
              {!data.email && !data.phone && (
                <p className="text-xs text-muted-foreground">Sin datos de contacto</p>
              )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── sub-componentes ────────────────────────────────────────────────────────

function Field({
  icon, label, value, editMode, type = "text", prefix, onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  editMode: boolean;
  type?: string;
  prefix?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-5 flex-shrink-0 flex justify-center">{icon}</div>
      <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</span>
      {editMode ? (
        <div className="flex items-center gap-1 flex-1">
          {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
          <input
            type={type}
            value={value ?? ""}
            onChange={e => onChange?.(e.target.value)}
            className="input-stripe flex-1 py-1 text-sm"
          />
        </div>
      ) : (
        <span className={cn("text-sm flex-1 truncate", value ? "text-foreground" : "text-muted-foreground italic")}>
          {value ? (prefix ? `${prefix}${value}` : value) : "—"}
        </span>
      )}
    </div>
  );
}

function ActivityItem({
  icon, color, title, time, future,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  time: string;
  future?: boolean;
}) {
  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-xl border text-sm", color)}>
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {future
            ? `Programado: ${new Date(time).toLocaleDateString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
            : timeAgo(time)}
        </p>
      </div>
    </div>
  );
}
