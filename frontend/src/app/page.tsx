"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Users, TrendingUp, Bot, Check,
  ArrowRight, Star, Globe, Phone, Instagram,
  BarChart3, Shield, Sparkles, X, Send, Zap, RefreshCw, Bell, FileText,
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
  { animType: "agents",    title: "5 Agentes IA especializados",   desc: "Calificador BANT, Cerrador, Nutridor, Soporte y Analista trabajando 24/7 en paralelo.",                         gradient: "from-violet-500 to-purple-600" },
  { animType: "omni",      title: "Omnicanal integrado",            desc: "WhatsApp Business, webchat embeddable e Instagram en una sola bandeja de entrada.",                             gradient: "from-blue-500 to-cyan-500" },
  { animType: "bant",      title: "Calificación BANT automática",   desc: "Cada lead puntuado por Budget, Authority, Need y Timeline. Solo los mejores llegan a tu equipo.",               gradient: "from-emerald-500 to-teal-500" },
  { animType: "analytics", title: "Analytics en tiempo real",       desc: "Dashboard con tendencias, performance por agente y distribución de canales.",                                    gradient: "from-amber-500 to-orange-500" },
  { animType: "handoff",   title: "Handoff a humanos",              desc: "El agente pasa la conversación a tu equipo sin perder contexto cuando el cliente lo necesita.",                  gradient: "from-rose-500 to-pink-500" },
  { animType: "security",  title: "Multi-tenant seguro",            desc: "Datos completamente aislados por empresa. Cumplimiento GDPR y LGPD.",                                            gradient: "from-indigo-500 to-violet-500" },
];

const STATS = [
  { value: "3x",    numericTarget: 3,  suffix: "x",   label: "más leads calificados",    icon: TrendingUp, gradient: "from-violet-500 to-purple-600",  glow: "shadow-violet-500/25", bar: "from-violet-400 to-purple-500" },
  { value: "87%",  numericTarget: 87, suffix: "%",   label: "menos tiempo de respuesta", icon: Zap,         gradient: "from-amber-400 to-orange-500",  glow: "shadow-amber-500/25",  bar: "from-amber-400 to-orange-400" },
  { value: "24/7", numericTarget: null, suffix: "",  label: "cobertura automática",      icon: Bot,         gradient: "from-emerald-500 to-teal-500", glow: "shadow-emerald-500/25", bar: "from-emerald-400 to-teal-400" },
  { value: "10m",  numericTarget: 10, suffix: "m",   label: "para instalar",              icon: Sparkles,    gradient: "from-cyan-500 to-blue-500",    glow: "shadow-cyan-500/25",   bar: "from-cyan-400 to-blue-400" },
];

const TESTIMONIALS = [
  { quote: "Pasamos de 20 leads/mes a 150+ con el mismo equipo. Los agentes trabajan mientras dormimos.", name: "María González", role: "CEO · Fintech Chile", avatar: "MG", gradient: "from-pink-400 to-rose-500" },
  { quote: "La calificación BANT automática eliminó el 80% de los leads no calificados.", name: "Carlos Mendoza", role: "Head of Sales · SaaS México", avatar: "CM", gradient: "from-violet-400 to-indigo-500" },
  { quote: "Implementamos el widget en 10 minutos. Al día siguiente ya teníamos conversaciones calificadas.", name: "Ana Torres", role: "Founder · E-commerce Colombia", avatar: "AT", gradient: "from-emerald-400 to-teal-500" },
];

