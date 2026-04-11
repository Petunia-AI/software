"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import {
  Bell, ChevronRight, Sparkles, LogOut,
  LayoutDashboard, MessageCircle, UsersRound, CalendarCheck,
  TrendingUp, BrainCircuit, PenLine, SlidersHorizontal,
  CreditCard, Building2,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

const PAGE_META: Record<string, { label: string; Icon: LucideIcon; color: string }> = {
  "/dashboard":     { label: "Dashboard",      Icon: LayoutDashboard,    color: "#7C3AED" },
  "/conversations": { label: "Conversaciones", Icon: MessageCircle,      color: "#06B6D4" },
  "/leads":         { label: "Leads",          Icon: UsersRound,         color: "#10B981" },
  "/seguimiento":   { label: "Seguimiento",    Icon: CalendarCheck,      color: "#F59E0B" },
  "/analytics":     { label: "Analíticas",     Icon: TrendingUp,         color: "#3B82F6" },
  "/agents":        { label: "Agentes IA",     Icon: BrainCircuit,       color: "#8B5CF6" },
  "/content":       { label: "Contenido",      Icon: PenLine,            color: "#EC4899" },
  "/settings":      { label: "Configuración",  Icon: SlidersHorizontal,  color: "#6B7280" },
  "/billing":       { label: "Plan & Billing", Icon: CreditCard,         color: "#F97316" },
  "/properties":    { label: "Propiedades",    Icon: Building2,          color: "#14B8A6" },
};

export function TopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => { logout(); router.push("/login"); };

  const meta = Object.entries(PAGE_META).find(
    ([key]) => pathname === key || (key !== "/" && pathname.startsWith(key))
  )?.[1] ?? { label: "Dashboard", Icon: LayoutDashboard, color: "#7C3AED" };

  const initial = user?.full_name?.[0]?.toUpperCase() ?? "U";

  return (
    <header className="top-header">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
          <Sparkles size={13} className="inline mr-1 text-violet-400" />
          Petunia AI
        </Link>
        <ChevronRight size={13} className="text-muted-foreground/40" />
        <span className="text-foreground font-semibold flex items-center gap-1.5">
          <span
            className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: `${meta.color}18` }}
          >
            <meta.Icon size={12} style={{ color: meta.color }} />
          </span>
          {meta.label}
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button
          className="relative p-2 rounded-xl hover:bg-secondary transition-colors"
          aria-label="Notificaciones"
        >
          <Bell size={16} className="text-muted-foreground" />
          {/* Red dot */}
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500"
            style={{ boxShadow: "0 0 5px rgba(239,68,68,0.6)" }}
          />
        </button>

        {/* User avatar + logout */}
        <div className="flex items-center gap-2 pl-1 border-l border-border">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm text-white text-xs font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#635BFF,#7C3AED)" }}
          >
            {initial}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-foreground leading-tight truncate max-w-[120px]">
              {user?.full_name ?? "Usuario"}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {user?.email?.split("@")[0]}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg transition-colors ml-1"
            style={{ color: "rgba(0,0,0,0.25)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#EF4444";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,0,0,0.25)";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
