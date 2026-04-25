import { cn } from "@/lib/utils";
import {
  ChatCircle, Camera, GlobeHemisphereWest, EnvelopeSimple,
  TiktokLogo, LinkedinLogo, FacebookLogo,
  Target, Lightning, Heart, Headphones, ChartBar,
  Warning, Sparkle,
  UserCirclePlus, MagnifyingGlass, Star, TreePalm,
  CalendarCheck, FileText, Handshake, Confetti, X,
  ArrowRight,
} from "@phosphor-icons/react";

type BadgeVariant = "violet" | "green" | "blue" | "orange" | "red" | "gray" | "purple";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function Badge({ children, variant = "gray", dot, icon, className }: BadgeProps) {
  return (
    <span className={cn("badge", `badge-${variant}`, className)}>
      {icon && <span className="flex-shrink-0 opacity-80">{icon}</span>}
      {dot && !icon && (
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

// ── Agent Badge ────────────────────────────────────────────────────────────
export function AgentBadge({ agent }: { agent: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant; icon: React.ReactNode }> = {
    qualifier: { label: "Calificador", variant: "blue",   icon: <Target size={11} weight="duotone" /> },
    closer:    { label: "Cerrador",    variant: "green",  icon: <Lightning size={11} weight="duotone" /> },
    nurturer:  { label: "Nurturing",   variant: "orange", icon: <Heart size={11} weight="duotone" /> },
    support:   { label: "Soporte",     variant: "purple", icon: <Headphones size={11} weight="duotone" /> },
    analyst:   { label: "Analista",    variant: "gray",   icon: <ChartBar size={11} weight="duotone" /> },
    escalated: { label: "Escalado",    variant: "red",    icon: <Warning size={11} weight="duotone" /> },
  };
  const cfg = map[agent] ?? { label: agent, variant: "gray" as BadgeVariant, icon: <Sparkle size={11} weight="duotone" /> };
  return <Badge variant={cfg.variant} icon={cfg.icon}>{cfg.label}</Badge>;
}

// ── Stage Badge ────────────────────────────────────────────────────────────
export function StageBadge({ stage }: { stage: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant; icon: React.ReactNode }> = {
    new:              { label: "Nuevo",             variant: "gray",   icon: <UserCirclePlus size={11} weight="duotone" /> },
    qualifying:       { label: "Calificando",       variant: "blue",   icon: <MagnifyingGlass size={11} weight="duotone" /> },
    qualified:        { label: "Calificado",        variant: "violet", icon: <Star size={11} weight="duotone" /> },
    nurturing:        { label: "Nurturing",         variant: "orange", icon: <TreePalm size={11} weight="duotone" /> },
    demo_scheduled:   { label: "Demo agendada",     variant: "purple", icon: <CalendarCheck size={11} weight="duotone" /> },
    proposal_sent:    { label: "Propuesta enviada", variant: "blue",   icon: <FileText size={11} weight="duotone" /> },
    negotiating:      { label: "Negociando",        variant: "orange", icon: <Handshake size={11} weight="duotone" /> },
    closed_won:       { label: "Ganado",            variant: "green",  icon: <Confetti size={11} weight="duotone" /> },
    closed_lost:      { label: "Perdido",           variant: "red",    icon: <X size={11} weight="bold" /> },
  };
  const cfg = map[stage] ?? { label: stage, variant: "gray" as BadgeVariant, icon: <ArrowRight size={11} weight="duotone" /> };
  return <Badge variant={cfg.variant} icon={cfg.icon}>{cfg.label}</Badge>;
}

// ── Channel Badge ─────────────────────────────────────────────────────────

function TikTokIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"/>
    </svg>
  );
}

const CHANNEL_CONFIG: Record<string, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bg: string;
  border: string;
}> = {
  whatsapp:  { icon: <ChatCircle size={12} weight="duotone" />,          label: "WhatsApp",  color: "#059669", bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.25)"  },
  instagram: { icon: <Camera size={12} weight="duotone" />,              label: "Instagram", color: "#DB2777", bg: "rgba(219,39,119,0.10)",  border: "rgba(219,39,119,0.25)"  },
  webchat:   { icon: <GlobeHemisphereWest size={12} weight="duotone" />, label: "Webchat",   color: "#4F46E5", bg: "rgba(99,91,255,0.10)",   border: "rgba(99,91,255,0.25)"   },
  email:     { icon: <EnvelopeSimple size={12} weight="duotone" />,      label: "Email",     color: "#0284C7", bg: "rgba(14,165,233,0.10)",  border: "rgba(14,165,233,0.25)"  },
  messenger: { icon: <FacebookLogo size={12} weight="duotone" />,        label: "Messenger", color: "#2563EB", bg: "rgba(37,99,235,0.10)",   border: "rgba(37,99,235,0.25)"   },
  linkedin:  { icon: <LinkedinLogo size={12} weight="duotone" />,        label: "LinkedIn",  color: "#0A66C2", bg: "rgba(10,102,194,0.10)",  border: "rgba(10,102,194,0.25)"  },
  tiktok:    { icon: <TikTokIcon size={12} />,                           label: "TikTok",    color: "#111827", bg: "rgba(17,24,39,0.10)",    border: "rgba(17,24,39,0.20)"    },
  manual:    { icon: <Sparkle size={12} weight="duotone" />,             label: "Manual",    color: "#7C3AED", bg: "rgba(124,58,237,0.10)",  border: "rgba(124,58,237,0.25)"  },
  referral:  { icon: <Heart size={12} weight="duotone" />,               label: "Referral",  color: "#BE185D", bg: "rgba(190,24,93,0.10)",   border: "rgba(190,24,93,0.25)"   },
};

export function ChannelBadge({ channel }: { channel: string }) {
  const cfg = CHANNEL_CONFIG[channel?.toLowerCase()] ?? {
    icon: <ChatCircle size={12} weight="duotone" />,
    label: channel ?? "—",
    color: "#6B7280",
    bg: "rgba(107,114,128,0.10)",
    border: "rgba(107,114,128,0.20)",
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
