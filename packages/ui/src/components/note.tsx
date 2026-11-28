import * as React from "react"
import { cn } from "cn"

const NOTE_TONE = {
  plain: "border-border bg-g-50 [&_b]:text-strong",
  info: "border-brand-100 bg-brand-50 [&_b]:text-brand-700",
  ok: "border-brand-100 bg-brand-50 [&_b]:text-brand-700",
  warn: "border-g-300 bg-g-100 [&_b]:text-ink-3",
  bad: "border-ink bg-paper [&_b]:text-ink",
  err: "border-danger-line bg-danger-bg text-danger [&_b]:text-danger",
} as const

export type NoteTone = keyof typeof NOTE_TONE

/** Callout box (prototype `.note`); `err` is the red inline error note. */
function Note({ tone = "plain", children, className, flat, role }: { tone?: NoteTone; children: React.ReactNode; className?: string; flat?: boolean; role?: string }) {
  return (
    <div data-slot="note" role={role} className={cn("rounded-lg border px-3.5 py-3 text-sm text-text", NOTE_TONE[tone], flat ? "m-0" : "mb-3.5", className)}>
      {children}
    </div>
  )
}

/** "Read live from core banking" label with the accent dot. */
function CoreLabel({ simulated = false, className }: { simulated?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 before:size-1.5 before:rounded-full before:bg-brand before:content-['']", className)}>
      Read live from core banking{simulated ? " (simulated)" : ""}
    </span>
  )
}

/** Small uppercase section label (prototype `.sec-t`). */
function SectionLabel({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("mt-4 mb-2 text-2xs font-semibold tracking-[0.08em] text-muted-foreground uppercase", className)} {...props} />
}

export { CoreLabel, Note, SectionLabel }
