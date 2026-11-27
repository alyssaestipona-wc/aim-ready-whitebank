import * as React from "react"
import { cn } from "cn"

/** Centered "nothing here" message with an optional hint and action. */
function EmptyState({
  title,
  hint,
  children,
  className,
}: {
  title: string
  hint?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div data-slot="empty-state" className={cn("px-4 py-[30px] text-center text-sm text-muted-foreground", className)}>
      <b className="mb-[3px] block text-base font-semibold text-strong">{title}</b>
      {hint}
      {children && <div className="mt-3 flex justify-center">{children}</div>}
    </div>
  )
}

export { EmptyState }
