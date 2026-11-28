import * as React from "react"
import { cn } from "cn"

/** Eyebrow, title, description on the left; actions on the right. */
function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div data-slot="page-header" className={cn("mb-5 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mt-0 mb-1.5 text-[11px] font-semibold tracking-[0.09em] text-subtle uppercase">{eyebrow}</p>}
        <h1 className="text-2xl leading-tight font-semibold tracking-[-0.025em]">{title}</h1>
        {description && <p className="mt-1.5 mb-0 max-w-[72ch] text-[13.5px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export { PageHeader }
