import Link from "next/link"
import Image from "next/image"

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #4A154B 0%, #350d36 55%, #1a0a1a 100%)" }}
    >
      {/* Dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.045] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />
      {/* Radial glow top-left */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#7C3085]/20 blur-3xl pointer-events-none" />
      {/* Radial glow bottom-right */}
      <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full bg-[#4A154B]/30 blur-3xl pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 h-16 flex items-center justify-between px-6 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center p-1.5">
            <Image src="/logo-petunia.svg" alt="Petunia AI" width={24} height={24} style={{ filter: "brightness(10)" }} />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold tracking-tight text-white">Petunia AI</span>
            <span className="text-[10px] font-medium text-white/55 -mt-0.5">Setup Wizard</span>
          </div>
        </Link>
        <span className="text-xs text-white/40 font-medium">¿Necesitas ayuda? soporte@petunia.ai</span>
      </div>

      <main className="relative z-10 flex-1 flex items-start justify-center p-6 pt-10 pb-16">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  )
}
