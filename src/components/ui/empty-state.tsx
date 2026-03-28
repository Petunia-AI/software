import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  titulo: string;
  descripcion: string;
  botonTexto?: string;
  botonLink?: string;
  onBotonClick?: () => void;
}

export function EmptyState({
  icon: Icon,
  titulo,
  descripcion,
  botonTexto,
  botonLink,
  onBotonClick,
}: EmptyStateProps) {
  return (
    <div
      style={{ textAlign: "center", padding: "4rem 2rem" }}
      className="flex flex-col items-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground/40" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{titulo}</h3>
      <p style={{ color: "#64748B" }} className="text-xs max-w-xs">
        {descripcion}
      </p>
      {botonTexto && botonLink && (
        <Link
          href={botonLink}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:opacity-90 transition"
        >
          {botonTexto}
        </Link>
      )}
      {botonTexto && onBotonClick && !botonLink && (
        <button
          onClick={onBotonClick}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:opacity-90 transition"
        >
          {botonTexto}
        </button>
      )}
    </div>
  );
}
