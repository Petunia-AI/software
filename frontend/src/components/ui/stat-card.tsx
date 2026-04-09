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
}

function resolveIcon(iconColor = "text-violet-600") {
  if (iconColor.includes("violet") || iconColor.includes("purple"))
    return { bg: "bg-violet-100", color: "text-violet-600", grad: "gradient-text-violet" };
  if (iconColor.includes("blue") || iconColor.includes("indigo"))
    return { bg: "bg-blue-100", color: "text-blue-600", grad: "gradient-text-blue" };
  if (iconColor.includes("green") || iconColor.includes("emerald"))
    return { bg: "bg-emerald-100", color: "text-emerald-600", grad: "gradient-text-green" };
  if (iconColor.includes("amber") || iconColor.includes("yellow"))
    return { bg: "bg-amber-100", color: "text-amber-600", grad: "gradient-text-amber" };
  if (iconColor.includes("red") || iconColor.includes("rose"))
    return { bg: "bg-red-100", color: "text-red-600", grad: "gradient-text-violet" };
  return { bg: "bg-violet-100", color: "text-violet-600", grad: "gradient-text-violet" };
}

export function StatCard({
  title, value, subtitle,
  icon: Icon,
  iconColor = "text-violet-600",
  trend,
  delay = 0,
  onClick,
}: StatCardProps) {
  const trendUp   = trend !== undefined && trend > 0;
  const trendDown = trend !== undefined && trend < 0;
  const { bg, color, grad } = resolveIcon(iconColor);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={cn("stat-card", onClick && "cursor-pointer")}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", bg)}>
          <Icon size={18} className={color} />
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

      <p className={cn("text-2xl font-bold tracking-tight tabular-nums", grad)}>{value}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </motion.div>
  );
}
