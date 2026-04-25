"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Users, TrendingUp, Bot, Check,
  ArrowRight, Star, Globe, Phone, Instagram,
  BarChart3, Shield, Sparkles, X, Send, Zap,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface Plan {
  id: string;
  name: string;
  price_usd: number;
  description: string;
  features: string[];
  highlight: boolean;
  cta: string;
}

const FEATURES = [
  { icon: Bot, title: "5 Agentes IA especializados", desc: "Calificador BANT, Cerrador, Nutridor, Soporte y Analista trabajando 24/7 en paralelo.", gradient: "from-violet-500 to-purple-600" },
  { icon: MessageSquare, title: "Omnicanal integrado", desc: "WhatsApp Business, webchat embeddable e Instagram en una sola bandeja de entrada.", gradient: "from-blue-500 to-cyan-500" },
  { icon: TrendingUp, title: "Calificación BANT automática", desc: "Cada lead puntuado por Budget, Authority, Need y Timeline. Solo los mejores llegan a tu equipo.", gradient: "from-emerald-500 to-teal-500" },
  { icon: BarChart3, title: "Analytics en tiempo real", desc: "Dashboard con tendencias, performance por agente y distribución de canales.", gradient: "from-amber-500 to-orange-500" },
  { icon: Users, title: "Handoff a humanos", desc: "El agente pasa la conversación a tu equipo sin perder contexto cuando el cliente lo necesita.", gradient: "from-rose-500 to-pink-500" },
  { icon: Shield, title: "Multi-tenant seguro", desc: "Datos completamente aislados por empresa. Cumplimiento GDPR y LGPD.", gradient: "from-indigo-500 to-violet-500" },
];

const STATS = [
  { value: "3x", label: "más leads calificados" },
  { value: "87%", label: "menos tiempo de respuesta" },
  { value: "24/7", label: "cobertura automática" },
  { value: "10min", label: "para instalar" },
];

const TESTIMONIALS = [
  { quote: "Pasamos de 20 leads/mes a 150+ con el mismo equipo. Los agentes trabajan mientras dormimos.", name: "María González", role: "CEO · Fintech Chile", avatar: "MG", gradient: "from-pink-400 to-rose-500" },
  { quote: "La calificación BANT automática eliminó el 80% de los leads no calificados.", name: "Carlos Mendoza", role: "Head of Sales · SaaS México", avatar: "CM", gradient: "from-violet-400 to-indigo-500" },
  { quote: "Implementamos el widget en 10 minutos. Al día siguiente ya teníamos conversaciones calificadas.", name: "Ana Torres", role: "Founder · E-commerce Colombia", avatar: "AT", gradient: "from-emerald-400 to-teal-500" },
];

const DEFAULT_PLANS: Plan[] = [
  { id: "starter", name: "Starter", price_usd: 49, description: "Para equipos que empiezan a automatizar ventas.", features: ["500 conversaciones / mes", "200 leads / mes", "3 agentes IA activos", "Canal Webchat", "Dashboard analytics", "Soporte por email"], cta: "Empieza gratis 14 días", highlight: false },
  { id: "pro", name: "Pro", price_usd: 149, description: "El favorito de equipos de ventas en crecimiento.", features: ["2,000 conversaciones / mes", "1,000 leads / mes", "5 agentes IA (todos)", "WhatsApp + Webchat + Instagram", "Analytics avanzado", "Reportes diarios por email", "Soporte prioritario", "Hasta 10 usuarios"], cta: "Empieza gratis 14 días", highlight: true },
  { id: "enterprise", name: "Enterprise", price_usd: 399, description: "Para empresas con volumen alto y necesidades custom.", features: ["Conversaciones ilimitadas", "Leads ilimitados", "Agentes ilimitados", "Todos los canales", "API access", "SLA 99.9% uptime", "Onboarding dedicado", "Usuarios ilimitados"], cta: "Hablar con ventas", highlight: false },
];

const DEMO_MESSAGES = [
  { id: 1, from: "agent" as const, text: "¡Hola! Soy Petunia 🌸 ¿En qué te puedo ayudar hoy?" },
  { id: 2, from: "user" as const, text: "Busco una propiedad de 3 cuartos en Miraflores" },
  { id: 3, from: "agent" as const, text: "¡Perfecto! Tenemos 12 opciones disponibles 🏠 ¿Cuál es tu presupuesto?" },
  { id: 4, from: "user" as const, text: "Entre $150k y $200k USD" },
  { id: 5, from: "agent" as const, text: "¡Encontré 5 propiedades ideales para ti! Te envío los detalles ✨" },
  { id: 6, from: "agent" as const, text: "✅ Lead calificado · BANT score: 92% · Budget confirmado" },
];

