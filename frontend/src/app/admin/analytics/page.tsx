"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import {
  Building2, Users, MessageSquare, TrendingUp, Bot,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

export default function AdminAnalyticsPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => adminApi.overview().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: analytics } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => adminApi.analytics().then((r) => r.data),
  });

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      <PageHeader
        title="Analíticas de plataforma"
        subtitle="Métricas globales de todos los negocios"
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Negocios" value={overview?.total_businesses ?? 0}
              icon={Building2} iconBg="bg-violet-50" iconColor="text-violet-600" delay={0} />
            <StatCard title="Usuarios" value={overview?.total_users ?? 0}
              icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" delay={0.05} />
            <StatCard title="Mensajes IA" value={overview?.total_messages ?? 0}
              icon={Bot} iconBg="bg-green-50" iconColor="text-green-600" delay={0.1} />
            <StatCard title="Conversión global" value={`${overview?.platform_conversion ?? 0}%`}
              icon={TrendingUp} iconBg="bg-amber-50" iconColor="text-amber-600" delay={0.15} />
          </>
        )}
      </div>

      {analytics?.top_businesses_by_conversations && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-stripe p-6"
        >
          <p className="font-semibold text-foreground mb-5">Top 10 negocios por conversaciones</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={analytics.top_businesses_by_conversations}
              layout="vertical"
              margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,93%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="name" type="category"
                tick={{ fontSize: 11 }} axisLine={false}
                tickLine={false} width={140}
              />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid hsl(220,13%,91%)", borderRadius: "10px", fontSize: "12px" }}
              />
              <Bar dataKey="conversations" fill="hsl(243,75%,59%)" radius={[0, 4, 4, 0]} name="Conversaciones" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}
