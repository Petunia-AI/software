"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Plus,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  MessageCircle,
  AlertCircle,
  User,
  Loader2,
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
import { EmptyState } from "@/components/ui/empty-state";

interface FollowUpTask {
  id: string;
  type: string;
  content: string;
  scheduledAt: string;
  completedAt: string | null;
  lead: { name: string; property?: { title: string } | null };
}

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  steps: { day: number; type: string; content: string }[];
  isActive: boolean;
  _count?: { followUpTasks: number };
}

const typeIcons: Record<string, typeof Phone> = {
  CALL: Phone,
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
  REMINDER: Bell,
};

const typeLabels: Record<string, string> = {
  CALL: "Llamada",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  REMINDER: "Recordatorio",
};

const typeColors: Record<string, string> = {
  CALL: "bg-blue-100 text-blue-700",
  EMAIL: "bg-orange-100 text-orange-700",
  WHATSAPP: "bg-green-100 text-green-700",
  REMINDER: "bg-yellow-100 text-yellow-700",
};

export default function FollowUpPage() {
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tasks" | "sequences">("tasks");
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewSequence, setShowNewSequence] = useState(false);
  const [newTask, setNewTask] = useState({ type: "CALL", content: "", leadId: "" });
  const [newSeq, setNewSeq] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [leads, setLeads] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/follow-up").then((r) => r.json()),
      fetch("/api/follow-up/sequences").then((r) => r.json()).catch(() => []),
    ])
      .then(([tasksData, seqData]) => {
        if (Array.isArray(tasksData)) setTasks(tasksData);
        if (Array.isArray(seqData)) setSequences(seqData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleComplete = async (taskId: string) => {
    try {
      const res = await fetch(`/api/follow-up/${taskId}/complete`, { method: "PATCH" });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, completedAt: new Date().toISOString() } : t))
        );
        toast.success("Tarea completada");
      }
    } catch {
      toast.error("Error al completar");
    }
  };

  const handleOpenNewTask = async () => {
    setShowNewTask(true);
    if (leads.length === 0) {
      try {
        const res = await fetch("/api/leads");
        const data = await res.json();
        if (Array.isArray(data)) setLeads(data.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })));
      } catch { /* ignore */ }
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.content || !newTask.leadId) {
      toast.error("Completa todos los campos");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newTask.type,
          content: newTask.content,
          leadId: newTask.leadId,
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setTasks((prev) => [created, ...prev]);
        setShowNewTask(false);
        setNewTask({ type: "CALL", content: "", leadId: "" });
        toast.success("Tarea de seguimiento creada");
      } else {
        toast.error("Error al crear tarea");
      }
    } catch {
      toast.error("Error al crear tarea");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSequence = async () => {
    if (!newSeq.name) {
      toast.error("Ingresa un nombre para la secuencia");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/follow-up/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSeq.name,
          description: newSeq.description,
          steps: [
            { day: 1, type: "WHATSAPP", content: "Mensaje de bienvenida" },
            { day: 3, type: "CALL", content: "Llamada de seguimiento" },
            { day: 7, type: "EMAIL", content: "Email con información" },
          ],
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setSequences((prev) => [...prev, created]);
        setShowNewSequence(false);
        setNewSeq({ name: "", description: "" });
        toast.success("Secuencia creada");
      } else {
        toast.error("Error al crear secuencia");
      }
    } catch {
      toast.error("Error al crear secuencia");
    } finally {
      setSaving(false);
    }
  };

  const now = new Date();
  const pending = tasks.filter((t) => !t.completedAt);
  const overdue = pending.filter((t) => new Date(t.scheduledAt) < now);
  const today = pending.filter((t) => {
    const d = new Date(t.scheduledAt);
    return d >= now || d.toDateString() === now.toDateString();
  }).filter((t) => !overdue.includes(t));
  const completed = tasks.filter((t) => t.completedAt);
  const activeSequences = sequences.filter((s) => s.isActive);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #4A154B 0%, #350d36 60%, #1a0a1a 100%)' }}>
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='0.03'%3E%3Cpath d='M36 18c0-9.94-8.06-18-18-18S0 8.06 0 18 18 36 36 18'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <Bell className="h-5 w-5" />
              </div>
              <Badge className="bg-white/10 text-white/80 border-white/10 text-[10px] font-medium backdrop-blur-sm">
                Automatización
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Seguimiento</h1>
            <p className="text-white/70 text-sm max-w-md">
              Recordatorios, tareas y secuencias automatizadas
            </p>
          </div>
          <Button size="sm" className="rounded-xl bg-white text-[#4A154B] hover:bg-white/90 font-semibold" onClick={handleOpenNewTask}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo seguimiento
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Pendientes", value: today.length, icon: Clock, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Vencidos", value: overdue.length, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Completados", value: completed.length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Secuencias", value: activeSequences.length, icon: Bell, color: "text-foreground", bg: "bg-muted/50" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border/40 p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/40 w-fit">
        {[
          { id: "tasks" as const, label: "Tareas de seguimiento" },
          { id: "sequences" as const, label: "Secuencias" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks Tab */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          {/* Overdue */}
          {overdue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                <p className="text-[11px] font-medium text-red-500 uppercase tracking-widest">
                  Vencidos ({overdue.length})
                </p>
              </div>
              <div className="space-y-2">
                {overdue.map((task) => {
                  const Icon = typeIcons[task.type] || Bell;
                  return (
                    <div key={task.id} className="flex items-center justify-between p-4 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${typeColors[task.type] || "bg-muted"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{task.content}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {task.lead.name}
                            </span>
                            {task.lead.property && (
                              <>
                                <span className="text-muted-foreground/40">·</span>
                                <span className="text-xs text-muted-foreground">{task.lead.property.title}</span>
                              </>
                            )}
                            <span className="text-muted-foreground/40">·</span>
                            <Badge className={`text-[10px] rounded-full ${typeColors[task.type]}`}>
                              {typeLabels[task.type] || task.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-red-500 font-medium">
                          {new Date(task.scheduledAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                        </span>
                        <Button
                          size="sm"
                          className="h-8 text-xs rounded-xl bg-primary text-white hover:bg-foreground/90"
                          onClick={() => handleComplete(task.id)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                Pendientes ({today.length})
              </p>
            </div>
            {today.length > 0 ? (
              <div className="space-y-2">
                {today.map((task) => {
                  const Icon = typeIcons[task.type] || Bell;
                  return (
                    <div key={task.id} className="flex items-center justify-between p-4 rounded-2xl border border-border/40 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${typeColors[task.type] || "bg-muted"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{task.content}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {task.lead.name}
                            </span>
                            {task.lead.property && (
                              <>
                                <span className="text-muted-foreground/40">·</span>
                                <span className="text-xs text-muted-foreground">{task.lead.property.title}</span>
                              </>
                            )}
                            <span className="text-muted-foreground/40">·</span>
                            <Badge className={`text-[10px] rounded-full ${typeColors[task.type]}`}>
                              {typeLabels[task.type] || task.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.scheduledAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs rounded-xl border-border/40"
                          onClick={() => handleComplete(task.id)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-border/40">
                <EmptyState
                  icon={Clock}
                  titulo="Sin seguimientos pendientes"
                  descripcion="Crea una tarea de seguimiento para un lead o activa una secuencia automática."
                  botonTexto="Nueva tarea"
                  onBotonClick={handleOpenNewTask}
                />
              </div>
            )}
          </div>

          {/* Completed */}
          {completed.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                  Completados ({completed.length})
                </p>
              </div>
              <div className="space-y-2">
                {completed.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-muted/10 opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-green-100 dark:bg-green-950/30">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium line-through text-muted-foreground">{task.content}</p>
                        <span className="text-xs text-muted-foreground">{task.lead.name}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(task.completedAt!).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                ))}
                {completed.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    +{completed.length - 5} tareas completadas más
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sequences Tab */}
      {activeTab === "sequences" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sequences.map((seq) => (
            <div key={seq.id} className="rounded-2xl border border-border/40 p-5 hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{seq.name}</h3>
                  <Badge className={`rounded-full text-[10px] ${seq.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {seq.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                {seq.description && (
                  <p className="text-xs text-muted-foreground">{seq.description}</p>
                )}
                {Array.isArray(seq.steps) && seq.steps.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {seq.steps.slice(0, 3).map((step, i) => {
                      const StepIcon = typeIcons[step.type] || Bell;
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="text-[10px] font-mono w-8 shrink-0">D{step.day}</span>
                          <StepIcon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{step.content}</span>
                        </div>
                      );
                    })}
                    {seq.steps.length > 3 && (
                      <p className="text-[10px] text-muted-foreground/60 pl-8">+{seq.steps.length - 3} pasos más</p>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs text-muted-foreground">
                  <span>{Array.isArray(seq.steps) ? seq.steps.length : 0} pasos</span>
                  {seq._count?.followUpTasks !== undefined && (
                    <span>{seq._count.followUpTasks} tareas generadas</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <button onClick={() => setShowNewSequence(true)} className="rounded-2xl border-2 border-dashed border-border/40 hover:border-foreground/20 transition-all cursor-pointer">
            <div className="p-5 flex flex-col items-center justify-center h-full min-h-[160px]">
              <div className="p-3 rounded-full bg-muted/50 mb-2">
                <Plus className="h-5 w-5 text-foreground" />
              </div>
              <p className="text-sm font-medium">Nueva secuencia</p>
              <p className="text-xs text-muted-foreground mt-0.5">Crea un flujo de seguimiento</p>
            </div>
          </button>
        </div>
      )}

      {/* New Task Dialog */}
      <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo seguimiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={newTask.type} onValueChange={(v) => { if (v) setNewTask((p) => ({ ...p, type: v })); }}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CALL">Llamada</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="REMINDER">Recordatorio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Lead</Label>
              <Select value={newTask.leadId} onValueChange={(v) => { if (v) setNewTask((p) => ({ ...p, leadId: v })); }}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecciona un lead" /></SelectTrigger>
                <SelectContent>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                  {leads.length === 0 && (
                    <SelectItem value="_" disabled>No hay leads disponibles</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Descripcion</Label>
              <Textarea
                placeholder="Ej: Llamar para confirmar visita..."
                value={newTask.content}
                onChange={(e) => setNewTask((p) => ({ ...p, content: e.target.value }))}
                className="rounded-xl"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setShowNewTask(false)}>Cancelar</Button>
              <Button className="rounded-xl gold-gradient text-white border-0" onClick={handleCreateTask} disabled={saving}>
                {saving ? "Creando..." : "Crear tarea"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Sequence Dialog */}
      <Dialog open={showNewSequence} onOpenChange={setShowNewSequence}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nueva secuencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label>Nombre</Label>
              <Input
                placeholder="Ej: Seguimiento leads frios"
                value={newSeq.name}
                onChange={(e) => setNewSeq((p) => ({ ...p, name: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label>Descripcion</Label>
              <Textarea
                placeholder="Describe el objetivo de esta secuencia..."
                value={newSeq.description}
                onChange={(e) => setNewSeq((p) => ({ ...p, description: e.target.value }))}
                className="rounded-xl"
                rows={3}
              />
            </div>
            <div className="rounded-xl bg-muted/30 p-3">
              <p className="text-xs font-medium mb-2">Pasos iniciales (puedes editar despues):</p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><span className="font-mono w-6">D1</span><MessageCircle className="h-3 w-3" /> Mensaje de bienvenida</div>
                <div className="flex items-center gap-2"><span className="font-mono w-6">D3</span><Phone className="h-3 w-3" /> Llamada de seguimiento</div>
                <div className="flex items-center gap-2"><span className="font-mono w-6">D7</span><Mail className="h-3 w-3" /> Email con informacion</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setShowNewSequence(false)}>Cancelar</Button>
              <Button className="rounded-xl gold-gradient text-white border-0" onClick={handleCreateSequence} disabled={saving}>
                {saving ? "Creando..." : "Crear secuencia"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
