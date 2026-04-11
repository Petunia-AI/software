"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Bell, ChevronRight, Sparkles, LogOut } from "lucide-react";
import Link from "next/link";

const PAGE_META: Record<string, { label: string; emoji: string }> = {
  "/dashboard":     { label: "Dashboard",       emoji: "📊" },
  "/conversations": { label: "Conversaciones",  emoji: "💬" },
  "/leads":         { label: "Leads",           emoji: "👥" },
  "/seguimiento":   { label: "Seguimiento",     emoji: "📅" },
  "/analytics":     { label: "Analíticas",      emoji: "📈" },
  "/agents":        { label: "Agentes IA",       emoji: "🤖" },
  "/content":       { label: "Contenido",       emoji: "✨" },
  "/settings":      { label: "Configuración",   emoji: "⚙️" },
  "/billing":       { label: "Plan & Billing",  emoji: "💳" },
  "/properties":    { label: "Propiedades",     emoji: "🏢" },
};

export function TopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => { logout(); router.push("/login"); };

  const meta = Object.entries(PAGE_META).find(
    ([key]) => pathname === key || (key !== "/" && pathname.startsWith(key))
  )?.[1] ?? { label: "Dashboard", emoji: "📊" };

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
        <span className="text-foreground font-semibold">
          <span className="mr-1.5">{meta.emoji}</span>
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
