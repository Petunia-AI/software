"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Credenciales inválidas");
      } else {
        router.push("/dashboard");
      }
    } catch {
      toast.error("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 bg-white">
        <div className="w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl gold-gradient flex items-center justify-center shadow-md p-1 shrink-0">
              <Image src="/logo-petunia.svg" alt="Petunia AI" width={36} height={36} className="w-full h-full" style={{ filter: "brightness(2)" }} />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-[#1D1C1D]">PETUNIA AI</span>
              <span className="text-[10px] font-medium text-[#616061] -mt-0.5 tracking-wider">
                REAL ESTATE OS
              </span>
            </div>
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-[#1D1C1D]">Bienvenido de vuelta</h1>
          <p className="text-sm text-[#616061] mt-1.5 mb-8">
            Ingresa tus credenciales para acceder a tu cuenta
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email" className="text-[#1D1C1D] font-medium text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 border-[#E0E0E0] bg-white text-[#1D1C1D] placeholder:text-[#AAAAAA] focus-visible:ring-[#4A154B] focus-visible:border-[#4A154B]"
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[#1D1C1D] font-medium text-sm">Contraseña</Label>
                <button
                  type="button"
                  onClick={() => toast.info("Enviaremos un enlace de recuperación a tu email", { description: "Contacta soporte@petunia.ai si necesitas ayuda" })}
                  className="text-xs text-[#4A154B] hover:underline cursor-pointer font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 border-[#E0E0E0] bg-white text-[#1D1C1D] placeholder:text-[#AAAAAA] focus-visible:ring-[#4A154B] focus-visible:border-[#4A154B] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#616061] hover:text-[#1D1C1D]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 gold-gradient border-0 text-white font-semibold text-sm hover:opacity-90 transition-opacity mt-2"
              disabled={loading}
            >
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E0E0E0]" />
            </div>
          </div>

          <p className="text-sm text-center text-[#616061] mt-2">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-[#4A154B] font-semibold hover:underline">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>

      {/* Right panel — branding */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center p-12 overflow-hidden" style={{ background: "linear-gradient(160deg, #4A154B 0%, #350d36 60%, #1a0a1a 100%)" }}>
        {/* subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="relative max-w-md z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-8 shadow-xl p-3">
            <Image src="/logo-petunia.svg" alt="Petunia AI" width={64} height={64} className="w-full h-full" style={{ filter: "brightness(2)" }} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-4 text-white">
            Tu operación inmobiliaria en piloto automático
          </h2>
          <p className="text-white/70 leading-relaxed text-sm">
            Gestiona propiedades, genera contenido con IA, captura leads y cierra más ventas.
            Todo desde una sola plataforma diseñada para brokers inmobiliarios.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              { value: "500+", label: "Propiedades gestionadas" },
              { value: "2,000+", label: "Leads capturados" },
              { value: "10K+", label: "Contenidos generados" },
              { value: "95%", label: "Satisfacción" },
            ].map((stat) => (
              <div key={stat.label} className="p-4 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-[11px] text-white/60 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