const DEFAULT_PLANS: Plan[] = [
  { id: "starter", name: "Starter", price_usd: 49, description: "Para equipos que empiezan a automatizar ventas.", features: ["500 conversaciones / mes", "200 leads / mes", "3 agentes IA activos", "Canal Webchat", "Dashboard analytics", "Soporte por email"], cta: "Comenzar ahora", highlight: false },
  { id: "pro", name: "Pro", price_usd: 149, description: "El favorito de equipos de ventas en crecimiento.", features: ["2,000 conversaciones / mes", "1,000 leads / mes", "5 agentes IA (todos)", "WhatsApp + Webchat + Instagram", "Analytics avanzado", "Reportes diarios por email", "Soporte prioritario", "Hasta 10 usuarios"], cta: "Comenzar ahora", highlight: true },
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

const MARQUEE_ITEMS = [
  "Setup en 10 minutos",
  "+500 empresas en LATAM",
  "5 Agentes IA en paralelo",
  "3× más leads calificados",
  "WhatsApp · Instagram · Webchat",
  "Datos 100% aislados",
  "Respuesta 24 / 7 automática",
];

function MarqueeStrip() {
  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="overflow-hidden bg-gradient-to-r from-violet-700 via-purple-700 to-violet-700 py-4 select-none relative border-y border-violet-500/20">
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-violet-700 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-violet-700 to-transparent z-10 pointer-events-none" />
      <motion.div
        className="flex gap-14 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
      >
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-3 text-white/75 text-sm font-semibold tracking-wide">
            <Sparkles size={10} className="text-violet-300 shrink-0" />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

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
    <div className="relative w-full max-w-[340px] mx-auto select-none flex-shrink-0">
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
        <div className="bg-gray-50 px-3 py-4 space-y-3 h-[400px] overflow-hidden">
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

// ── Lead Pipeline Demo ────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { id: "new",       label: "Nuevo",       color: "bg-blue-50 border-blue-200",     badge: "bg-blue-500",     text: "text-blue-700"    },
  { id: "qualified", label: "Calificado",  color: "bg-violet-50 border-violet-200", badge: "bg-violet-500",   text: "text-violet-700"  },
  { id: "closing",   label: "Cerrando",    color: "bg-amber-50 border-amber-200",   badge: "bg-amber-500",    text: "text-amber-700"   },
  { id: "won",       label: "Ganado ✅",   color: "bg-emerald-50 border-emerald-200", badge: "bg-emerald-500", text: "text-emerald-700" },
];

interface PipelineLead {
  id: number;
  name: string;
  company: string;
  score: number;
  avatar: string;
  channel: string;
  stageIdx: number;
}

const INITIAL_LEADS: PipelineLead[] = [
  { id: 1, name: "María González",  company: "Fintech MX",    score: 87, avatar: "MG", channel: "WhatsApp",  stageIdx: 0 },
  { id: 2, name: "Carlos Mendoza",  company: "SaaS Chile",    score: 72, avatar: "CM", channel: "Instagram", stageIdx: 1 },
  { id: 3, name: "Ana Torres",      company: "E-comm CO",     score: 94, avatar: "AT", channel: "Webchat",   stageIdx: 2 },
  { id: 4, name: "Luis Romero",     company: "Inmobiliaria",  score: 68, avatar: "LR", channel: "WhatsApp",  stageIdx: 0 },
  { id: 5, name: "Sofía Castro",    company: "AgriTech PE",   score: 91, avatar: "SC", channel: "Webchat",   stageIdx: 1 },
  { id: 6, name: "Diego Paredes",   company: "RetailPro AR",  score: 78, avatar: "DP", channel: "Instagram", stageIdx: 2 },
];

const CHANNEL_COLORS: Record<string, string> = {
  "WhatsApp":  "bg-emerald-100 text-emerald-700",
  "Instagram": "bg-pink-100 text-pink-700",
  "Webchat":   "bg-blue-100 text-blue-700",
};

function LeadPipelineDemo() {
  const [leads, setLeads] = useState<PipelineLead[]>(INITIAL_LEADS);
  const [movingId, setMovingId] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setLeads((prev) => {
        // Find a lead that can advance (not in last stage)
        const eligible = prev.filter((l) => l.stageIdx < 3);
        if (eligible.length === 0) {
          // Reset all to stage 0
          return INITIAL_LEADS.map((l) => ({ ...l }));
        }
        // Pick a random eligible lead
        const target = eligible[Math.floor(Math.random() * eligible.length)];
        setMovingId(target.id);
        setTimeout(() => setMovingId(null), 700);
        return prev.map((l) => l.id === target.id ? { ...l, stageIdx: l.stageIdx + 1 } : l);
      });
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PIPELINE_STAGES.map((stage, sIdx) => {
          const stageLeads = leads.filter((l) => l.stageIdx === sIdx);
          return (
            <div key={stage.id} className={`rounded-2xl border ${stage.color} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold ${stage.text}`}>{stage.label}</span>
                <span className={`w-5 h-5 rounded-full ${stage.badge} flex items-center justify-center text-white text-[10px] font-bold`}>
                  {stageLeads.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[200px]">
                <AnimatePresence>
                  {stageLeads.map((lead) => (
                    <motion.div
                      key={lead.id}
                      layout
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{
                        opacity: 1, x: 0, scale: movingId === lead.id ? [1, 1.04, 1] : 1,
                        boxShadow: movingId === lead.id ? "0 8px 25px rgba(124,58,237,0.25)" : "0 1px 4px rgba(0,0,0,0.06)"
                      }}
                      exit={{ opacity: 0, x: 20, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      className="bg-white rounded-2xl p-3.5 border border-white/80 shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0`}>
                          {lead.avatar}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{lead.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{lead.company}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${CHANNEL_COLORS[lead.channel]}`}>{lead.channel}</span>
                        <div className="flex items-center gap-1">
                          <div className="w-10 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                              animate={{ width: `${lead.score}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-violet-600">{lead.score}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Analytics Dashboard Demo ──────────────────────────────────────────────

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul"];
const CONV_DATA  = [120, 195, 170, 260, 310, 420, 510];
const LEADS_DATA = [45,  80,  65,  110, 140, 195, 248];

function useCountUp(target: number, duration = 1800) {
  const [value, setValue] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const steps = 50;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) { setValue(target); clearInterval(interval); }
      else { setValue(Math.floor(current)); }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [target, duration]);
  return value;
}

function AnalyticsDashboardDemo() {
  const [visible, setVisible] = useState(false);
  const maxConv = Math.max(...CONV_DATA);

  const conversations = useCountUp(visible ? 510 : 0);
  const leads = useCountUp(visible ? 248 : 0);
  const conversion = useCountUp(visible ? 87 : 0, 1400);

  return (
    <motion.div
      onViewportEnter={() => setVisible(true)}
      viewport={{ once: true }}
      className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
    >
      {/* Topbar */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-3 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <p className="text-white/80 text-xs font-medium flex-1 text-center">Analytics · Petunia AI Dashboard</p>
      </div>

      <div className="p-5 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Conversaciones", value: conversations, suffix: "", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
            { label: "Leads calificados", value: leads, suffix: "", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
            { label: "Tasa de respuesta", value: conversion, suffix: "%", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
          ].map((kpi) => (
            <div key={kpi.label} className={`${kpi.bg} border ${kpi.border} rounded-2xl p-3 text-center`}>
              <motion.p
                className={`text-2xl font-bold ${kpi.color}`}
                animate={{ scale: visible ? [1, 1.05, 1] : 1 }}
                transition={{ duration: 0.4, delay: 0.8 }}
              >
                {kpi.value}{kpi.suffix}
              </motion.p>
              <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-700">Conversaciones vs Leads — últimos 7 meses</p>
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-violet-500 inline-block" /> Conversaciones</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" /> Leads</span>
            </div>
          </div>
          <div className="flex items-end gap-2" style={{ height: 120 }}>
            {MONTHS.map((month, i) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5" style={{ height: 96 }}>
                  <motion.div
                    className="flex-1 bg-gradient-to-t from-violet-600 to-violet-400 rounded-t-md"
                    initial={{ height: 0 }}
                    animate={{ height: visible ? `${(CONV_DATA[i] / maxConv) * 96}px` : 0 }}
                    transition={{ duration: 0.8, delay: 0.1 + i * 0.1, ease: "easeOut" }}
                  />
                  <motion.div
                    className="flex-1 bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t-md"
                    initial={{ height: 0 }}
                    animate={{ height: visible ? `${(LEADS_DATA[i] / maxConv) * 96}px` : 0 }}
                    transition={{ duration: 0.8, delay: 0.15 + i * 0.1, ease: "easeOut" }}
                  />
                </div>
                <p className="text-[9px] text-gray-400 font-medium">{month}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Agent performance row */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Performance por agente</p>
          <div className="space-y-2">
            {[
              { name: "Calificador BANT", pct: 92, color: "from-violet-500 to-purple-500" },
              { name: "Cerrador",         pct: 78, color: "from-rose-500 to-pink-500"     },
              { name: "Nutridor",         pct: 85, color: "from-blue-500 to-cyan-500"     },
              { name: "Soporte",          pct: 96, color: "from-emerald-500 to-teal-500"  },
            ].map((agent) => (
              <div key={agent.name} className="flex items-center gap-3">
                <p className="text-[11px] text-gray-600 w-32 flex-shrink-0">{agent.name}</p>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${agent.color} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: visible ? `${agent.pct}%` : 0 }}
                    transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                  />
                </div>
                <p className="text-[11px] font-bold text-gray-700 w-8 text-right">{agent.pct}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Social Calendar Demo ──────────────────────────────────────────────────

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface CalPost {
  id: number;
  day: number;   // 0-6
  slot: number;  // 0-2 (mañana / tarde / noche)
  network: "instagram" | "facebook" | "tiktok" | "linkedin";
  text: string;
  emoji: string;
}

const CALENDAR_POSTS: CalPost[] = [
  { id: 1,  day: 0, slot: 0, network: "instagram", text: "Nueva propiedad disponible en Miraflores 🏡", emoji: "📸" },
  { id: 2,  day: 0, slot: 2, network: "facebook",  text: "¿Buscas casa? Te ayudamos a encontrarla 🔑",   emoji: "👍" },
  { id: 3,  day: 1, slot: 1, network: "tiktok",    text: "Tour virtual · Penthouse vista al mar 🌊",      emoji: "🎬" },
  { id: 4,  day: 2, slot: 0, network: "linkedin",  text: "Mercado inmobiliario LATAM Q2 2026 📊",         emoji: "💼" },
  { id: 5,  day: 2, slot: 2, network: "instagram", text: "3 tips para vender más rápido tu propiedad ✅", emoji: "📸" },
  { id: 6,  day: 3, slot: 1, network: "facebook",  text: "Clientes felices · 150+ cierres este mes 🎉",  emoji: "👍" },
  { id: 7,  day: 4, slot: 0, network: "tiktok",    text: "Antes vs Después · Remodelación increíble 🔨", emoji: "🎬" },
  { id: 8,  day: 4, slot: 2, network: "linkedin",  text: "Automatiza tu agencia con IA 🤖",               emoji: "💼" },
  { id: 9,  day: 5, slot: 1, network: "instagram", text: "Weekend Open House · Sábado 10am–2pm 🏠",      emoji: "📸" },
  { id: 10, day: 6, slot: 0, network: "facebook",  text: "¡Feliz domingo! Conoce nuestros proyectos 🌟", emoji: "👍" },
];

const NET_STYLES: Record<string, { bg: string; label: string; dot: string }> = {
  instagram: { bg: "from-pink-500 to-rose-500",       label: "Instagram", dot: "bg-pink-500"    },
  facebook:  { bg: "from-blue-500 to-indigo-500",      label: "Facebook",  dot: "bg-blue-500"   },
  tiktok:    { bg: "from-gray-800 to-gray-600",        label: "TikTok",    dot: "bg-gray-800"   },
  linkedin:  { bg: "from-sky-600 to-blue-700",         label: "LinkedIn",  dot: "bg-sky-600"    },
};

const SLOT_LABELS = ["09:00", "14:00", "19:00"];

function SocialCalendarDemo() {
  const [activePost, setActivePost] = useState<CalPost | null>(null);
  const [publishedIds, setPublishedIds] = useState<Set<number>>(new Set());
  const [currentIdx, setCurrentIdx] = useState(0);

  // Auto-publish posts one by one
  useEffect(() => {
    if (currentIdx >= CALENDAR_POSTS.length) {
      // Reset after pause
      const t = setTimeout(() => {
        setPublishedIds(new Set());
        setCurrentIdx(0);
      }, 3000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      const post = CALENDAR_POSTS[currentIdx];
      setPublishedIds((prev) => new Set([...prev, post.id]));
      setActivePost(post);
      setCurrentIdx((i) => i + 1);
    }, 600);
    return () => clearTimeout(t);
  }, [currentIdx]);

  return (
    <div className="w-full">
      {/* Calendar grid */}
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <p className="text-white font-semibold text-sm">Calendario de contenido · IA Petunia</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/70 text-xs">Publicando...</span>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-8 border-b border-gray-100 bg-gray-50">
          <div className="px-4 py-3 text-xs text-gray-400 font-medium border-r border-gray-100"></div>
          {DAYS.map((d) => (
            <div key={d} className="px-1 py-3 text-center text-sm font-bold text-gray-500 tracking-wide">{d}</div>
          ))}
        </div>

        {/* Slots */}
        {SLOT_LABELS.map((slotLabel, slotIdx) => (
          <div key={slotIdx} className="grid grid-cols-8 border-b border-gray-100 last:border-b-0">
            <div className="px-4 py-3 flex items-center justify-center text-xs text-gray-400 border-r border-gray-100 font-mono font-semibold">
              {slotLabel}
            </div>
            {DAYS.map((_, dayIdx) => {
              const post = CALENDAR_POSTS.find((p) => p.day === dayIdx && p.slot === slotIdx);
              const published = post ? publishedIds.has(post.id) : false;
              const isActive = activePost?.id === post?.id;
              return (
                <div key={dayIdx} className="min-h-[88px] p-1.5 border-r border-gray-50 last:border-r-0 flex items-center justify-center">
                  <AnimatePresence>
                    {post && published && (
                      <motion.button
                        key={post.id}
                        initial={{ scale: 0, opacity: 0, rotate: -10 }}
                        animate={{ scale: isActive ? [1, 1.08, 1] : 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 22 }}
                        onClick={() => setActivePost(post === activePost ? null : post)}
                        className={`w-full rounded-xl p-2 bg-gradient-to-br ${NET_STYLES[post.network].bg} shadow-md cursor-pointer`}
                      >
                        <p className="text-white text-xs font-bold leading-none mb-1">{post.emoji} {NET_STYLES[post.network].label}</p>
                        <p className="text-white/80 text-[10px] leading-tight line-clamp-2">{post.text}</p>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Post preview card */}
      <AnimatePresence mode="wait">
        {activePost && (
          <motion.div
            key={activePost.id}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="mt-5 bg-white rounded-2xl border border-gray-100 shadow-lg p-5 flex items-start gap-5"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${NET_STYLES[activePost.network].bg} flex items-center justify-center flex-shrink-0 shadow-md`}>
              <span className="text-xl">{activePost.emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-sm font-bold text-gray-700">{NET_STYLES[activePost.network].label}</span>
                <span className="text-sm text-gray-400">· {DAYS[activePost.day]} {SLOT_LABELS[activePost.slot]}</span>
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  <Check size={10} strokeWidth={3} /> Publicado
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{activePost.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Counters */}
      <div className="mt-5 flex items-center justify-center gap-8">
        {Object.entries(NET_STYLES).map(([net, style]) => {
          const count = [...publishedIds].filter((id) => CALENDAR_POSTS.find((p) => p.id === id && p.network === net)).length;
          return (
            <div key={net} className="flex items-center gap-2 text-sm text-gray-500">
              <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
              <span className="font-medium">{style.label}</span>
              <motion.span
                key={count}
                initial={{ scale: 1.4, color: "#7c3aed" }}
                animate={{ scale: 1, color: "#6b7280" }}
                className="font-bold"
              >{count}</motion.span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeatureAnimation({ type }: { type: string }) {
  if (type === "agents") {
    return (
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-white"
            animate={{ scale: [0.5, 1.4, 0.5], opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 1.5, delay: i * 0.24, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
    );
  }
  if (type === "omni") {
    return (
      <div className="flex items-center gap-3">
        {([Globe, Phone, Instagram] as React.ElementType[]).map((Icon, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -10] }}
            transition={{ duration: 2.2, delay: i * 0.65, repeat: Infinity, repeatDelay: 0.4, ease: "easeInOut" }}
          >
            <Icon size={17} className="text-white" />
          </motion.div>
        ))}
      </div>
    );
  }
  if (type === "bant") {
    return (
      <div className="w-full px-1">
        <p className="text-white/70 text-[9px] font-black tracking-[0.2em] mb-1.5">BANT SCORE</p>
        <div className="w-full bg-white/30 rounded-full h-2">
          <motion.div
            className="bg-white rounded-full h-2"
            animate={{ width: ["0%", "92%", "92%", "0%"] }}
            transition={{ duration: 3, times: [0, 0.5, 0.82, 1], repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <motion.p
          className="text-white text-xs font-bold text-right mt-1"
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{ duration: 3, times: [0, 0.42, 0.54, 0.82, 1], repeat: Infinity }}
        >92%</motion.p>
      </div>
    );
  }
  if (type === "analytics") {
    const bars = [55, 80, 42, 95, 68];
    return (
      <div className="flex items-end gap-1 w-full" style={{ height: 40 }}>
        {bars.map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 bg-white rounded-sm"
            animate={{ height: ["0%", `${h}%`, `${h}%`, "0%"] }}
            transition={{ duration: 2.8, delay: i * 0.13, repeat: Infinity, repeatDelay: 0.7, ease: "easeOut" }}
          />
        ))}
      </div>
    );
  }
  if (type === "handoff") {
    return (
      <div className="flex items-center gap-2">
        <motion.div animate={{ x: [0, 2, 0] }} transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}>
          <Bot size={18} className="text-white" />
        </motion.div>
        <motion.div
          animate={{ x: [-2, 3, -2], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowRight size={15} className="text-white" />
        </motion.div>
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.3, delay: 0.35, repeat: Infinity, ease: "easeInOut" }}
        >
          <Users size={18} className="text-white" />
        </motion.div>
      </div>
    );
  }
  if (type === "security") {
    return (
      <div className="relative flex items-center justify-center">
        <Shield size={28} className="text-white/30" />
        <motion.div
          className="absolute"
          animate={{ scale: [0, 1.2, 1, 1, 0], opacity: [0, 1, 1, 1, 0] }}
          transition={{ duration: 2.5, times: [0, 0.25, 0.4, 0.75, 1], repeat: Infinity, repeatDelay: 0.6, ease: "backOut" }}
        >
          <Check size={14} className="text-white" strokeWidth={3} />
        </motion.div>
      </div>
    );
  }
  return null;
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
          <Link href="/login" className="text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 text-white px-5 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5">Iniciar sesión</Link>
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
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Animated gradient orbs */}
          <motion.div animate={{ scale: [1, 1.18, 1], opacity: [0.07, 0.14, 0.07] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-40 right-0 w-[900px] h-[900px] rounded-full"
            style={{ background: "radial-gradient(ellipse, #7c3aed 0%, transparent 65%)" }} />
          <motion.div animate={{ scale: [1, 1.25, 1], opacity: [0.04, 0.09, 0.04] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 3 }}
            className="absolute top-1/3 -left-60 w-[700px] h-[700px] rounded-full"
            style={{ background: "radial-gradient(ellipse, #06b6d4 0%, transparent 65%)" }} />
          <motion.div animate={{ scale: [1, 1.12, 1], opacity: [0.04, 0.08, 0.04] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full"
            style={{ background: "radial-gradient(ellipse, #a855f7 0%, transparent 65%)" }} />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.022]"
            style={{ backgroundImage: "linear-gradient(rgba(124,58,237,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.6) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
        </div>
        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-last lg:order-first" style={{ alignSelf: "start" }}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-violet-600 text-sm font-medium mb-7">
                <Sparkles size={13} /> Agente de ventas IA para LATAM
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
                className="text-6xl lg:text-[80px] font-black tracking-tighter leading-[0.95] mb-7 text-gray-900">
                Vende más,<br />
                <span className="bg-gradient-to-r from-violet-600 via-purple-500 to-cyan-500 bg-clip-text text-transparent">sin esfuerzo extra.</span>
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                className="text-xl text-gray-500 max-w-lg leading-relaxed mb-8">
                5 agentes de IA que califican leads BANT, nutren prospectos y cierran ventas — las 24 horas del día en WhatsApp, Instagram y tu sitio web.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
                className="flex flex-col sm:flex-row gap-3 mb-7">
                <Link href="/login" className="flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl transition-all hover:shadow-xl hover:shadow-violet-200 hover:-translate-y-0.5 text-base">
                  Comenzar ahora <ArrowRight size={17} />
                </Link>
                <a href="#pricing" className="flex items-center justify-center gap-2 px-7 py-3.5 border border-gray-200 text-gray-700 hover:border-violet-300 hover:text-violet-600 rounded-xl transition-all text-base">
                  Ver planes
                </a>
              </motion.div>

            </div>
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 120, damping: 20 }}
              className="order-first lg:order-last flex justify-center lg:justify-end pr-8 self-start">
              <AnimatedChatDemo />
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.42 + i * 0.08, type: "spring", stiffness: 160, damping: 22 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className={`relative group overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-lg hover:shadow-2xl ${s.glow} transition-all duration-300 p-6`}
              >
                {/* Top accent gradient bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${s.bar} rounded-t-2xl`} />
                {/* Subtle gradient bg on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300`} />
                {/* Icon top-right */}
                <div className={`absolute top-4 right-4 w-8 h-8 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-md`}>
                  <s.icon size={14} className="text-white" />
                </div>
                {/* Number */}
                <p className={`text-4xl font-black tracking-tight bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent leading-none mb-2 mt-1`}>
                  {s.value}
                </p>
                {/* Label */}
                <p className="text-sm text-gray-500 font-medium leading-snug">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <MarqueeStrip />

      {/* Features */}
      <section id="features" className="relative py-24 px-6 bg-gray-50 overflow-hidden">
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
                <div className={`w-full h-14 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-5 shadow-md px-4 overflow-hidden`}>
                  <FeatureAnimation type={f.animType} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-28 px-6 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div animate={{ x: [0, 40, 0], y: [0, -30, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 left-1/4 w-96 h-96 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }} />
          <motion.div animate={{ x: [0, -50, 0], y: [0, 40, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-10 right-1/4 w-80 h-80 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #0ea5e9 0%, transparent 70%)" }} />
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-300 text-sm font-medium mb-5">
              <Zap size={13} /> Automatización en minutos
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 }}
              className="text-5xl font-bold text-white mb-4">Empieza en <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">3 pasos</span></motion.h2>
            <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="text-white/50 text-lg max-w-xl mx-auto">Sin técnicos, sin semanas de setup. Tu agente de ventas IA funcionando hoy.</motion.p>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector line desktop */}
            <div className="hidden md:block absolute top-16 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px">
              <motion.div className="h-full bg-gradient-to-r from-amber-400 via-violet-400 to-emerald-400"
                initial={{ scaleX: 0, transformOrigin: "left" }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }} />
            </div>

            {[
              {
                step: "01", title: "Instala el widget", icon: Zap,
                gradient: "from-amber-400 to-orange-500", glow: "shadow-amber-500/30",
                desc: "Copia una línea de código en tu web. Listo en menos de 10 minutos.",
                detail: "Compatible con cualquier CMS, web o landing page.",
              },
              {
                step: "02", title: "Configura tus agentes", icon: Bot,
                gradient: "from-violet-500 to-purple-600", glow: "shadow-violet-500/30",
                desc: "Define tu producto, precios y guión de ventas. La IA aprende tu negocio.",
                detail: "5 agentes especializados listos en minutos.",
              },
              {
                step: "03", title: "Recibe leads calificados", icon: TrendingUp,
                gradient: "from-emerald-400 to-teal-500", glow: "shadow-emerald-500/30",
                desc: "Tus agentes trabajan 24/7 calificando, nutriendo y cerrando ventas.",
                detail: "Notificaciones en tiempo real cuando un lead está listo.",
              },
            ].map((item, i) => (
              <motion.div key={item.step}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, type: "spring", stiffness: 180, damping: 22 }}
                whileHover={{ y: -6, transition: { duration: 0.22 } }}
                className="relative bg-white/5 border border-white/10 backdrop-blur-sm rounded-3xl p-7 flex flex-col items-center text-center group hover:bg-white/10 hover:border-white/20 transition-all cursor-default"
              >
                {/* Glow on hover */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />

                {/* Step number */}
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/40 text-xs font-black mb-5 tracking-widest">
                  {item.step}
                </div>

                {/* Icon */}
                <motion.div
                  animate={{ rotate: [0, -4, 4, 0], y: [0, -3, 0] }}
                  transition={{ duration: 3.5, delay: i * 0.7, repeat: Infinity, ease: "easeInOut" }}
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-5 shadow-2xl ${item.glow}`}
                >
                  <item.icon size={28} className="text-white" />
                </motion.div>

                <h3 className="font-bold text-white text-xl mb-2">{item.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-3">{item.desc}</p>
                <p className="text-white/30 text-xs italic">{item.detail}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA inline */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }}
            className="text-center mt-14">
            <a href="/login" className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold rounded-2xl hover:shadow-2xl hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all text-sm">
              Comenzar ahora <ArrowRight size={16} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Channels */}
      <section className="relative py-28 px-6 bg-white overflow-hidden">
        {/* Subtle dot grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, #e5e7eb 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-violet-600 text-sm font-semibold uppercase tracking-wider mb-3">Omnicanal</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 }}
              className="text-5xl font-bold text-gray-900 mb-4">Donde están tus clientes,<br /><span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">ahí está Petunia.</span></motion.h2>
            <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="text-gray-400 text-lg max-w-xl mx-auto">Tus agentes responden en todos los canales desde una sola plataforma, sin perder ninguna conversación.</motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Globe,
                label: "Webchat",
                tag: "Instalación inmediata",
                desc: "Embeds en cualquier web con una línea de código. Tus visitantes reciben atención al instante.",
                gradient: "from-blue-500 to-cyan-500",
                glow: "group-hover:shadow-blue-200",
                stats: [{ v: "< 10 min", l: "setup" }, { v: "100%", l: "personalizable" }],
                animate: { x: [0, 3, -3, 0], transition: { duration: 4, repeat: Infinity } },
              },
              {
                icon: Phone,
                label: "WhatsApp Business",
                tag: "Canal #1 en LATAM",
                desc: "Responde mensajes de WhatsApp 24/7 con tu propio número. Sin bots genéricos.",
                gradient: "from-emerald-500 to-green-500",
                glow: "group-hover:shadow-emerald-200",
                stats: [{ v: "24/7", l: "disponible" }, { v: "2 seg", l: "respuesta" }],
                animate: { y: [0, -4, 0], transition: { duration: 3.5, repeat: Infinity } },
              },
              {
                icon: Instagram,
                label: "Instagram DMs",
                tag: "Leads desde stories y posts",
                desc: "Califica automáticamente cada DM. Nunca más pierdas un prospecto que llegó por Instagram.",
                gradient: "from-pink-500 to-rose-500",
                glow: "group-hover:shadow-pink-200",
                stats: [{ v: "+40%", l: "leads capturados" }, { v: "Auto", l: "calificación" }],
                animate: { rotate: [0, 2, -2, 0], transition: { duration: 5, repeat: Infinity } },
              },
            ].map((c, i) => (
              <motion.div key={c.label}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, type: "spring", stiffness: 160, damping: 22 }}
                className={`group relative bg-white rounded-3xl border border-gray-100 shadow-lg hover:shadow-2xl ${c.glow} transition-all duration-300 p-7 overflow-hidden`}
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300`} />

                {/* Tag */}
                <div className="mb-5">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${c.gradient} text-white shadow-sm`}>{c.tag}</span>
                </div>

                {/* Animated icon */}
                <motion.div
                  animate={c.animate}
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center mb-5 shadow-xl`}
                >
                  <c.icon size={26} className="text-white" />
                </motion.div>

                <h3 className="font-bold text-gray-900 text-xl mb-2">{c.label}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">{c.desc}</p>

                {/* Stats row */}
                <div className="flex gap-4 pt-5 border-t border-gray-50">
                  {c.stats.map((s) => (
                    <div key={s.l}>
                      <p className={`text-lg font-bold bg-gradient-to-r ${c.gradient} bg-clip-text text-transparent`}>{s.v}</p>
                      <p className="text-xs text-gray-400">{s.l}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Floating connection visual */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }}
            className="mt-14 flex items-center justify-center gap-4 flex-wrap">
            {[
              { label: "Webchat", color: "bg-blue-500" },
              { label: "WhatsApp", color: "bg-emerald-500" },
              { label: "Instagram", color: "bg-pink-500" },
            ].map((ch, i) => (
              <React.Fragment key={ch.label}>
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-full shadow-sm">
                  <span className={`w-2 h-2 rounded-full ${ch.color} animate-pulse`} />
                  <span className="text-sm text-gray-600 font-medium">{ch.label}</span>
                </motion.div>
                {i < 2 && (
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, delay: i * 0.4, repeat: Infinity }}
                    className="hidden sm:block">
                    <ArrowRight size={16} className="text-gray-300" />
                  </motion.div>
                )}
              </React.Fragment>
            ))}
            <div className="hidden sm:flex items-center gap-2 ml-2">
              <ArrowRight size={16} className="text-gray-300" />
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full shadow-lg shadow-violet-200">
                <Bot size={14} className="text-white" />
                <span className="text-sm text-white font-semibold">Petunia AI</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Lead Pipeline */}
      <section className="py-24 px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-violet-600 text-sm font-semibold uppercase tracking-wider mb-3">Pipeline de ventas</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 }}
              className="text-5xl font-bold text-gray-900 mb-4">Tus leads avanzan solos en el funnel</motion.h2>
            <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="text-gray-500 text-lg max-w-2xl mx-auto">Cada prospecto es calificado con BANT y empujado automáticamente por el pipeline — de &ldquo;Nuevo&rdquo; a &ldquo;Ganado&rdquo; sin intervención manual.</motion.p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            {[
              { label: "Calificación BANT automática en segundos", icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
              { label: "Avance de etapa según respuestas del lead", icon: RefreshCw, color: "text-violet-600", bg: "bg-violet-50" },
              { label: "Alerta a tu equipo cuando el lead está listo", icon: Bell, color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="flex items-center gap-2.5 text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-full px-5 py-2.5">
                <span className={`w-7 h-7 rounded-full ${item.bg} flex items-center justify-center shrink-0`}>
                  <item.icon size={13} className={item.color} />
                </span>
                {item.label}
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2, type: "spring", stiffness: 120, damping: 22 }}>
            <LeadPipelineDemo />
          </motion.div>
        </div>
      </section>

      {/* Analytics Dashboard */}
      <section className="py-24 px-6 bg-gray-50 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1, type: "spring", stiffness: 120, damping: 22 }}
              className="order-last lg:order-first">
              <AnalyticsDashboardDemo />
            </motion.div>
            <div className="order-first lg:order-last">
              <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="text-violet-600 text-sm font-semibold uppercase tracking-wider mb-3">Analytics en tiempo real</motion.p>
              <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 }}
                className="text-4xl font-bold text-gray-900 mb-4">Métricas que te dicen exactamente qué funciona</motion.h2>
              <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                className="text-gray-500 leading-relaxed mb-6">Visualiza conversaciones, leads calificados, tasa de respuesta y performance de cada agente en un solo dashboard actualizado en tiempo real.</motion.p>
              <div className="space-y-3">
                {[
                  { label: "Gráficas de tendencia por mes y canal", icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
                  { label: "Score de cada agente IA en tiempo real", icon: Bot, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Exporta reportes PDF con un clic", icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
                ].map((item, i) => (
                  <motion.div key={item.label} initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    transition={{ delay: 0.14 + i * 0.08 }}
                    className="flex items-center gap-3 text-sm text-gray-600">
                    <span className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                      <item.icon size={15} className={item.color} />
                    </span>
                    {item.label}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Calendar */}
      <section className="py-28 px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-violet-600 text-sm font-semibold uppercase tracking-wider mb-3">Contenido automático</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 }}
              className="text-5xl font-bold text-gray-900 mb-4">Publica en todas tus redes, <span className="bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">sin esfuerzo</span></motion.h2>
            <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="text-gray-400 text-lg max-w-2xl mx-auto">Petunia crea, programa y publica contenido en Instagram, Facebook, TikTok y LinkedIn de forma completamente automática.</motion.p>
          </div>
          <SocialCalendarDemo />
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative py-28 px-6 bg-slate-950 overflow-hidden">
        {/* Glow orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-30"
            style={{ background: "radial-gradient(ellipse, rgba(124,58,237,0.4) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-20"
            style={{ background: "radial-gradient(ellipse, rgba(14,165,233,0.3) 0%, transparent 70%)" }} />
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>


        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
              className="flex items-center justify-center gap-1 mb-5">
              {[...Array(5)].map((_, i) => <Star key={i} size={22} className="fill-amber-400 text-amber-400" />)}
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-5xl font-bold text-white mb-3">Empresas LATAM que ya <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">venden más</span></motion.h2>
            <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 }}
              className="text-white/50 text-lg">Resultados reales de equipos que automatizaron sus ventas con Petunia.</motion.p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 160, damping: 22 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="relative p-7 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-default overflow-hidden">
                {/* Decorative large quote */}
                <div className="absolute top-3 right-5 text-8xl font-black text-white/[0.04] leading-none select-none pointer-events-none">&rdquo;</div>
                <div className="flex gap-1 mb-5">
                  {[...Array(5)].map((_, j) => <Star key={j} size={13} className="fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-white/75 text-sm leading-relaxed mb-7">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-lg`}>{t.avatar}</div>
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

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-violet-600 text-sm font-semibold uppercase tracking-wider mb-3">Precios</p>
            <h2 className="text-4xl font-bold text-gray-900">Precio simple y transparente</h2>
            <p className="text-gray-500 mt-4">Planes desde $50 USD / mes · Cancela cuando quieras.</p>
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
      <section className="py-28 px-6 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-white/5" />
          <div className="absolute -bottom-20 right-1/4 w-[400px] h-[400px] rounded-full bg-white/5" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl font-bold text-white mb-4">
            Empieza hoy.
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 }} className="text-white/80 text-lg mb-10">
            Configura tus agentes en minutos y empieza a recibir leads calificados desde el primer día.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.12 }}>
            <Link href="/login" className="inline-flex items-center gap-2 px-10 py-4 bg-white text-violet-700 font-bold rounded-2xl hover:bg-white/95 transition-all shadow-2xl text-lg hover:-translate-y-0.5">
              Crear mi cuenta <ArrowRight size={20} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Petunia AI" className="h-8 w-auto brightness-0 invert opacity-70" />
          <p className="text-gray-500 text-sm flex items-center gap-1.5">© 2026 Petunia AI · Construido para LATAM <Globe size={13} className="text-gray-400" /></p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/login" className="hover:text-gray-300 transition-colors">Acceso</Link>
            <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacidad</Link>
            <Link href="/terms" className="hover:text-gray-300 transition-colors">Términos</Link>
            <a href="mailto:api@aipetunia.com" className="hover:text-gray-300 transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
