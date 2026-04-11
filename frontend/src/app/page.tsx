"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Zap, MessageSquare, Users, TrendingUp, Bot, Check,
  ArrowRight, Star, Globe, Phone, Instagram,
  BarChart3, Shield, Sparkles, ChevronRight,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ── Data ───────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Bot,
    title: "5 Agentes IA especializados",
    desc: "Calificador BANT, Cerrador, Nutridor, Soporte y Analista trabajando 24/7 en paralelo.",
    color: "bg-violet-50 text-violet-600",
    darkColor: "bg-violet-900/30 text-violet-300",
  },
  {
    icon: MessageSquare,
    title: "Omnicanal integrado",
    desc: "WhatsApp Business, webchat embeddable e Instagram en una sola bandeja de entrada.",
    color: "bg-blue-50 text-blue-600",
    darkColor: "bg-blue-900/30 text-blue-300",
  },
  {
    icon: TrendingUp,
    title: "Calificación BANT automática",
    desc: "Cada lead es puntuado por Budget, Authority, Need y Timeline. Los mejores llegan solos al cerrador.",
    color: "bg-green-50 text-green-600",
    darkColor: "bg-green-900/30 text-green-300",
  },
  {
    icon: BarChart3,
    title: "Analytics en tiempo real",
    desc: "Dashboard con tendencias, performance por agente y distribución de canales. Toma decisiones con datos.",
    color: "bg-amber-50 text-amber-600",
    darkColor: "bg-amber-900/30 text-amber-300",
  },
  {
    icon: Users,
    title: "Handoff a humanos",
    desc: "Cuando el cliente lo necesita, el agente pasa la conversación a tu equipo sin perder contexto.",
    color: "bg-rose-50 text-rose-600",
    darkColor: "bg-rose-900/30 text-rose-300",
  },
  {
    icon: Shield,
    title: "Multi-tenant seguro",
    desc: "Cada empresa tiene sus datos completamente aislados. Cumplimiento GDPR y LGPD.",
    color: "bg-indigo-50 text-indigo-600",
    darkColor: "bg-indigo-900/30 text-indigo-300",
  },
];

// ── Plan type ──────────────────────────────────────────────────────────────
interface Plan {
  id: string;
  name: string;
  price_usd: number;
  description: string;
  features: string[];
  highlight: boolean;
  cta: string;
}

// Fallback hardcoded (used while loading / if API fails)
const DEFAULT_PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price_usd: 49,
    description: "Para equipos que empiezan a automatizar ventas.",
    features: [
      "500 conversaciones / mes",
      "200 leads / mes",
      "3 agentes IA activos",
      "Canal Webchat",
      "Dashboard analytics",
      "Soporte por email",
    ],
    cta: "Empieza gratis 14 días",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price_usd: 149,
    description: "El favorito de equipos de ventas en crecimiento.",
    features: [
      "2,000 conversaciones / mes",
      "1,000 leads / mes",
      "5 agentes IA (todos)",
      "WhatsApp + Webchat + Instagram",
      "Analytics avanzado",
      "Reportes diarios por email",
      "Soporte prioritario",
      "Hasta 10 usuarios",
    ],
    cta: "Empieza gratis 14 días",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price_usd: 399,
    description: "Para empresas con volumen alto y necesidades custom.",
    features: [
      "Conversaciones ilimitadas",
      "Leads ilimitados",
      "Agentes ilimitados",
      "Todos los canales",
      "API access",
      "SLA 99.9% uptime",
      "Onboarding dedicado",
      "Usuarios ilimitados",
    ],
    cta: "Hablar con ventas",
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    quote: "Pasamos de 20 leads/mes a 150+ con el mismo equipo. Los agentes trabajan mientras dormimos.",
    name: "María González",
    role: "CEO · Fintech Chile",
    avatar: "MG",
    color: "from-pink-400 to-rose-500",
  },
  {
    quote: "La calificación BANT automática eliminó el 80% de los leads no calificados que perdían tiempo a nuestro equipo.",
    name: "Carlos Mendoza",
    role: "Head of Sales · SaaS México",
    avatar: "CM",
    color: "from-violet-400 to-indigo-500",
  },
  {
    quote: "Implementamos el widget en 10 minutos. Al día siguiente ya teníamos conversaciones calificadas.",
    name: "Ana Torres",
    role: "Founder · E-commerce Colombia",
    avatar: "AT",
    color: "from-emerald-400 to-teal-500",
  },
];

const STATS = [
  { value: "3x", label: "más leads calificados" },
  { value: "87%", label: "menos tiempo de respuesta" },
  { value: "24/7", label: "cobertura automática" },
  { value: "< 10min", label: "para instalar" },
];

