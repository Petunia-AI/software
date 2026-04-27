"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays, Plus, Video, Link2, Users, Clock, CheckCircle2,
  XCircle, Trash2, Edit3, ChevronLeft, ChevronRight, FileText,
  Sparkles, Send, ExternalLink, Wifi, WifiOff, Loader2, X,
  AlertCircle, Download, Mail,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CalendarAccount {
  id: string;
  provider: "google" | "zoom";
  email_or_user: string;
  display_name: string;
  is_active: boolean;
}

interface Meeting {
  id: string;
  business_id: string;
  lead_id?: string;
  calendar_account_id?: string;
  title: string;
  description?: string;
  provider: "google" | "zoom" | "manual";
  status: "scheduled" | "completed" | "cancelled";
  meeting_url?: string;
  meeting_id_ext?: string;
  start_time: string;
  end_time: string;
  attendees_json?: string;
  transcript_text?: string;
  summary_text?: string;
  presentation_html?: string;
  follow_up_email_html?: string;
  created_at: string;
  updated_at: string;
}

interface Attendee {
  email: string;
  name?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const t = localStorage.getItem("token");
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

function parseAttendees(json?: string): Attendee[] {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}
function fmtDateTimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Agendada", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completada", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700" },
};

const PROVIDER_ICONS: Record<string, JSX.Element> = {
  google: <Video className="w-4 h-4 text-green-600" />,
  zoom: <Video className="w-4 h-4 text-blue-600" />,
  manual: <Link2 className="w-4 h-4 text-slate-500" />,
};

