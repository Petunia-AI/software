"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { followupsApi, leadsApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  X, Phone, Mail, MessageSquare, Users, CheckSquare,
  Calendar, Bell, BellOff, Zap, Bot, Save, Loader2,
  AlertTriangle, ChevronDown,
} from "lucide-react";
import type { FollowUp, FollowUpStats } from "@/types/followup";
import { FOLLOWUP_TYPES, PRIORITY_CONFIG } from "@/types/followup";

interface FollowUpDrawerProps {
  open: boolean;
  onClose: () => void;
  editingFollowUp?: FollowUp | null;
  defaultLeadId?: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  call:     <Phone size={14} />,
  email:    <Mail size={14} />,
  whatsapp: <MessageSquare size={14} />,
  meeting:  <Users size={14} />,
  task:     <CheckSquare size={14} />,
};

function toLocalDatetimeInput(isoString?: string): string {
  if (!isoString) {
    // default: mañana a las 10:00
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  }
  return new Date(isoString).toISOString().slice(0, 16);
}

export default function FollowUpDrawer({ open, onClose, editingFollowUp, defaultLeadId }: FollowUpDrawerProps) {
  const qc = useQueryClient();

  const [form, setForm] = useState({
    lead_id: defaultLeadId ?? "",
    followup_type: "call" as string,
    title: "",
    description: "",
    priority: "medium" as string,
    scheduled_at: toLocalDatetimeInput(),
    assigned_to: "manual",
    notify_email: true,
    notify_whatsapp: false,
  });

  // Buscar leads para el selector
  const { data: leadsData } = useQuery({
    queryKey: ["leads", "all"],
    queryFn: () => leadsApi.list({ limit: 200 }).then(r => r.data),
    enabled: open,
  });
  const leads: Array<{ id: string; name?: string; email?: string; company?: string }> = leadsData ?? [];

  // Llenar form al editar
  useEffect(() => {
    if (editingFollowUp) {
      setForm({
        lead_id: editingFollowUp.lead_id,
        followup_type: editingFollowUp.followup_type,
        title: editingFollowUp.title,
        description: editingFollowUp.description ?? "",
        priority: editingFollowUp.priority,
        scheduled_at: toLocalDatetimeInput(editingFollowUp.scheduled_at),
        assigned_to: editingFollowUp.assigned_to,
        notify_email: editingFollowUp.notify_email,
        notify_whatsapp: editingFollowUp.notify_whatsapp,
      });
    } else {
      setForm(f => ({ ...f, lead_id: defaultLeadId ?? "", scheduled_at: toLocalDatetimeInput() }));
    }
  }, [editingFollowUp, defaultLeadId, open]);

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      followupsApi.create({
        ...data,
        scheduled_at: new Date(data.scheduled_at).toISOString(),
        description: data.description || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followups"] });
      qc.invalidateQueries({ queryKey: ["followup-stats"] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof form) =>
      followupsApi.update(editingFollowUp!.id, {
        ...data,
        scheduled_at: new Date(data.scheduled_at).toISOString(),
        description: data.description || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followups"] });
      onClose();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.lead_id || !form.title || !form.scheduled_at) return;
    if (editingFollowUp) updateMutation.mutate(form);
    else createMutation.mutate(form);
  }

  const selectedLead = leads.find(l => l.id === form.lead_id);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[460px] bg-background border-l border-border z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Calendar size={15} className="text-violet-600" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-foreground">
                    {editingFollowUp ? "Editar seguimiento" : "Nuevo seguimiento"}
                  </h2>
                  <p className="text-xs text-muted-foreground">Programar tarea de seguimiento</p>
                </div>
              </div>
              <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Lead selector */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Lead *</label>
                <div className="relative">
                  <select
                    value={form.lead_id}
                    onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))}
                    required
                    className="input-stripe w-full appearance-none pr-8"
                  >
                    <option value="">Seleccionar lead...</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name || l.email || "Sin nombre"}
                        {l.company ? ` — ${l.company}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
                {selectedLead && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedLead.email} {selectedLead.company && `· ${selectedLead.company}`}
                  </p>
                )}
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Tipo de seguimiento</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {FOLLOWUP_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, followup_type: t.value }))}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-all",
                        form.followup_type === t.value
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-border hover:border-border/80 hover:bg-accent text-muted-foreground"
                      )}
                    >
                      <span className="text-base">{t.icon}</span>
                      <span className="text-[10px]">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Título *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  placeholder={`Ej: Llamar a ${selectedLead?.name || 'lead'} para demo`}
                  className="input-stripe w-full"
                />
              </div>

              {/* Fecha/hora */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Fecha y hora *</label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  required
                  className="input-stripe w-full"
                />
              </div>

              {/* Prioridad */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Prioridad</label>
                <div className="flex gap-2">
                  {(["low", "medium", "high", "urgent"] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, priority: p }))}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all",
                        form.priority === p
                          ? PRIORITY_CONFIG[p].color + " border-current"
                          : "border-border text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {PRIORITY_CONFIG[p].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Contexto, objetivos, puntos a tratar..."
                  className="input-stripe w-full resize-none"
                />
              </div>

              {/* Asignado */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Asignar a</label>
                <div className="flex gap-2">
                  {[
                    { value: "ai", label: "IA automático", icon: <Bot size={13} /> },
                    { value: "manual", label: "Yo (manual)", icon: <Zap size={13} /> },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, assigned_to: opt.value }))}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all",
                        form.assigned_to === opt.value
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-border text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {opt.icon}{opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notificaciones */}
              <div className="bg-accent/40 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">Notificaciones</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setForm(f => ({ ...f, notify_email: !f.notify_email }))}
                    className={cn(
                      "w-9 h-5 rounded-full transition-colors relative cursor-pointer",
                      form.notify_email ? "bg-violet-600" : "bg-muted"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                      form.notify_email ? "translate-x-4" : "translate-x-0.5"
                    )} />
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-foreground">
                    <Mail size={12} /> Notificación por email
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setForm(f => ({ ...f, notify_whatsapp: !f.notify_whatsapp }))}
                    className={cn(
                      "w-9 h-5 rounded-full transition-colors relative cursor-pointer",
                      form.notify_whatsapp ? "bg-green-600" : "bg-muted"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                      form.notify_whatsapp ? "translate-x-4" : "translate-x-0.5"
                    )} />
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-foreground">
                    <MessageSquare size={12} /> Notificación por WhatsApp
                  </span>
                </label>
              </div>

              {/* Error */}
              {(createMutation.isError || updateMutation.isError) && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <AlertTriangle size={13} /> Error al guardar el seguimiento
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-border flex-shrink-0">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 py-2">
                Cancelar
              </button>
              <button
                onClick={handleSubmit as unknown as React.MouseEventHandler}
                disabled={isPending || !form.lead_id || !form.title}
                className="btn-primary flex-1 py-2 flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editingFollowUp ? "Guardar cambios" : "Crear seguimiento"}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
