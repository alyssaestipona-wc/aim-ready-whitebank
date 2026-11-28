/**
 * Small staff-console building blocks ported from the prototype's helpers
 * (kpi, rows, kv, pill, gradeB, slaB, CORE, note). The app-agnostic pieces
 * (GradeBadge, Kpi, KpiGrid, KeyValues, Split, Section) live in
 * `@aim-ready/ui` and are re-exported here so existing imports keep working;
 * only the case-pipeline-specific pieces (tied to `Stage`/`Outcome`) stay
 * app-local.
 */
import { StatusPill, cn, type BadgeVariant } from "@aim-ready/ui"

export { CoreLabel, GradeBadge, KeyValues, Kpi, KpiGrid, Note, Section, SectionLabel, Split } from "@aim-ready/ui"
import { Avatar } from "@aim-ready/ui"
import type * as React from "react"

import type { Outcome, Stage } from "@/mock"

/** Stage → pill tone, as the prototype's STAGE_CLS. */
const STAGE_TONE: Partial<Record<Stage, BadgeVariant>> = {
  Submitted: "info", Checks: "info", Review: "warn", "Info requested": "warn", Approval: "warn", Committee: "warn", Offer: "info", Documentation: "info", Booking: "info", "Pending checker": "warn", Disbursed: "ok", Declined: "bad",
}

export function StagePill({ stage }: { stage: Stage }) {
  return <StatusPill tone={STAGE_TONE[stage] ?? "neutral"}>{stage}</StatusPill>
}

export function OutcomePill({ outcome }: { outcome: Outcome | null }) {
  if (outcome === "approve") return <StatusPill tone="ok">Auto-approve</StatusPill>
  if (outcome === "refer") return <StatusPill tone="warn">Refer</StatusPill>
  if (outcome === "decline") return <StatusPill tone="bad">Auto-decline</StatusPill>
  return <StatusPill>Not decided</StatusPill>
}

export function SlaBadge({ hours }: { hours: number | null | undefined }) {
  if (hours == null) return <span className="text-subtle">—</span>
  if (hours < 0) return <span className="font-mono text-xs font-medium text-ink">{-hours}h over</span>
  return <span className={cn("font-mono text-xs font-medium", hours <= 2 ? "text-ink-3" : "text-muted-foreground")}>{hours}h left</span>
}

/** Label/value rows with hairlines (prototype `dl.rows`). */
export function Rows({ rows, className }: { rows: ReadonlyArray<[React.ReactNode, React.ReactNode, ("tot" | undefined)?]>; className?: string }) {
  return (
    <dl className={cn("m-0 grid", className)}>
      {rows.map(([dt, dd, cls], i) => (
        <div key={i} className={cn("flex justify-between gap-3 border-t border-border-soft py-2 text-sm first:border-t-0 first:pt-0", cls === "tot" && "font-semibold")}>
          <dt className="text-muted-foreground">{dt}</dt>
          <dd className="m-0 text-right font-medium text-strong tabular-nums">{dd}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Gray message chip (prototype `.mc`). */
export function MessageChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2.5 rounded-lg border border-border bg-g-50 px-3 py-2.5 text-sm [&_b]:text-strong", className)}>{children}</div>
}

/** Person cell with avatar initials, name and a mono sub-line. */
export function WhoCell({ name, sub }: { name: string; sub: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={name} />
      <div>
        <b className="block font-semibold text-strong">{name}</b>
        <small className="mono block text-xs text-muted-foreground">{sub}</small>
      </div>
    </div>
  )
}