// ── Subcomponents ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] || { label: status, color: "bg-slate-100 text-slate-600" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>;
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error" | "info"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const colors = { success: "bg-green-600", error: "bg-red-600", info: "bg-blue-600" };
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-xl ${colors[type]} text-sm max-w-md`}>
      {type === "error" ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-1 opacity-75 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ── Create/Edit Meeting Modal ─────────────────────────────────────────────────

interface MeetingModalProps {
  calendarAccounts: CalendarAccount[];
  editMeeting?: Meeting | null;
  onClose: () => void;
  onSaved: (m: Meeting) => void;
  onConnectGoogle: () => void;
  onConnectZoom: () => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}

function MeetingModal({ calendarAccounts, editMeeting, onClose, onSaved, onConnectGoogle, onConnectZoom, toast }: MeetingModalProps) {
  const isEdit = !!editMeeting;
  const now = new Date();
  const startDefault = new Date(now.getTime() + 60 * 60 * 1000);
  const endDefault = new Date(startDefault.getTime() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const toLocal = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const [title, setTitle] = useState(editMeeting?.title || "");
  const [description, setDescription] = useState(editMeeting?.description || "");
  const [startTime, setStartTime] = useState(editMeeting ? fmtDateTimeLocal(editMeeting.start_time) : toLocal(startDefault));
  const [endTime, setEndTime] = useState(editMeeting ? fmtDateTimeLocal(editMeeting.end_time) : toLocal(endDefault));
  const [provider, setProvider] = useState<"google" | "zoom" | "manual">(editMeeting?.provider || "google");
  const [calAccountId, setCalAccountId] = useState(editMeeting?.calendar_account_id || "");
  const [attendeesInput, setAttendeesInput] = useState("");
  const [attendees, setAttendees] = useState<Attendee[]>(parseAttendees(editMeeting?.attendees_json));
  const [manualUrl, setManualUrl] = useState(editMeeting?.meeting_url || "");
  const [saving, setSaving] = useState(false);

  const googleAccounts = calendarAccounts.filter((a) => a.provider === "google" && a.is_active);
  const zoomAccounts = calendarAccounts.filter((a) => a.provider === "zoom" && a.is_active);

  function addAttendee() {
    const email = attendeesInput.trim();
    if (!email || !email.includes("@")) return;
    if (attendees.find((a) => a.email === email)) { setAttendeesInput(""); return; }
    setAttendees([...attendees, { email }]);
    setAttendeesInput("");
  }

  async function handleSave() {
    if (!title || !startTime || !endTime) { toast("Completa el título y fechas", "error"); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title,
        description,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        provider,
        calendar_account_id: (provider !== "manual" && calAccountId) ? calAccountId : null,
        attendees,
        meeting_url: provider === "manual" ? manualUrl : undefined,
      };
      const url = isEdit ? `${API}/meetings/${editMeeting!.id}` : `${API}/meetings`;
      const method = isEdit ? "PUT" : "POST";
      const resp = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || "Error al guardar");
      }
      const saved = await resp.json();
      toast(isEdit ? "Reunión actualizada" : "Reunión creada correctamente", "success");
      onSaved(saved);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Error inesperado", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-lg">{isEdit ? "Editar reunión" : "Nueva reunión"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Demo con cliente / Revisión de proyecto"
            />
          </div>
          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
              rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Agenda de la reunión..."
            />
          </div>
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Inicio *</label>
              <input type="datetime-local" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fin *</label>
              <input type="datetime-local" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          {/* Provider */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Plataforma</label>
            <div className="flex gap-2">
              {(["google", "zoom", "manual"] as const).map((p) => (
                <button key={p}
                  onClick={() => setProvider(p)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${provider === p ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {p === "google" ? "Google Meet" : p === "zoom" ? "Zoom" : "Sin enlace"}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar account selector */}
          {provider === "google" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cuenta Google Calendar</label>
              {googleAccounts.length > 0 ? (
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  value={calAccountId} onChange={(e) => setCalAccountId(e.target.value)}>
                  <option value="">— Sin crear en calendario —</option>
                  {googleAccounts.map((a) => <option key={a.id} value={a.id}>{a.display_name || a.email_or_user}</option>)}
                </select>
              ) : (
                <button onClick={onConnectGoogle} className="flex items-center gap-2 text-xs text-violet-600 hover:underline">
                  <Plus className="w-3 h-3" /> Conectar Google Calendar
                </button>
              )}
            </div>
          )}
          {provider === "zoom" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cuenta Zoom</label>
              {zoomAccounts.length > 0 ? (
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  value={calAccountId} onChange={(e) => setCalAccountId(e.target.value)}>
                  <option value="">— Sin crear en Zoom —</option>
                  {zoomAccounts.map((a) => <option key={a.id} value={a.id}>{a.display_name || a.email_or_user}</option>)}
                </select>
              ) : (
                <button onClick={onConnectZoom} className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                  <Plus className="w-3 h-3" /> Conectar Zoom
                </button>
              )}
            </div>
          )}
          {provider === "manual" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Enlace de reunión (opcional)</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}

          {/* Attendees */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Asistentes</label>
            <div className="flex gap-2 mb-2">
              <input className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                placeholder="email@cliente.com" value={attendeesInput} onChange={(e) => setAttendeesInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAttendee(); } }} />
              <button onClick={addAttendee} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {attendees.map((a) => (
                <span key={a.email} className="flex items-center gap-1 bg-violet-50 text-violet-700 text-xs px-2 py-1 rounded-full border border-violet-100">
                  {a.email}
                  <button onClick={() => setAttendees(attendees.filter((x) => x.email !== a.email))} className="ml-1 opacity-60 hover:opacity-100">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Guardar cambios" : "Crear reunión"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Transcript & AI Panel ─────────────────────────────────────────────────────

interface AIPanelProps {
  meeting: Meeting;
  onUpdated: (m: Meeting) => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}

function AIPanel({ meeting, onUpdated, toast }: AIPanelProps) {
  const [transcript, setTranscript] = useState(meeting.transcript_text || "");
  const [savingTranscript, setSavingTranscript] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingPresentation, setGeneratingPresentation] = useState(false);
  const [activeTab, setActiveTab] = useState<"transcript" | "summary" | "presentation" | "email">(
    meeting.presentation_html ? "presentation" : meeting.summary_text ? "summary" : "transcript"
  );
  const presentationRef = useRef<HTMLIFrameElement>(null);

  async function saveTranscript() {
    setSavingTranscript(true);
    try {
      const resp = await fetch(`${API}/meetings/${meeting.id}/transcript`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ transcript_text: transcript }),
      });
      if (!resp.ok) throw new Error("Error al guardar transcript");
      const updated = await resp.json();
      onUpdated(updated);
      toast("Transcript guardado", "success");
    } catch { toast("Error al guardar transcript", "error"); }
    finally { setSavingTranscript(false); }
  }

  async function generateSummary() {
    setGeneratingSummary(true);
    setActiveTab("summary");
    try {
      const resp = await fetch(`${API}/meetings/${meeting.id}/generate-summary`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || "Error al generar resumen");
      }
      const updated = await resp.json();
      onUpdated(updated);
      toast("Resumen generado con Gemini", "success");
    } catch (e: unknown) { toast(e instanceof Error ? e.message : "Error al generar resumen", "error"); }
    finally { setGeneratingSummary(false); }
  }

  async function generatePresentation() {
    setGeneratingPresentation(true);
    setActiveTab("presentation");
    try {
      const resp = await fetch(`${API}/meetings/${meeting.id}/generate-presentation`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || "Error al generar presentación");
      }
      const updated = await resp.json();
      onUpdated(updated);
      toast("Presentación generada con Claude ✨", "success");
    } catch (e: unknown) { toast(e instanceof Error ? e.message : "Error al generar presentación", "error"); }
    finally { setGeneratingPresentation(false); }
  }

  function downloadPresentation() {
    if (!meeting.presentation_html) return;
    const blob = new Blob([meeting.presentation_html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meeting.title.replace(/\s+/g, "_")}_presentacion.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openEmailWithPresentation() {
    if (!meeting.follow_up_email_html) return;
    const lead = meeting.lead_id ? `&lead=${meeting.lead_id}` : "";
    window.location.href = `/email?compose=1${lead}&subject=${encodeURIComponent(`Seguimiento: ${meeting.title}`)}&body=${encodeURIComponent(meeting.follow_up_email_html)}`;
  }

  const hasTranscript = !!meeting.transcript_text;
  const hasSummary = !!meeting.summary_text;
  const hasPresentation = !!meeting.presentation_html;
  const hasEmail = !!meeting.follow_up_email_html;

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-slate-100">
        {([
          { key: "transcript", label: "Transcript", icon: FileText, enabled: true },
          { key: "summary", label: "Resumen", icon: Sparkles, enabled: true },
          { key: "presentation", label: "Presentación", icon: Download, enabled: true },
          { key: "email", label: "Email", icon: Mail, enabled: true },
        ] as const).map(({ key, label, icon: Icon, enabled }) => (
          <button key={key} disabled={!enabled}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === key ? "border-violet-500 text-violet-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            {key === "summary" && hasSummary && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
            {key === "presentation" && hasPresentation && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Transcript */}
        {activeTab === "transcript" && (
          <div className="space-y-3 h-full flex flex-col">
            <p className="text-xs text-slate-500">Pega aquí la transcripción de la reunión (copia desde Zoom, Meet, Otter.ai, etc.).</p>
            <textarea
              className="flex-1 min-h-[200px] w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
              placeholder="[00:00] Juan: Hola, muchas gracias por tu tiempo hoy..." value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">{transcript.length.toLocaleString()} caracteres</span>
              <button onClick={saveTranscript} disabled={savingTranscript || !transcript}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-xs rounded-lg hover:bg-slate-700 disabled:opacity-50">
                {savingTranscript ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                Guardar transcript
              </button>
            </div>
            {hasTranscript && (
              <button onClick={generateSummary} disabled={generatingSummary}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-violet-600 text-white text-sm rounded-xl hover:bg-violet-700 disabled:opacity-60 font-medium">
                {generatingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generatingSummary ? "Generando resumen con Gemini..." : "Resumir con Gemini"}
              </button>
            )}
          </div>
        )}

        {/* Summary */}
        {activeTab === "summary" && (
          <div className="space-y-3 h-full flex flex-col">
            {generatingSummary ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                <p className="text-sm">Gemini está analizando la reunión...</p>
              </div>
            ) : hasSummary ? (
              <>
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-4 flex-1 overflow-auto">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
                    {meeting.summary_text}
                  </pre>
                </div>
                <div className="flex gap-2">
                  <button onClick={generateSummary} disabled={generatingSummary}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50">
                    <Sparkles className="w-3.5 h-3.5" /> Regenerar
                  </button>
                  {hasSummary && (
                    <button onClick={generatePresentation} disabled={generatingPresentation}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-60 font-medium">
                      {generatingPresentation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {generatingPresentation ? "Generando con Claude..." : "Generar presentación con Claude"}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                <Sparkles className="w-10 h-10 text-violet-300" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600">Aún no hay resumen</p>
                  <p className="text-xs text-slate-400 mt-1">Guarda el transcript y genera el resumen con Gemini</p>
                </div>
                {hasTranscript && (
                  <button onClick={generateSummary}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700">
                    <Sparkles className="w-4 h-4" /> Resumir con Gemini
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Presentation */}
        {activeTab === "presentation" && (
          <div className="space-y-3 h-full flex flex-col">
            {generatingPresentation ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                <p className="text-sm">Claude está creando la presentación...</p>
              </div>
            ) : hasPresentation ? (
              <>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={downloadPresentation}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 text-white rounded-lg hover:bg-slate-700">
                    <Download className="w-3.5 h-3.5" /> Descargar HTML
                  </button>
                  <button onClick={generatePresentation} disabled={generatingPresentation}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50">
                    <Sparkles className="w-3.5 h-3.5" /> Regenerar
                  </button>
                </div>
                <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <iframe
                    ref={presentationRef}
                    className="w-full h-full min-h-[400px]"
                    srcDoc={meeting.presentation_html}
                    sandbox="allow-same-origin"
                    title="Presentación"
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                <Download className="w-10 h-10 text-violet-300" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600">Presentación no generada</p>
                  <p className="text-xs text-slate-400 mt-1">Primero genera el resumen con Gemini</p>
                </div>
                {hasSummary && (
                  <button onClick={generatePresentation}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700">
                    <Sparkles className="w-4 h-4" /> Generar presentación
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Follow-up email */}
        {activeTab === "email" && (
          <div className="space-y-3 h-full flex flex-col">
            {hasEmail ? (
              <>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={openEmailWithPresentation}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700">
                    <Send className="w-3.5 h-3.5" /> Abrir en Email CRM
                  </button>
                  <button onClick={generatePresentation} disabled={generatingPresentation}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50">
                    <Sparkles className="w-3.5 h-3.5" /> Regenerar
                  </button>
                </div>
                <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <iframe
                    className="w-full h-full min-h-[400px]"
                    srcDoc={meeting.follow_up_email_html}
                    sandbox="allow-same-origin"
                    title="Email de seguimiento"
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                <Mail className="w-10 h-10 text-violet-300" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600">Email de seguimiento no generado</p>
                  <p className="text-xs text-slate-400 mt-1">Se genera junto con la presentación</p>
                </div>
                {hasSummary && (
                  <button onClick={generatePresentation}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700">
                    <Sparkles className="w-4 h-4" /> Generar email de seguimiento
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const searchParams = useSearchParams();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [calendarAccounts, setCalendarAccounts] = useState<CalendarAccount[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [connectingZoom, setConnectingZoom] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [meetsResp, accResp] = await Promise.all([
        fetch(`${API}/meetings`, { headers: authHeaders() }),
        fetch(`${API}/meetings/calendar-accounts`, { headers: authHeaders() }),
      ]);
      if (meetsResp.ok) setMeetings(await meetsResp.json());
      if (accResp.ok) setCalendarAccounts(await accResp.json());
    } catch {
      showToast("Error al cargar datos", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // Handle OAuth redirect feedback
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "google") showToast("Google Calendar conectado correctamente", "success");
    else if (connected === "zoom") showToast("Zoom conectado correctamente", "success");
    else if (error) showToast(`Error al conectar: ${error}`, "error");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function connectGoogle() {
    setConnectingGoogle(true);
    try {
      const resp = await fetch(`${API}/meetings/calendar/connect-google`, { headers: authHeaders() });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || "Error al conectar Google");
      }
      const { auth_url } = await resp.json();
      window.location.href = auth_url;
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error", "error");
      setConnectingGoogle(false);
    }
  }

  async function connectZoom() {
    setConnectingZoom(true);
    try {
      const resp = await fetch(`${API}/meetings/calendar/connect-zoom`, { headers: authHeaders() });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || "Error al conectar Zoom");
      }
      const { auth_url } = await resp.json();
      window.location.href = auth_url;
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error", "error");
      setConnectingZoom(false);
    }
  }

  async function disconnectAccount(id: string) {
    await fetch(`${API}/meetings/calendar-accounts/${id}`, { method: "DELETE", headers: authHeaders() });
    setCalendarAccounts((prev) => prev.filter((a) => a.id !== id));
    showToast("Cuenta desconectada", "info");
  }

  async function deleteMeeting(id: string) {
    await fetch(`${API}/meetings/${id}`, { method: "DELETE", headers: authHeaders() });
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    if (selectedMeeting?.id === id) setSelectedMeeting(null);
    showToast("Reunión eliminada", "info");
  }

  async function changeStatus(id: string, status: string) {
    const resp = await fetch(`${API}/meetings/${id}/status?status=${status}`, {
      method: "PATCH", headers: authHeaders(),
    });
    if (resp.ok) {
      const updated = await resp.json();
      setMeetings((prev) => prev.map((m) => m.id === id ? updated : m));
      if (selectedMeeting?.id === id) setSelectedMeeting(updated);
    }
  }

  function handleMeetingSaved(m: Meeting) {
    setMeetings((prev) => {
      const idx = prev.findIndex((x) => x.id === m.id);
      return idx >= 0 ? prev.map((x) => x.id === m.id ? m : x) : [m, ...prev];
    });
    setSelectedMeeting(m);
    setShowModal(false);
    setEditMeeting(null);
  }

  function handleMeetingUpdated(m: Meeting) {
    setMeetings((prev) => prev.map((x) => x.id === m.id ? m : x));
    setSelectedMeeting(m);
  }

  const filteredMeetings = meetings.filter((m) => filterStatus === "all" || m.status === filterStatus);

  const now = new Date();
  const upcoming = filteredMeetings.filter((m) => new Date(m.start_time) >= now && m.status === "scheduled");
  const past = filteredMeetings.filter((m) => new Date(m.start_time) < now || m.status !== "scheduled");

  const googleAccounts = calendarAccounts.filter((a) => a.provider === "google");
  const zoomAccounts = calendarAccounts.filter((a) => a.provider === "zoom");

  return (
    <div className="flex h-full bg-slate-50">
      {/* Left sidebar — Meeting list */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-violet-600" />
              <h1 className="font-semibold text-slate-800">Reuniones</h1>
            </div>
            <button
              onClick={() => { setEditMeeting(null); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700 font-medium">
              <Plus className="w-3.5 h-3.5" /> Nueva
            </button>
          </div>

          {/* Filter */}
          <div className="flex gap-1">
            {[["all", "Todas"], ["scheduled", "Agendadas"], ["completed", "Completadas"]].map(([val, label]) => (
              <button key={val}
                onClick={() => setFilterStatus(val)}
                className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${filterStatus === val ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:text-slate-700"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar connections strip */}
        <div className="p-3 bg-slate-50 border-b border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-2">Calendarios conectados</p>
          <div className="flex flex-wrap gap-1.5">
            {googleAccounts.map((a) => (
              <span key={a.id} className="flex items-center gap-1 bg-white border border-green-200 text-green-700 text-xs px-2 py-1 rounded-full">
                <Wifi className="w-3 h-3" /> {a.display_name || "Google Calendar"}
                <button onClick={() => disconnectAccount(a.id)} className="opacity-50 hover:opacity-100 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {zoomAccounts.map((a) => (
              <span key={a.id} className="flex items-center gap-1 bg-white border border-blue-200 text-blue-700 text-xs px-2 py-1 rounded-full">
                <Wifi className="w-3 h-3" /> {a.display_name || "Zoom"}
                <button onClick={() => disconnectAccount(a.id)} className="opacity-50 hover:opacity-100 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {googleAccounts.length === 0 && (
              <button onClick={connectGoogle} disabled={connectingGoogle}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-green-700 border border-dashed border-slate-300 rounded-full px-2 py-1 hover:border-green-400">
                {connectingGoogle ? <Loader2 className="w-3 h-3 animate-spin" /> : <WifiOff className="w-3 h-3" />}
                Google Meet
              </button>
            )}
            {zoomAccounts.length === 0 && (
              <button onClick={connectZoom} disabled={connectingZoom}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-700 border border-dashed border-slate-300 rounded-full px-2 py-1 hover:border-blue-400">
                {connectingZoom ? <Loader2 className="w-3 h-3 animate-spin" /> : <WifiOff className="w-3 h-3" />}
                Zoom
              </button>
            )}
          </div>
        </div>

        {/* Meeting list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2">
              <CalendarDays className="w-8 h-8 text-slate-200" />
              <p className="text-sm">No hay reuniones</p>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 pt-3 pb-1">Próximas</p>
                  {upcoming.map((m) => (
                    <MeetingListItem key={m.id} meeting={m} selected={selectedMeeting?.id === m.id}
                      onClick={() => setSelectedMeeting(m)} />
                  ))}
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 pt-3 pb-1">Anteriores</p>
                  {past.map((m) => (
                    <MeetingListItem key={m.id} meeting={m} selected={selectedMeeting?.id === m.id}
                      onClick={() => setSelectedMeeting(m)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedMeeting ? (
          <MeetingDetail
            meeting={selectedMeeting}
            onEdit={() => { setEditMeeting(selectedMeeting); setShowModal(true); }}
            onDelete={() => deleteMeeting(selectedMeeting.id)}
            onStatusChange={(s) => changeStatus(selectedMeeting.id, s)}
            onUpdated={handleMeetingUpdated}
            toast={showToast}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
            <CalendarDays className="w-16 h-16 text-slate-200" />
            <div className="text-center">
              <p className="text-lg font-medium text-slate-600">Selecciona una reunión</p>
              <p className="text-sm text-slate-400 mt-1">o crea una nueva para empezar</p>
            </div>
            <button
              onClick={() => { setEditMeeting(null); setShowModal(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 font-medium text-sm">
              <Plus className="w-4 h-4" /> Agendar reunión
            </button>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <MeetingModal
          calendarAccounts={calendarAccounts}
          editMeeting={editMeeting}
          onClose={() => { setShowModal(false); setEditMeeting(null); }}
          onSaved={handleMeetingSaved}
          onConnectGoogle={connectGoogle}
          onConnectZoom={connectZoom}
          toast={showToast}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── Meeting List Item ─────────────────────────────────────────────────────────

function MeetingListItem({ meeting, selected, onClick }: { meeting: Meeting; selected: boolean; onClick: () => void }) {
  const hasAI = !!(meeting.summary_text || meeting.presentation_html);
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${selected ? "bg-violet-50 border-r-2 border-r-violet-500" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {PROVIDER_ICONS[meeting.provider]}
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{meeting.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {fmtDate(meeting.start_time)} · {fmtTime(meeting.start_time)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <StatusBadge status={meeting.status} />
          {hasAI && <Sparkles className="w-3 h-3 text-violet-400" />}
        </div>
      </div>
    </button>
  );
}

// ── Meeting Detail ────────────────────────────────────────────────────────────

interface MeetingDetailProps {
  meeting: Meeting;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: string) => void;
  onUpdated: (m: Meeting) => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}

function MeetingDetail({ meeting, onEdit, onDelete, onStatusChange, onUpdated, toast }: MeetingDetailProps) {
  const attendees = parseAttendees(meeting.attendees_json);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Detail header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl ${meeting.provider === "google" ? "bg-green-50" : meeting.provider === "zoom" ? "bg-blue-50" : "bg-slate-50"}`}>
            {PROVIDER_ICONS[meeting.provider]}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{meeting.title}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              <Clock className="w-3.5 h-3.5 inline mr-1" />
              {fmtDate(meeting.start_time)} · {fmtTime(meeting.start_time)} – {fmtTime(meeting.end_time)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={meeting.status} />
          {meeting.meeting_url && (
            <a href={meeting.meeting_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700 font-medium">
              <ExternalLink className="w-3.5 h-3.5" /> Unirse
            </a>
          )}
          <button onClick={onEdit} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={() => setConfirmDelete(true)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-6 px-6 py-3 bg-slate-50 border-b border-slate-100 text-sm flex-wrap">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Users className="w-4 h-4 text-slate-400" />
          {attendees.length > 0
            ? attendees.map((a) => a.email).join(", ")
            : <span className="text-slate-400">Sin asistentes registrados</span>}
        </div>
        {meeting.description && (
          <span className="text-slate-500">{meeting.description}</span>
        )}
        {/* Status change */}
        <div className="ml-auto flex gap-2">
          {meeting.status !== "completed" && (
            <button onClick={() => onStatusChange("completed")}
              className="flex items-center gap-1 text-xs text-green-600 border border-green-200 rounded-lg px-2 py-1 hover:bg-green-50">
              <CheckCircle2 className="w-3.5 h-3.5" /> Marcar completada
            </button>
          )}
          {meeting.status !== "cancelled" && meeting.status !== "completed" && (
            <button onClick={() => onStatusChange("cancelled")}
              className="flex items-center gap-1 text-xs text-red-500 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50">
              <XCircle className="w-3.5 h-3.5" /> Cancelar
            </button>
          )}
        </div>
      </div>

      {/* AI Panel */}
      <div className="flex-1 overflow-hidden">
        <AIPanel meeting={meeting} onUpdated={onUpdated} toast={toast} />
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80">
            <h3 className="font-semibold text-slate-800 mb-2">¿Eliminar reunión?</h3>
            <p className="text-sm text-slate-500 mb-4">Esta acción no se puede deshacer. Se eliminará toda la información, transcript y presentación.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={() => { setConfirmDelete(false); onDelete(); }}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
