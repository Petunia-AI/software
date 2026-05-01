"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import {
  Download, TrendingUp, MessageSquare, Users, Zap,
  Activity, Brain, Sparkles, ArrowUpRight, ArrowDownRight, Bot, Target,
} from "lucide-react";
import {
  UsersThree, ChatCenteredDots, Funnel as FunnelIcon, ChartBar,
} from "@phosphor-icons/react";

// ── Futuristic palette ──────────────────────────────────────────────────────
const C = {
  violet:  "#7C3AED",
  purple:  "#A78BFA",
  cyan:    "#06B6D4",
  teal:    "#14B8A6",
  emerald: "#10B981",
  amber:   "#F59E0B",
  orange:  "#F97316",
  rose:    "#F43F5E",
  indigo:  "#6366F1",
  blue:    "#3B82F6",
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp:  C.emerald,
  webchat:   C.violet,
  instagram: C.rose,
  facebook:  C.blue,
  messenger: C.indigo,
};

const STAGE_LABELS: Record<string, string> = {
  new: "Nuevo", qualifying: "Calificando", qualified: "Calificado",
  nurturing: "Nurturing", demo_scheduled: "Demo", proposal_sent: "Propuesta",
  negotiating: "Negociando", closed_won: "Ganado", closed_lost: "Perdido",
  contacted: "Contactado", proposal: "Propuesta", negotiation: "Negociación",
};

const DAYS_OPTIONS = [7, 14, 30, 60, 90];

// ── Animated counter ────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = "", suffix = "" }: {
  value: number | string; prefix?: string; suffix?: string;
}) {
  const num = typeof value === "string" ? parseFloat(value) || 0 : value;
  const isFloat = typeof value === "string" && value.includes(".");
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const end = num;
    const duration = 900;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * ease);
      if (progress < 1) requestAnimationFrame(step);
      else ref.current = end;
    };
    requestAnimationFrame(step);
  }, [num]);

  const formatted = isFloat ? display.toFixed(1) : Math.round(display).toLocaleString();
  return <span>{prefix}{formatted}{suffix}</span>;
}

// ── Custom futuristic tooltip ────────────────────────────────────────────────
function FuturisticTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-violet-500/30 bg-card/95 backdrop-blur-md shadow-2xl shadow-violet-500/10 px-3 py-2.5 text-xs min-w-[130px]">
      {label && <p className="text-muted-foreground font-medium mb-1.5 pb-1.5 border-b border-border">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-muted-foreground capitalize">{p.name}</span>
          </div>
          <span className="font-bold text-foreground tabular-nums">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({
  title, value, subtitle, gradient, glow, PhIcon, trend, delay = 0, prefix = "", suffix = "",
}: {
  title: string; value: number | string; subtitle?: string;
  gradient: string; glow: string; PhIcon: React.ElementType;
  trend?: number; delay?: number; prefix?: string; suffix?: string;
}) {
  const trendPositive = (trend ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 160, damping: 22 }}
      whileHover={{ y: -4, transition: { duration: 0.18 } }}
      className={`relative group overflow-hidden rounded-2xl border border-white/10 shadow-xl ${glow} transition-all duration-300`}
      style={{ background: gradient }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-3xl opacity-30 bg-white pointer-events-none" />
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
            <PhIcon size={18} weight="duotone" className="text-white" />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
              trendPositive ? "bg-emerald-400/20 text-emerald-200" : "bg-rose-400/20 text-rose-200"
            }`}>
              {trendPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <p className="text-3xl font-black text-white tracking-tight leading-none mb-1">
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
        </p>
        <p className="text-sm font-semibold text-white/90">{title}</p>
        {subtitle && <p className="text-[11px] text-white/60 mt-0.5">{subtitle}</p>}
      </div>
    </motion.div>
  );
}

// ── Section card ─────────────────────────────────────────────────────────────
function ChartCard({
  title, subtitle, children, PhIcon, accentColor = "#7C3AED", action, delay = 0,
}: {
  title: string; subtitle?: string; children: React.ReactNode;
  PhIcon?: React.ElementType; accentColor?: string;
  action?: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border"
        style={{ background: `linear-gradient(135deg,${accentColor}12 0%,transparent 100%)` }}>
        <div className="flex items-center gap-2.5">
          {PhIcon && (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}22` }}>
              <PhIcon size={14} weight="duotone" style={{ color: accentColor }} />
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-foreground">{title}</p>
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

