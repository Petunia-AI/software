"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { businessApi } from "@/lib/api";
import { Bot, Zap, Target, Heart, Headphones, BarChart2, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const AGENT_TYPES = [
  {
    type: "qualifier",
    name: "Calificador",
    icon: Target,
    color: "bg-blue-100 text-blue-700",
    description: "Califica leads con el framework BANT. Temperatura baja para ser consistente.",
    defaultPersona: "Sofía",
    defaultTone: "amigable y profesional",
  },
  {
    type: "closer",
    name: "Cerrador",
    icon: Zap,
    color: "bg-green-100 text-green-700",
    description: "Cierra ventas con leads calificados. Persuasivo y orientado a resultados.",
    defaultPersona: "Carlos",
    defaultTone: "directo y persuasivo",
  },
  {
    type: "nurturer",
    name: "Nurturing",
    icon: Heart,
    color: "bg-orange-100 text-orange-700",
    description: "Mantiene el contacto con leads fríos. Educativo y paciente.",
    defaultPersona: "Ana",
    defaultTone: "empático y educativo",
  },
  {
    type: "support",
    name: "Soporte",
    icon: Headphones,
    color: "bg-purple-100 text-purple-700",
    description: "Soporte post-venta y detección de upsell. Preciso y resolutivo.",
    defaultPersona: "Valentina",
    defaultTone: "preciso y empático",
  },
  {
    type: "analyst",
    name: "Analista",
    icon: BarChart2,
    color: "bg-gray-100 text-gray-700",
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Agentes de IA</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configura la personalidad y comportamiento de cada agente. Todos usan Claude claude-sonnet-4-6.
        </p>
      </div>

      {/* Model badge */}
      <div className="flex items-center gap-2 mb-8 px-4 py-3 bg-violet-50 border border-violet-200 rounded-xl">
        <Bot className="w-4 h-4 text-violet-600" />
        <p className="text-sm text-violet-800">
          <strong>Modelo:</strong> Claude claude-sonnet-4-6 — el modelo más potente de Anthropic para tareas complejas
        </p>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AGENT_TYPES.map(({ type, name, icon: Icon, color, description, defaultPersona, defaultTone }, i) => {
          const config = getConfig(type);
          const isEditing = editing === type;

          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-card border border-border rounded-2xl p-6 hover:border-violet-500/30 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{name}</h3>
                    {config && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
              </div>

              {/* Current config */}
              {config && !isEditing && (
                <div className="mb-4 p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">Persona activa</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {config.persona_name as string} · {config.persona_tone as string}
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
                  className="w-full py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted hover:border-violet-500/40 transition"
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
