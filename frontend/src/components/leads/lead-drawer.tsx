"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { leadsApi } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { ChannelBadge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  X, Mail, Phone, Building2, User, Briefcase, DollarSign,
  MessageSquare, Tag, Calendar, Edit3, Save,
  CheckCircle, XCircle, Clock, ArrowRight, Zap, Target,
  AlertCircle, Trash2, BotMessageSquare,
  Loader2, Send, Inbox, CalendarDays, Sparkles,
  ExternalLink, Video, FileText, TrendingUp, Star,
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

const STAGES = [
  { value: "new",            label: "Nuevo",              color: "text-slate-500",   bg: "bg-slate-100",    dot: "#94a3b8" },
  { value: "qualifying",     label: "Calificando",        color: "text-blue-600",    bg: "bg-blue-50",      dot: "#3b82f6" },
  { value: "qualified",      label: "Calificado",         color: "text-violet-600",  bg: "bg-violet-50",    dot: "#7c3aed" },
  { value: "nurturing",      label: "Nurturing",          color: "text-amber-600",   bg: "bg-amber-50",     dot: "#d97706" },
  { value: "demo_scheduled", label: "Demo agendada",      color: "text-purple-600",  bg: "bg-purple-50",    dot: "#9333ea" },
  { value: "proposal_sent",  label: "Propuesta enviada",  color: "text-indigo-600",  bg: "bg-indigo-50",    dot: "#4f46e5" },
  { value: "negotiating",    label: "Negociando",         color: "text-orange-600",  bg: "bg-orange-50",    dot: "#ea580c" },
  { value: "closed_won",     label: "Ganado",             color: "text-emerald-600", bg: "bg-emerald-50",   dot: "#059669" },
  { value: "closed_lost",    label: "Perdido",            color: "text-red-600",     bg: "bg-red-50",       dot: "#dc2626" },
];

const BANT_FIELDS = [
  { key: "budget",    label: "B — Budget",    icon: DollarSign, placeholder: "¿Tiene presupuesto asignado?",     hint: "Presupuesto",   gradient: "from-blue-500 to-cyan-500",     glow: "shadow-blue-500/20",    bg: "from-blue-50 to-cyan-50",      border: "border-blue-200",   text: "text-blue-700"    },
  { key: "authority", label: "A — Authority", icon: User,       placeholder: "¿Es el decisor de compra?",        hint: "Autoridad",     gradient: "from-violet-500 to-purple-600", glow: "shadow-violet-500/20",  bg: "from-violet-50 to-purple-50",  border: "border-violet-200", text: "text-violet-700"  },
  { key: "need",      label: "N — Need",      icon: Target,     placeholder: "¿Cuál es su necesidad principal?", hint: "Necesidad",     gradient: "from-emerald-500 to-teal-500",  glow: "shadow-emerald-500/20", bg: "from-emerald-50 to-teal-50",   border: "border-emerald-200",text: "text-emerald-700" },
  { key: "timeline",  label: "T — Timeline",  icon: Clock,      placeholder: "¿En qué plazo necesita solución?", hint: "Plazo",         gradient: "from-amber-400 to-orange-500",  glow: "shadow-amber-500/20",   bg: "from-amber-50 to-orange-50",   border: "border-amber-200",  text: "text-amber-700"   },
] as const;

