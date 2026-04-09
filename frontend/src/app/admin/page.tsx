"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import {
  Building2, Users, MessageSquare, TrendingUp,
  Bot, Activity, ShieldCheck,
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
  },
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

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-md">
          <ShieldCheck size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Panel Super Admin</h1>
          <p className="text-sm text-muted-foreground">Visión global de la plataforma</p>
        </div>
      </div>

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
              iconBg="bg-violet-50" iconColor="text-violet-600"
              delay={0}
            />
            <StatCard
              title="Usuarios registrados"
              value={overview?.total_users ?? 0}
              icon={Users}
              iconBg="bg-blue-50" iconColor="text-blue-600"
              delay={0.05}
            />
            <StatCard
              title="Conversaciones totales"
              value={overview?.total_conversations ?? 0}
              subtitle={`${overview?.total_messages ?? 0} mensajes`}
              icon={MessageSquare}
              iconBg="bg-green-50" iconColor="text-green-600"
              delay={0.1}
            />
            <StatCard
              title="Conversión plataforma"
              value={`${overview?.platform_conversion ?? 0}%`}
              subtitle={`${overview?.closed_won ?? 0} deals ganados`}
              icon={TrendingUp}
              iconBg="bg-amber-50" iconColor="text-amber-600"
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
            <Activity size={15} className="text-muted-foreground" />
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
                <Bar dataKey="conversations" fill="hsl(243,75%,59%)" radius={[0, 4, 4, 0]} name="Conversaciones" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Sin datos todavía
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
            <Bot size={15} className="text-muted-foreground" />
            <p className="font-semibold text-foreground">Resumen de plataforma</p>
          </div>
          <div className="space-y-4">
            {[
              { label: "Total de leads en plataforma",  value: overview?.total_leads ?? 0,          color: "bg-violet-500" },
              { label: "Mensajes procesados por IA",    value: overview?.total_messages ?? 0,        color: "bg-blue-500"   },
              { label: "Cierres ganados",               value: overview?.closed_won ?? 0,            color: "bg-green-500"  },
              { label: "Tasa de conversión global",     value: `${overview?.platform_conversion ?? 0}%`, color: "bg-amber-500"  },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${color} flex-shrink-0`} />
                  <p className="text-sm text-foreground">{label}</p>
                </div>
                <p className="font-bold text-foreground tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
