"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  SquaresFour,
  ChatCircleText,
  UsersThree,
  BellRinging,
  List,
} from "@phosphor-icons/react";
import { useState } from "react";
import { MobileSidebarSheet } from "./mobile-sidebar-sheet";

const NAV_ITEMS = [
  { href: "/dashboard",     icon: SquaresFour,    label: "Inicio" },
  { href: "/conversations", icon: ChatCircleText, label: "Chats" },
  { href: "/leads",         icon: UsersThree,     label: "Leads" },
  { href: "/seguimiento",   icon: BellRinging,    label: "Seguimiento" },
];

export function MobileNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
        style={{
          background: "hsl(var(--sidebar-bg))",
          borderTop: "1px solid hsl(var(--sidebar-border))",
          paddingBottom: "env(safe-area-inset-bottom)",
          boxShadow: "0 -4px 20px rgba(107,139,255,0.08)",
        }}
      >
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 flex-1 py-1 px-1 rounded-xl transition-all"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    isActive
                      ? "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg"
                      : "bg-transparent"
                  )}
                  style={
                    isActive
                      ? { boxShadow: "0 4px 12px rgba(107,139,255,0.4)" }
                      : {}
                  }
                >
                  <Icon
                    size={20}
                    weight={isActive ? "duotone" : "regular"}
                    style={{ color: isActive ? "#fff" : "rgba(70,90,155,0.5)" }}
                  />
                </div>
                <span
                  className="text-[10px] font-semibold leading-none"
                  style={{
                    color: isActive ? "#5B78F5" : "rgba(70,90,155,0.45)",
                  }}
                >
                  {label}
                </span>
              </Link>
            );
          })}

          {/* More button → opens sidebar sheet */}
          <button
            onClick={() => setSheetOpen(true)}
            className="flex flex-col items-center gap-0.5 flex-1 py-1 px-1 rounded-xl transition-all"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-transparent">
              <List
                size={20}
                weight="regular"
                style={{ color: "rgba(70,90,155,0.5)" }}
              />
            </div>
            <span
              className="text-[10px] font-semibold leading-none"
              style={{ color: "rgba(70,90,155,0.45)" }}
            >
              Más
            </span>
          </button>
        </div>
      </nav>

      <MobileSidebarSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
