"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Robot, PenNib, Buildings, EnvelopeSimple,
  CalendarDots, ChatCircle, SlidersHorizontal,
  Wallet, X, SignOut,
  GlobeHemisphereWest, Camera, FacebookLogo, TrendUp,
} from "@phosphor-icons/react";

const MORE_ITEMS = [
  { href: "/analytics",  icon: TrendUp,         label: "Analíticas",        color: "from-cyan-500 to-sky-600" },
  { href: "/agents",     icon: Robot,           label: "Agentes IA",        color: "from-fuchsia-500 to-purple-600" },
  { href: "/content",    icon: PenNib,          label: "Contenido",         color: "from-pink-500 to-rose-500" },
  { href: "/email",      icon: EnvelopeSimple,  label: "Email CRM",         color: "from-sky-500 to-blue-600" },
  { href: "/meetings",   icon: CalendarDots,    label: "Reuniones",         color: "from-violet-500 to-purple-600" },
  { href: "/properties", icon: Buildings,       label: "Propiedades",       color: "from-teal-500 to-green-600" },
  { href: "/settings",   icon: SlidersHorizontal, label: "Configuración",  color: "from-slate-500 to-gray-600" },
  { href: "/billing",    icon: Wallet,          label: "Plan & Billing",    color: "from-violet-600 to-indigo-600" },
];

export function MobileSidebarSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    onClose();
    window.location.href = "/login";
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 40 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col lg:hidden overflow-y-auto"
            style={{
              background: "hsl(var(--sidebar-bg))",
              borderRight: "1px solid hsl(var(--sidebar-border))",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-4"
              style={{ borderBottom: "1px solid rgba(107,139,255,0.12)" }}
            >
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Petunia AI" className="w-8 h-8 object-contain" />
                <div>
                  <p className="text-[13px] font-bold" style={{ color: "#1A1F3C" }}>Petunia AI</p>
                  <p className="text-[10px] font-medium" style={{ color: "rgba(107,139,255,0.75)" }}>Agente de ventas</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-indigo-50 transition-colors"
              >
                <X size={16} style={{ color: "rgba(107,139,255,0.5)" }} />
              </button>
            </div>

            {/* User info */}
            <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(107,139,255,0.12)" }}>
              <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-indigo-50/60">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#635BFF,#7C3AED)" }}
                >
                  {user?.full_name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold truncate" style={{ color: "#1A1F3C" }}>
                    {user?.full_name ?? "Usuario"}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: "rgba(107,139,255,0.7)" }}>
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-2 py-3 space-y-0.5">
              <p
                className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "rgba(60,75,140,0.45)" }}
              >
                Más opciones
              </p>
              {MORE_ITEMS.map(({ href, icon: Icon, label, color }) => {
                const isActive =
                  pathname === href ||
                  (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-2.5 px-2 py-[7px] rounded-xl text-[13px] font-semibold transition-all",
                      isActive
                        ? "text-indigo-700"
                        : "text-slate-500 hover:text-slate-800 hover:bg-indigo-50/60"
                    )}
                    style={
                      isActive
                        ? {
                            background:
                              "linear-gradient(135deg,rgba(107,139,255,0.13) 0%,rgba(196,170,255,0.10) 50%,rgba(255,186,154,0.08) 100%)",
                            border: "1px solid rgba(107,139,255,0.25)",
                          }
                        : { border: "1px solid transparent" }
                    }
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                        isActive ? `bg-gradient-to-br ${color}` : "bg-white/[0.07]"
                      )}
                      style={isActive ? { boxShadow: "0 2px 8px rgba(107,139,255,0.3)" } : {}}
                    >
                      <Icon
                        size={14}
                        weight={isActive ? "duotone" : "regular"}
                        style={{ color: isActive ? "#fff" : "rgba(70,90,155,0.65)" }}
                      />
                    </div>
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="px-3 pb-6" style={{ borderTop: "1px solid rgba(107,139,255,0.12)", paddingTop: "12px" }}>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <SignOut size={15} weight="duotone" />
                Cerrar sesión
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
