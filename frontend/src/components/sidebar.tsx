"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, MessageSquare, Users, BarChart3,
  Settings, Bot, Zap, LogOut, ChevronDown,
  Search, CreditCard, Sparkles, Building2,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Dashboard",      badge: null },
  { href: "/conversations", icon: MessageSquare,   label: "Conversaciones", badge: "3"  },
  { href: "/leads",         icon: Users,           label: "Leads",          badge: null },
  { href: "/analytics",     icon: BarChart3,       label: "Analíticas",     badge: null },
  { href: "/agents",        icon: Bot,             label: "Agentes IA",     badge: null },
  { href: "/content",       icon: Sparkles,        label: "Contenido",      badge: null },
  { href: "/properties",    icon: Building2,       label: "Propiedades",    badge: null },
  { href: "/settings",      icon: Settings,        label: "Configuración",  badge: null },
  { href: "/billing",       icon: CreditCard,      label: "Plan & Billing", badge: null },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  const handleLogout = () => { logout(); router.push("/login"); };

  return (
    <aside className="sidebar w-60 flex flex-col h-full select-none flex-shrink-0">

      {/* ── Workspace header ── */}
      <button
        onClick={() => setWorkspaceOpen(!workspaceOpen)}
        className="relative z-10 flex items-center gap-2.5 px-4 py-3.5 hover:bg-white/5 transition-colors w-full text-left"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Logo Petunia AI */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-petunia.svg" alt="Petunia AI" className="w-8 h-8 flex-shrink-0 drop-shadow-lg" style={{ filter: "drop-shadow(0 0 8px rgba(139,92,246,0.6))" }} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate leading-tight">
            Petunia AI
          </p>
          <p className="text-[10px] leading-tight font-medium"
            style={{ color: "rgba(167,139,250,0.8)" }}>
            Agente de ventas
          </p>
        </div>

        <ChevronDown
          size={14}
          className={cn("text-white/30 transition-transform flex-shrink-0", workspaceOpen && "rotate-180")}
        />
      </button>

      {/* ── Search ── */}
      <div className="relative z-10 px-3 py-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <button
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.35)"
          }}
        >
          <Search size={12} />
          <span>Buscar...</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}>
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 relative z-10 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p className="section-label px-2 pt-1 pb-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>
          Principal
        </p>

        {navItems.map(({ href, icon: Icon, label, badge }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-sm font-medium transition-all duration-150"
              )}
              style={isActive ? {
                background: "linear-gradient(135deg, rgba(99,91,255,0.2) 0%, rgba(139,92,246,0.12) 100%)",
                border: "1px solid rgba(99,91,255,0.25)",
                color: "#fff",
              } : {
                border: "1px solid transparent",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              {/* Active indicator line */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                  style={{ background: "linear-gradient(180deg, #A78BFA, #635BFF)" }} />
              )}

              <Icon
                size={15}
                className="flex-shrink-0 transition-colors"
                style={isActive
                  ? { color: "#A78BFA" }
                  : { color: "rgba(255,255,255,0.28)" }
                }
              />
              <span className="flex-1 truncate">{label}</span>

              {badge && (
                <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}>
                  {badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Canales */}
        <p className="section-label px-2 pt-4 pb-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>
          Canales
        </p>

        {[
          { icon: "💬", label: "WhatsApp",  channel: "whatsapp",  count: 2 },
          { icon: "🌐", label: "Webchat",   channel: "webchat",   count: 1 },
          { icon: "📸", label: "Instagram", channel: "instagram", count: 0 },
        ].map(({ icon, label, channel, count }) => {
          const isActive = pathname.startsWith("/conversations") &&
            (typeof window !== "undefined"
              ? new URLSearchParams(window.location.search).get("channel") === channel
              : false);
          return (
            <Link
              key={channel}
              href={`/conversations?channel=${channel}`}
              className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-sm font-medium transition-all duration-150"
              style={isActive ? {
                background: "linear-gradient(135deg, rgba(99,91,255,0.2), rgba(139,92,246,0.12))",
                border: "1px solid rgba(99,91,255,0.25)",
                color: "#fff",
              } : {
                color: "rgba(255,255,255,0.38)",
                border: "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.7)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                  (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.38)";
                }
              }}
            >
              <span className="text-sm">{icon}</span>
              <span className="flex-1 truncate">{label}</span>
              {count > 0 && (
                <span className="w-5 h-5 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── User footer ── */}
      <div className="relative z-10 p-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-default transition-colors"
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shadow"
              style={{ background: "linear-gradient(135deg, #635BFF, #7C3AED)" }}>
              <span className="text-white text-xs font-bold">
                {user?.full_name?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full border-2"
              style={{
                background: "#10B981",
                borderColor: "hsl(243, 50%, 12%)",
                boxShadow: "0 0 6px rgba(16,185,129,0.7)"
              }} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white/90 truncate leading-tight">
              {user?.full_name ?? "Usuario"}
            </p>
            <p className="text-[10px] truncate leading-tight" style={{ color: "rgba(167,139,250,0.6)" }}>
              {user?.email}
            </p>
          </div>

          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{ color: "rgba(255,255,255,0.2)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#F87171";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.2)";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
