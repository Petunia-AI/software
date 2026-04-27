"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { TopHeader } from "@/components/top-header";
import { MobileNav } from "@/components/mobile-nav";
import { useAuthStore } from "@/store/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, loadUser, token } = useAuthStore();

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    loadUser();
  }, [token, loadUser, router]);

  if (!token) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar — only desktop */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader />
        {/* Extra bottom padding on mobile for the bottom nav */}
        <main className="flex-1 overflow-auto bg-gradient-mesh pb-[72px] lg:pb-0">
          {children}
        </main>
      </div>

      {/* Bottom nav — only mobile */}
      <MobileNav />
    </div>
  );
}


