import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Status pill. Only the accent and neutrals are used: "ok" and "info" are
 * blue, "warn" is gray, "bad" and "dark" are ink. Never green or orange.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border py-0.5 pr-[9px] pl-2 text-xs font-medium whitespace-nowrap before:size-1.5 before:rounded-full before:content-['']",
  {
    variants: {
      variant: {
        neutral: "border-border bg-paper text-ink-4 before:bg-g-400",
        ok: "border-brand-100 bg-brand-50 text-brand-700 before:bg-brand-700",
        info: "border-brand-100 bg-brand-50 text-brand-700 before:bg-brand",
        warn: "border-g-300 bg-g-100 text-ink-3 before:bg-ink-4",
        bad: "border-ink bg-ink text-white before:bg-white",
        dark: "border-ink bg-ink text-white before:bg-white",
      },
      plain: {
        true: "pl-[9px] before:hidden",
        false: "",
      },
    },
    defaultVariants: {
      variant: "neutral",
      plain: false,
    },
  }
)

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>

function Badge({
  className,
  variant = "neutral",
  plain = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, plain }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants, type BadgeVariant }
