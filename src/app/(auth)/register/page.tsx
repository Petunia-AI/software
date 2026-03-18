"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, companyName }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Error al registrarse");
        return;
      }

      toast.success("Cuenta creada exitosamente");
      router.push("/login");
    } catch {
      toast.error("Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center p-12 overflow-hidden" style={{ background: "linear-gradient(160deg, #4A154B 0%, #350d36 60%, #1a0a1a 100%)" }}>
        {/* subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="relative max-w-md z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-8 shadow-xl p-3">
            <Image src="/logo-petunia.svg" alt="Petunia AI" width={64} height={64} className="w-full h-full" style={{ filter: "brightness(2)" }} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-4 text-white">
            Comienza a crecer con Petunia AI
          </h2>
          <p className="text-white/70 leading-relaxed text-sm">
            Crea tu cuenta en segundos y empieza a automatizar tu marketing inmobiliario,
            capturar más leads y cerrar más ventas con inteligencia artificial.
          </p>
          <div className="mt-8 space-y-3">
            {[
              "Gestión de propiedades centralizada",
              "Motor de contenido con IA (Claude + GPT)",
              "CRM y pipeline comercial visual",
              "Seguimiento automatizado de leads",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-sm text-white/85">
                <div className="h-5 w-5 rounded-full bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
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

          <h1 className="text-2xl font-bold tracking-tight text-[#1D1C1D]">Crear cuenta</h1>
          <p className="text-sm text-[#616061] mt-1.5 mb-8">
            Completa el formulario para comenzar a usar la plataforma
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name" className="text-[#1D1C1D] font-medium text-sm">Nombre completo</Label>
              <Input
                id="name"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11 border-[#E0E0E0] bg-white text-[#1D1C1D] placeholder:text-[#AAAAAA] focus-visible:ring-[#4A154B] focus-visible:border-[#4A154B]"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="company" className="text-[#1D1C1D] font-medium text-sm">Nombre de tu empresa</Label>
              <Input
                id="company"
                placeholder="Ej: Mi Inmobiliaria"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="h-11 border-[#E0E0E0] bg-white text-[#1D1C1D] placeholder:text-[#AAAAAA] focus-visible:ring-[#4A154B] focus-visible:border-[#4A154B]"
              />
            </div>
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
              <Label htmlFor="password" className="text-[#1D1C1D] font-medium text-sm">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
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
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>

          <p className="text-sm text-center text-[#616061] mt-6">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-[#4A154B] font-semibold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
