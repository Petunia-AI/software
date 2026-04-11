"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuthStore } from "@/store/admin-auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Building2, Users, BarChart3,
  Zap, LogOut, ShieldCheck, Bot, DollarSign,
  Bell, ChevronRight, CreditCard,
} from "lucide-react";

const adminNav = [
  { href: "/admin",             icon: LayoutDashboard, label: "Overview",    section: "main" },
  { href: "/admin/businesses",  icon: Building2,       label: "Negocios",    section: "main" },
  { href: "/admin/users",       icon: Users,           label: "Usuarios",    section: "main" },
  { href: "/admin/analytics",   icon: BarChart3,       label: "Analíticas",  section: "main" },
  { href: "/admin/finanzas",    icon: DollarSign,      label: "Finanzas",    section: "main" },
  { href: "/admin/planes",      icon: CreditCard,      label: "Planes",      section: "main" },
  { href: "/admin/settings",    icon: Bot,             label: "Config. IA",  section: "config" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout, loadUser, _hasHydrated } = useAdminAuthStore();

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) return;
    if (!_hasHydrated) return;
    if (!token) { router.replace("/admin/login"); return; }
    loadUser();
  }, [_hasHydrated, token, isLoginPage]);

  useEffect(() => {
    if (isLoginPage) return;
    if (user && !user.is_superuser) router.replace("/dashboard");
  }, [user, isLoginPage]);

  // La ruta /admin/login NO debe usar el layout con sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!_hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#120028]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-xl">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-orange-500 animate-spin" />
        </div>
      </div>
    );
  }

  const handleLogout = () => { logout(); router.push("/admin/login"); };

  // Derive page title for top header
  const currentNav = adminNav.find(n =>
    n.href === pathname || (n.href !== "/admin" && pathname.startsWith(n.href))
  );
  const pageTitle = currentNav?.label ?? "Overview";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F7F8FC" }}>

      {/* ── Admin Sidebar ── */}
      <aside className="admin-sidebar w-60 flex flex-col h-full">

        {/* Brand header */}
        <div className="relative z-10 flex items-center gap-3 px-5 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
            style={{ background: "linear-gradient(135deg,#F97316,#EF4444)" }}
          >
            <ShieldCheck size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Super Admin</p>
            <p className="text-[10px] font-medium" style={{ color: "rgba(249,115,22,0.6)" }}>
              Agente Ventas AI
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 relative z-10 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="section-label px-2 pb-2" style={{ color: "rgba(255,255,255,0.22)" }}>
            Principal
          </p>

          {adminNav.filter(n => n.section === "main").map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="group relative flex items-center gap-2.5 px-3 py-[7px] rounded-xl text-sm font-medium transition-all duration-150"
                style={isActive ? {
                  background: "linear-gradient(135deg,rgba(249,115,22,0.2),rgba(239,68,68,0.1))",
                  border: "1px solid rgba(249,115,22,0.25)",
                  color: "#fff",
                } : {
                  border: "1px solid transparent",
                  color: "rgba(255,255,255,0.42)",
                }}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                    style={{ background: "linear-gradient(180deg,#F97316,#EF4444)" }}
                  />
                )}
                <Icon
                  size={15}
                  className="flex-shrink-0"
                  style={isActive ? { color: "#FB923C" } : { color: "rgba(255,255,255,0.28)" }}
                />
                <span className="flex-1 truncate">{label}</span>
              </Link>
            );
          })}

          <p className="section-label px-2 pt-4 pb-2" style={{ color: "rgba(255,255,255,0.22)" }}>
            Config
          </p>

          {adminNav.filter(n => n.section === "config").map(({ href, icon: Icon, label }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="group relative flex items-center gap-2.5 px-3 py-[7px] rounded-xl text-sm font-medium transition-all duration-150"
                style={isActive ? {
                  background: "linear-gradient(135deg,rgba(249,115,22,0.2),rgba(239,68,68,0.1))",
                  border: "1px solid rgba(249,115,22,0.25)",
                  color: "#fff",
                } : {
                  border: "1px solid transparent",
                  color: "rgba(255,255,255,0.42)",
                }}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                    style={{ background: "linear-gradient(180deg,#F97316,#EF4444)" }}
                  />
                )}
                <Icon
                  size={15}
                  className="flex-shrink-0"
                  style={isActive ? { color: "#FB923C" } : { color: "rgba(255,255,255,0.28)" }}
                />
                <span className="flex-1 truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="relative z-10 p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div
            className="flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors cursor-default"
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow"
              style={{ background: "linear-gradient(135deg,#F97316,#EF4444)" }}
            >
              {user?.full_name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/90 truncate leading-tight">
                {user?.full_name ?? "Admin"}
              </p>
              <p className="text-[10px]" style={{ color: "rgba(249,115,22,0.5)" }}>Super Admin</p>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-1.5 rounded-lg transition-colors"
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
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Admin Top Header */}
        <header className="top-header">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <ShieldCheck size={13} className="text-orange-400" />
              Admin
            </span>
            <ChevronRight size={13} className="text-muted-foreground/40" />
            <span className="text-foreground font-semibold">{pageTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-xl hover:bg-secondary transition-colors">
              <Bell size={16} className="text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm text-white text-xs font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#F97316,#EF4444)" }}
              >
                {user?.full_name?.[0]?.toUpperCase() ?? "A"}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-foreground leading-tight">
                  {user?.full_name ?? "Admin"}
                </p>
                <p className="text-[10px] text-orange-500 font-medium leading-tight">Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-gradient-mesh">{children}</main>
      </div>
    </div>
  );
}

