"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Mail,
  Plus,
  Play,
  Pause,
  Trash2,
  Users,
  Clock,
  ChevronRight,
  ArrowLeft,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────

interface DripStep {
  id?: string;
  stepNumber: number;
  delayDays: number;
  subject: string;
  bodyHtml: string;
}

interface EmailDrip {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  triggerStatus: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED";
  fromName: string | null;
  fromEmail: string | null;
  replyTo: string | null;
  totalEnrolled: number;
  totalCompleted: number;
  createdAt: string;
  steps: DripStep[];
  _count?: { enrollments: number };
}

// ─── Constants ─────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  "lead.created": "Al crear un lead",
  "lead.status_changed": "Al cambiar estatus del lead",
  manual: "Manual (asignación manual)",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PAUSED: "bg-amber-50 text-amber-700",
  DRAFT: "bg-gray-100 text-gray-600",
};

const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

// ─── Drip Card ─────────────────────────────────────────────────────────────

function DripCard({
  drip,
  onOpen,
  onToggle,
  onDelete,
}: {
  drip: EmailDrip;
  onOpen: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 flex flex-col gap-4 hover:border-gray-200 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[drip.status]}`}>
              {drip.status === "ACTIVE" ? "Activa" : drip.status === "PAUSED" ? "Pausada" : "Borrador"}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{drip.name}</h3>
          {drip.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{drip.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggle}
            title={drip.status === "ACTIVE" ? "Pausar" : "Activar"}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition"
          >
            {drip.status === "ACTIVE" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Mail className="w-3 h-3" />
          {drip.steps.length} emails
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {drip.totalEnrolled} inscritos
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {drip.totalCompleted} completados
        </span>
      </div>

      <div className="text-xs text-gray-400 border-t border-gray-100 pt-3">
        {TRIGGER_LABELS[drip.trigger] ?? drip.trigger}
        {drip.triggerStatus && ` → ${drip.triggerStatus}`}
      </div>

      <button
        onClick={onOpen}
        className="flex items-center justify-center gap-1.5 w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-800 text-sm rounded-xl transition border border-gray-200"
      >
        Editar secuencia <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Step Editor ───────────────────────────────────────────────────────────

function StepEditor({
  step,
  index,
  onChange,
  onRemove,
}: {
  step: DripStep;
  index: number;
  onChange: (s: DripStep) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-violet-600">Email #{index + 1}</span>
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 transition">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Días de espera</label>
          <input
            type="number"
            min={0}
            value={step.delayDays}
            onChange={(e) => onChange({ ...step, delayDays: parseInt(e.target.value) || 0 })}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Asunto del email</label>
          <input
            value={step.subject}
            onChange={(e) => onChange({ ...step, subject: e.target.value })}
            placeholder="Hola {{nombre}}…"
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Cuerpo del email (HTML)</label>
        <textarea
          rows={4}
          value={step.bodyHtml}
          onChange={(e) => onChange({ ...step, bodyHtml: e.target.value })}
          placeholder="<p>Hola {{nombre}}, te escribo para…</p>"
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">Usa {"{{nombre}}"} para personalizar con el nombre del lead.</p>
      </div>
    </div>
  );
}

// ─── Drip Form ─────────────────────────────────────────────────────────────

function DripForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<EmailDrip>;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [trigger, setTrigger] = useState(initial?.trigger ?? "lead.created");
  const [triggerStatus, setTriggerStatus] = useState(initial?.triggerStatus ?? "");
  const [fromName, setFromName] = useState(initial?.fromName ?? "");
  const [fromEmail, setFromEmail] = useState(initial?.fromEmail ?? "");
  const [replyTo, setReplyTo] = useState(initial?.replyTo ?? "");
  const [steps, setSteps] = useState<DripStep[]>(
    initial?.steps ?? [{ stepNumber: 1, delayDays: 0, subject: "", bodyHtml: "" }]
  );
  const [saving, setSaving] = useState(false);

  const addStep = () =>
    setSteps((prev) => [
      ...prev,
      { stepNumber: prev.length + 1, delayDays: 3, subject: "", bodyHtml: "" },
    ]);

  const removeStep = (i: number) =>
    setSteps((prev) => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, stepNumber: idx + 1 })));

  const handleSubmit = async () => {
    if (!name) { toast.error("El nombre es requerido"); return; }
    if (steps.some((s) => !s.subject || !s.bodyHtml)) {
      toast.error("Todos los emails necesitan asunto y cuerpo");
      return;
    }
    setSaving(true);
    try {
      await onSave({ name, description, trigger, triggerStatus: trigger === "lead.status_changed" ? triggerStatus : null, fromName, fromEmail, replyTo, steps });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-xl transition">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {initial?.id ? "Editar secuencia" : "Nueva secuencia de email"}
        </h2>
      </div>

      {/* Meta fields */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs text-gray-500 block mb-1">Nombre de la secuencia *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" placeholder="Bienvenida a nuevos leads" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-gray-500 block mb-1">Descripción</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" placeholder="Breve descripción del objetivo…" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Trigger (cuándo se activa)</label>
          <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400">
            {Object.entries(TRIGGER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {trigger === "lead.status_changed" && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">Estatus que activa el trigger</label>
            <select value={triggerStatus} onChange={(e) => setTriggerStatus(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400">
              <option value="">Seleccionar…</option>
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Nombre del remitente</label>
          <input value={fromName} onChange={(e) => setFromName(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" placeholder="Tu Agencia Inmobiliaria" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Email remitente</label>
          <input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" placeholder="hola@tuagencia.com" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Reply-To</label>
          <input type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" placeholder="respuestas@tuagencia.com" />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Emails de la secuencia ({steps.length})</h3>
          <button onClick={addStep} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-violet-600/80 hover:bg-violet-600 text-white rounded-xl transition">
            <Plus className="w-3.5 h-3.5" /> Agregar email
          </button>
        </div>
        {steps.map((step, i) => (
          <StepEditor
            key={i}
            step={step}
            index={i}
            onChange={(s) => setSteps((prev) => prev.map((x, idx) => idx === i ? s : x))}
            onRemove={() => removeStep(i)}
          />
        ))}
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition">
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition">
          <Save className="w-4 h-4" />
          {saving ? "Guardando…" : "Guardar secuencia"}
        </button>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function EmailDripPage() {
  const [drips, setDrips] = useState<EmailDrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "new" | "edit">("list");
  const [editing, setEditing] = useState<EmailDrip | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/drip");
      if (res.ok) setDrips(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: any) => {
    const isEdit = view === "edit" && editing;
    const res = await fetch(isEdit ? `/api/drip/${editing!.id}` : "/api/drip", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast.success(isEdit ? "Secuencia actualizada" : "Secuencia creada");
      setView("list");
      setEditing(null);
      load();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al guardar");
    }
  };

  const handleToggle = async (drip: EmailDrip) => {
    const newStatus = drip.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const res = await fetch(`/api/drip/${drip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success(newStatus === "ACTIVE" ? "Secuencia activada" : "Secuencia pausada");
      load();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta secuencia? Se cancelarán todos los enrollments activos.")) return;
    const res = await fetch(`/api/drip/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Secuencia eliminada"); load(); }
  };

  if (view !== "list") {
    return (
      <div className="max-w-3xl">
        <DripForm
          initial={editing ?? undefined}
          onSave={handleSave}
          onCancel={() => { setView("list"); setEditing(null); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-violet-600" />
            Email Drip Campaigns
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Secuencias automatizadas de email para nutrir tus leads
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setView("new"); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition"
        >
          <Plus className="w-4 h-4" />
          Nueva secuencia
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <strong className="text-blue-800">Cómo funciona:</strong> Configura el trigger (ej. "Al crear un lead"),
          agrega los emails con sus días de espera, activa la secuencia.
          El cron <code className="text-blue-700 bg-blue-100 px-1 rounded">/api/cron/process-drips</code> envía
          automáticamente cada email en el momento correcto.
          Configura <code className="text-blue-700 bg-blue-100 px-1 rounded">RESEND_API_KEY</code> en tu .env para activar el envío real.
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : drips.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium text-gray-500">Sin secuencias</p>
          <p className="text-sm mt-1">Crea tu primera campaña drip para automatizar el seguimiento.</p>
          <button
            onClick={() => setView("new")}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition"
          >
            <Plus className="w-4 h-4" /> Crear primera secuencia
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drips.map((d) => (
            <DripCard
              key={d.id}
              drip={d}
              onOpen={() => { setEditing(d); setView("edit"); }}
              onToggle={() => handleToggle(d)}
              onDelete={() => handleDelete(d.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
