"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Sparkles,
  CalendarDays,
  Kanban,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Shield,
  Camera,
  CreditCard,
  BookOpen,
  Rocket,
  Globe,
  Megaphone,
  ExternalLink,
  Brain,
  BarChart3,
  ShieldCheck,
  Mail,
  FlaskConical,
  FileText,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Image from "next/image";

const clientNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Propiedades", href: "/properties", icon: Building2 },
  { name: "CRM Pipeline", href: "/crm", icon: Kanban },
  { name: "Campañas", href: "/campaigns", icon: Megaphone },
  { name: "Email Drip", href: "/email-drip", icon: Mail },
  { name: "A/B Testing", href: "/ab-testing", icon: FlaskConical },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Reportes PDF", href: "/reports", icon: FileText },
  { name: "Contenido IA", href: "/content", icon: Sparkles },
  { name: "Avatar IA", href: "/avatar", icon: Camera },
  { name: "Calendario", href: "/calendar", icon: CalendarDays },
  { name: "Landing Pages", href: "/landing-pages", icon: Globe },
  { name: "Seguimiento", href: "/follow-up", icon: Bell },
  { name: "Aprendizaje IA", href: "/knowledge", icon: Brain },
  { name: "Knowledge Base", href: "/docs", icon: BookOpen },
  { name: "Planes y Pagos", href: "/billing", icon: CreditCard },
  { name: "Configuración", href: "/settings", icon: Settings },
  { name: "Audit Log", href: "/audit-log", icon: ShieldCheck },
];

const adminNavigation = [
  { name: "Super Admin", href: "/admin", icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();

  // Sync main content padding with sidebar width
  useEffect(() => {
    const el = document.getElementById("main-content");
    if (el) {
      el.style.paddingLeft = collapsed ? "70px" : "256px";
    }
  }, [collapsed]);

  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === "ADMIN";

  const navigation = isAdmin
    ? [...adminNavigation, ...clientNavigation]
    : clientNavigation;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity duration-300",
          collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        onClick={() => setCollapsed(true)}
      />

      {/* Mobile menu button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-lg p-2 shadow-lg"
        style={{ background: "linear-gradient(135deg, #4A154B, #611f69)", color: "#fff" }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar — Slack aubergine */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen transition-all duration-300 flex flex-col",
          collapsed ? "w-[70px]" : "w-[256px]",
          "max-lg:translate-x-0",
          collapsed && "max-lg:-translate-x-full"
        )}
        style={{ background: "linear-gradient(180deg, #3D1140 0%, #2E0C38 50%, #1E0726 100%)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-[58px] px-4 border-b border-white/8">
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center p-1.5 shrink-0 bg-white/12 border border-white/15">
              <Image src="/logo-petunia.svg" alt="Petunia AI" width={32} height={32} className="w-full h-full" style={{ filter: "brightness(10)" }} />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-bold tracking-tight text-white truncate">
                  Petunia AI
                </span>
                <span className="text-[10px] font-medium text-white/45 -mt-0.5">
                  Real Estate OS
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/10 transition-colors shrink-0"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 text-white/40 transition-transform duration-300",
                collapsed && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto scrollbar-none">
          {navigation.map((item, index) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            const isAdminItem = item.href === "/admin";

            return (
              <div key={item.name}>
                {isAdmin && index === adminNavigation.length && (
                  <div className="my-2 border-t border-white/8 mx-1" />
                )}
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-[7px] text-[13px] font-medium transition-all duration-150 group",
                    isActive
                      ? "bg-white/18 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
                      : "text-white/60 hover:bg-white/8 hover:text-white/90",
                    isAdminItem && !isActive && "text-[#ECB22E]/80 hover:text-[#ECB22E]"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      "h-[17px] w-[17px] shrink-0 transition-colors",
                      isActive ? "text-white" : "text-white/45 group-hover:text-white/80",
                      isAdminItem && !isActive && "text-[#ECB22E]/60"
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                  {isActive && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Setup wizard link — separate from navigation */}
        <div className="px-2.5 pb-1">
          <div className="border-t border-white/8 pt-2 mb-1">
            {!collapsed && (
              <p className="px-3 mb-1 text-[9px] font-semibold text-white/30 uppercase tracking-widest">
                Configuración inicial
              </p>
            )}
            <Link
              href="/onboarding"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-[7px] text-[13px] font-medium transition-all duration-150 group",
                pathname?.startsWith("/onboarding")
                  ? "bg-white/18 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
                  : "text-white/40 hover:bg-white/8 hover:text-white/70"
              )}
              title={collapsed ? "Setup Wizard (pantalla completa)" : undefined}
            >
              <Rocket className="h-[17px] w-[17px] shrink-0 text-white/30 group-hover:text-white/60" />
              {!collapsed && (
                <>
                  <span className="truncate">Setup Wizard</span>
                  <ExternalLink className="ml-auto h-3 w-3 text-white/25" />
                </>
              )}
            </Link>
          </div>
        </div>

        {/* User section */}
        <div className="border-t border-white/8 p-2.5">
          {!collapsed && session?.user?.name && (
            <div className="px-3 py-2 mb-1 rounded-lg hover:bg-white/8 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-white">
                    {session.user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-white/90 truncate">
                    {session.user.name}
                  </p>
                  <p className="text-[10px] text-white/35 truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <span className="inline-flex items-center mt-2 text-[9px] bg-[#ECB22E]/20 text-[#ECB22E] px-2 py-0.5 rounded-full font-semibold tracking-wide">
                  SUPER ADMIN
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 rounded-lg px-3 py-[7px] text-[13px] font-medium text-white/40 hover:bg-white/8 hover:text-white/75 transition-all w-full"
            title={collapsed ? "Cerrar sesión" : undefined}
          >
            <LogOut className="h-[17px] w-[17px] shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
