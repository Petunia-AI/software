"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi, conversationsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { timeAgo } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { AgentBadge, ChannelBadge } from "@/components/ui/badge";
import {
  MessageSquare, Users, TrendingUp, Zap,
  Activity, ArrowUpRight,
  Bot, CircleDot, Sparkles,
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
  const { user } = useAuthStore();

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

  const firstName = user?.full_name?.split(" ")[0] ?? "Usuario";
  const [greeting, setGreeting] = useState("Hola");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Buenos días" : h < 18 ? "Buenas tardes" : "Buenas noches");
  }, []);

  return (
    <div className="p-8 max-w-[1280px] mx-auto space-y-6">

      {/* ── Hero banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(243,75%,58%) 0%, hsl(263,70%,50%) 50%, hsl(280,65%,54%) 100%)",
          boxShadow: "0 8px 40px rgba(99,91,255,0.30)",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 pointer-events-none" />

        <div className="relative flex items-center justify-between px-8 py-7 gap-6">
          {/* Left: greeting */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={13} className="text-white/60" />
              <span className="text-white/60 text-sm font-medium">{greeting},</span>
            </div>
            <h1 className="text-3xl font-black text-white">{firstName} 👋</h1>
            <p className="text-white/55 text-sm mt-1.5">
              Aquí está el resumen de tu agente IA hoy
            </p>
          </div>

          {/* Right: live counters */}
          <div className="hidden sm:flex flex-col items-end gap-3">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
              <CircleDot size={10} className="text-emerald-300 animate-pulse" />
              <span className="text-white/90 text-xs font-semibold">
                {stats?.active_conversations ?? 0} activas ahora
              </span>
            </div>
            <div className="flex items-center gap-5">
              {[
                { label: "Conversaciones", value: stats?.total_conversations ?? 0 },
                { label: "Leads",          value: stats?.total_leads ?? 0 },
                { label: "Conversión",     value: `${stats?.conversion_rate ?? 0}%` },
              ].map((item, i) => (
                <div key={item.label} className="flex items-center gap-5">
                  {i > 0 && <div className="w-px h-9 bg-white/20" />}
                  <div className="text-right">
                    <p className="text-white/55 text-[10px] uppercase tracking-widest">{item.label}</p>
                    <p className="text-white font-black text-2xl tabular-nums">
                      {statsLoading ? "—" : item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Conversaciones"
              value={stats?.total_conversations ?? 0}
              subtitle={`${stats?.active_conversations ?? 0} activas ahora`}
              icon={MessageSquare}
              iconBg="bg-gradient-to-br from-violet-500 to-purple-600"
              iconColor="text-white"
              delay={0}
            />
            <StatCard
              title="Leads generados"
              value={stats?.total_leads ?? 0}
              subtitle={`${stats?.qualified_leads ?? 0} calificados`}
              icon={Users}
              iconBg="bg-gradient-to-br from-blue-500 to-cyan-500"
              iconColor="text-white"
              delay={0.05}
            />
            <StatCard
              title="Conversión"
              value={`${stats?.conversion_rate ?? 0}%`}
              subtitle={`${stats?.closed_won ?? 0} cierres ganados`}
              icon={TrendingUp}
              iconBg="bg-gradient-to-br from-emerald-500 to-green-600"
              iconColor="text-white"
              delay={0.1}
            />
            <StatCard
              title="Score BANT"
              value={`${stats?.avg_qualification_score ?? 0}/10`}
              subtitle="Calificación media de leads"
              icon={Zap}
              iconBg="bg-gradient-to-br from-amber-400 to-orange-500"
              iconColor="text-white"
              delay={0.15}
            />
          </>
        )}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

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
              <p className="text-xs text-muted-foreground mt-0.5">Volumen diario acumulado</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-lg">
              <Activity size={12} className="text-primary" />
              <span>Tiempo real</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={trend ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gViolet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="hsl(243,75%,59%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(243,75%,59%)" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,93%)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(220,9%,60%)" }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(220,9%,60%)" }}
                axisLine={false} tickLine={false}
              />
              <Tooltip {...CHART_STYLE} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(243,75%,59%)"
                strokeWidth={2.5}
                fill="url(#gViolet)"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: "hsl(243,75%,59%)" }}
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
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Ver todas <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="flex-1 space-y-1">
            {!convs || convs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 text-muted-foreground">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-2">
                  <MessageSquare size={20} className="opacity-30" />
                </div>
                <p className="text-sm font-medium">Sin conversaciones aún</p>
                <p className="text-xs mt-0.5 opacity-60">Los chats aparecerán aquí</p>
              </div>
            ) : (
              convs.map((conv: Record<string, unknown>) => (
                <Link
                  key={conv.id as string}
                  href={`/conversations/${conv.id}`}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 border border-violet-200/50 flex items-center justify-center text-sm flex-shrink-0">
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
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Bot size={14} className="text-white" />
              </div>
              <p className="font-semibold text-foreground">Rendimiento por agente</p>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={agentPerf} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,93%)" vertical={false} />
                <XAxis
                  dataKey="agent"
                  tick={{ fontSize: 11, fill: "hsl(220,9%,60%)" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(220,9%,60%)" }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip {...CHART_STYLE} />
                <Bar dataKey="messages" fill="hsl(243,75%,59%)" radius={[6, 6, 0, 0]} name="Mensajes" />
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
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Activity size={14} className="text-white" />
              </div>
              <p className="font-semibold text-foreground">Distribución por canal</p>
            </div>
            <div className="space-y-4">
              {Object.entries(stats.conversations_by_channel).map(([channel, count]) => {
                const total = stats.total_conversations || 1;
                const pct = Math.round((count as number / total) * 100);
                const colors: Record<string, string> = {
                  whatsapp:  "bg-emerald-500",
                  instagram: "bg-pink-500",
                  webchat:   "bg-violet-500",
                };
                return (
                  <div key={channel}>
                    <div className="flex items-center justify-between mb-1.5">
                      <ChannelBadge channel={channel} />
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {count as number}
                        <span className="text-muted-foreground font-normal text-xs ml-1.5">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
                        className={`h-full rounded-full ${colors[channel] ?? "bg-primary"}`}
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
