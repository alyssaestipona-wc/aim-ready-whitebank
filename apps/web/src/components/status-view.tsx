"use client"

import Link from "next/link"
import { Button, StatusPill, cn } from "@aim-ready/ui"

import type { PlainStatus } from "@/mock"
import type { trackerSteps } from "@/mock"

export function StatusPillFor({ status }: { status: PlainStatus }) {
  return (
    <StatusPill tone={status.pill[1]} plain={status.plainPill}>
      {status.pill[0]}
    </StatusPill>
  )
}

/** Primary call to action as a full-width link button. */
export function CtaLink({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "default" }) {
  return (
    <Button asChild variant={variant} wide>
      <Link href={href}>{children}</Link>
    </Button>
  )
}

/** Six-step progress tracker. */
export function Tracker({ steps }: { steps: ReturnType<typeof trackerSteps> }) {
  return (
    <ol aria-label="Application progress" className="m-0 mt-1.5 list-none p-0">
      {steps.map((s) => (
        <li
          key={s.label}
          data-state={s.state}
          aria-current={s.state === "now" ? "step" : undefined}
          className={cn(
            "relative flex gap-3 pb-3.5 text-sm last:pb-0",
            "before:relative before:z-[1] before:mt-1 before:size-2.5 before:flex-none before:rounded-full before:border-2 before:content-['']",
            "after:absolute after:top-4 after:bottom-0 after:left-[5px] after:w-0.5 after:bg-g-200 after:content-[''] last:after:hidden",
            s.state === "done" && "before:border-ink before:bg-ink",
            s.state === "now" && "before:border-brand before:bg-brand before:shadow-[0_0_0_4px_var(--brand-100)]",
            s.state === "todo" && "text-subtle before:border-g-300 before:bg-paper"
          )}
        >
          <div>
            <b className={cn("block font-semibold", s.state === "todo" ? "font-medium text-subtle" : "text-strong")}>{s.label}</b>
            {s.sub && <small className="block text-xs text-muted-foreground">{s.sub}</small>}
          </div>
        </li>
      ))}
    </ol>
  )
}
