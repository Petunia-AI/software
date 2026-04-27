"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  SquaresFour, ChatCircleText, UsersThree, BellRinging,
  TrendUp, Robot, PenNib, Buildings, EnvelopeSimple,
  CalendarDots, ChatCircle, SlidersHorizontal, Wallet,
} from "@phosphor-icons/react";

const NAV_ITEMS = [
  { href: "/dashboard",              icon: SquaresFour,       label: "Inicio" },
  { href: "/conversations",          icon: ChatCircleText,    label: "Chats" },
  { href: "/leads",                  icon: UsersThree,        label: "Leads" },
  { href: "/seguimiento",            icon: BellRinging,       label: "Seguimiento" },
  { href: "/analytics",              icon: TrendUp,           label: "Analíticas" },
  { href: "/agents",                 icon: Robot,             label: "Agentes IA" },
  { href: "/content",                icon: PenNib,            label: "Contenido" },
  { href: "/email",                  icon: EnvelopeSimple,    label: "Email CRM" },
  { href: "/meetings",               icon: CalendarDots,      label: "Reuniones" },
  { href: "/integrations/whatsapp",  icon: ChatCircle,        label: "WhatsApp" },
  { href: "/properties",             icon: Buildings,         label: "Propiedades" },
  { href: "/settings",               icon: SlidersHorizontal, label: "Config" },
  { href: "/billing",                icon: Wallet,            label: "Billing" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{
        background: "hsl(var(--sidebar-bg))",
        borderTop: "1px solid hsl(var(--sidebar-border))",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -4px 20px rgba(107,139,255,0.08)",
      }}
    >
      {/* Scrollable horizontal strip */}
      <div
        className="flex items-center gap-1 px-2 pt-2 pb-1 overflow-x-auto"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 flex-shrink-0 py-1 px-2 rounded-xl transition-all"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  isActive
                    ? "bg-gradient-to-br from-violet-500 to-indigo-600"
                    : "bg-transparent"
                )}
                style={
                  isActive ? { boxShadow: "0 4px 12px rgba(107,139,255,0.4)" } : {}
                }
              >
                <Icon
                  size={19}
                  weight={isActive ? "duotone" : "regular"}
                  style={{ color: isActive ? "#fff" : "rgba(70,90,155,0.5)" }}
                />
              </div>
              <span
                className="text-[10px] font-semibold leading-none whitespace-nowrap"
                style={{ color: isActive ? "#5B78F5" : "rgba(70,90,155,0.45)" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
