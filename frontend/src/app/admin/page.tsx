"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import {
  Building2, Users, MessageSquare, TrendingUp,
  Bot, Activity, Zap, DollarSign,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const CHART_STYLE = {
  contentStyle: {
    background: "#fff",
    border: "1px solid hsl(220,13%,91%)",
    borderRadius: "10px",
    fontSize: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  },
  labelStyle: { color: "hsl(220,9%,46%)", fontWeight: 500 },
  cursor: { fill: "rgba(249,115,22,0.05)" },
};

export default function AdminOverviewPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => adminApi.overview().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: analytics } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => adminApi.analytics().then((r) => r.data),
  });

  return (
    <div className="p-8 max-w-[1200px] mx-auto">

      {/* ── Hero banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="metric-banner mb-8"
      >
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">
              Agente Ventas AI — Plataforma
            </p>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Panel Super Admin
            </h1>
            <p className="text-white/60 text-sm mt-1">
              Visión global y control total de la plataforma
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-center">
              <p className="text-3xl font-black text-white tabular-nums">
                {overview?.total_businesses ?? "—"}
              </p>
              <p className="text-white/50 text-xs mt-0.5">Negocios</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-black text-white tabular-nums">
                {overview?.total_users ?? "—"}
              </p>
              <p className="text-white/50 text-xs mt-0.5">Usuarios</p>
            </div>
          </div>
        </div>

        {/* Decorative glow circles */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(249,115,22,0.6) 0%, transparent 70%)", transform: "translate(30%,-30%)" }}
        />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)", transform: "translate(-50%,30%)" }}
        />
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Negocios activos"
              value={overview?.total_businesses ?? 0}
              icon={Building2}
              iconColor="text-orange-600"
              variant="admin"
              delay={0}
            />
            <StatCard
              title="Usuarios registrados"
              value={overview?.total_users ?? 0}
              icon={Users}
              iconColor="text-violet-600"
              variant="admin"
              delay={0.05}
            />
            <StatCard
              title="Conversaciones totales"
              value={overview?.total_conversations ?? 0}
              subtitle={`${overview?.total_messages ?? 0} mensajes`}
              icon={MessageSquare}
              iconColor="text-blue-600"
              variant="admin"
              delay={0.1}
            />
            <StatCard
              title="Conversión global"
              value={`${overview?.platform_conversion ?? 0}%`}
              subtitle={`${overview?.closed_won ?? 0} deals ganados`}
              icon={TrendingUp}
              iconColor="text-emerald-600"
              variant="admin"
              delay={0.15}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Top businesses */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-stripe p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#F97316,#EF4444)" }}>
              <Activity size={13} className="text-white" />
            </div>
            <p className="font-semibold text-foreground">Top negocios por conversaciones</p>
          </div>
          {analytics?.top_businesses_by_conversations?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={analytics.top_businesses_by_conversations}
                layout="vertical"
                margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,93%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip {...CHART_STYLE} />
                <Bar dataKey="conversations" fill="url(#adminGrad)" radius={[0, 4, 4, 0]} name="Conversaciones">
                  <defs>
                    <linearGradient id="adminGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#F97316" />
                      <stop offset="100%" stopColor="#EF4444" />
                    </linearGradient>
                  </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Building2 size={28} className="opacity-20 mb-2" />
              <p className="text-sm">Sin datos todavía</p>
            </div>
          )}
        </motion.div>

        {/* Platform summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card-stripe p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
              <Zap size={13} className="text-white" />
            </div>
            <p className="font-semibold text-foreground">Resumen de plataforma</p>
          </div>
          <div className="space-y-3">
            {[
              { label: "Total de leads",          value: overview?.total_leads ?? 0,            grad: "from-violet-500 to-purple-600"  },
              { label: "Mensajes procesados IA",  value: overview?.total_messages ?? 0,          grad: "from-blue-500 to-indigo-600"    },
              { label: "Cierres ganados",          value: overview?.closed_won ?? 0,             grad: "from-emerald-500 to-teal-600"   },
              { label: "Tasa conversión global",  value: `${overview?.platform_conversion ?? 0}%`, grad: "from-amber-500 to-orange-600" },
            ].map(({ label, value, grad }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                style={{ background: "hsl(var(--secondary)/0.4)" }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${grad} flex-shrink-0`} />
                  <p className="text-sm text-foreground">{label}</p>
                </div>
                <p className="font-bold text-foreground tabular-nums">{value}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

