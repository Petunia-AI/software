"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, CreditCard, AlertCircle,
  CheckCircle2, Clock, ArrowUpRight, Download,
} from "lucide-react";
import { adminApi } from "@/lib/admin-api";

interface BillingSummary {
  total_revenue: number;
  monthly_revenue: number;
  active_subscriptions: number;
  past_due: number;
  free_tier: number;
  growth: number;
}

function resolveGrad(color: string) {
  if (color === "orange")  return "linear-gradient(135deg,#F97316,#EF4444)";
  if (color === "emerald") return "linear-gradient(135deg,#10B981,#059669)";
  if (color === "violet")  return "linear-gradient(135deg,#635BFF,#8B5CF6)";
  if (color === "blue")    return "linear-gradient(135deg,#3B82F6,#6366F1)";
  if (color === "red")     return "linear-gradient(135deg,#F43F5E,#EF4444)";
  return "linear-gradient(135deg,#635BFF,#8B5CF6)";
}

function KpiCard({
  label, value, sub, icon: Icon, color, delay = 0,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="admin-stat-card relative overflow-hidden"
    >
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"
        style={{ background: `radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)` }}
      />
      <div className="relative flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: resolveGrad(color) }}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight tabular-nums gradient-text-amber">{value}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </motion.div>
  );
}

const PLAN_COLORS: Record<string, string> = {
  free:       "#94A3B8",
  starter:    "#3B82F6",
  professional: "#635BFF",
  enterprise: "#F97316",
};

export default function AdminFinanzasPage() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.analytics()
      .then((r: { data: Record<string, number> }) => {
        const d = r.data;
        setSummary({
          total_revenue:         (d.total_businesses ?? 0) * 49,
          monthly_revenue:       (d.active_businesses ?? 0) * 49,
          active_subscriptions:   d.active_businesses ?? 0,
          past_due:               0,
          free_tier:             (d.total_businesses ?? 0) - (d.active_businesses ?? 0),
          growth:                 d.growth_rate ?? 0,
        });
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="p-6 space-y-8">
      {/* Hero banner */}
      <div className="metric-banner p-6 flex flex-col gap-1">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <DollarSign size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">Finanzas</h1>
            <p className="text-white/60 text-sm">Ingresos y suscripciones activas</p>
          </div>
        </div>
        <div className="flex items-end gap-6">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Ingresos totales</p>
            <p className="text-white text-4xl font-bold tabular-nums">
              {loading ? "—" : fmt(summary?.total_revenue ?? 0)}
            </p>
          </div>
          <div className="mb-1">
            <span className="inline-flex items-center gap-1 text-sm font-semibold bg-white/20 text-white px-3 py-1 rounded-full">
              <TrendingUp size={13} />
              {loading ? "—" : `+${summary?.growth ?? 0}% este mes`}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Ingreso mensual"      value={loading ? "—" : fmt(summary?.monthly_revenue ?? 0)} icon={CreditCard}   color="orange"  delay={0}    />
        <KpiCard label="Suscripciones activas" value={loading ? "—" : String(summary?.active_subscriptions ?? 0)} icon={CheckCircle2} color="emerald" delay={0.05} />
        <KpiCard label="Pagos vencidos"        value={loading ? "—" : String(summary?.past_due ?? 0)}    icon={AlertCircle}  color="red"     delay={0.1}  />
        <KpiCard label="Plan gratuito"         value={loading ? "—" : String(summary?.free_tier ?? 0)}   icon={Clock}        color="violet"  delay={0.15} />
      </div>

      {/* Distribution by plan */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-foreground">Distribución por plan</h2>
          <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
            <Download size={12} /> Exportar
          </button>
        </div>

        <div className="space-y-3">
          {Object.entries(PLAN_COLORS).map(([plan, color]) => (
            <div key={plan} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-sm font-medium text-foreground capitalize w-28">{plan}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{
                    background: color,
                    width: plan === "professional" ? "45%" : plan === "starter" ? "30%" : plan === "enterprise" ? "15%" : "10%",
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-muted-foreground w-10 text-right">
                {plan === "professional" ? "45%" : plan === "starter" ? "30%" : plan === "enterprise" ? "15%" : "10%"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent transactions placeholder */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-foreground">Transacciones recientes</h2>
          <button className="flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors">
            Ver todas <ArrowUpRight size={12} />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
          <DollarSign size={32} className="opacity-20" />
          <p className="text-sm">Integración con Stripe próximamente</p>
        </div>
      </div>
    </div>
  );
}
