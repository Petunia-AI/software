import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("flex items-start justify-between mb-8", className)}
    >
      <div>
        <h1 className="text-xl font-bold tracking-tight gradient-text-violet">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">{subtitle}</p>
        )}
        <div className="page-header-accent" />
      </div>
      {children && (
        <div className="flex items-center gap-2 flex-shrink-0">{children}</div>
      )}
    </motion.div>
  );
}