function AnimatedChatDemo() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (visibleCount >= DEMO_MESSAGES.length) {
      setIsTyping(false);
      const t = setTimeout(() => setVisibleCount(0), 3500);
      return () => clearTimeout(t);
    }
    const nextMsg = DEMO_MESSAGES[visibleCount];
    const isAgent = nextMsg.from === "agent";
    if (isAgent) setIsTyping(true);
    const delay = isAgent ? 1400 : 700;
    const t = setTimeout(() => { setIsTyping(false); setVisibleCount((c) => c + 1); }, delay);
    return () => clearTimeout(t);
  }, [visibleCount]);

  return (
    <div className="relative w-full max-w-[340px] mx-auto select-none">
      <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-10 top-20 bg-white rounded-2xl shadow-lg border border-gray-100 px-3 py-2 flex items-center gap-2 z-10">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
          <Check size={14} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-800 whitespace-nowrap">Lead calificado</p>
          <p className="text-xs text-gray-400 whitespace-nowrap">BANT score: 92%</p>
        </div>
      </motion.div>
      <motion.div animate={{ y: [0, 7, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        className="absolute -right-10 bottom-24 bg-white rounded-2xl shadow-lg border border-gray-100 px-3 py-2 z-10">
        <p className="text-xs font-semibold text-gray-800 whitespace-nowrap">+150 leads/mes</p>
        <p className="text-xs text-emerald-500 flex items-center gap-1 whitespace-nowrap"><TrendingUp size={10} /> +3x crecimiento</p>
      </motion.div>
      <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Petunia" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Petunia AI</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <p className="text-white/70 text-xs">En línea</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-3 py-4 space-y-3 min-h-[300px]">
          <AnimatePresence>
            {DEMO_MESSAGES.slice(0, visibleCount).map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  msg.from === "agent"
                    ? "bg-white text-gray-700 shadow-sm border border-gray-100 rounded-tl-sm"
                    : "bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-tr-sm"
                }`}>{msg.text}</div>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div key="typing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-start">
                <div className="bg-white border border-gray-100 shadow-sm px-4 py-2.5 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="w-2 h-2 bg-gray-400 rounded-full block"
                      animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="bg-white border-t border-gray-100 px-3 py-2.5 flex items-center gap-2">
          <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-400">Escribe un mensaje...</div>
          <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Send size={14} className="text-white ml-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

const BOT_KB: { keywords: string[]; response: string }[] = [
  { keywords: ["precio", "costo", "plan", "cuanto", "cuánto", "vale", "cobran"], response: "Tenemos planes desde $49/mes. El plan Pro ($149/mes) incluye los 5 agentes IA y todos los canales 🚀" },
  { keywords: ["whatsapp", "instagram", "canal", "integra", "redes"], response: "Petunia se integra con WhatsApp Business, Instagram DMs y webchat embeddable 📱" },
  { keywords: ["prueba", "gratis", "free", "trial", "demo"], response: "¡Sí! Tienes 14 días de prueba completamente gratis, sin tarjeta de crédito 🎉" },
  { keywords: ["instala", "setup", "configura", "tiempo", "implementa", "minutos"], response: "El setup toma menos de 10 minutos. Copias una línea de código en tu web y listo 💡" },
  { keywords: ["bant", "califica", "lead", "prospecto"], response: "El agente Calificador evalúa cada lead con metodología BANT (Budget, Authority, Need, Timeline) 🎯" },
  { keywords: ["agente", "ia", "bot", "robot", "inteligencia"], response: "Petunia tiene 5 agentes: Calificador BANT, Cerrador, Nutridor, Soporte y Analista. Todos trabajan 24/7 🤖" },
  { keywords: ["hola", "hi", "buenas", "ola", "saludos"], response: "¡Hola! 🌸 ¿En qué te puedo ayudar hoy?" },
];

const QUICK_QUESTIONS = ["¿Cuánto cuesta?", "¿Tiene WhatsApp?", "¿Hay prueba gratis?", "¿Cómo se instala?"];

interface ChatMsg { from: "bot" | "user"; text: string; }

function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { from: "bot", text: "¡Hola! Soy Petunia 🌸 ¿Tienes alguna pregunta sobre nuestros servicios?" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { from: "user", text }]);
    setInput(""); setShowQuick(false); setIsTyping(true);
    const lower = text.toLowerCase();
    let response = "Gracias por tu mensaje 😊 Escríbenos a api@aipetunia.com o inicia tu prueba gratuita.";
    for (const entry of BOT_KB) {
      if (entry.keywords.some((k) => lower.includes(k))) { response = entry.response; break; }
    }
    setTimeout(() => { setIsTyping(false); setMessages((m) => [...m, { from: "bot", text: response }]); }, 1300);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.85, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="Petunia" className="w-6 h-6 object-contain" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Petunia AI</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-white/70 text-xs">Responde en segundos</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                <X size={17} />
              </button>
            </div>
            <div className="h-72 overflow-y-auto bg-gray-50 px-3 py-4 space-y-3">
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      msg.from === "bot"
                        ? "bg-white text-gray-700 shadow-sm border border-gray-100 rounded-tl-sm"
                        : "bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-tr-sm"
                    }`}>{msg.text}</div>
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div key="typing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-start">
                    <div className="bg-white border border-gray-100 shadow-sm px-4 py-2.5 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                      {[0, 1, 2].map((i) => (
                        <motion.span key={i} className="w-2 h-2 bg-gray-400 rounded-full block"
                          animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={endRef} />
            </div>
            <AnimatePresence>
              {showQuick && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="px-3 py-2 flex flex-wrap gap-1.5 border-t border-gray-100 bg-white">
                  {QUICK_QUESTIONS.map((q) => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="text-xs px-3 py-1.5 rounded-full border border-violet-200 text-violet-600 hover:bg-violet-50 transition-colors">{q}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="bg-white border-t border-gray-100 px-3 py-2.5 flex items-center gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                placeholder="Escribe tu pregunta..."
                className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:bg-gray-50 transition-colors" />
              <button onClick={() => sendMessage(input)}
                className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity">
                <Send size={14} className="text-white ml-0.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button onClick={() => setOpen(!open)} whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.93 }}
        className="relative w-14 h-14 bg-gradient-to-br from-violet-600 to-purple-600 rounded-full shadow-2xl shadow-violet-500/40 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {open
            ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X size={22} className="text-white" /></motion.div>
            : <motion.div key="msg" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><MessageSquare size={22} className="text-white" /></motion.div>
          }
        </AnimatePresence>
        {!open && <span className="absolute inset-0 rounded-full bg-violet-500 animate-ping opacity-25" />}
      </motion.button>
    </div>
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100" : "bg-transparent"
    }`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Petunia AI" className="h-9 w-auto" />
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
          <a href="#features" className="hover:text-gray-900 transition-colors">Funcionalidades</a>
          <a href="#pricing" className="hover:text-gray-900 transition-colors">Precios</a>
          <a href="#testimonials" className="hover:text-gray-900 transition-colors">Casos de éxito</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-2">Iniciar sesión</Link>
          <Link href="/login" className="text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 text-white px-5 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5">
            Empieza gratis
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);

  useEffect(() => {
    fetch(`${API}/billing/plans`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (Array.isArray(data) && data.length > 0) setPlans(data); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <Navbar />
      <SupportWidget />

      {/* Hero */}
      <section className="relative pt-28 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 right-0 w-[700px] h-[700px] rounded-full opacity-[0.06]"
            style={{ background: "radial-gradient(ellipse, #7c3aed 0%, transparent 70%)" }} />
          <div className="absolute top-1/2 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.05]"
            style={{ background: "radial-gradient(ellipse, #0ea5e9 0%, transparent 70%)" }} />
        </div>
        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-violet-600 text-sm font-medium mb-7">
                <Sparkles size={13} /> Agente de ventas IA para LATAM
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
                className="text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6 text-gray-900">
                Vende más,<br />
                <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">sin esfuerzo extra.</span>
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                className="text-lg text-gray-500 max-w-lg leading-relaxed mb-8">
                5 agentes de IA que califican leads BANT, nutren prospectos y cierran ventas — las 24 horas del día en WhatsApp, Instagram y tu sitio web.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
                className="flex flex-col sm:flex-row gap-3 mb-7">
                <Link href="/login" className="flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl transition-all hover:shadow-xl hover:shadow-violet-200 hover:-translate-y-0.5 text-base">
                  Empieza gratis 14 días <ArrowRight size={17} />
                </Link>
                <a href="#pricing" className="flex items-center justify-center gap-2 px-7 py-3.5 border border-gray-200 text-gray-700 hover:border-violet-300 hover:text-violet-600 rounded-xl transition-all text-base">
                  Ver planes
                </a>
              </motion.div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="text-sm text-gray-400">
                Sin tarjeta de crédito · Cancela cuando quieras · Setup en 10 minutos
              </motion.p>
            </div>
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 120, damping: 20 }}
              className="flex justify-center lg:justify-end pr-8">
              <AnimatedChatDemo />
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 + i * 0.07 }}
                className="text-center p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100">
                <p className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-600 text-sm font-semibold uppercase tracking-wider mb-3">Funcionalidades</p>
            <h2 className="text-4xl font-bold text-gray-900">Todo lo que necesitas para vender más</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">Plataforma completa de IA conversacional diseñada para equipos de ventas en LATAM.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.07 }} whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all cursor-default">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 shadow-md`}>
                  <f.icon size={20} className="text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-violet-600 text-sm font-semibold uppercase tracking-wider mb-3">Cómo funciona</p>
          <h2 className="text-4xl font-bold text-gray-900 mb-16">Empieza en 3 pasos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { step: "01", title: "Instala el widget", desc: "Copia una línea de código en tu web. Listo en menos de 10 minutos.", icon: Zap, gradient: "from-amber-400 to-orange-500" },
              { step: "02", title: "Configura tus agentes", desc: "Define tu producto, precios y guión de ventas. La IA aprende tu negocio.", icon: Bot, gradient: "from-violet-500 to-purple-600" },
              { step: "03", title: "Recibe leads calificados", desc: "Tus 5 agentes trabajan 24/7 calificando, nutriendo y cerrando ventas.", icon: TrendingUp, gradient: "from-emerald-400 to-teal-500" },
            ].map((item, i) => (
              <motion.div key={item.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.12 }} className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                  <item.icon size={26} className="text-white" />
                </div>
                <span className="text-xs font-bold text-gray-300 mb-2 tracking-widest">{item.step}</span>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Channels */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Conecta todos tus canales</h2>
          <p className="text-gray-500 mb-12">Tus agentes responden donde están tus clientes, sin importar el canal.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Globe, label: "Webchat", desc: "Widget instalable en cualquier sitio web con una línea de código.", gradient: "from-blue-500 to-cyan-500" },
              { icon: Phone, label: "WhatsApp Business", desc: "Responde mensajes de WhatsApp 24/7 sin bot de número compartido.", gradient: "from-emerald-500 to-green-500" },
              { icon: Instagram, label: "Instagram", desc: "Califica leads que llegan por DM de Instagram automáticamente.", gradient: "from-pink-500 to-rose-500" },
            ].map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.09 }} whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center mx-auto mb-4 shadow-md`}>
                  <c.icon size={24} className="text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{c.label}</h3>
                <p className="text-sm text-gray-500">{c.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-1 mb-5">
              {[...Array(5)].map((_, i) => <Star key={i} size={20} className="fill-amber-400 text-amber-400" />)}
            </div>
            <h2 className="text-4xl font-bold text-gray-900">Empresas LATAM que ya venden más</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.09 }} className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} size={13} className="fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed italic mb-5">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{t.avatar}</div>
                  <div>
                    <p className="text-gray-900 text-sm font-semibold">{t.name}</p>
                    <p className="text-gray-400 text-xs">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-violet-600 text-sm font-semibold uppercase tracking-wider mb-3">Precios</p>
            <h2 className="text-4xl font-bold text-gray-900">Precio simple y transparente</h2>
            <p className="text-gray-500 mt-4">14 días de prueba gratis en todos los planes. Sin tarjeta de crédito.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {plans.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`relative p-7 rounded-2xl border transition-all ${
                  plan.highlight ? "border-violet-300 bg-gradient-to-br from-violet-50 to-indigo-50 shadow-xl shadow-violet-100" : "border-gray-200 bg-white shadow-sm"
                }`}>
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold rounded-full shadow-md">MÁS POPULAR</span>
                  </div>
                )}
                <div className="mb-5">
                  <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-gray-900">${plan.price_usd}</span>
                    <span className="text-gray-400 mb-1">/mes</span>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">USD · facturación mensual</p>
                </div>
                <ul className="space-y-2.5 mb-7">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <Check size={14} className="text-violet-500 mt-0.5 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.highlight ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-200 hover:-translate-y-0.5" : "border border-gray-200 text-gray-700 hover:border-violet-300 hover:text-violet-600"
                }`}>{plan.cta}</Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-white/5" />
          <div className="absolute -bottom-20 right-1/4 w-[400px] h-[400px] rounded-full bg-white/5" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl font-bold text-white mb-4">
            Empieza hoy, gratis.
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 }} className="text-white/80 text-lg mb-10">
            Configura tus agentes en minutos. Tus primeras 14 días son completamente gratuitas.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.12 }}>
            <Link href="/login" className="inline-flex items-center gap-2 px-10 py-4 bg-white text-violet-700 font-bold rounded-2xl hover:bg-white/95 transition-all shadow-2xl text-lg hover:-translate-y-0.5">
              Crear cuenta gratis <ArrowRight size={20} />
            </Link>
          </motion.div>
          <p className="text-white/40 text-sm mt-5">Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Petunia AI" className="h-8 w-auto brightness-0 invert opacity-70" />
          <p className="text-gray-500 text-sm">© 2025 Petunia AI · Construido para LATAM 🌎</p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/login" className="hover:text-gray-300 transition-colors">Acceso</Link>
            <a href="mailto:api@aipetunia.com" className="hover:text-gray-300 transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
