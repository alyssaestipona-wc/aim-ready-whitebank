/**
 * Small staff-console building blocks ported from the prototype's helpers
 * (kpi, rows, kv, pill, gradeB, slaB, CORE, note).
 */
import { Avatar, Card, StatusPill, cn, type BadgeVariant } from "@aim-ready/ui"
import * as React from "react"

import type { Grade, Outcome, Stage } from "@/mock"

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

const GRADE_TONE: Record<Grade, string> = {
  A: "border-brand-100 bg-brand-50 text-brand-700",
  B: "border-brand-100 bg-brand-50 text-brand-700",
  C: "border-g-300 bg-g-100 text-ink-3",
  D: "border-ink bg-ink text-white",
  E: "border-ink bg-ink text-white",
}

export function GradeBadge({ grade }: { grade: Grade | null | undefined }) {
  if (!grade) return <span className="text-subtle">—</span>
  return <span className={cn("inline-flex size-[26px] items-center justify-center rounded-[7px] border font-mono text-[12.5px] font-semibold", GRADE_TONE[grade])}>{grade}</span>
}

export function SlaBadge({ hours }: { hours: number | null | undefined }) {
  if (hours == null) return <span className="text-subtle">—</span>
  if (hours < 0) return <span className="font-mono text-xs font-medium text-ink">{-hours}h over</span>
  return <span className={cn("font-mono text-xs font-medium", hours <= 2 ? "text-ink-3" : "text-muted-foreground")}>{hours}h left</span>
}

/** "Read live from core banking" label (simulated core response). */
export function CoreLabel({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 before:size-1.5 before:rounded-full before:bg-brand before:content-['']", className)}>
      Read live from core banking
    </span>
  )
}

export function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Card className="px-4 py-3.5">
      <p className="m-0 text-[12.5px] font-medium text-muted-foreground">{label}</p>
      <b className="mt-1 block text-2xl leading-tight font-semibold tracking-[-0.02em] text-strong tabular-nums">{value}</b>
      {sub && <small className="text-xs text-muted-foreground">{sub}</small>}
    </Card>
  )
}

export function KpiGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 3 | 4 }) {
  return <div className={cn("mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2", cols === 4 ? "xl:grid-cols-4" : "lg:grid-cols-3")}>{children}</div>
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

/** Uppercase-label fields in a responsive grid (prototype `dl.kv`). */
export function KeyValues({ items }: { items: ReadonlyArray<[string, React.ReactNode]> }) {
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

const NOTE_TONE = {
  plain: "border-border bg-g-50 [&_b]:text-strong",
  info: "border-brand-100 bg-brand-50 [&_b]:text-brand-700",
  ok: "border-brand-100 bg-brand-50 [&_b]:text-brand-700",
  warn: "border-g-300 bg-g-100 [&_b]:text-ink-3",
  bad: "border-ink bg-paper [&_b]:text-ink",
  err: "border-danger-line bg-danger-bg text-danger [&_b]:text-danger",
} as const

/** Callout box (prototype `.note`). */
export function Note({ tone = "plain", children, className, flat, role }: { tone?: keyof typeof NOTE_TONE; children: React.ReactNode; className?: string; flat?: boolean; role?: string }) {
  return (
    <div role={role} className={cn("rounded-lg border px-3.5 py-3 text-sm text-text", NOTE_TONE[tone], flat ? "m-0" : "mb-3.5", className)}>
      {children}
    </div>
  )
}

/** Gray message chip (prototype `.mc`). */
export function MessageChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2.5 rounded-lg border border-border bg-g-50 px-3 py-2.5 text-sm [&_b]:text-strong", className)}>{children}</div>
}

/** Section label (prototype `.sec-t`). */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow mt-4 mb-2">{children}</p>
}

/** Two-column page body that stacks under 1180px (prototype `.split`). */
export function Split({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 min-[1180px]:grid-cols-[minmax(0,1.6fr)_minmax(310px,1fr)]">
      <div className="grid min-w-0 content-start gap-3.5">{main}</div>
      <div className="grid min-w-0 content-start gap-3.5 min-[1180px]:sticky min-[1180px]:top-[86px]">{side}</div>
    </div>
  )
}

/** Card with a header title and optional tag. */
export function Section({ title, tag, flush, children, className }: { title?: React.ReactNode; tag?: React.ReactNode; flush?: boolean; children: React.ReactNode; className?: string }) {
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