// ── Navbar ─────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[hsl(258,47%,8%)]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-petunia.svg" alt="Petunia AI" className="w-9 h-9 drop-shadow-lg" />
          <div>
            <span className="font-bold text-white text-lg">Petunia AI</span>
            <span className="ml-2 text-xs text-white/40 font-normal hidden sm:inline">Real Estate Automation</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
          <a href="#pricing" className="hover:text-white transition-colors">Precios</a>
          <a href="#testimonials" className="hover:text-white transition-colors">Casos de éxito</a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white px-5 py-2 rounded-xl transition-colors shadow-lg shadow-violet-900/40"
          >
            Empieza gratis
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);

  useEffect(() => {
    fetch(`${API}/billing/plans`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (Array.isArray(data) && data.length > 0) setPlans(data); })
      .catch(() => {/* keep defaults */});
  }, []);
  return (
    <div className="min-h-screen bg-[hsl(258,47%,8%)] text-white overflow-x-hidden">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-20"
            style={{ background: "radial-gradient(ellipse, hsl(243,75%,59%) 0%, transparent 70%)" }}
          />
          <div
            className="absolute bottom-0 right-0 w-[500px] h-[400px] rounded-full opacity-10"
            style={{ background: "radial-gradient(ellipse, hsl(199,89%,48%) 0%, transparent 70%)" }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm mb-8"
          >
            <Sparkles size={13} />
            Petunia AI · Agente de ventas inteligente
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6"
          >
            Petunia AI —<br />
            <span className="bg-gradient-to-r from-violet-300 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
              tu agente de ventas.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-10"
          >
            5 agentes de IA especializados que califican leads BANT, nutren prospectos y
            cierran ventas — las 24 horas, en WhatsApp, Instagram y tu sitio web.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/login"
              className="flex items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-2xl transition-all shadow-2xl shadow-violet-900/60 text-lg"
            >
              Empieza gratis 14 días <ArrowRight size={18} />
            </Link>
            <a
              href="#pricing"
              className="flex items-center gap-2 px-8 py-4 border border-white/20 hover:border-white/40 text-white/80 hover:text-white rounded-2xl transition-all text-lg"
            >
              Ver planes <ChevronRight size={18} />
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-5 text-sm text-white/40"
          >
            Sin tarjeta de crédito · Cancela cuando quieras · Setup en menos de 10 minutos
          </motion.p>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative max-w-3xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10"
        >
          {STATS.map((s) => (
            <div key={s.label} className="bg-white/5 backdrop-blur px-6 py-5 text-center">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-white/50 mt-1">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-400 text-sm font-semibold uppercase tracking-wider mb-3">
              Funcionalidades
            </p>
            <h2 className="text-4xl font-bold text-white">
              Todo lo que necesitas para vender más
            </h2>
            <p className="text-white/50 mt-4 max-w-xl mx-auto">
              Una plataforma completa de IA conversacional diseñada para equipos de ventas en LATAM.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="p-6 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.darkColor}`}>
                  <f.icon size={18} />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Channels ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Conecta todos tus canales
          </h2>
          <p className="text-white/50 mb-12">
            Tus agentes responden donde están tus clientes, sin importar el canal.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Globe,     label: "Webchat",           desc: "Widget instalable en cualquier sitio web con una línea de código.", color: "bg-blue-500" },
              { icon: Phone,     label: "WhatsApp Business", desc: "Responde mensajes de WhatsApp 24/7 vía Twilio. Sin bot de número compartido.", color: "bg-green-500" },
              { icon: Instagram, label: "Instagram",         desc: "Califica leads que llegan por DM de Instagram de forma automática.", color: "bg-pink-500" },
            ].map((c) => (
              <div key={c.label} className="p-6 rounded-2xl border border-white/10 bg-white/[0.04] text-center">
                <div className={`w-12 h-12 rounded-2xl ${c.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <c.icon size={22} className="text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">{c.label}</h3>
                <p className="text-sm text-white/50">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <h2 className="text-4xl font-bold text-white">
              Empresas LATAM que ya venden más
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="p-6 rounded-2xl border border-white/10 bg-white/[0.04]"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={12} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed italic mb-5">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{t.name}</p>
                    <p className="text-white/40 text-xs">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-violet-400 text-sm font-semibold uppercase tracking-wider mb-3">
              Precios
            </p>
            <h2 className="text-4xl font-bold text-white">
              Precio simple y transparente
            </h2>
            <p className="text-white/50 mt-4">
              14 días de prueba gratis en todos los planes. Sin tarjeta de crédito.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`relative p-7 rounded-2xl border transition-all ${
                  plan.highlight
                    ? "border-violet-500 bg-violet-950/60 shadow-2xl shadow-violet-900/40"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-violet-500 text-white text-xs font-bold rounded-full">
                      MÁS POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                  <p className="text-white/50 text-sm mt-1">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">${plan.price_usd}</span>
                    <span className="text-white/40 mb-1">/mes</span>
                  </div>
                  <p className="text-white/40 text-xs mt-1">USD · facturación mensual</p>
                </div>

                <ul className="space-y-2.5 mb-7">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                      <Check size={14} className="text-violet-400 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.highlight
                      ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/50"
                      : "border border-white/20 hover:border-white/40 text-white hover:bg-white/5"
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full opacity-25"
            style={{ background: "radial-gradient(ellipse, hsl(243,75%,59%) 0%, transparent 70%)" }}
          />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Empieza hoy, gratis.</h2>
          <p className="text-white/60 text-lg mb-10">
            Configura tus agentes en minutos. Tus primeras 14 días son completamente gratuitas.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-10 py-4 bg-white text-[hsl(258,47%,13%)] font-bold rounded-2xl hover:bg-white/90 transition-all shadow-2xl text-lg"
          >
            Crear cuenta gratis <ArrowRight size={20} />
          </Link>
          <p className="text-white/30 text-sm mt-5">
            Sin tarjeta de crédito · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center">
              <Zap size={13} className="text-white" />
            </div>
            <span className="font-bold text-white">Agente de Ventas AI</span>
          </div>
          <p className="text-white/30 text-sm">
            © 2025 Agente de Ventas AI · Construido para LATAM 🌎
          </p>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <Link href="/login" className="hover:text-white/70 transition-colors">Acceso</Link>
            <a href="mailto:hola@agenteventas.ai" className="hover:text-white/70 transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
