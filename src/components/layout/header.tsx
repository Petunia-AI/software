"use client";

import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";

export function Header() {
  const { data: session } = useSession();
  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <header className="sticky top-0 z-30 h-[58px] bg-white border-b border-[#C4A0D4] shadow-[0_1px_0_#C4A0D4]">
      <div className="flex h-full items-center justify-between px-6 gap-4">
        {/* Search */}
        <div className="hidden md:flex items-center flex-1 max-w-xs">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#AAAAAA]" />
            <Input
              placeholder="Buscar propiedades, leads..."
              className="pl-9 h-9 rounded-xl bg-[#F4F4F4] border-0 text-[13px] text-[#1D1C1D] placeholder:text-[#AAAAAA] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 focus-visible:bg-white transition-colors"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5">
              <kbd className="h-4 px-1.5 rounded-[4px] bg-[#EBEBEB] text-[#999] text-[10px] font-mono flex items-center">⌘K</kbd>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Notifications */}
          <button className="relative h-9 w-9 rounded-xl flex items-center justify-center text-[#616061] hover:bg-[#F4F4F4] hover:text-[#1D1C1D] transition-colors">
            <Bell className="h-[17px] w-[17px]" />
            <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[#E01E5A]" />
          </button>

          {/* Separator */}
          <div className="h-5 w-px bg-[#EBEBEB] mx-1" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-[#F4F4F4] transition-colors outline-none cursor-pointer"
              render={<div />}
              nativeButton={false}
            >
              <Avatar className="h-7 w-7">
                {user?.image ? (
                  <AvatarImage src={user.image} alt={user?.name || "Avatar"} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-[#4A154B] to-[#611f69] text-white text-[10px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-[12px] font-semibold text-[#1D1C1D] leading-tight">
                  {user?.name || "Usuario"}
                </span>
                <span className="text-[10px] text-[#AAAAAA] leading-tight">
                  {(user as any)?.organizationName || "Mi Organización"}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#C4A0D4] shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-1">
              <DropdownMenuItem className="rounded-lg text-[13px]">Mi perfil</DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg text-[13px]">Configuración</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#F0F0F0]" />
              <DropdownMenuItem className="rounded-lg text-[13px] text-[#E01E5A] focus:text-[#E01E5A] focus:bg-[#FFECF0]" onClick={() => signOut({ callbackUrl: "/login" })}>
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
