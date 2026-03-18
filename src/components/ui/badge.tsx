import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-[#4A154B] text-white",
        secondary: "bg-[#F4F4F4] text-[#616061] border-[#E8E8E8]",
        destructive: "bg-[#FFECF0] text-[#E01E5A] border-[#FECDD9]",
        outline: "border-[#C4A0D4] text-[#616061] bg-transparent",
        success: "bg-[#E8F9F0] text-[#1A8A4A] border-[#B7EDD0]",
        warning: "bg-[#FFF8E6] text-[#B07400] border-[#FCEAB7]",
        info: "bg-[#E8F5FD] text-[#0070A8] border-[#B3DFF5]",
        ghost: "hover:bg-[#F4F4F4] text-[#616061]",
        link: "text-[#4A154B] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
