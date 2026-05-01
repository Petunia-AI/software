"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";
import { Eye, EyeOff, Zap, ArrowRight, Check } from "lucide-react";

const FEATURES = [
  "5 agentes IA especializados (Claude claude-sonnet-4-6)",
  "Calificación BANT automática 24/7",
  "WhatsApp, Webchat e Instagram",
  "Analytics y reportes en tiempo real",
];

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await register(form.email, form.password, form.full_name);
        toast.success("¡Cuenta creada! Bienvenido 🎉");
        router.push("/onboarding");
      } else {
        await login(form.email, form.password);
        toast.success("Bienvenido de vuelta");
        const { user } = useAuthStore.getState();
        if (user?.is_superuser) {
          router.push("/admin");
        } else {
          const onboardingDone = localStorage.getItem("onboarding_done");
          router.push(onboardingDone ? "/dashboard" : "/onboarding");
        }
      }
    } catch {
      toast.error(isRegister ? "Error al crear cuenta" : "Email o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — Marketing ── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "hsl(258,47%,13%)" }}
      >
        {/* Glow decorativo */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(243,75%,59%) 0%, transparent 70%)", transform: "translate(-30%, -30%)" }}
        />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(199,89%,48%) 0%, transparent 70%)", transform: "translate(30%, 30%)" }}
        />

        {/* Logo */}
        <div className="relative z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Petunia AI" className="h-12 w-auto drop-shadow-lg" />
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
              Vende más,<br />
              <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
                sin trabajar más.
              </span>
            </h1>
            <p className="mt-4 text-white/60 text-base leading-relaxed">
              5 agentes de IA especializados que califican, nutren y cierran ventas por ti —
              las 24 horas, en WhatsApp, Instagram y tu sitio web.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-white/70">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-violet-300" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Testimonial */}
        <div className="relative z-10 p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
          <p className="text-white/80 text-sm italic leading-relaxed">
            "Pasamos de 20 leads/mes a 150+ con el mismo equipo.
            Los agentes trabajan mientras dormimos."
          </p>
          <div className="flex items-center gap-2.5 mt-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold">
              M
            </div>
            <div>
              <p className="text-white text-xs font-semibold">María González</p>
              <p className="text-white/40 text-xs">CEO · Fintech Chile</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — Form ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[hsl(0,0%,98%)]">
        <div className="w-full max-w-[400px] animate-fade-up">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Petunia AI" className="w-9 h-9" />
            <p className="font-bold text-foreground">Petunia AI</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              {isRegister ? "Crea tu cuenta" : "Bienvenido de vuelta"}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {isRegister
                ? "Empieza gratis, sin tarjeta de crédito"
                : "Ingresa tus credenciales para continuar"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="input-stripe"
                  placeholder="Tu nombre"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                autoFocus={!isRegister}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-stripe"
                placeholder="tu@empresa.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-foreground">Contraseña</label>
                {!isRegister && (
                  <button type="button" className="text-xs text-primary hover:underline">
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-stripe pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2 text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isRegister ? "Creando cuenta..." : "Iniciando sesión..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isRegister ? "Crear cuenta gratis" : "Iniciar sesión"}
                  <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          {isRegister && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Al registrarte aceptas nuestros{" "}
              <span className="text-primary hover:underline cursor-pointer">Términos de Servicio</span>
              {" "}y{" "}
              <span className="text-primary hover:underline cursor-pointer">Política de Privacidad</span>
            </p>
          )}

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-[hsl(0,0%,98%)] text-muted-foreground">
                {isRegister ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsRegister(!isRegister)}
            className="btn-secondary w-full py-2.5"
          >
            {isRegister ? "Iniciar sesión" : "Crear cuenta gratis"}
          </button>
        </div>
      </div>
    </div>
  );
}
