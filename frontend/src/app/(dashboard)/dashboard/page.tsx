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
  ChatCircle, Camera, GlobeHemisphereWest, EnvelopeSimple,
  FacebookLogo, LinkedinLogo, MusicNote,
} from "@phosphor-icons/react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
  TooltipProps,
} from "recharts";
import { motion } from "framer-motion";
import Link from "next/link";

/* ─────────── Clean Tooltip ─────────── */
function CleanTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-gray-500 font-medium mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-bold text-gray-800">
          {p.name}: <span style={{ color: p.color }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
}

const BAR_COLORS = ["#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EC4899", "#6366F1"];

const CHANNEL_COLOR: Record<string, string> = {
  whatsapp:  "#10B981",
  instagram: "#EC4899",
  webchat:   "#8B5CF6",
  email:     "#0EA5E9",
  messenger: "#3B82F6",
  linkedin:  "#0A66C2",
  tiktok:    "#374151",
};

const DEMO_TREND = [
  { date: "día 1",  count: 4 },
  { date: "día 2",  count: 7 },
  { date: "día 3",  count: 5 },
  { date: "día 4",  count: 10 },
  { date: "día 5",  count: 8 },
  { date: "día 6",  count: 13 },
  { date: "día 7",  count: 11 },
  { date: "día 8",  count: 16 },
  { date: "día 9",  count: 14 },
  { date: "día 10", count: 18 },
  { date: "día 11", count: 15 },
  { date: "día 12", count: 21 },
  { date: "día 13", count: 17 },
  { date: "día 14", count: 24 },
];

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
    refetchInterval: 60_000,
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

  const trendData = (trend as Record<string, unknown>[] | undefined) ?? [];
  const agentData = (agentPerf as Record<string, unknown>[] | undefined) ?? [];
  const convsData = (convs as Record<string, unknown>[] | undefined) ?? [];
  const chartData = trendData.length > 0 ? trendData : DEMO_TREND;
  const isDemo = trendData.length === 0;

  return (
    <div className="p-4 md:p-8 max-w-[1280px] mx-auto space-y-4 md:space-y-6">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #6B8BFF 0%, #B8A0FF 50%, #FFBA9A 100%)",
          boxShadow: "0 8px 40px rgba(99,91,255,0.30)",
        }}
      >
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 pointer-events-none" />
        <div className="relative flex items-center justify-between px-5 md:px-8 py-5 md:py-7 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={13} className="text-white/60" />
              <span className="text-white/60 text-sm font-medium">{greeting},</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">{firstName} 👋</h1>
            <p className="text-white/55 text-xs md:text-sm mt-1">Aquí está el resumen de tu agente IA hoy</p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-3">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
              <CircleDot size={10} className="text-emerald-300 animate-pulse" />
              <span className="text-white/90 text-xs font-semibold">{stats?.active_conversations ?? 0} activas ahora</span>
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
                    <p className="text-white font-black text-2xl tabular-nums">{statsLoading ? "—" : item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <Link href="/conversations"><StatCard title="Conversaciones" value={stats?.total_conversations ?? 0} subtitle={`${stats?.active_conversations ?? 0} activas ahora`} icon={MessageSquare} iconBg="bg-gradient-to-br from-violet-500 to-purple-600" iconColor="text-white" delay={0} onClick={() => {}} /></Link>
            <Link href="/leads"><StatCard title="Leads generados" value={stats?.total_leads ?? 0} subtitle={`${stats?.qualified_leads ?? 0} calificados`} icon={Users} iconBg="bg-gradient-to-br from-blue-500 to-cyan-500" iconColor="text-white" delay={0.05} onClick={() => {}} /></Link>
            <Link href="/leads?filter=closed_won"><StatCard title="Conversión" value={`${stats?.conversion_rate ?? 0}%`} subtitle={`${stats?.closed_won ?? 0} cierres ganados`} icon={TrendingUp} iconBg="bg-gradient-to-br from-emerald-500 to-green-600" iconColor="text-white" delay={0.1} onClick={() => {}} /></Link>
            <Link href="/leads?filter=high_score"><StatCard title="Score BANT" value={`${stats?.avg_qualification_score ?? 0}/10`} subtitle="Calificación media de leads" icon={Zap} iconBg="bg-gradient-to-br from-amber-400 to-orange-500" iconColor="text-white" delay={0.15} onClick={() => {}} /></Link>
          </>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Trend chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div>
              <p className="font-bold text-gray-900 text-sm">Conversaciones · 14 días</p>
              <p className="text-xs text-gray-400 mt-0.5">Volumen diario acumulado</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-xs font-semibold text-violet-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {isDemo ? "Ejemplo" : "Tiempo real"}
            </div>
          </div>
          <div className="px-2 pb-2">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaViolet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#8B5CF6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 500 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v: string) => v.includes("-") ? v.slice(5) : v} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 500 }}
                  axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CleanTooltip />}
                  cursor={{ stroke: "#E5E7EB", strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Area type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={2.5}
                  fill="url(#areaViolet)" dot={false}
                  activeDot={{ r: 5, fill: "#8B5CF6", strokeWidth: 2, stroke: "#fff" }}
                  name="Conversaciones" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {isDemo && (
            <p className="text-center text-[11px] text-gray-400 pb-3">
              Vista previa — los datos reales aparecerán cuando haya conversaciones
            </p>
          )}
        </motion.div>

        {/* Actividad reciente */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <p className="font-bold text-gray-900 text-sm">Actividad reciente</p>
            <Link href="/conversations" className="flex items-center gap-1 text-xs font-semibold text-violet-500 hover:text-violet-700 transition-colors">
              Ver todas <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="flex-1 px-3 pb-4 space-y-0.5">
            {convsData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                  <MessageSquare size={20} className="text-violet-400" />
                </div>
                <p className="text-sm font-semibold text-gray-400">Sin conversaciones aún</p>
                <Link href="/conversations" className="text-xs font-semibold text-violet-500">
                  Ir a conversaciones →
                </Link>
              </div>
            ) : (
              convsData.map((conv) => (
                <Link key={conv.id as string} href={`/conversations/${conv.id}`}
                  className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                    style={{
                      background: ({
                        whatsapp:  "linear-gradient(135deg,#10B981,#059669)",
                        instagram: "linear-gradient(135deg,#EC4899,#BE185D)",
                        webchat:   "linear-gradient(135deg,#8B5CF6,#6D28D9)",
                        email:     "linear-gradient(135deg,#0EA5E9,#0284C7)",
                        messenger: "linear-gradient(135deg,#3B82F6,#2563EB)",
                        linkedin:  "linear-gradient(135deg,#0A66C2,#004182)",
                        tiktok:    "linear-gradient(135deg,#374151,#111827)",
                      } as Record<string, string>)[conv.channel as string] ?? "linear-gradient(135deg,#7C3AED,#6D28D9)",
                    }}>
                    {({
                      whatsapp:  <ChatCircle size={14} weight="fill" />,
                      instagram: <Camera size={14} weight="fill" />,
                      webchat:   <GlobeHemisphereWest size={14} weight="fill" />,
                      email:     <EnvelopeSimple size={14} weight="fill" />,
                      messenger: <FacebookLogo size={14} weight="fill" />,
                      linkedin:  <LinkedinLogo size={14} weight="fill" />,
                      tiktok:    <MusicNote size={14} weight="fill" />,
                    } as Record<string, React.ReactNode>)[conv.channel as string] ?? <ChatCircle size={14} weight="fill" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {(conv.lead_name as string) || `Chat #${(conv.id as string).slice(0, 6)}`}
                    </p>
                    <div className="mt-0.5"><AgentBadge agent={conv.current_agent as string} /></div>
                  </div>
                  <p className="text-[10px] text-gray-400 flex-shrink-0">
                    {conv.last_message_at ? timeAgo(conv.last_message_at as string) : "—"}
                  </p>
                </Link>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Agente performance */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-3 px-6 pt-5 pb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Bot size={14} className="text-violet-500" />
            </div>
            <p className="font-bold text-gray-900 text-sm">Rendimiento por agente</p>
          </div>
          {agentData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[170px] gap-2 pb-6">
              <Bot size={28} className="text-gray-200" />
              <p className="text-sm text-gray-400">Sin datos de agentes aún</p>
            </div>
          ) : (
            <div className="px-2 pb-5">
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={agentData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 6" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="agent" tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 500 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CleanTooltip />} cursor={{ fill: "#F9FAFB" }} />
                  <Bar dataKey="messages" radius={[6, 6, 2, 2]} name="Mensajes" maxBarSize={48}>
                    {agentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Canales */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-3 px-6 pt-5 pb-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
              <Activity size={14} className="text-cyan-500" />
            </div>
            <p className="font-bold text-gray-900 text-sm">Distribución por canal</p>
          </div>
          {!stats?.conversations_by_channel || Object.keys(stats.conversations_by_channel).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[170px] gap-2 pb-6">
              <Activity size={28} className="text-gray-200" />
              <p className="text-sm text-gray-400">Sin datos de canales aún</p>
            </div>
          ) : (
            <div className="px-6 pb-6 space-y-4">
              {Object.entries(stats.conversations_by_channel).map(([channel, count]) => {
                const total = stats.total_conversations || 1;
                const pct = Math.round((count as number / total) * 100);
                const color = CHANNEL_COLOR[channel] ?? "#8B5CF6";
                return (
                  <div key={channel}>
                    <div className="flex items-center justify-between mb-2">
                      <ChannelBadge channel={channel} />
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tabular-nums" style={{ color }}>{count as number}</span>
                        <span className="text-xs text-gray-400">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.45, duration: 0.9, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: color, opacity: 0.8 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