// ── Download helper ──────────────────────────────────────────────────────────
function downloadCSV(type: "leads" | "conversations", days: number) {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/analytics/export/${type}?days=${days}`;
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${type}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    });
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => analyticsApi.dashboard().then(r => r.data),
    refetchInterval: 60_000,
  });
  const { data: trend } = useQuery({
    queryKey: ["trend", days],
    queryFn: () => analyticsApi.trend(days).then(r => r.data),
  });
  const { data: channelTrend } = useQuery({
    queryKey: ["channel-trend", days],
    queryFn: () => analyticsApi.channelTrend(days).then(r => r.data),
  });
  const { data: agentPerf } = useQuery({
    queryKey: ["agent-performance"],
    queryFn: () => analyticsApi.agentPerformance().then(r => r.data),
  });
  const { data: funnel } = useQuery({
    queryKey: ["funnel", days],
    queryFn: () => analyticsApi.leadsFunnel(days).then(r => r.data),
  });
  const { data: scoreDistrib } = useQuery({
    queryKey: ["score-distribution"],
    queryFn: () => analyticsApi.scoreDistribution().then(r => r.data),
  });

  const maxFunnel = Math.max(...(funnel ?? []).map((r: { count: number }) => r.count), 1);

  return (
    <div className="flex flex-col min-h-full bg-background">
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto w-full space-y-6">

        {/* ══ HERO BANNER ══ */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg,#0F0A2E 0%,#1E0A4A 35%,#0D1F40 70%,#051525 100%)" }}
        >
          <motion.div className="absolute top-0 left-0 w-80 h-80 rounded-full blur-[100px] opacity-25 pointer-events-none"
            style={{ background: "radial-gradient(circle,#7C3AED,transparent)" }}
            animate={{ scale: [1, 1.3, 1], x: [-20, 20, -20] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle,#06B6D4,transparent)" }}
            animate={{ scale: [1.2, 1, 1.2], x: [20, -20, 20] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full blur-[70px] opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(circle,#10B981,transparent)" }}
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />

          <div className="relative px-6 md:px-10 py-6 md:py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)", boxShadow: "0 0 32px rgba(124,58,237,0.5)" }}>
                  <Brain size={26} className="text-white" />
                </div>
                <motion.div className="absolute inset-0 rounded-2xl border border-violet-400/50 pointer-events-none"
                  animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 2.5, repeat: Infinity }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <motion.div className="w-2 h-2 rounded-full bg-emerald-400"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }} />
                  <span className="text-emerald-400 text-[11px] font-bold uppercase tracking-widest">Live · Actualizado en tiempo real</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight"
                  style={{ textShadow: "0 0 40px rgba(167,139,250,0.4)" }}>
                  Analytics IA
                </h1>
                <p className="text-white/50 text-sm mt-0.5">Inteligencia de ventas y performance de agentes</p>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-xl p-1 border border-white/10"
              style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)" }}>
              {DAYS_OPTIONS.map(d => (
                <button key={d} onClick={() => setDays(d)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={days === d
                    ? { background: "linear-gradient(135deg,#7C3AED,#06B6D4)", color: "white", boxShadow: "0 0 16px rgba(124,58,237,0.4)" }
                    : { color: "rgba(255,255,255,0.5)" }}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg,transparent,#7C3AED,#06B6D4,transparent)" }} />
        </motion.div>

        {/* ══ KPI CARDS ══ */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[120px] rounded-2xl bg-muted/40 animate-pulse" />
            ))
          ) : (
            <>
              <KpiCard title="Conversaciones" value={stats?.total_conversations ?? 0}
                subtitle={`${stats?.active_conversations ?? 0} activas ahora`}
                PhIcon={ChatCenteredDots}
                gradient="linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)"
                glow="shadow-violet-500/30" trend={8} delay={0} />
              <KpiCard title="Leads captados" value={stats?.total_leads ?? 0}
                subtitle={`${stats?.qualified_leads ?? 0} calificados`}
                PhIcon={UsersThree}
                gradient="linear-gradient(135deg,#06B6D4 0%,#0E7490 100%)"
                glow="shadow-cyan-500/30" trend={12} delay={0.07} />
              <KpiCard title="Conversión" value={stats?.conversion_rate ?? 0} suffix="%"
                subtitle={`${stats?.closed_won ?? 0} cierres ganados`}
                PhIcon={TrendingUp as unknown as React.ElementType}
                gradient="linear-gradient(135deg,#10B981 0%,#047857 100%)"
                glow="shadow-emerald-500/30" trend={5} delay={0.14} />
              <KpiCard title="Score promedio" value={stats?.avg_qualification_score ?? 0} suffix="/10"
                subtitle="Calificación media IA"
                PhIcon={Zap as unknown as React.ElementType}
                gradient="linear-gradient(135deg,#F59E0B 0%,#D97706 100%)"
                glow="shadow-amber-500/30" delay={0.21} />
            </>
          )}
        </div>

        {/* ══ TREND + CHANNELS ══ */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          <div className="xl:col-span-3">
            <ChartCard title={`Conversaciones — últimos ${days} días`}
              subtitle="Volumen diario total de interacciones"
              PhIcon={Activity as unknown as React.ElementType}
              accentColor={C.violet} delay={0.1}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend ?? []} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.violet} stopOpacity={0.35} />
                      <stop offset="55%" stopColor={C.violet} stopOpacity={0.08} />
                      <stop offset="100%" stopColor={C.violet} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(220,9%,55%)" }}
                    axisLine={false} tickLine={false} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(220,9%,55%)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<FuturisticTooltip />} />
                  <Area type="monotone" dataKey="count" name="Conversaciones"
                    stroke={C.violet} strokeWidth={2.5} fill="url(#gTrend)" dot={false}
                    activeDot={{ r: 5, strokeWidth: 0, fill: C.violet }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="xl:col-span-2">
            <ChartCard title="Por canal" subtitle={`Distribución en ${days} días`}
              PhIcon={ChartBar} accentColor={C.cyan} delay={0.15}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={channelTrend ?? []} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <defs>
                    {Object.entries(CHANNEL_COLORS).map(([ch, color]) => (
                      <linearGradient key={ch} id={`gCh${ch}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(220,9%,55%)" }}
                    axisLine={false} tickLine={false} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(220,9%,55%)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<FuturisticTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }} />
                  {["webchat", "whatsapp", "instagram"].map(ch => (
                    <Area key={ch} type="monotone" dataKey={ch} stackId="1" name={ch}
                      stroke={CHANNEL_COLORS[ch]} fill={`url(#gCh${ch})`}
                      strokeWidth={1.5} dot={false} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* ══ FUNNEL + AGENT + SCORE ══ */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Funnel */}
          <ChartCard title="Funnel de ventas" subtitle={`Leads por etapa — ${days} días`}
            PhIcon={FunnelIcon} accentColor={C.cyan} delay={0.2}>
            <div className="space-y-2.5 mt-1">
              {(funnel ?? []).map((row: { stage: string; count: number }, i: number) => {
                const pct = Math.round((row.count / maxFunnel) * 100);
                const colors = [C.violet, C.indigo, C.blue, C.cyan, C.teal, C.emerald, C.amber, "#10b981", C.rose];
                const color = colors[i % colors.length];
                return (
                  <div key={row.stage}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-xs font-semibold text-foreground">{STAGE_LABELS[row.stage] ?? row.stage}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{pct}%</span>
                        <span className="text-xs font-bold tabular-nums" style={{ color }}>{row.count}</span>
                      </div>
                    </div>
                    <div className="relative h-2 rounded-full overflow-hidden" style={{ background: `${color}18` }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 + i * 0.05 }}
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ background: `linear-gradient(90deg,${color},${color}88)`, boxShadow: `0 0 8px ${color}60` }} />
                    </div>
                  </div>
                );
              })}
              {(!funnel || funnel.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-8">Sin datos de funnel aún</p>
              )}
            </div>
          </ChartCard>

          {/* Agent performance - horizontal bars */}
          <ChartCard title="Performance por agente" subtitle="Mensajes procesados por IA"
            PhIcon={Bot as unknown as React.ElementType} accentColor={C.violet} delay={0.25}>
            {(agentPerf ?? []).length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart layout="vertical"
                  data={(agentPerf ?? []).map((a: { agent: string; messages: number }, i: number) => ({
                    ...a,
                    fill: [C.violet, C.cyan, C.emerald, C.amber, C.rose][i % 5],
                  }))}
                  margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(220,9%,55%)" }}
                    axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="agent" tick={{ fontSize: 10, fill: "hsl(220,9%,55%)" }}
                    axisLine={false} tickLine={false} width={72} />
                  <Tooltip content={<FuturisticTooltip />} />
                  <Bar dataKey="messages" name="Mensajes" radius={[0, 6, 6, 0]} barSize={18}>
                    {(agentPerf ?? []).map((_: unknown, i: number) => (
                      <Cell key={i} fill={[C.violet, C.cyan, C.emerald, C.amber, C.rose][i % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Brain size={32} className="text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Sin datos de agentes aún</p>
              </div>
            )}
          </ChartCard>

          {/* Score distribution */}
          <ChartCard title="Distribución de scores" subtitle="Calificación de leads por IA"
            PhIcon={Target as unknown as React.ElementType} accentColor={C.amber} delay={0.3}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={scoreDistrib ?? []} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  {(scoreDistrib ?? []).map((_: unknown, i: number) => {
                    const colors = [C.rose, C.rose, C.amber, C.amber, C.cyan, C.emerald, C.emerald];
                    const color = colors[i] ?? C.violet;
                    return (
                      <linearGradient key={i} id={`gScore${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={1} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: "hsl(220,9%,55%)" }}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(220,9%,55%)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<FuturisticTooltip />} />
                <Bar dataKey="count" name="Leads" radius={[5, 5, 0, 0]}>
                  {(scoreDistrib ?? []).map((_: unknown, i: number) => (
                    <Cell key={i} fill={`url(#gScore${i})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ══ AI INSIGHTS STRIP ══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl border border-violet-500/20 overflow-hidden"
          style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.06) 0%,rgba(6,182,212,0.04) 100%)" }}
        >
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-violet-500/10">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)" }}>
              <Sparkles size={13} className="text-white" />
            </div>
            <span className="text-sm font-bold text-foreground">Resumen inteligente</span>
            <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }} />
            <span className="text-[10px] text-emerald-500 font-semibold">IA activa</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-violet-500/10">
            {[
              {
                label: "Tasa de calificación",
                value: stats?.total_leads && stats?.qualified_leads
                  ? `${Math.round((stats.qualified_leads / stats.total_leads) * 100)}%` : "—",
                sub: "Leads calificados vs total",
                color: C.violet,
              },
              {
                label: "Engagement promedio",
                value: stats?.avg_qualification_score ? `${stats.avg_qualification_score}/10` : "—",
                sub: "Score medio de IA",
                color: C.cyan,
              },
              {
                label: "Ratio ganados",
                value: stats?.total_leads && stats?.closed_won
                  ? `${Math.round((stats.closed_won / stats.total_leads) * 100)}%` : "—",
                sub: "Cierres sobre total leads",
                color: C.emerald,
              },
            ].map((item, i) => (
              <div key={i} className="px-5 py-4">
                <p className="text-[11px] text-muted-foreground font-medium mb-1">{item.label}</p>
                <p className="text-2xl font-black" style={{ color: item.color }}>{item.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ══ EXPORT ══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
        >
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-accent/30">
            <Download size={14} className="text-muted-foreground" />
            <span className="text-sm font-bold text-foreground">Exportar datos</span>
            <span className="text-xs text-muted-foreground ml-auto">Período: {days} días</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
            {[
              {
                type: "leads" as const,
                label: "Leads",
                desc: "Nombre, email, score, etapa, canal, agente",
                gradient: "linear-gradient(135deg,#7C3AED,#6D28D9)",
                icon: Users,
              },
              {
                type: "conversations" as const,
                label: "Conversaciones",
                desc: "Canal, estado, agente IA, fecha de inicio",
                gradient: "linear-gradient(135deg,#06B6D4,#0E7490)",
                icon: MessageSquare,
              },
            ].map(item => (
              <div key={item.type}
                className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-violet-300/50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md"
                    style={{ background: item.gradient }}>
                    <item.icon size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => downloadCSV(item.type, days)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-md"
                  style={{ background: item.gradient }}>
                  <Download size={11} /> CSV
                </motion.button>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}


// ── Download helper ────────────────────────────────────────────────────────
function downloadCSV(type: "leads" | "conversations", days: number) {
  const token = localStorage.getItem("access_token");
  const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/analytics/export/${type}?days=${days}`;
  const a = document.createElement("a");
  a.href = url;
  // Attach token via fetch + blob for authenticated download
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.blob())
    .then((blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${type}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    });
}

// ── Components ─────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, children, action }: {
  title: string; subtitle?: string;
  children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-stripe p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: trend } = useQuery({
    queryKey: ["trend", days],
    queryFn: () => analyticsApi.trend(days).then((r) => r.data),
  });

  const { data: channelTrend } = useQuery({
    queryKey: ["channel-trend", days],
    queryFn: () => analyticsApi.channelTrend(days).then((r) => r.data),
  });

  const { data: agentPerf } = useQuery({
    queryKey: ["agent-performance"],
    queryFn: () => analyticsApi.agentPerformance().then((r) => r.data),
  });

  const { data: funnel } = useQuery({
    queryKey: ["funnel", days],
    queryFn: () => analyticsApi.leadsFunnel(days).then((r) => r.data),
  });

  const { data: scoreDistrib } = useQuery({
    queryKey: ["score-distribution"],
    queryFn: () => analyticsApi.scoreDistribution().then((r) => r.data),
  });

  return (
    <div className="p-4 md:p-8 max-w-[1280px] mx-auto">
      <PageHeader
        title="Analíticas"
        subtitle="Rendimiento completo de tu plataforma"
        icon={<BarChart3 size={28} />}
        gradient="linear-gradient(135deg, #7B9AFF 0%, #C4AAFF 50%, #FFBA9A 100%)"
      >
        {/* Period selector */}
        <div className="flex items-center gap-1 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl p-1">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                days === d
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </PageHeader>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Conversaciones" value={stats?.total_conversations ?? 0}
              subtitle={`${stats?.active_conversations ?? 0} activas`}
              icon={MessageSquare} iconBg="bg-violet-50" iconColor="text-violet-600" delay={0} />
            <StatCard title="Leads" value={stats?.total_leads ?? 0}
              subtitle={`${stats?.qualified_leads ?? 0} calificados`}
              icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" delay={0.05} />
            <StatCard title="Conversión" value={`${stats?.conversion_rate ?? 0}%`}
              subtitle={`${stats?.closed_won ?? 0} cierres ganados`}
              icon={TrendingUp} iconBg="bg-green-50" iconColor="text-green-600" delay={0.1} />
            <StatCard title="Score BANT prom." value={`${stats?.avg_qualification_score ?? 0}/10`}
              subtitle="Calificación media" icon={Zap}
              iconBg="bg-amber-50" iconColor="text-amber-600" delay={0.15} />
          </>
        )}
      </div>

      {/* ── Trend + Agent Perf ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">

        <SectionCard
          title={`Conversaciones — últimos ${days} días`}
          subtitle="Volumen diario total"
          action={<Calendar size={15} className="text-muted-foreground" />}
        >
          <div className="xl:col-span-2">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trend ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gV2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={VIOLET} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={VIOLET} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,93%)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(220,9%,55%)" }}
                  axisLine={false} tickLine={false} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(220,9%,55%)" }} axisLine={false} tickLine={false} />
                <Tooltip {...CHART_STYLE} />
                <Area type="monotone" dataKey="count" stroke={VIOLET} strokeWidth={2}
                  fill="url(#gV2)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} name="Conversaciones" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Channel trend stacked */}
        <SectionCard title="Por canal" subtitle={`Últimos ${days} días`}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={channelTrend ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                {Object.entries(CHANNEL_COLORS).map(([ch, color]) => (
                  <linearGradient key={ch} id={`g${ch}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,93%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(220,9%,55%)" }}
                axisLine={false} tickLine={false} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(220,9%,55%)" }} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_STYLE} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              {["webchat", "whatsapp", "instagram"].map((ch) => (
                <Area key={ch} type="monotone" dataKey={ch} stackId="1"
                  stroke={CHANNEL_COLORS[ch]} fill={`url(#g${ch})`}
                  strokeWidth={1.5} dot={false} name={ch} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Agent perf */}
        <SectionCard title="Mensajes por agente" subtitle="Acumulado total">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={agentPerf ?? []} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,93%)" vertical={false} />
              <XAxis dataKey="agent" tick={{ fontSize: 10, fill: "hsl(220,9%,55%)" }}
                axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(220,9%,55%)" }} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_STYLE} />
              <Bar dataKey="messages" radius={[4, 4, 0, 0]} name="Mensajes">
                {(agentPerf ?? []).map((_: unknown, i: number) => (
                  <Cell key={i} fill={[VIOLET, BLUE, GREEN, AMBER, ROSE][i % 5]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* ── Funnel + Score distribution ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">

        <SectionCard title="Funnel de ventas" subtitle={`Leads por etapa — últimos ${days} días`}>
          <div className="space-y-2">
            {(funnel ?? []).map((row: { stage: string; count: number }, i: number) => {
              const max = Math.max(...(funnel ?? []).map((r: { count: number }) => r.count), 1);
              const pct = Math.round((row.count / max) * 100);
              const STAGE_LABELS: Record<string, string> = {
                new: "Nuevo", contacted: "Contactado", qualified: "Calificado",
                proposal: "Propuesta", negotiation: "Negociación",
                closed_won: "Ganado", closed_lost: "Perdido",
              };
              const STAGE_COLORS = [BLUE, VIOLET, AMBER, GREEN, GREEN, "#10b981", ROSE];
              return (
                <div key={row.stage}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">
                      {STAGE_LABELS[row.stage] ?? row.stage}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{row.count}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.04 }}
                      className="h-full rounded-full"
                      style={{ background: STAGE_COLORS[i % STAGE_COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Distribución de scores BANT" subtitle="Todos los leads">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scoreDistrib ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,93%)" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: "hsl(220,9%,55%)" }}
                axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(220,9%,55%)" }} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_STYLE} />
              <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
                {(scoreDistrib ?? []).map((_: unknown, i: number) => (
                  <Cell key={i}
                    fill={["#e5e7eb", ROSE, AMBER, AMBER, GREEN, "#10b981"][i] ?? VIOLET} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* ── Export section ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card-stripe p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Download size={15} className="text-muted-foreground" />
          <p className="font-semibold text-foreground">Exportar datos</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              type: "leads" as const,
              label: "Leads",
              desc: "Nombre, email, score BANT, etapa, canal, agente asignado",
              icon: Users,
              color: "bg-blue-50 text-blue-600",
            },
            {
              type: "conversations" as const,
              label: "Conversaciones",
              desc: "Canal, estado, agente, takeover humano, fecha de inicio",
              icon: MessageSquare,
              color: "bg-violet-50 text-violet-600",
            },
          ].map((item) => (
            <div key={item.type}
              className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-secondary/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.color}`}>
                  <item.icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
              <button
                onClick={() => downloadCSV(item.type, days)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium rounded-lg transition-colors"
              >
                <Download size={12} />
                CSV ({days}d)
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Los archivos incluyen datos de los últimos <strong>{days} días</strong> según el período seleccionado.
        </p>
      </motion.div>
    </div>
  );
}
