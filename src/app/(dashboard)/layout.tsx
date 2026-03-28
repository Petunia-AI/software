import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PetuniaChat } from "@/components/assistant/petunia-chat";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

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
