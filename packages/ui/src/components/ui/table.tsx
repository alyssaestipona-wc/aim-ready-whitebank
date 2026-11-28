"use client"

import * as React from "react"
import { cn } from "cn"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
      <table data-slot="table" className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={className} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("[&_tr:last-child_td]:border-b-0", className)} {...props} />
}

function TableRow({
  className,
  onActivate,
  ...props
}: React.ComponentProps<"tr"> & {
  /** Makes the whole row a link-like target (click or Enter). */
  onActivate?: () => void
}) {
  return (
    <tr
      data-slot="table-row"
      className={cn(onActivate && "cursor-pointer hover:[&>td]:bg-g-50 focus-visible:[&>td]:bg-g-50", className)}
      onClick={onActivate}
      onKeyDown={
        onActivate
          ? (e) => {
              // Only when the row itself has focus, not a button inside it.
              if (e.key === "Enter" && e.target === e.currentTarget) onActivate()
            }
          : undefined
      }
      tabIndex={onActivate ? 0 : undefined}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "border-b border-border bg-g-50 px-4 py-2.5 text-left text-2xs font-semibold tracking-[0.07em] whitespace-nowrap text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("border-b border-border-soft px-4 py-3 align-middle", className)}
      {...props}
    />
  )
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow }
