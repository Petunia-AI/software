import { cn } from "@/lib/utils";

type BadgeVariant = "violet" | "green" | "blue" | "orange" | "red" | "gray" | "purple";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

export function Badge({ children, variant = "gray", dot, className }: BadgeProps) {
  return (
    <span className={cn("badge", `badge-${variant}`, className)}>
      {dot && (
        <span className={cn(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          {
            violet: "bg-violet-500",
            green:  "bg-green-500",
            blue:   "bg-blue-500",
            orange: "bg-orange-500",
            red:    "bg-red-500",
            gray:   "bg-gray-400",
            purple: "bg-purple-500",
          }[variant]
        )} />
      )}
      {children}
    </span>
  );
}

// Helpers para etapas de lead y tipos de agente
export function AgentBadge({ agent }: { agent: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    qualifier: { label: "Calificador", variant: "blue"   },
    closer:    { label: "Cerrador",    variant: "green"  },
    nurturer:  { label: "Nurturing",   variant: "orange" },
    support:   { label: "Soporte",     variant: "purple" },
    analyst:   { label: "Analista",    variant: "gray"   },
    escalated: { label: "Escalado",    variant: "red"    },
  };
  const { label, variant } = map[agent] ?? { label: agent, variant: "gray" as BadgeVariant };
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function StageBadge({ stage }: { stage: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    new:              { label: "Nuevo",             variant: "gray"   },
    qualifying:       { label: "Calificando",       variant: "blue"   },
    qualified:        { label: "Calificado",        variant: "violet" },
    nurturing:        { label: "Nurturing",         variant: "orange" },
    demo_scheduled:   { label: "Demo agendada",     variant: "purple" },
    proposal_sent:    { label: "Propuesta enviada", variant: "blue"   },
    negotiating:      { label: "Negociando",        variant: "orange" },
    closed_won:       { label: "Ganado ✓",          variant: "green"  },
    closed_lost:      { label: "Perdido",           variant: "red"    },
  };
  const { label, variant } = map[stage] ?? { label: stage, variant: "gray" as BadgeVariant };
  return <Badge variant={variant}>{label}</Badge>;
}

export function ChannelBadge({ channel }: { channel: string }) {
  const icons: Record<string, string> = {
    whatsapp:  "💬",
    instagram: "📸",
    webchat:   "🌐",
    email:     "📧",
  };
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span>{icons[channel] ?? "💬"}</span>
      <span className="capitalize">{channel}</span>
    </span>
  );
}