function BantBar({ value }: { value?: string }) {
  const positives = ["sí", "si", "confirmado", "aprobado", "tiene", "tenemos", "ahora", "urgente", "definit", "asignad"];
  const score = !value ? 0 : positives.some(w => value.toLowerCase().includes(w)) ? 1 : 0.5;
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("h-full rounded-full", score === 1 ? "bg-emerald-400" : score === 0.5 ? "bg-amber-400" : "bg-slate-200")}
        />
      </div>
      <span className={cn("text-[10px] font-bold", score === 1 ? "text-emerald-600" : score === 0.5 ? "text-amber-600" : "text-slate-400")}>
        {score === 1 ? "Confirmado" : score === 0.5 ? "Parcial" : "Sin datos"}
      </span>
    </div>
  );
}

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
  const [followupDone, setFollowupDone] = useState(false);

  const fetchLeadEmails = useCallback(async (leadId: string) => {
    if (!token) return;
    setEmailsLoading(true);
    try {
      const r = await fetch(`${API}/email/leads/${leadId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setLeadEmails(await r.json());
    } finally { setEmailsLoading(false); }
  }, [token]);

  useEffect(() => {
    if (activeTab === "emails" && lead?.id) fetchLeadEmails(lead.id);
  }, [activeTab, lead?.id, fetchLeadEmails]);

  const fetchLeadMeetings = useCallback(async (leadId: string) => {
    if (!token) return;
    setMeetingsLoading(true);
    try {
      const r = await fetch(`${API}/meetings?lead_id=${leadId}&limit=20`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setLeadMeetings(await r.json());
    } finally { setMeetingsLoading(false); }
  }, [token]);

  useEffect(() => {
    if (activeTab === "meetings" && lead?.id) fetchLeadMeetings(lead.id);
  }, [activeTab, lead?.id, fetchLeadMeetings]);

  async function generatePresentation(meetingId: string) {
    if (!token) return;
    setGeneratingPresentationId(meetingId);
    try {
      const r = await fetch(`${API}/meetings/${meetingId}/generate-presentation`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail || "Error"); }
      const updated: LeadMeeting = await r.json();
      setLeadMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, presentation_html: updated.presentation_html } : m));
    } catch (e) { console.error(e); }
    finally { setGeneratingPresentationId(null); }
  }

  function downloadPresentation(meeting: LeadMeeting) {
    if (!meeting.presentation_html) return;
    const blob = new Blob([meeting.presentation_html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${meeting.title.replace(/\s+/g, "_")}_presentacion.html`; a.click();
    URL.revokeObjectURL(url);
  }

  const followupMutation = useMutation({
    mutationFn: async () => {
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await followupsApi.create({ lead_id: lead!.id, title: `Seguimiento AI — ${lead!.name ?? "Lead"}`, description: "Seguimiento automático iniciado desde el panel de leads.", followup_type: "ai_followup", priority: "high", scheduled_at: scheduledAt });
      await leadsApi.updateStage(lead!.id, "nurturing");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["followups"] });
      setFollowupDone(true);
      setTimeout(() => { onClose(); router.push("/seguimiento"); }, 1200);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Lead>) => leadsApi.update(lead!.id, data as Record<string, unknown>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); setEditMode(false); setForm({}); },
  });

  const stageMutation = useMutation({
    mutationFn: (stage: string) => leadsApi.updateStage(lead!.id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  function startEdit() { if (!lead) return; setForm({ ...lead }); setEditMode(true); }
  function cancelEdit() { setEditMode(false); setForm({}); }
  function saveEdit() { if (!lead) return; updateMutation.mutate(form); }

  const data = editMode ? { ...lead!, ...form } : lead;
  if (!data) return null;

  const currentStageIdx = STAGES.findIndex(s => s.value === data.stage);
  const scoreColor = data.qualification_score >= 7 ? "#10b981" : data.qualification_score >= 4 ? "#f59e0b" : "#ef4444";
  const scoreLabel = data.qualification_score >= 7 ? "Alto" : data.qualification_score >= 4 ? "Medio" : "Bajo";
  const scoreTextClass = data.qualification_score >= 7 ? "text-emerald-300" : data.qualification_score >= 4 ? "text-amber-300" : "text-red-300";

  const TAB_CONFIG = [
    { key: "info"     as const, label: "Info" },
    { key: "bant"     as const, label: "BANT" },
    { key: "activity" as const, label: "Timeline" },
    { key: "emails"   as const, label: "Emails",   badge: leadEmails.length },
    { key: "meetings" as const, label: "Reuniones", badge: leadMeetings.length },
  ];

  return (
    <AnimatePresence>
      {lead && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />

          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[500px] bg-background border-l border-border z-50 flex flex-col shadow-2xl"
          >

            {/* ══ HEADER GRADIENT ══ */}
            <div className="relative overflow-hidden flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-700 to-violet-800" />
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 -left-6 w-32 h-32 rounded-full bg-purple-400/20 blur-2xl pointer-events-none" />

              <div className="relative px-5 pt-4 pb-5">
                {/* Action bar */}
                <div className="flex items-center justify-end gap-1.5 mb-4">
                  {editMode ? (
                    <>
                      <button onClick={cancelEdit} className="p-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"><XCircle size={15} /></button>
                      <button onClick={saveEdit} disabled={updateMutation.isPending} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-violet-700 text-xs font-bold hover:bg-white/90 transition-all shadow-md">
                        {updateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar
                      </button>
                    </>
                  ) : (
                    <button onClick={startEdit} className="p-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"><Edit3 size={14} /></button>
                  )}
                  {onDelete && lead && (
                    <button onClick={() => onDelete(lead)} className="p-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-red-500/40 hover:text-white transition-colors"><Trash2 size={14} /></button>
                  )}
                  <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"><X size={15} /></button>
                </div>

                {/* Profile */}
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white font-black text-xl shadow-lg">
                      {(data.name ?? "?")[0]?.toUpperCase()}
                    </div>
                    <motion.div className="absolute inset-0 rounded-2xl border-2 border-white/50 pointer-events-none"
                      animate={{ scale: [1, 1.15, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }} />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white shadow-sm">
                      <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {editMode ? (
                      <input value={form.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="bg-white/15 border border-white/30 rounded-lg px-3 py-1.5 text-white placeholder-white/50 text-base font-semibold w-full mb-1.5 focus:outline-none focus:border-white/60 focus:bg-white/20 transition-all"
                        placeholder="Nombre del lead" />
                    ) : (
                      <h2 className="font-black text-white text-lg leading-tight truncate mb-1.5">
                        {data.name || <span className="italic text-white/50 font-normal text-base">Sin nombre</span>}
                      </h2>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {data.company && (
                        <span className="flex items-center gap-1 text-[11px] text-white/70 bg-white/10 px-2 py-0.5 rounded-full">
                          <Building2 size={9} /> {data.company}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white border border-white/20">
                        {STAGES.find(s => s.value === data.stage)?.label ?? data.stage}
                      </span>
                      <ChannelBadge channel={data.source} />
                    </div>
                  </div>
                </div>

                {/* Stat chips */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/15">
                    <p className="text-[9px] text-white/60 font-semibold uppercase tracking-wider mb-1">Score</p>
                    <div className="flex items-end gap-1">
                      <span className={`text-xl font-black leading-none ${scoreTextClass}`}>{data.qualification_score.toFixed(1)}</span>
                      <span className="text-[10px] text-white/40 mb-0.5">/10</span>
                    </div>
                    <p className={`text-[9px] font-semibold mt-0.5 ${scoreTextClass}`}>{scoreLabel}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/15">
                    <p className="text-[9px] text-white/60 font-semibold uppercase tracking-wider mb-1">Pipeline</p>
                    <span className="text-sm font-black text-emerald-300 leading-none">
                      {data.estimated_value ? `$${data.estimated_value.toLocaleString()}` : "—"}
                    </span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/15">
                    <p className="text-[9px] text-white/60 font-semibold uppercase tracking-wider mb-1">Fuente</p>
                    <span className="text-xs font-bold text-white capitalize leading-none">{data.source || "—"}</span>
                  </div>
                </div>

                {/* Pipeline bar */}
                <div className="mt-3.5">
                  <div className="flex items-center gap-0.5 mb-1.5">
                    {STAGES.slice(0, 7).map((s, idx) => (
                      <button key={s.value} onClick={() => stageMutation.mutate(s.value)} disabled={stageMutation.isPending}
                        title={s.label} className="h-1.5 flex-1 rounded-full transition-all hover:scale-y-[2] cursor-pointer"
                        style={{ background: idx <= currentStageIdx ? "linear-gradient(90deg,#a78bfa,#7c3aed)" : "rgba(255,255,255,0.15)" }} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-white/60">
                      Etapa {currentStageIdx + 1}/7 · <span className="text-white/80 font-semibold">{STAGES[currentStageIdx]?.label ?? data.stage}</span>
                    </p>
                    {stageMutation.isPending && <Loader2 size={10} className="animate-spin text-white/50" />}
                  </div>
                </div>
              </div>
            </div>

            {/* ══ TABS PILLS ══ */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-background border-b border-border flex-shrink-0 overflow-x-auto">
              {TAB_CONFIG.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all",
                    activeTab === tab.key
                      ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/25"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}>
                  {tab.label}
                  {"badge" in tab && (tab.badge ?? 0) > 0 && (
                    <span className={cn("text-[9px] font-black px-1 py-0.5 rounded-full min-w-[16px] text-center",
                      activeTab === tab.key ? "bg-white/25 text-white" : "bg-violet-100 text-violet-700")}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ══ BODY ══ */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* ── INFO ── */}
              {activeTab === "info" && (
                <>
                  <SectionCard icon={<User size={13} />} title="Contacto" gradient="from-violet-500 to-purple-600">
                    <div className="space-y-1">
                      <Field icon={<Mail size={12} />} label="Email" value={data.email} editMode={editMode} type="email" onChange={v => setForm(f => ({ ...f, email: v }))} />
                      <Field icon={<Phone size={12} />} label="Teléfono" value={data.phone} editMode={editMode} type="tel" onChange={v => setForm(f => ({ ...f, phone: v }))} />
                      <Field icon={<Building2 size={12} />} label="Empresa" value={data.company} editMode={editMode} onChange={v => setForm(f => ({ ...f, company: v }))} />
                      <Field icon={<Briefcase size={12} />} label="Cargo" value={data.position} editMode={editMode} onChange={v => setForm(f => ({ ...f, position: v }))} />
                    </div>
                  </SectionCard>

                  <SectionCard icon={<TrendingUp size={13} />} title="Oportunidad" gradient="from-emerald-500 to-teal-500">
                    <div className="space-y-1">
                      <Field icon={<DollarSign size={12} className="text-emerald-500" />} label="Valor est." value={data.estimated_value?.toString()} editMode={editMode} type="number" prefix="$" onChange={v => setForm(f => ({ ...f, estimated_value: v ? parseFloat(v) : undefined }))} />
                      <Field icon={<Calendar size={12} />} label="Próx. seguimiento" value={data.next_followup_at ? new Date(data.next_followup_at).toISOString().slice(0,16) : undefined} editMode={editMode} type="datetime-local" onChange={v => setForm(f => ({ ...f, next_followup_at: v }))} />
                    </div>
                  </SectionCard>

                  <SectionCard icon={<ArrowRight size={13} />} title="Cambiar etapa" gradient="from-blue-500 to-cyan-500">
                    <div className="grid grid-cols-2 gap-1.5">
                      {STAGES.map(s => (
                        <button key={s.value} onClick={() => stageMutation.mutate(s.value)} disabled={stageMutation.isPending || data.stage === s.value}
                          className={cn("px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all flex items-center gap-1.5",
                            data.stage === s.value
                              ? `${s.bg} ${s.color} border-current ring-2 ring-offset-1 ring-current/30`
                              : "border-border hover:border-violet-300 hover:bg-violet-50 text-muted-foreground hover:text-violet-700")}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </SectionCard>

                  <SectionCard icon={<MessageSquare size={13} />} title="Notas" gradient="from-amber-400 to-orange-500">
                    {editMode ? (
                      <textarea value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        rows={4} className="input-stripe w-full resize-none text-sm" placeholder="Escribe tus notas aquí..." />
                    ) : (
                      <p className={cn("text-sm leading-relaxed", data.notes ? "text-foreground" : "text-muted-foreground italic")}>
                        {data.notes || "Sin notas. Haz clic en editar para añadir."}
                      </p>
                    )}
                  </SectionCard>

                  {(data.tags?.length ?? 0) > 0 && (
                    <SectionCard icon={<Tag size={13} />} title="Etiquetas" gradient="from-indigo-500 to-violet-500">
                      <div className="flex flex-wrap gap-1.5">
                        {(data.tags as string[]).map(tag => (
                          <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 border border-violet-200">{tag}</span>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </>
              )}

              {/* ── BANT ── */}
              {activeTab === "bant" && (
                <>
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-2xl p-4 border border-violet-200 bg-gradient-to-br from-violet-50 via-purple-50 to-violet-50">
                    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-violet-200/40 blur-2xl pointer-events-none" />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-xs text-violet-500 font-semibold uppercase tracking-wider mb-1">Score BANT Global</p>
                        <div className="flex items-end gap-2">
                          <span className="text-4xl font-black" style={{ color: scoreColor }}>{data.qualification_score.toFixed(1)}</span>
                          <span className="text-base text-muted-foreground mb-1">/10</span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: scoreColor }}>
                          {data.qualification_score >= 7 ? "✅ Lead muy calificado — prioridad alta" : data.qualification_score >= 4 ? "⚠️ En proceso de calificación" : "❌ Necesita nurturing"}
                        </p>
                      </div>
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <svg width="80" height="80" className="-rotate-90">
                          <circle cx="40" cy="40" r="30" fill="none" stroke="#e2e8f0" strokeWidth="7" />
                          <motion.circle cx="40" cy="40" r="30" fill="none" stroke={scoreColor} strokeWidth="7"
                            strokeLinecap="round" initial={{ strokeDasharray: "0 188.5" }}
                            animate={{ strokeDasharray: `${(data.qualification_score / 10) * 188.5} 188.5` }}
                            transition={{ duration: 1, ease: "easeOut" }} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-lg font-black leading-none" style={{ color: scoreColor }}>{Math.round(data.qualification_score * 10)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-white/70 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ background: scoreColor }}
                        initial={{ width: 0 }} animate={{ width: `${(data.qualification_score / 10) * 100}%` }}
                        transition={{ duration: 1, ease: "easeOut" }} />
                    </div>
                  </motion.div>

                  {BANT_FIELDS.map(({ key, label, icon: Icon, placeholder, hint, gradient, glow, bg, border, text }, i) => (
                    <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                      className={cn("rounded-2xl border overflow-hidden shadow-md", border, glow)}>
                      <div className={cn("flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r", bg)}>
                        <div className={cn("w-6 h-6 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-sm", gradient)}>
                          <Icon size={12} />
                        </div>
                        <span className={cn("text-xs font-bold", text)}>{label}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{hint}</span>
                      </div>
                      <div className="px-4 py-3 bg-white/70 dark:bg-card">
                        {editMode ? (
                          <textarea value={(form as Record<string, string>)[key] ?? ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                            rows={2} className="input-stripe w-full resize-none text-sm" placeholder={placeholder} />
                        ) : (
                          <>
                            <p className={cn("text-sm", (data as unknown as Record<string, unknown>)[key] ? "text-foreground" : "text-muted-foreground italic")}>
                              {(data as unknown as Record<string, unknown>)[key] as string || placeholder}
                            </p>
                            <BantBar value={(data as unknown as Record<string, unknown>)[key] as string} />
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </>
              )}

              {/* ── ACTIVIDAD ── */}
              {activeTab === "activity" && (
                <div className="space-y-3">
                  <TimelineItem icon={<Star size={13} />} iconBg="from-violet-500 to-purple-600" title="Lead creado" time={data.created_at} />
                  {data.last_contacted_at && (
                    <TimelineItem icon={<MessageSquare size={13} />} iconBg="from-blue-500 to-cyan-500" title="Último contacto" time={data.last_contacted_at} />
                  )}
                  {data.next_followup_at && (
                    <TimelineItem icon={<Calendar size={13} />} iconBg="from-amber-400 to-orange-500" title="Próximo seguimiento" time={data.next_followup_at} future />
                  )}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                    className="mt-4 p-5 rounded-2xl border border-dashed border-border text-center bg-accent/20">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-3">
                      <AlertCircle size={18} className="text-violet-400" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">Historial de conversaciones</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Próximamente disponible</p>
                  </motion.div>
                </div>
              )}

              {/* ── EMAILS ── */}
              {activeTab === "emails" && (
                <div className="space-y-2">
                  {data.email && (
                    <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      onClick={() => router.push(`/email?compose=1&to=${encodeURIComponent(data.email!)}&lead=${data.id}`)}
                      className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-md shadow-sky-500/20"
                      style={{ background: "linear-gradient(135deg,#0EA5E9,#2563EB)" }}>
                      <Send size={12} /> Enviar email a {data.name || data.email}
                    </motion.button>
                  )}
                  {emailsLoading ? (
                    <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-violet-400" /></div>
                  ) : leadEmails.length === 0 ? (
                    <div className="flex flex-col items-center py-12 gap-3 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center">
                        <Inbox size={22} className="text-sky-400" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Sin emails</p>
                      <p className="text-xs text-muted-foreground">No hay emails registrados con este lead.</p>
                    </div>
                  ) : selectedLeadEmail ? (
                    <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
                      <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-sky-50 to-blue-50 flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground truncate">{selectedLeadEmail.subject || "(sin asunto)"}</p>
                        <button onClick={() => setSelectedLeadEmail(null)} className="p-1 rounded-lg hover:bg-white text-muted-foreground transition-colors flex-shrink-0 ml-2"><X size={13} /></button>
                      </div>
                      <div className="p-3 text-xs text-muted-foreground space-y-1 bg-white/50">
                        <p><span className="font-semibold text-foreground">De:</span> {selectedLeadEmail.from_name ? `${selectedLeadEmail.from_name} <${selectedLeadEmail.from_email}>` : selectedLeadEmail.from_email}</p>
                        <p><span className="font-semibold text-foreground">Para:</span> {selectedLeadEmail.to_emails.join(", ")}</p>
                        <p><span className="font-semibold text-foreground">Fecha:</span> {new Date(selectedLeadEmail.received_at || selectedLeadEmail.sent_at || selectedLeadEmail.created_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</p>
                      </div>
                      <div className="px-3 pb-3">
                        {selectedLeadEmail.body_html
                          ? <div className="prose prose-xs max-w-none text-xs border border-border rounded-xl p-3 bg-white max-h-48 overflow-y-auto" dangerouslySetInnerHTML={{ __html: selectedLeadEmail.body_html }} />
                          : <pre className="text-xs whitespace-pre-wrap font-sans bg-white border border-border rounded-xl p-3 max-h-48 overflow-y-auto">{selectedLeadEmail.body_text}</pre>}
                      </div>
                    </div>
                  ) : (
                    leadEmails.map((e, i) => (
                      <motion.button key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        onClick={() => setSelectedLeadEmail(e)} className="w-full text-left px-4 py-3 rounded-2xl border border-border hover:border-sky-300 hover:bg-sky-50/50 transition-all">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className={`text-xs font-semibold truncate ${!e.is_read && e.direction === "inbound" ? "text-foreground" : "text-muted-foreground"}`}>
                            {e.direction === "inbound" ? (e.from_name || e.from_email) : `→ ${e.to_emails[0] || ""}`}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border flex-shrink-0 ${e.direction === "inbound" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                            {e.direction === "inbound" ? "Recibido" : "Enviado"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{e.subject || "(sin asunto)"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(e.received_at || e.sent_at || e.created_at).toLocaleDateString("es-MX", { month: "short", day: "numeric", year: "2-digit" })}</p>
                      </motion.button>
                    ))
                  )}
                </div>
              )}

              {/* ── REUNIONES ── */}
              {activeTab === "meetings" && (
                <div className="space-y-3">
                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    onClick={() => router.push(`/meetings`)}
                    className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-md shadow-violet-500/25"
                    style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}>
                    <CalendarDays size={12} /> Agendar nueva reunión
                  </motion.button>

                  {meetingsLoading ? (
                    <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-violet-400" /></div>
                  ) : leadMeetings.length === 0 ? (
                    <div className="flex flex-col items-center py-12 gap-3 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                        <CalendarDays size={22} className="text-violet-400" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Sin reuniones</p>
                      <p className="text-xs text-muted-foreground">No hay reuniones registradas con este lead.</p>
                    </div>
                  ) : (
                    leadMeetings.map((meeting, i) => (
                      <motion.div key={meeting.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                        className="rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className={cn("px-4 py-3 flex items-start justify-between gap-2",
                          meeting.status === "completed" ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200" :
                          meeting.status === "cancelled" ? "bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-200" :
                          "bg-gradient-to-r from-blue-50 to-sky-50 border-b border-blue-200")}>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0",
                              meeting.provider === "google" ? "bg-gradient-to-br from-green-500 to-emerald-600" :
                              meeting.provider === "zoom" ? "bg-gradient-to-br from-blue-500 to-cyan-600" :
                              "bg-gradient-to-br from-slate-500 to-slate-600")}>
                              {meeting.provider !== "manual" ? <Video size={12} /> : <CalendarDays size={12} />}
                            </div>
                            <p className="text-xs font-bold text-foreground truncate">{meeting.title}</p>
                          </div>
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold border flex-shrink-0",
                            meeting.status === "completed" ? "bg-emerald-100 text-emerald-700 border-emerald-300" :
                            meeting.status === "cancelled" ? "bg-red-100 text-red-700 border-red-300" :
                            "bg-blue-100 text-blue-700 border-blue-300")}>
                            {meeting.status === "completed" ? "✓ Completada" : meeting.status === "cancelled" ? "Cancelada" : "Agendada"}
                          </span>
                        </div>
                        <div className="p-4 space-y-3">
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <Clock size={11} className="text-muted-foreground/60" />
                            {new Date(meeting.start_time).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                          {meeting.summary_text && (
                            <p className="text-[11px] text-muted-foreground bg-accent/40 rounded-xl p-3 leading-relaxed line-clamp-3">{meeting.summary_text}</p>
                          )}
                          {meeting.presentation_html ? (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex-1">
                                <FileText size={11} /> Presentación lista ✓
                              </div>
                              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                onClick={() => downloadPresentation(meeting)}
                                className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold shadow-sm">
                                <ExternalLink size={10} /> Descargar
                              </motion.button>
                            </div>
                          ) : meeting.status === "completed" ? (
                            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                              onClick={() => generatePresentation(meeting.id)} disabled={generatingPresentationId === meeting.id}
                              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white disabled:opacity-60 shadow-md shadow-violet-500/25">
                              {generatingPresentationId === meeting.id
                                ? <><Loader2 size={12} className="animate-spin" /> Generando presentación...</>
                                : <><Sparkles size={12} /> Generar presentación para el cliente</>}
                            </motion.button>
                          ) : (
                            <p className="text-[11px] text-muted-foreground italic text-center py-1">Disponible al completar la reunión</p>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* ══ FOOTER ══ */}
            <div className="border-t border-border px-5 py-4 flex flex-col gap-2.5 flex-shrink-0 bg-background">
              <motion.button
                whileHover={{ scale: followupDone ? 1 : 1.01 }} whileTap={{ scale: followupDone ? 1 : 0.99 }}
                onClick={() => followupMutation.mutate()}
                disabled={followupMutation.isPending || followupDone}
                className={cn("w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all shadow-md",
                  followupDone
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white cursor-default shadow-emerald-500/25"
                    : "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-violet-500/25")}>
                {followupDone ? <><CheckCircle size={16} /> ¡Seguimiento creado!</>
                  : followupMutation.isPending ? <><Loader2 size={16} className="animate-spin" /> Creando seguimiento...</>
                  : <><BotMessageSquare size={16} /> Comenzar seguimiento AI</>}
              </motion.button>
              <div className="flex items-center gap-2">
                {data.email && (
                  <button onClick={() => router.push(`/email?compose=1&to=${encodeURIComponent(data.email!)}&lead=${data.id}`)}
                    className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-xl text-xs font-semibold border border-border hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-all">
                    <Mail size={13} /> Email
                  </button>
                )}
                {data.phone && (
                  <a href={`tel:${data.phone}`} className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-xl text-xs font-semibold border border-border hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all">
                    <Phone size={13} /> Llamar
                  </a>
                )}
                {data.phone && (
                  <a href={`https://wa.me/${data.phone?.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-xl text-xs font-semibold border border-border hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-all">
                    <Zap size={13} className="text-emerald-500" /> WhatsApp
                  </a>
                )}
                {!data.email && !data.phone && <p className="text-xs text-muted-foreground flex-1 text-center">Sin datos de contacto</p>}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── sub-componentes ──────────────────────────────────────────────────────────

function SectionCard({ icon, title, gradient, children }: { icon: React.ReactNode; title: string; gradient: string; children: React.ReactNode; }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-accent/40 border-b border-border">
        <div className={cn("w-6 h-6 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-sm", gradient)}>{icon}</div>
        <span className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </motion.section>
  );
}

function Field({ icon, label, value, editMode, type = "text", prefix, onChange }: { icon: React.ReactNode; label: string; value?: string; editMode: boolean; type?: string; prefix?: string; onChange?: (v: string) => void; }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-5 flex-shrink-0 flex justify-center text-muted-foreground">{icon}</div>
      <span className="text-[11px] text-muted-foreground w-28 flex-shrink-0 font-medium">{label}</span>
      {editMode ? (
        <div className="flex items-center gap-1 flex-1">
          {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
          <input type={type} value={value ?? ""} onChange={e => onChange?.(e.target.value)} className="input-stripe flex-1 py-1 text-sm" />
        </div>
      ) : (
        <span className={cn("text-sm flex-1 truncate", value ? "text-foreground font-medium" : "text-muted-foreground italic")}>
          {value ? (prefix ? `${prefix}${value}` : value) : "—"}
        </span>
      )}
    </div>
  );
}

function TimelineItem({ icon, iconBg, title, time, future }: { icon: React.ReactNode; iconBg: string; title: string; time: string; future?: boolean; }) {
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 p-3.5 rounded-2xl border border-border bg-card hover:bg-accent/30 transition-colors">
      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0 bg-gradient-to-br", iconBg)}>{icon}</div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {future
            ? `Programado: ${new Date(time).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
            : timeAgo(time)}
        </p>
      </div>
    </motion.div>
  );
}
