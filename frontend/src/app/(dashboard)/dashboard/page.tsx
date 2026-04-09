"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsApi, conversationsApi } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { AgentBadge, ChannelBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  MessageSquare, Users, TrendingUp, Zap,
  Activity, ArrowUpRight, ExternalLink,
  Bot, CircleDot,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { motion } from "framer-motion";
import Link from "next/link";

const CHART_STYLE = {
  contentStyle: {
    background: "#fff",
    border: "1px solid hsl(220,13%,89%)",
    borderRadius: "12px",
    fontSize: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  },
  labelStyle: { color: "hsl(220,9%,46%)", fontWeight: 500 },
  cursor: { fill: "rgba(99,91,255,0.05)" },
};

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: trend } = useQuery({
    queryKey: ["trend"],
    queryFn: () => analyticsApi.trend(14).then((r) => r.data),
  });

  const { data: agentPerf } = useQuery({
    queryKey: ["agent-performance"],
    queryFn: () => analyticsApi.agentPerformance().then((r) => r.data),
  });

  const { data: convs } = useQuery({
    queryKey: ["conversations-recent"],
    queryFn: () => conversationsApi.list({ limit: 6 }).then((r) => r.data),
    refetchInterval: 15_000,
  });

  return (
    <div className="p-8 max-w-[1280px] mx-auto">

      <PageHeader
        title="Dashboard"
        subtitle="Rendimiento en tiempo real de tus agentes IA"
      >
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-medium">
          <CircleDot size={11} className="text-emerald-500 animate-pulse" />
          Agentes activos
        </div>
      </PageHeader>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Conversaciones"
              value={stats?.total_conversations ?? 0}
              subtitle={`${stats?.active_conversations ?? 0} activas ahora`}
              icon={MessageSquare}
              iconBg="bg-violet-50" iconColor="text-violet-600"
              delay={0}
            />
            <StatCard
              title="Leads generados"
              value={stats?.total_leads ?? 0}
              subtitle={`${stats?.qualified_leads ?? 0} calificados (score ≥7)`}
              icon={Users}
              iconBg="bg-blue-50" iconColor="text-blue-600"
              delay={0.05}
            />
            <StatCard
              title="Tasa de conversión"
              value={`${stats?.conversion_rate ?? 0}%`}
              subtitle={`${stats?.closed_won ?? 0} cierres ganados`}
              icon={TrendingUp}
              iconBg="bg-green-50" iconColor="text-green-600"
              delay={0.1}
            />
            <StatCard
              title="Score BANT promedio"
              value={`${stats?.avg_qualification_score ?? 0}/10`}
              subtitle="Calificación media de leads"
              icon={Zap}
              iconBg="bg-amber-50" iconColor="text-amber-600"
              delay={0.15}
            />
          </>
        )}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">

        {/* Trend chart — 2 cols */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-2 card-stripe p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-semibold text-foreground">Conversaciones — 14 días</p>
              <p className="text-xs text-muted-foreground mt-0.5">Volumen diario por canal</p>
            </div>
            <Activity size={16} className="text-muted-foreground" />
          </div>

          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={trend ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gViolet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="hsl(243,75%,59%)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="hsl(243,75%,59%)" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,92%)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(220,9%,55%)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(220,9%,55%)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip {...CHART_STYLE} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(243,75%,59%)"
                strokeWidth={2}
                fill="url(#gViolet)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                name="Conversaciones"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent activity */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card-stripe p-5 flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-foreground">Actividad reciente</p>
            <Link
              href="/conversations"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Ver todas <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="flex-1 space-y-1">
            {!convs || convs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <MessageSquare size={28} className="opacity-20 mb-2" />
                <p className="text-sm">Sin conversaciones aún</p>
              </div>
            ) : (
              convs.map((conv: Record<string, unknown>, i: number) => (
                <Link
                  key={conv.id as string}
                  href={`/conversations/${conv.id}`}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-secondary transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-sm flex-shrink-0">
                    {{ whatsapp: "💬", instagram: "📸", webchat: "🌐" }[conv.channel as string] ?? "💬"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      #{(conv.id as string).slice(0, 8)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <AgentBadge agent={conv.current_agent as string} />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
                    {conv.last_message_at ? timeAgo(conv.last_message_at as string) : "—"}
                  </p>
                </Link>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Second row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Agentes performance */}
        {agentPerf && agentPerf.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card-stripe p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Bot size={16} className="text-muted-foreground" />
              <p className="font-semibold text-foreground">Mensajes por agente</p>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={agentPerf} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,92%)" vertical={false} />
                <XAxis
                  dataKey="agent"
                  tick={{ fontSize: 11, fill: "hsl(220,9%,55%)" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(220,9%,55%)" }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip {...CHART_STYLE} />
                <Bar dataKey="messages" fill="hsl(243,75%,59%)" radius={[4, 4, 0, 0]} name="Mensajes" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Canales */}
        {stats?.conversations_by_channel && Object.keys(stats.conversations_by_channel).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="card-stripe p-6"
          >
            <p className="font-semibold text-foreground mb-5">Distribución por canal</p>
            <div className="space-y-4">
              {Object.entries(stats.conversations_by_channel).map(([channel, count]) => {
                const total = stats.total_conversations || 1;
                const pct = Math.round((count as number / total) * 100);
                return (
                  <div key={channel}>
                    <div className="flex items-center justify-between mb-1.5">
                      <ChannelBadge channel={channel} />
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {count as number}
                        <span className="text-muted-foreground font-normal text-xs ml-1">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
