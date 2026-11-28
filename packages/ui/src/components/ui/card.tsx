import * as React from "react"
import { cn } from "cn"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("min-w-0 rounded-xl border border-border bg-paper", className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex items-center justify-between gap-2.5 border-b border-border-soft px-[18px] py-[13px]", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 data-slot="card-title" className={cn("text-base font-semibold", className)} {...props} />
}

/** Small right-aligned caption in a card header, e.g. "33 unread of 45". */
function CardTag({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="card-tag" className={cn("text-right text-xs text-muted-foreground", className)} {...props} />
}

function CardContent({
  className,
  flush = false,
  ...props
}: React.ComponentProps<"div"> & { flush?: boolean }) {
  return (
    <div
      data-slot="card-content"
      className={cn(flush ? "p-0" : "px-[18px] py-4", className)}
      {...props}
    />
  )
}

export { Card, CardContent, CardHeader, CardTag, CardTitle }
