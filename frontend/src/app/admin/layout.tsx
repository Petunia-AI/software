"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuthStore } from "@/store/admin-auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Building2, Users, BarChart3,
  Zap, LogOut, ShieldCheck, Bot,
} from "lucide-react";

const adminNav = [
  { href: "/admin",             icon: LayoutDashboard, label: "Overview"   },
  { href: "/admin/businesses",  icon: Building2,       label: "Negocios"   },
  { href: "/admin/users",       icon: Users,           label: "Usuarios"   },
  { href: "/admin/analytics",   icon: BarChart3,       label: "Analíticas" },
  { href: "/admin/settings",    icon: Bot,             label: "Config. IA" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout, loadUser, _hasHydrated } = useAdminAuthStore();

  // La ruta /admin/login NO debe usar el layout con sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  useEffect(() => {
    if (!_hasHydrated) return; // esperar a que Zustand hidrate desde localStorage
    if (!token) { router.replace("/admin/login"); return; }
    loadUser();
  }, [_hasHydrated, token]);

  // Redirigir si no es superuser (verificado tras cargar)
  useEffect(() => {
    if (user && !user.is_superuser) router.replace("/dashboard");
  }, [user]);

  // Mientras hidrata, mostrar pantalla de carga
  if (!_hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-red-500 animate-spin" />
      </div>
    );
  }

  const handleLogout = () => { logout(); router.push("/admin/login"); };

  return (
    <div className="flex h-screen bg-[hsl(0,0%,98%)]">

      {/* Sidebar Admin */}
      <aside className="w-56 flex flex-col h-full bg-slate-900 flex-shrink-0">

        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={15} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Super Admin</p>
            <p className="text-white/40 text-[10px]">Agente Ventas AI</p>
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {adminNav.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/50 hover:bg-white/8 hover:text-white/80"
                )}
              >
                <Icon size={15} className={isActive ? "text-white" : "text-white/40"} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.full_name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
              <p className="text-[10px] text-white/40">Super Admin</p>
            </div>
            <button onClick={handleLogout} className="text-white/30 hover:text-red-400 transition-colors">
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
