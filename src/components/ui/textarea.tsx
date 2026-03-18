import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-[#D4B5D6] bg-white px-2.5 py-2 text-base transition-all duration-200 outline-none placeholder:text-muted-foreground hover:border-[#4A154B]/50 focus-visible:border-[#4A154B] focus-visible:ring-3 focus-visible:ring-[#4A154B]/15 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:border-[#5B2B5C] dark:hover:border-[#7C3085]/50 dark:focus-visible:border-[#7C3085] dark:focus-visible:ring-[#4A154B]/30 dark:disabled:bg-input/80",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
