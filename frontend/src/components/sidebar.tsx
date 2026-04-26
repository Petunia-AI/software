"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  SquaresFour, ChatCircleText, UsersThree, BellRinging,
  TrendUp, Robot, PenNib, Buildings, SlidersHorizontal,
  Wallet, CaretDown, MagnifyingGlass, SignOut,
  GlobeHemisphereWest, Camera, EnvelopeSimple, CalendarDots,
  ChatCircle, LinkedinLogo, FacebookLogo,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { followupsApi, analyticsApi } from "@/lib/api";

const navItems = [
  { href: "/dashboard",              icon: SquaresFour,       label: "Dashboard",         badge: null,      color: "from-violet-500 to-purple-600",  glow: "rgba(139,92,246,0.35)",  iconWeight: "duotone" as const },
  { href: "/conversations",          icon: ChatCircleText,    label: "Conversaciones",    badge: null,      color: "from-blue-500 to-indigo-600",    glow: "rgba(99,102,241,0.35)",  iconWeight: "duotone" as const },
  { href: "/leads",                  icon: UsersThree,        label: "Leads",             badge: null,      color: "from-emerald-500 to-teal-600",   glow: "rgba(16,185,129,0.35)",  iconWeight: "duotone" as const },
  { href: "/seguimiento",            icon: BellRinging,       label: "Seguimiento",       badge: "dynamic", color: "from-amber-500 to-orange-500",   glow: "rgba(245,158,11,0.35)",  iconWeight: "duotone" as const },
  { href: "/analytics",              icon: TrendUp,           label: "Analíticas",        badge: null,      color: "from-cyan-500 to-sky-600",       glow: "rgba(6,182,212,0.35)",   iconWeight: "duotone" as const },
  { href: "/agents",                 icon: Robot,             label: "Agentes IA",        badge: null,      color: "from-fuchsia-500 to-purple-600", glow: "rgba(217,70,239,0.35)",  iconWeight: "duotone" as const },
  { href: "/content",                icon: PenNib,            label: "Contenido",         badge: null,      color: "from-pink-500 to-rose-500",      glow: "rgba(236,72,153,0.35)",  iconWeight: "duotone" as const },
  { href: "/email",                  icon: EnvelopeSimple,    label: "Email CRM",         badge: null,      color: "from-sky-500 to-blue-600",       glow: "rgba(14,165,233,0.35)",  iconWeight: "duotone" as const },
  { href: "/meetings",               icon: CalendarDots,      label: "Reuniones",         badge: null,      color: "from-violet-500 to-purple-600",  glow: "rgba(139,92,246,0.35)",  iconWeight: "duotone" as const },
  { href: "/integrations/whatsapp",  icon: ChatCircle,        label: "WhatsApp Business", badge: null,      color: "from-green-500 to-emerald-600",  glow: "rgba(16,185,129,0.35)",  iconWeight: "duotone" as const },
  { href: "/properties",             icon: Buildings,         label: "Propiedades",       badge: null,      color: "from-teal-500 to-green-600",     glow: "rgba(20,184,166,0.35)",  iconWeight: "duotone" as const },
  { href: "/settings",               icon: SlidersHorizontal, label: "Configuración",     badge: null,      color: "from-slate-500 to-gray-600",     glow: "rgba(100,116,139,0.35)", iconWeight: "duotone" as const },
  { href: "/billing",                icon: Wallet,            label: "Plan & Billing",    badge: null,      color: "from-violet-600 to-indigo-600",  glow: "rgba(99,91,255,0.35)",   iconWeight: "duotone" as const },
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

  const { data: dashStats } = useQuery({
    queryKey: ["dashboard-stats-sidebar"],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const convByChannel: Record<string, number> = dashStats?.conversations_by_channel ?? {};

  return (
    <aside className="sidebar w-60 flex flex-col h-full select-none flex-shrink-0">

      {/* ── Logo header ── */}
      <button
        onClick={() => setWorkspaceOpen(!workspaceOpen)}
        className="relative z-10 flex items-center gap-3 px-4 py-4 w-full text-left group"
        style={{ borderBottom: "1px solid rgba(107,139,255,0.12)" }}
      >
        {/* Logo icon */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
          style={{
            background: "linear-gradient(135deg, #6B8BFF 0%, #C4AAFF 60%, #FFBA9A 100%)",
            boxShadow: "0 0 16px rgba(107,139,255,0.55), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          {/* P letter mark */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 3h5a3 3 0 0 1 0 6H6v4H4V3z" fill="white" fillOpacity="0.95"/>
            <circle cx="7.5" cy="6" r="1.5" fill="white" fillOpacity="0.4"/>
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold leading-tight tracking-tight" style={{ color: "#1A1F3C" }}>
            Petunia AI
          </p>
          <p className="text-[10px] leading-tight font-medium" style={{ color: "rgba(107,139,255,0.75)" }}>
            Agente de ventas
          </p>
        </div>

        <CaretDown
          size={13}
          className={cn("transition-transform flex-shrink-0", workspaceOpen && "rotate-180")}
          style={{ color: "rgba(107,139,255,0.45)" }}
        />
      </button>

      {/* ── Search ── */}
      <div className="relative z-10 px-3 py-2.5"
        style={{ borderBottom: "1px solid rgba(107,139,255,0.12)" }}>
        <button
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-all duration-150 hover:bg-indigo-50/70"
          style={{
            background: "rgba(107,139,255,0.06)",
            border: "1px solid rgba(107,139,255,0.15)",
            color: "rgba(60,75,120,0.55)"
          }}
        >
          <MagnifyingGlass size={12} />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="text-[9px] px-1.5 py-0.5 rounded font-mono"
            style={{ background: "rgba(107,139,255,0.08)", color: "rgba(60,75,120,0.55)", border: "1px solid rgba(107,139,255,0.15)" }}>
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 relative z-10 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-2.5 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "rgba(60,75,140,0.45)" }}>
          Principal
        </p>

        {navItems.map(({ href, icon: Icon, label, badge, color, glow, iconWeight }) => {
          const resolvedBadge = badge === "dynamic"
            ? (overdueCount > 0 ? String(overdueCount) : null)
            : badge;
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-2.5 px-2 py-[6px] rounded-xl text-[13px] font-semibold transition-all duration-150",
                isActive
                  ? "text-indigo-700"
                  : "text-slate-500 hover:text-slate-800 hover:bg-indigo-50/60"
              )}
              style={isActive ? {
                background: "linear-gradient(135deg, rgba(107,139,255,0.13) 0%, rgba(196,170,255,0.10) 50%, rgba(255,186,154,0.08) 100%)",
                border: "1px solid rgba(107,139,255,0.25)",
                boxShadow: "0 1px 4px rgba(107,139,255,0.12)",
              } : { border: "1px solid transparent" }}
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
                  size={15}
                  style={{ color: isActive ? "#fff" : "rgba(70,90,155,0.65)" }}
                />
              </div>

              <span className="flex-1 truncate">{label}</span>

              {resolvedBadge && (
                <span
                  className="flex-shrink-0 min-w-[18px] h-[18px] px-1 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                  style={{
                    background: badge === "dynamic"
                      ? "linear-gradient(135deg, #EF4444, #DC2626)"
                      : "linear-gradient(135deg, #7B9AFF, #C4AAFF)",
                    boxShadow: badge === "dynamic"
                      ? "0 0 8px rgba(239,68,68,0.5)"
                      : "0 0 8px rgba(123,154,255,0.55)",
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
          style={{ color: "rgba(60,75,140,0.45)" }}>
          Canales
        </p>
        </p>

        {(() => {
          const ALL_CHANNELS: { label: string; channel: string; color: string; glow: string; Icon: React.ElementType; customIcon?: React.ReactNode }[] = [
            { label: "WhatsApp",  channel: "whatsapp",  color: "from-green-500 to-emerald-600", glow: "rgba(16,185,129,0.4)",  Icon: ChatCircle },
            { label: "Webchat",   channel: "webchat",   color: "from-blue-500 to-indigo-600",   glow: "rgba(99,102,241,0.4)",  Icon: GlobeHemisphereWest },
            { label: "Instagram", channel: "instagram", color: "from-pink-500 to-fuchsia-600",  glow: "rgba(236,72,153,0.4)",  Icon: Camera },
            { label: "Messenger", channel: "messenger", color: "from-blue-600 to-indigo-700",   glow: "rgba(59,130,246,0.4)",  Icon: FacebookLogo },
            { label: "TikTok",    channel: "tiktok",    color: "from-neutral-800 to-neutral-900", glow: "rgba(255,255,255,0.15)", Icon: Camera,
              customIcon: (
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
                </svg>
              ),
            },
          ];
          // Mostrar solo canales con actividad + siempre WhatsApp y Webchat
          const always = new Set(["whatsapp", "webchat"]);
          const channels = ALL_CHANNELS.filter(
            (c) => always.has(c.channel) || (convByChannel[c.channel] ?? 0) > 0
          );
          return channels.map(({ label, channel, color, glow, Icon, customIcon }) => {
            const count = convByChannel[channel] ?? 0;
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
                    ? "text-indigo-700"
                    : "text-slate-500 hover:text-slate-800 hover:bg-indigo-50/60"
                )}
                style={isActive ? {
                  background: "linear-gradient(135deg, rgba(107,139,255,0.13) 0%, rgba(196,170,255,0.10) 50%, rgba(255,186,154,0.08) 100%)",
                  border: "1px solid rgba(107,139,255,0.25)",
                  boxShadow: "0 1px 4px rgba(107,139,255,0.12)",
                } : { border: "1px solid transparent" }}
              >
                <div
                  className={cn(
                    "w-[26px] h-[26px] rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150",
                    isActive
                      ? `bg-gradient-to-br ${color}`
                      : "bg-white/[0.07] group-hover:bg-white/[0.1]"
                  )}
                  style={isActive ? { boxShadow: `0 2px 10px ${glow}`, color: "#fff" } : { color: "rgba(70,90,155,0.65)" }}
                >
                  {customIcon ? customIcon : <Icon size={15} weight={isActive ? "duotone" : "regular"} />}
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
          });
        })()}
      </nav>

      {/* ── User footer ── */}
      <div className="relative z-10 p-3"
        style={{ borderTop: "1px solid rgba(107,139,255,0.12)" }}>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl cursor-default group transition-colors hover:bg-indigo-50/60">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shadow"
              style={{ background: "linear-gradient(135deg, #7B9AFF, #C4AAFF)", boxShadow: "0 2px 8px rgba(123,154,255,0.45)" }}
            >
              <span className="text-white text-[11px] font-bold">
                {user?.full_name?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-[1.5px]"
              style={{
                background: "#10B981",
                borderColor: "hsl(225, 40%, 97%)",
                boxShadow: "0 0 5px rgba(16,185,129,0.7)"
              }} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold truncate leading-tight" style={{ color: "#1A1F3C" }}>
              {user?.full_name ?? "Usuario"}
            </p>
            <p className="text-[10px] truncate leading-tight" style={{ color: "rgba(107,139,255,0.7)" }}>
              {user?.email}
            </p>
          </div>

          <SignOut
            size={14}
            weight="duotone"
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            style={{ color: "rgba(107,139,255,0.5)" }}
          />
        </div>
      </div>
    </aside>
  );
}
