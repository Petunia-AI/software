import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PetuniaChat } from "@/components/assistant/petunia-chat";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <Sidebar />
      <div id="main-content" className="lg:pl-[256px] transition-all duration-300">
        <Header />
        <main className="p-6 max-w-[1400px]">{children}</main>
      </div>
      <PetuniaChat />
    </div>
  );
}
