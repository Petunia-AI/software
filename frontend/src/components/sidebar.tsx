"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  LayoutGrid, MessageCircle, UsersRound, BellDot,
  TrendingUp, BrainCircuit, PenLine, Building2,
  SlidersHorizontal, Wallet, ChevronDown, Search,
  LogOut, Globe, Camera,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { followupsApi } from "@/lib/api";

const navItems = [
  {
    href: "/dashboard",     icon: LayoutGrid,       label: "Dashboard",
    badge: null,
    color: "from-violet-500 to-purple-600",
    glow: "rgba(139,92,246,0.35)",
  },
  {
    href: "/conversations", icon: MessageCircle,    label: "Conversaciones",
    badge: null,
    color: "from-blue-500 to-indigo-600",
    glow: "rgba(99,102,241,0.35)",
  },
  {
    href: "/leads",         icon: UsersRound,       label: "Leads",
    badge: null,
    color: "from-emerald-500 to-teal-600",
    glow: "rgba(16,185,129,0.35)",
  },
  {
    href: "/seguimiento",   icon: BellDot,          label: "Seguimiento",
    badge: "dynamic",
    color: "from-amber-500 to-orange-500",
    glow: "rgba(245,158,11,0.35)",
  },
  {
    href: "/analytics",     icon: TrendingUp,       label: "Analíticas",
    badge: null,
    color: "from-cyan-500 to-sky-600",
    glow: "rgba(6,182,212,0.35)",
  },
  {
    href: "/agents",        icon: BrainCircuit,     label: "Agentes IA",
    badge: null,
    color: "from-fuchsia-500 to-purple-600",
    glow: "rgba(217,70,239,0.35)",
  },
  {
    href: "/content",       icon: PenLine,          label: "Contenido",
    badge: null,
    color: "from-pink-500 to-rose-500",
    glow: "rgba(236,72,153,0.35)",
  },
  {
    href: "/properties",    icon: Building2,        label: "Propiedades",
    badge: null,
    color: "from-teal-500 to-green-600",
    glow: "rgba(20,184,166,0.35)",
  },
  {
    href: "/settings",      icon: SlidersHorizontal, label: "Configuración",
    badge: null,
    color: "from-slate-500 to-gray-600",
    glow: "rgba(100,116,139,0.35)",
  },
  {
    href: "/billing",       icon: Wallet,           label: "Plan & Billing",
    badge: null,
    color: "from-violet-600 to-indigo-600",
    glow: "rgba(99,91,255,0.35)",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  const { data: followupStats } = useQuery({
    queryKey: ["followup-stats-sidebar"],
    queryFn: () => followupsApi.stats().then((r) => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const overdueCount: number = followupStats?.overdue ?? 0;

  return (
    <aside className="sidebar w-60 flex flex-col h-full select-none flex-shrink-0">

      {/* ── Logo header ── */}
      <button
        onClick={() => setWorkspaceOpen(!workspaceOpen)}
        className="relative z-10 flex items-center gap-3 px-4 py-4 w-full text-left group"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Logo icon */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
            boxShadow: "0 0 16px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          {/* P letter mark */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 3h5a3 3 0 0 1 0 6H6v4H4V3z" fill="white" fillOpacity="0.95"/>
            <circle cx="7.5" cy="6" r="1.5" fill="white" fillOpacity="0.4"/>
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-white leading-tight tracking-tight">
            Petunia AI
          </p>
          <p className="text-[10px] leading-tight font-medium" style={{ color: "rgba(167,139,250,0.7)" }}>
            Agente de ventas
          </p>
        </div>

        <ChevronDown
          size={13}
          className={cn("transition-transform flex-shrink-0", workspaceOpen && "rotate-180")}
          style={{ color: "rgba(255,255,255,0.2)" }}
        />
      </button>

      {/* ── Search ── */}
      <div className="relative z-10 px-3 py-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-all duration-150 hover:bg-white/[0.06]"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.3)"
          }}
        >
          <Search size={11} />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="text-[9px] px-1.5 py-0.5 rounded font-mono"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.08)" }}>
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 relative z-10 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-2.5 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.18)" }}>
          Principal
        </p>

        {navItems.map(({ href, icon: Icon, label, badge, color, glow }) => {
          const resolvedBadge = badge === "dynamic"
            ? (overdueCount > 0 ? String(overdueCount) : null)
            : badge;
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-2.5 px-2 py-[6px] rounded-xl text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "text-white"
                  : "text-white/40 hover:text-white/75 hover:bg-white/[0.05]"
              )}
              style={isActive ? {
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.08)",
              } : { border: "1px solid transparent" }}
            >
              {/* Icon container */}
              <div
                className={cn(
                  "w-[26px] h-[26px] rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150",
                  isActive
                    ? `bg-gradient-to-br ${color}`
                    : "bg-white/[0.07] group-hover:bg-white/[0.1]"
                )}
                style={isActive ? { boxShadow: `0 2px 10px ${glow}` } : {}}
              >
                <Icon
                  size={13}
                  className="flex-shrink-0"
                  style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.45)" }}
                />
              </div>

              <span className="flex-1 truncate">{label}</span>

              {resolvedBadge && (
                <span
                  className="flex-shrink-0 min-w-[18px] h-[18px] px-1 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                  style={{
                    background: badge === "dynamic"
                      ? "linear-gradient(135deg, #EF4444, #DC2626)"
                      : "linear-gradient(135deg, #635BFF, #8B5CF6)",
                    boxShadow: badge === "dynamic"
                      ? "0 0 8px rgba(239,68,68,0.5)"
                      : "0 0 8px rgba(99,91,255,0.5)",
                  }}
                >
                  {resolvedBadge}
                </span>
              )}
            </Link>
          );
        })}

        {/* ── Canales ── */}
        <p className="px-2.5 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.18)" }}>
          Canales
        </p>

        {[
          {
            label: "WhatsApp",  channel: "whatsapp",  count: 2,
            color: "from-green-500 to-emerald-600",
            glow: "rgba(16,185,129,0.4)",
            Icon: MessageCircle,
          },
          {
            label: "Webchat",   channel: "webchat",   count: 1,
            color: "from-blue-500 to-indigo-600",
            glow: "rgba(99,102,241,0.4)",
            Icon: Globe,
          },
          {
            label: "Instagram", channel: "instagram", count: 0,
            color: "from-pink-500 to-fuchsia-600",
            glow: "rgba(236,72,153,0.4)",
            Icon: Camera,
          },
          {
            label: "TikTok", channel: "tiktok", count: 0,
            color: "from-neutral-800 to-neutral-900",
            glow: "rgba(255,255,255,0.15)",
            Icon: Camera,
            customIcon: (
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
              </svg>
            ),
          },
        ].map(({ label, channel, count, color, glow, Icon, customIcon }: { label: string; channel: string; count: number; color: string; glow: string; Icon: React.ElementType; customIcon?: React.ReactNode }) => {
          const isActive = pathname.startsWith("/conversations") &&
            (typeof window !== "undefined"
              ? new URLSearchParams(window.location.search).get("channel") === channel
              : false);
          return (
            <Link
              key={channel}
              href={`/conversations?channel=${channel}`}
              className={cn(
                "group flex items-center gap-2.5 px-2 py-[6px] rounded-xl text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "text-white"
                  : "text-white/40 hover:text-white/75 hover:bg-white/[0.05]"
              )}
              style={isActive ? {
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.08)",
              } : { border: "1px solid transparent" }}
            >
              <div
                className={cn(
                  "w-[26px] h-[26px] rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150",
                  isActive
                    ? `bg-gradient-to-br ${color}`
                    : "bg-white/[0.07] group-hover:bg-white/[0.1]"
                )}
                style={isActive ? { boxShadow: `0 2px 10px ${glow}`, color: "#fff" } : { color: "rgba(255,255,255,0.45)" }}
              >
                {customIcon ?? <Icon size={13} />}
              </div>
              <span className="flex-1 truncate">{label}</span>
              {count > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)", boxShadow: "0 0 8px rgba(239,68,68,0.5)" }}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── User footer ── */}
      <div className="relative z-10 p-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl cursor-default group transition-colors hover:bg-white/[0.05]">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shadow"
              style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)", boxShadow: "0 2px 8px rgba(124,58,237,0.4)" }}
            >
              <span className="text-white text-[11px] font-bold">
                {user?.full_name?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-[1.5px]"
              style={{
                background: "#10B981",
                borderColor: "hsl(243, 50%, 12%)",
                boxShadow: "0 0 5px rgba(16,185,129,0.7)"
              }} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold truncate leading-tight" style={{ color: "rgba(255,255,255,0.85)" }}>
              {user?.full_name ?? "Usuario"}
            </p>
            <p className="text-[10px] truncate leading-tight" style={{ color: "rgba(167,139,250,0.55)" }}>
              {user?.email}
            </p>
          </div>

          <LogOut
            size={13}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            style={{ color: "rgba(255,255,255,0.3)" }}
          />
        </div>
      </div>
    </aside>
  );
}
