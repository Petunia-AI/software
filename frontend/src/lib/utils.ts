import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "dd MMM yyyy, HH:mm", { locale: es });
}

export function formatScore(score: number): string {
  return `${score.toFixed(1)}/10`;
}

export function getAgentLabel(agentType: string): string {
  const labels: Record<string, string> = {
    qualifier: "Calificador",
    closer: "Cerrador",
    nurturer: "Nurturing",
    support: "Soporte",
    analyst: "Analista",
    escalated: "Escalado",
  };
  return labels[agentType] || agentType;
}

export function getAgentColor(agentType: string): string {
  const colors: Record<string, string> = {
    qualifier: "bg-blue-100 text-blue-700",
    closer: "bg-green-100 text-green-700",
    nurturer: "bg-orange-100 text-orange-700",
    support: "bg-purple-100 text-purple-700",
    analyst: "bg-gray-100 text-gray-700",
    escalated: "bg-red-100 text-red-700",
  };
  return colors[agentType] || "bg-gray-100 text-gray-700";
}

export function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    new: "Nuevo",
    qualifying: "Calificando",
    qualified: "Calificado",
    nurturing: "Nurturing",
    demo_scheduled: "Demo Agendada",
    proposal_sent: "Propuesta Enviada",
    negotiating: "Negociando",
    closed_won: "Ganado",
    closed_lost: "Perdido",
  };
  return labels[stage] || stage;
}

export function getStageColor(stage: string): string {
  const colors: Record<string, string> = {
    new: "bg-gray-100 text-gray-600",
    qualifying: "bg-blue-100 text-blue-700",
    qualified: "bg-cyan-100 text-cyan-700",
    nurturing: "bg-yellow-100 text-yellow-700",
    demo_scheduled: "bg-purple-100 text-purple-700",
    proposal_sent: "bg-indigo-100 text-indigo-700",
    negotiating: "bg-orange-100 text-orange-700",
    closed_won: "bg-green-100 text-green-700",
    closed_lost: "bg-red-100 text-red-700",
  };
  return colors[stage] || "bg-gray-100 text-gray-600";
}

export function getScoreColor(score: number): string {
  if (score >= 7) return "text-green-600";
  if (score >= 4) return "text-yellow-600";
  return "text-red-500";
}

export function getChannelIcon(channel: string): string {
  const icons: Record<string, string> = {
    whatsapp: "💬",
    instagram: "📸",
    webchat: "🌐",
    email: "📧",
    tiktok: "🎵",
  };
  return icons[channel] || "💬";
}
