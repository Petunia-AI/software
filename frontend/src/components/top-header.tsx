"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import {
  Bell, ChevronRight, LogOut,
  LayoutDashboard, MessageCircle, UsersRound, CalendarCheck,
  TrendingUp, BrainCircuit, PenLine, SlidersHorizontal,
  CreditCard, Building2, ChevronDown,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => { logout(); router.push("/login"); };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const meta = Object.entries(PAGE_META).find(
    ([key]) => pathname === key || (key !== "/" && pathname.startsWith(key))
  )?.[1] ?? { label: "Dashboard", Icon: LayoutDashboard, color: "#7C3AED" };

  const initial = user?.full_name?.[0]?.toUpperCase() ?? "U";

  return (
    <header className="top-header">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        {/* Logo — solo en móvil (en desktop ya aparece en el sidebar) */}
        <Link href="/dashboard" className="flex-shrink-0 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Petunia AI" className="h-7 w-auto object-contain" />
        </Link>
        <ChevronRight size={13} className="text-muted-foreground/40 lg:hidden" />
        <span className="text-foreground font-semibold flex items-center gap-1.5 text-sm">
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

        {/* User avatar + dropdown */}
        <div className="relative pl-1 border-l border-border" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-secondary transition-colors"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm text-white text-xs font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#635BFF,#7C3AED)" }}
            >
              {initial}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-foreground leading-tight truncate max-w-[120px]">
                {user?.full_name ?? "Usuario"}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {user?.email?.split("@")[0]}
              </p>
            </div>
            <ChevronDown
              size={13}
              className={`text-muted-foreground transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-[calc(100%+6px)] w-48 rounded-xl shadow-lg z-50 overflow-hidden"
              style={{
                background: "#fff",
                border: "1px solid rgba(107,139,255,0.15)",
                boxShadow: "0 8px 24px rgba(107,139,255,0.12), 0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-indigo-50 transition-colors"
              >
                <SlidersHorizontal size={14} className="text-slate-400" />
                Configuración
              </Link>
              <Link
                href="/billing"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-indigo-50 transition-colors"
              >
                <CreditCard size={14} className="text-slate-400" />
                Plan &amp; Billing
              </Link>
              <div style={{ borderTop: "1px solid rgba(107,139,255,0.1)" }} />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
