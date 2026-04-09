"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, FunnelChart, Funnel, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import {
  Download, TrendingUp, MessageSquare, Users, Zap,
  Calendar, BarChart3, Filter,
} from "lucide-react";

// ── Palette ────────────────────────────────────────────────────────────────
const VIOLET  = "hsl(243,75%,59%)";
const GREEN   = "hsl(142,71%,45%)";
const BLUE    = "hsl(221,83%,53%)";
const AMBER   = "hsl(38,92%,50%)";
const ROSE    = "hsl(346,87%,57%)";
const CHANNEL_COLORS: Record<string, string> = {
  whatsapp:  GREEN,
  webchat:   VIOLET,
  instagram: ROSE,
};

const CHART_STYLE = {
  contentStyle: {
    background: "#fff",
    border: "1px solid hsl(220,13%,91%)",
    borderRadius: "10px",
    fontSize: "12px",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.07)",
  },
  labelStyle: { color: "hsl(220,9%,46%)", fontWeight: 500 },
};

const DAYS_OPTIONS = [7, 14, 30, 60, 90];

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
    <div className="p-8 max-w-[1280px] mx-auto">
      <PageHeader title="Analíticas" subtitle="Rendimiento completo de tu plataforma">
        {/* Period selector */}
        <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                days === d
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
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
