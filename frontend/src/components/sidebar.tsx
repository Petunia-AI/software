"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import {
  SquaresFour, ChatCircleText, UsersThree, BellRinging,
  TrendUp, Robot, PenNib, Buildings,
  EnvelopeSimple, CalendarDots,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { followupsApi } from "@/lib/api";

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
  { href: "/properties",             icon: Buildings,         label: "Propiedades",       badge: null,      color: "from-teal-500 to-green-600",     glow: "rgba(20,184,166,0.35)",  iconWeight: "duotone" as const },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

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
      <div
        className="relative z-10 flex items-center px-4 py-4"
        style={{ borderBottom: "1px solid rgba(107,139,255,0.12)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Petunia AI" className="h-9 w-auto object-contain" />
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
                  size={15}
                  weight={isActive ? iconWeight : "regular"}
                  className="flex-shrink-0"
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

      </nav>

    </aside>
  );
}
