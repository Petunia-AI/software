export interface FollowUp {
  id: string;
  lead_id: string;
  lead_name?: string;
  lead_email?: string;
  lead_company?: string;
  lead_stage?: string;
  followup_type: "call" | "email" | "whatsapp" | "meeting" | "task";
  title: string;
  description?: string;
  status: "pending" | "completed" | "cancelled" | "overdue";
  priority: "low" | "medium" | "high" | "urgent";
  scheduled_at: string;
  completed_at?: string;
  assigned_to: string;
  is_ai_generated: boolean;
  notify_email: boolean;
  notify_whatsapp: boolean;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: string;
  title: string;
  description?: string;
  outcome?: string;
  scheduled_at?: string;
  completed_at?: string;
  created_by: string;
  is_ai_generated: boolean;
  created_at: string;
}

export interface FollowUpStats {
  overdue: number;
  today: number;
  this_week: number;
  total_pending: number;
  completed_today: number;
}

export const FOLLOWUP_TYPES = [
  { value: "call",     label: "Llamada",    icon: "📞", color: "text-blue-600 bg-blue-50",   gradient: "linear-gradient(135deg,#3B82F6,#6366F1)" },
  { value: "email",    label: "Email",      icon: "📧", color: "text-violet-600 bg-violet-50", gradient: "linear-gradient(135deg,#635BFF,#8B5CF6)" },
  { value: "whatsapp", label: "WhatsApp",   icon: "💬", color: "text-green-600 bg-green-50",  gradient: "linear-gradient(135deg,#10B981,#059669)" },
  { value: "meeting",  label: "Reunión",    icon: "🤝", color: "text-orange-600 bg-orange-50", gradient: "linear-gradient(135deg,#F97316,#EA580C)" },
  { value: "task",     label: "Tarea",      icon: "✅", color: "text-slate-600 bg-slate-50",  gradient: "linear-gradient(135deg,#64748B,#475569)" },
] as const;

export const PRIORITY_CONFIG = {
  low:    { label: "Baja",    color: "text-slate-500  bg-slate-50  border-slate-200" },
  medium: { label: "Media",   color: "text-blue-600   bg-blue-50   border-blue-200" },
  high:   { label: "Alta",    color: "text-orange-600 bg-orange-50 border-orange-200" },
  urgent: { label: "Urgente", color: "text-red-600    bg-red-50    border-red-200" },
} as const;

export const STATUS_CONFIG = {
  pending:   { label: "Pendiente",   color: "text-blue-600   bg-blue-50   border-blue-200" },
  overdue:   { label: "Vencido",     color: "text-red-600    bg-red-50    border-red-200" },
  completed: { label: "Completado",  color: "text-green-600  bg-green-50  border-green-200" },
  cancelled: { label: "Cancelado",   color: "text-slate-400  bg-slate-50  border-slate-200" },
} as const;
