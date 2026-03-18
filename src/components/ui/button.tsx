"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ease-out outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#4A154B] text-white shadow-[0_1px_3px_rgba(74,21,75,0.35)] hover:bg-[#611f69] hover:shadow-[0_4px_14px_rgba(74,21,75,0.35)] hover:-translate-y-px active:translate-y-0 active:shadow-sm",
        accent: "bg-gradient-to-r from-[#611f69] to-[#ECB22E] text-white shadow-[0_1px_4px_rgba(97,31,105,0.35)] hover:shadow-[0_4px_14px_rgba(97,31,105,0.4)] hover:-translate-y-px active:translate-y-0 active:shadow-sm hover:opacity-95",
        outline:
          "border border-[#C4A0D4] bg-white text-[#1D1C1D] hover:border-[#4A154B] hover:bg-[#FAF5FA] hover:shadow-sm active:scale-[0.99] aria-expanded:bg-[#FAF5FA]",
        secondary:
          "bg-[#F5EFF5] text-[#4A154B] border border-[#C4A0D4] hover:bg-[#EDE0EE] hover:border-[#4A154B] hover:shadow-sm active:scale-[0.99] aria-expanded:bg-[#EDE0EE]",
        ghost:
          "text-[#616061] hover:bg-[#F4F4F4] hover:text-[#1D1C1D] active:scale-[0.99] aria-expanded:bg-[#F4F4F4]",
        destructive:
          "border border-destructive/20 bg-destructive/8 text-destructive hover:bg-destructive/15 hover:border-destructive/40 hover:shadow-sm active:scale-[0.99] focus-visible:ring-destructive/20",
        link: "text-[#4A154B] underline-offset-4 hover:underline font-medium",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-lg px-2.5 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-lg px-3 text-[0.8rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-5 text-[0.9rem] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
