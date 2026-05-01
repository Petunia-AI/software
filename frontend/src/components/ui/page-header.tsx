"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
  gradient?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export function PageHeader({ title, subtitle, children, className, gradient, icon, badge }: PageHeaderProps) {
  const bg = gradient
    ?? "linear-gradient(135deg, #6B8BFF 0%, #B8A0FF 50%, #FFBA9A 100%)";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn("relative rounded-2xl overflow-hidden mb-8", className)}
      style={{ background: bg, boxShadow: "0 8px 40px rgba(107,139,255,0.22)" }}
    >
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-40 h-40 rounded-full bg-white/5 translate-y-1/2 pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-20 h-20 rounded-full bg-white/5 -translate-y-1/2 pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-8 py-4 md:py-6 gap-3 md:gap-6">
        {/* Left: icon + text */}
        <div className="flex items-center gap-4">
          {icon && (
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center flex-shrink-0 text-white shadow-lg" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.3)" }}>
              {icon}
            </div>
          )}
          <div>
            {badge && <div className="mb-1">{badge}</div>}
            <h1 className="text-2xl md:text-3xl font-black text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.18)" }}>{title}</h1>
            {subtitle && <p className="text-white/75 text-sm mt-1 font-medium">{subtitle}</p>}
          </div>
        </div>

        {/* Right: action buttons */}
        {children && (
          <div className="flex items-center gap-2 flex-shrink-0
            [&_.btn-primary]:!bg-white/25 [&_.btn-primary]:!text-white [&_.btn-primary]:!border [&_.btn-primary]:!border-white/30 [&_.btn-primary]:!shadow-none [&_.btn-primary]:hover:!bg-white/35
            [&_.btn-ghost]:!text-white/80 [&_.btn-ghost]:hover:!bg-white/20 [&_.btn-ghost]:!border-white/20">
            {children}
          </div>
        )}
      </div>
    </motion.div>
  );
}

