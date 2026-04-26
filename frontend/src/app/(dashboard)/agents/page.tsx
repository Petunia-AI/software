"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { businessApi } from "@/lib/api";
import { Bot, Zap, Target, Heart, Headphones, BarChart2, CheckCircle, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const AGENT_TYPES = [
  {
    type: "qualifier",
    name: "Calificador",
    icon: Target,
    color: "bg-blue-100 text-blue-700",
    gradient: "linear-gradient(135deg,#3B82F6,#6366F1)",
    glow: "rgba(59,130,246,0.25)",
    description: "Califica leads con el framework BANT. Temperatura baja para ser consistente.",
    defaultPersona: "Sofía",
    defaultTone: "amigable y profesional",
  },
  {
    type: "closer",
    name: "Cerrador",
    icon: Zap,
    color: "bg-green-100 text-green-700",
    gradient: "linear-gradient(135deg,#10B981,#059669)",
    glow: "rgba(16,185,129,0.25)",
    description: "Cierra ventas con leads calificados. Persuasivo y orientado a resultados.",
    defaultPersona: "Carlos",
    defaultTone: "directo y persuasivo",
  },
  {
    type: "nurturer",
    name: "Nurturing",
    icon: Heart,
    color: "bg-orange-100 text-orange-700",
    gradient: "linear-gradient(135deg,#F97316,#EA580C)",
    glow: "rgba(249,115,22,0.25)",
    description: "Mantiene el contacto con leads fríos. Educativo y paciente.",
    defaultPersona: "Ana",
    defaultTone: "empático y educativo",
  },
  {
    type: "support",
    name: "Soporte",
    icon: Headphones,
    color: "bg-purple-100 text-purple-700",
    gradient: "linear-gradient(135deg,#635BFF,#8B5CF6)",
    glow: "rgba(99,91,255,0.25)",
    description: "Soporte post-venta y detección de upsell. Preciso y resolutivo.",
    defaultPersona: "Valentina",
    defaultTone: "preciso y empático",
  },
  {
    type: "analyst",
    name: "Analista",
    icon: BarChart2,
    color: "bg-gray-100 text-gray-700",
    gradient: "linear-gradient(135deg,#64748B,#475569)",
    glow: "rgba(100,116,139,0.25)",
    description: "Analiza conversaciones en background y genera insights diarios.",
    defaultPersona: "Sistema",
    defaultTone: "técnico y preciso",
  },
];

export default function AgentsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ persona_name: "", persona_tone: "" });

  const { data: configs = [] } = useQuery({
    queryKey: ["agent-configs"],
    queryFn: () => businessApi.getAgents().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: ({ type, name, tone }: { type: string; name: string; tone: string }) =>
      businessApi.createAgent(type, name, tone),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-configs"] });
      toast.success("Agente configurado");
      setEditing(null);
    },
  });

  const getConfig = (type: string) => configs.find((c: Record<string, unknown>) => c.agent_type === type);

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* ── Hero banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden mb-8"
        style={{ background: "linear-gradient(135deg, #6B8BFF 0%, #B8A0FF 50%, #FFBA9A 100%)", boxShadow: "0 8px 40px rgba(107,139,255,0.22)" }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-40 h-40 rounded-full bg-white/5 translate-y-1/2 pointer-events-none" />
        <div className="relative flex items-center justify-between px-8 py-6 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Bot size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Sparkles size={10} className="text-amber-300" />
                <span className="text-white/60 text-xs font-medium">Impulsado por Claude Sonnet</span>
              </div>
              <h1 className="text-2xl font-black text-white">Agentes de IA</h1>
              <p className="text-white/60 text-sm mt-0.5">Configura la personalidad y comportamiento de cada agente</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5">
            <Bot size={14} className="text-white/70" />
            <span className="text-white/80 text-xs font-semibold">Claude claude-sonnet-4-6</span>
          </div>
        </div>
      </motion.div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AGENT_TYPES.map(({ type, name, icon: Icon, gradient, glow, description, defaultPersona, defaultTone }, i) => {
          const config = getConfig(type);
          const isEditing = editing === type;

          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className="bg-card border border-border rounded-2xl p-6 hover:border-violet-200 hover:shadow-lg transition-all"
              style={{ boxShadow: config ? `0 4px 20px ${glow}` : undefined }}
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
                  style={{ background: gradient }}
                >
                  <Icon size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground">{name}</h3>
                    {config && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Activo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
              </div>

              {/* Current config */}
              {config && !isEditing && (
                <div className="mb-4 p-3 rounded-xl border" style={{ background: `linear-gradient(135deg, rgba(99,91,255,0.05), rgba(139,92,246,0.05))`, borderColor: `rgba(99,91,255,0.15)` }}>
                  <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider">Persona activa</p>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {config.persona_name as string} <span className="text-muted-foreground font-normal">· {config.persona_tone as string}</span>
                  </p>
                </div>
              )}

              {/* Edit form */}
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Nombre del agente</label>
                    <input
                      value={formData.persona_name}
                      onChange={(e) => setFormData({ ...formData, persona_name: e.target.value })}
                      placeholder={defaultPersona}
                      className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Tono de comunicación</label>
                    <input
                      value={formData.persona_tone}
                      onChange={(e) => setFormData({ ...formData, persona_tone: e.target.value })}
                      placeholder={defaultTone}
                      className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        createMutation.mutate({
                          type,
                          name: formData.persona_name || defaultPersona,
                          tone: formData.persona_tone || defaultTone,
                        });
                      }}
                      disabled={createMutation.isPending}
                      className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition"
                    >
                      {createMutation.isPending ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditing(type);
                    setFormData({
                      persona_name: config?.persona_name as string || defaultPersona,
                      persona_tone: config?.persona_tone as string || defaultTone,
                    });
                  }}
                  className={cn(
                    "w-full py-2.5 rounded-xl text-sm font-semibold transition-all",
                    config
                      ? "border-2 text-foreground hover:text-white hover:border-transparent"
                      : "text-white"
                  )}
                  style={config
                    ? { borderColor: `${glow.replace("0.25", "0.5")}`, background: `${glow.replace("0.25", "0.08")}` }
                    : { background: gradient }
                  }
                  onMouseEnter={(e) => { if (config) Object.assign(e.currentTarget.style, { background: gradient, borderColor: "transparent" }); }}
                  onMouseLeave={(e) => { if (config) Object.assign(e.currentTarget.style, { background: `${glow.replace("0.25", "0.08")}`, borderColor: `${glow.replace("0.25", "0.5")}` }); }}
                >
                  {config ? "Editar agente" : "Configurar agente"}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
