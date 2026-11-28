import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border font-medium leading-[1.35] whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-brand-100 disabled:cursor-not-allowed disabled:border-g-200 disabled:bg-g-100 disabled:text-subtle [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border-border-strong bg-paper text-strong hover:bg-g-50",
        primary: "border-ink bg-ink text-white hover:border-ink-3 hover:bg-ink-3",
        accent: "border-brand bg-brand text-white hover:border-brand-700 hover:bg-brand-700",
        danger: "border-g-400 bg-paper text-ink hover:bg-g-100",
        ghost: "border-transparent bg-transparent text-strong hover:bg-g-50",
        link: "border-transparent bg-transparent p-0 text-brand-700 underline-offset-4 hover:underline",
      },
      size: {
        default: "px-[13px] py-[7px] text-sm",
        sm: "rounded-sm px-2.5 py-1 text-xs",
        lg: "px-4 py-2.5 text-sm",
        icon: "size-[34px] p-0",
        "icon-sm": "size-8 p-0",
      },
      wide: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      wide: false,
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  wide = false,
  asChild = false,
  type,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size, wide, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
