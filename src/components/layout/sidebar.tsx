"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Sparkles,
  Kanban,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Shield,
  CreditCard,
  Megaphone,
  BarChart3,
  Mail,
  Globe,
  FileText,
  Camera,
  CalendarDays,
  Brain,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Image from "next/image";

// ─── Navigation groups ────────────────────────────────────────────────────

const pipelineGroup = {
  label: "Pipeline",
  items: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Propiedades", href: "/properties", icon: Building2 },
    { name: "CRM Pipeline", href: "/crm", icon: Kanban },
  ],
};

const marketingGroup = {
  label: "Marketing",
  items: [
    { name: "Campañas", href: "/campaigns", icon: Megaphone },
    { name: "Contenido IA", href: "/content", icon: Sparkles },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
  ],
};

const automationGroup = {
  label: "Automatización",
  items: [
    { name: "Seguimiento", href: "/follow-up", icon: Bell },
    { name: "Email Drip", href: "/email-drip", icon: Mail },
  ],
};

// Items that exist but are still being improved — still navigable
const extrasGroup = {
  label: "Más herramientas",
  items: [
    { name: "Reportes PDF", href: "/reports", icon: FileText },
    { name: "Avatar IA", href: "/avatar", icon: Camera },
    { name: "Calendario", href: "/calendar", icon: CalendarDays },
    { name: "Aprendizaje IA", href: "/knowledge", icon: Brain },
  ],
};

const bottomGroup = {
  items: [
    { name: "Planes y Pagos", href: "/billing", icon: CreditCard },
    { name: "Configuración", href: "/settings", icon: Settings },
  ],
};

const adminNavigation = [
  { name: "Super Admin", href: "/admin", icon: Shield },
];

// ─── Component ────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const el = document.getElementById("main-content");
    if (el) {
      el.style.paddingLeft = collapsed ? "70px" : "256px";
    }
  }, [collapsed]);

  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === "ADMIN";

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  const NavItem = ({
    item,
    isAdminItem = false,
    soon = false,
  }: {
    item: { name: string; href: string; icon?: React.ElementType };
    isAdminItem?: boolean;
    soon?: boolean;
  }) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-[7px] text-[13px] font-medium transition-all duration-150 group",
          active
            ? "bg-white/18 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
            : "text-white/60 hover:bg-white/8 hover:text-white/90",
          isAdminItem && !active && "text-[#ECB22E]/80 hover:text-[#ECB22E]"
        )}
        title={collapsed ? item.name : undefined}
      >
        {Icon && (
          <Icon
            className={cn(
              "h-[17px] w-[17px] shrink-0 transition-colors",
              active ? "text-white" : "text-white/45 group-hover:text-white/80",
              isAdminItem && !active && "text-[#ECB22E]/60"
            )}
          />
        )}
        {!collapsed && (
          <>
            <span className="truncate">{item.name}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />}
            {soon && !active && (
              <span className="ml-auto text-[9px] font-semibold text-white/25 uppercase tracking-wider">
                Pronto
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

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

      {/* Sidebar */}
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
        <nav className="flex-1 px-2.5 py-3 overflow-y-auto scrollbar-none space-y-4">
          {/* Admin section */}
          {isAdmin && (
            <div>
              {!collapsed && (
                <p className="px-3 mb-1 text-[9px] font-semibold text-white/30 uppercase tracking-widest">
                  Admin
                </p>
              )}
              {adminNavigation.map((item) => (
                <NavItem key={item.name} item={item} isAdminItem />
              ))}
              <div className="mt-3 border-t border-white/8" />
            </div>
          )}

          {/* Pipeline group */}
          <div>
            {!collapsed && (
              <p className="px-3 mb-1 text-[9px] font-semibold text-white/30 uppercase tracking-widest">
                {pipelineGroup.label}
              </p>
            )}
            <div className="space-y-0.5">
              {pipelineGroup.items.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </div>
          </div>

          {/* Marketing group */}
          <div>
            {!collapsed && (
              <p className="px-3 mb-1 text-[9px] font-semibold text-white/30 uppercase tracking-widest">
                {marketingGroup.label}
              </p>
            )}
            <div className="space-y-0.5">
              {marketingGroup.items.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </div>
          </div>

          {/* Automation group */}
          <div>
            {!collapsed && (
              <p className="px-3 mb-1 text-[9px] font-semibold text-white/30 uppercase tracking-widest">
                {automationGroup.label}
              </p>
            )}
            <div className="space-y-0.5">
              {automationGroup.items.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </div>
          </div>

          {/* Extras group */}
          <div>
            {!collapsed && (
              <p className="px-3 mb-1 text-[9px] font-semibold text-white/30 uppercase tracking-widest">
                {extrasGroup.label}
              </p>
            )}
            <div className="space-y-0.5">
              {extrasGroup.items.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </div>
          </div>
        </nav>

        {/* Bottom: billing + settings */}
        <div className="px-2.5 pb-1">
          <div className="border-t border-white/8 pt-2 mb-1 space-y-0.5">
            {bottomGroup.items.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
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
