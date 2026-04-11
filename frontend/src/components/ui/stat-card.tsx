"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg?: string;
  iconColor?: string;
  trend?: number;
  delay?: number;
  onClick?: () => void;
  variant?: "default" | "admin";
}

// Maps iconColor → gradient background for the icon container
function resolveGrad(iconColor = "text-violet-600"): { grad: string; textGrad: string } {
  if (iconColor.includes("violet") || iconColor.includes("purple"))
    return { grad: "linear-gradient(135deg,#635BFF,#8B5CF6)", textGrad: "gradient-text-violet" };
  if (iconColor.includes("blue") || iconColor.includes("indigo"))
    return { grad: "linear-gradient(135deg,#3B82F6,#6366F1)", textGrad: "gradient-text-blue" };
  if (iconColor.includes("green") || iconColor.includes("emerald"))
    return { grad: "linear-gradient(135deg,#10B981,#059669)", textGrad: "gradient-text-green" };
  if (iconColor.includes("amber") || iconColor.includes("yellow"))
    return { grad: "linear-gradient(135deg,#F59E0B,#D97706)", textGrad: "gradient-text-amber" };
  if (iconColor.includes("red") || iconColor.includes("rose"))
    return { grad: "linear-gradient(135deg,#F43F5E,#EF4444)", textGrad: "gradient-text-violet" };
  if (iconColor.includes("orange"))
    return { grad: "linear-gradient(135deg,#F97316,#EF4444)", textGrad: "gradient-text-amber" };
  return { grad: "linear-gradient(135deg,#635BFF,#8B5CF6)", textGrad: "gradient-text-violet" };
}

// Decorative blur color per theme
function resolveBlur(iconColor = "text-violet-600"): string {
  if (iconColor.includes("violet") || iconColor.includes("purple")) return "rgba(99,91,255,0.1)";
  if (iconColor.includes("blue") || iconColor.includes("indigo"))   return "rgba(59,130,246,0.1)";
  if (iconColor.includes("green") || iconColor.includes("emerald")) return "rgba(16,185,129,0.1)";
  if (iconColor.includes("amber") || iconColor.includes("yellow"))  return "rgba(245,158,11,0.1)";
  if (iconColor.includes("red") || iconColor.includes("rose"))      return "rgba(244,63,94,0.1)";
  if (iconColor.includes("orange"))                                  return "rgba(249,115,22,0.1)";
  return "rgba(99,91,255,0.1)";
}

export function StatCard({
  title, value, subtitle,
  icon: Icon,
  iconColor = "text-violet-600",
  trend,
  delay = 0,
  onClick,
  variant = "default",
}: StatCardProps) {
  const trendUp   = trend !== undefined && trend > 0;
  const trendDown = trend !== undefined && trend < 0;
  const { grad, textGrad } = resolveGrad(iconColor);
  const blurColor = resolveBlur(iconColor);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={cn(
        variant === "admin" ? "admin-stat-card" : "stat-card",
        onClick && "cursor-pointer"
      )}
    >
      {/* Decorative blur circle top-right */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${blurColor} 0%, transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between mb-4">
        {/* Gradient icon container */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ background: grad }}
        >
          <Icon size={18} className="text-white" />
        </div>

        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
            trendUp   && "bg-emerald-50 text-emerald-700 border border-emerald-200",
            trendDown && "bg-red-50 text-red-600 border border-red-200",
            !trendUp && !trendDown && "bg-slate-50 text-slate-500 border border-slate-200",
          )}>
            {trendUp   && <TrendingUp size={11} />}
            {trendDown && <TrendingDown size={11} />}
            {!trendUp && !trendDown && <Minus size={11} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <p className={cn("text-2xl font-bold tracking-tight tabular-nums", textGrad)}>{value}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </motion.div>
  );
}
