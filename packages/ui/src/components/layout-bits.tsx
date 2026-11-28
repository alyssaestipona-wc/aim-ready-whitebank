/**
 * General-purpose layout and display building blocks, shared by every app
 * (`apps/web`, `apps/backoffice`, `apps/admin`) rather than duplicated per
 * app, per `web-bootstrap`'s shared-UI rule.
 */
import * as React from "react"
import { cn } from "cn"

import { Card } from "./ui/card"

/**
 * A risk grade, duplicated here rather than imported from the core package,
 * since `packages/ui` never depends on it (ADR-0002) — the literal union is
 * identical to the core package's own `Grade`, so callers passing their own
 * `Grade` value in are structurally compatible with no cast needed.
 */
type Grade = "A" | "B" | "C" | "D" | "E"

const GRADE_TONE: Record<Grade, string> = {
  A: "border-brand-100 bg-brand-50 text-brand-700",
  B: "border-brand-100 bg-brand-50 text-brand-700",
  C: "border-g-300 bg-g-100 text-ink-3",
  D: "border-ink bg-ink text-white",
  E: "border-ink bg-ink text-white",
}

function GradeBadge({ grade }: { grade: Grade | null | undefined }) {
  if (!grade) return <span className="text-subtle">—</span>
  return <span className={cn("inline-flex size-[26px] items-center justify-center rounded-[7px] border font-mono text-[12.5px] font-semibold", GRADE_TONE[grade])}>{grade}</span>
}

function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Card className="px-4 py-3.5">
      <p className="m-0 text-[12.5px] font-medium text-muted-foreground">{label}</p>
      <b className="mt-1 block text-2xl leading-tight font-semibold tracking-[-0.02em] text-strong tabular-nums">{value}</b>
      {sub && <small className="text-xs text-muted-foreground">{sub}</small>}
    </Card>
  )
}

function KpiGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 3 | 4 }) {
  return <div className={cn("mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2", cols === 4 ? "xl:grid-cols-4" : "lg:grid-cols-3")}>{children}</div>
}

/** Uppercase-label fields in a responsive grid (prototype `dl.kv`). */
function KeyValues({ items }: { items: ReadonlyArray<[string, React.ReactNode]> }) {
  return (
    <dl className="m-0 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-5 gap-y-3.5">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-2xs font-semibold tracking-[0.07em] text-muted-foreground uppercase">{k}</dt>
          <dd className="mt-1 mb-0 text-[13.5px] font-medium [overflow-wrap:anywhere] text-strong tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Two-column page body that stacks under 1180px (prototype `.split`). */
function Split({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 min-[1180px]:grid-cols-[minmax(0,1.6fr)_minmax(310px,1fr)]">
      <div className="grid min-w-0 content-start gap-3.5">{main}</div>
      <div className="grid min-w-0 content-start gap-3.5 min-[1180px]:sticky min-[1180px]:top-[86px]">{side}</div>
    </div>
  )
}

/** Card with a header title and optional tag. */
function Section({ title, tag, flush, children, className }: { title?: React.ReactNode; tag?: React.ReactNode; flush?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      {title && (
        <div className="flex items-center justify-between gap-2.5 border-b border-border-soft px-[18px] py-[13px]">
          <h3 className="text-base font-semibold">{title}</h3>
          {tag && <span className="text-right text-xs text-muted-foreground">{tag}</span>}
        </div>
      )}
      <div className={flush ? "p-0" : "px-[18px] py-4"}>{children}</div>
    </Card>
  )
}

export { GradeBadge, Kpi, KpiGrid, KeyValues, Split, Section, type Grade }
