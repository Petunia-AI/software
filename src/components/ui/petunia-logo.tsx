import Image from "next/image";
import { cn } from "@/lib/utils";

interface PetuniaLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  textClassName?: string;
}

const sizes = {
  sm: { icon: "w-6 h-6", text: "text-xs", sub: "text-[8px]" },
  md: { icon: "w-8 h-8", text: "text-sm", sub: "text-[10px]" },
  lg: { icon: "w-9 h-9", text: "text-base", sub: "text-[10px]" },
  xl: { icon: "w-12 h-12", text: "text-lg", sub: "text-xs" },
};

const iconSizes = {
  sm: 24,
  md: 32,
  lg: 36,
  xl: 48,
};

export function PetuniaLogo({
  size = "md",
  showText = true,
  className,
  textClassName,
}: PetuniaLogoProps) {
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          s.icon,
          "rounded-xl gold-gradient flex items-center justify-center shadow-md shrink-0 p-1"
        )}
      >
        <Image
          src="/logo-petunia.svg"
          alt="Petunia AI"
          width={iconSizes[size]}
          height={iconSizes[size]}
          className="w-full h-full drop-shadow-[0_0_4px_rgba(18,100,163,0.5)]"
          style={{ filter: "brightness(2)" }}
        />
      </div>
      {showText && (
        <div className={cn("flex flex-col", textClassName)}>
          <span className={cn(s.text, "font-bold tracking-tight")}>
            PETUNIA AI
          </span>
          <span
            className={cn(
              s.sub,
              "font-medium text-muted-foreground -mt-0.5 tracking-wider"
            )}
          >
            REAL ESTATE OS
          </span>
        </div>
      )}
    </div>
  );
}
