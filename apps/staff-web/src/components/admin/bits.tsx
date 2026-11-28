"use client"

/**
 * Building blocks for the reports, compliance and configuration screens,
 * ported from the prototype's `.tog`, `.vb`, `.rr`, `.track`, `.diff` and
 * static table helpers.
 */
import { Button, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsList, TabsTrigger, cn, useToast } from "@aim-ready/ui"
import * as React from "react"

import type { ActionResult } from "@/mock"

/** On/off switch (prototype `.tog`). */
export function Toggle({ on, onToggle, disabled, label, title }: { on: boolean; onToggle?: () => void; disabled?: boolean; label: string; title?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "relative h-5 w-[34px] flex-none rounded-full border-0 p-0 transition-colors after:absolute after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-[left] after:content-[''] disabled:cursor-not-allowed disabled:opacity-45",
        on ? "bg-ink after:left-4" : "bg-g-300 after:left-0.5"
      )}
    />
  )
}

/** "Published · v4" / "Draft · v5" / "In review · v5" version badge. */
export function VersionBadge({ status, version }: { status: "Published" | "Draft" | "In review"; version: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] rounded-xs border px-2 py-0.5 font-mono text-[11px] font-semibold",
        status === "Published" ? "border-brand-100 bg-brand-50 text-brand-700" : status === "In review" ? "border-g-300 bg-g-100 text-ink-3" : "border-border-strong bg-paper text-ink-4"
      )}
    >
      {status} · {version}
    </span>
  )
}

/** Check row with a pass / fail / warn icon and a right-aligned value (prototype `.rr`). */
export function CheckRow({ state, label, value }: { state?: "p" | "f" | "w"; label: React.ReactNode; value?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 border-t border-border-soft py-[9px] text-sm first:border-t-0 first:pt-0.5">
      {state && (
        <span
          aria-hidden="true"
          className={cn(
            "flex size-5 flex-none items-center justify-center rounded-full text-[11px] font-semibold",
            state === "p" ? "bg-brand-50 text-brand-700" : state === "f" ? "bg-ink text-white" : "bg-g-100 text-ink-3"
          )}
        >
          {state === "p" ? "✓" : state === "f" ? "✕" : "!"}
        </span>
      )}
      <span className="min-w-0">{label}</span>
      {value !== undefined && <span className="ml-auto text-right font-mono text-xs font-medium text-muted-foreground">{value}</span>}
    </div>
  )
}

/** Stage track (prototype `.track`): done steps in ink, the current one in the accent. */
export function Track({ steps, current }: { steps: readonly string[]; current?: number }) {
  return (
    <ol className="m-0 mt-1 mb-[18px] flex list-none items-start overflow-x-auto p-0 pb-1">
      {steps.map((s, i) => {
        const cur = current === i
        const done = current === undefined || i < current
        return (
          <li
            key={s}
            className={cn(
              "relative min-w-[92px] flex-1 pt-[18px] text-xs font-medium",
              "before:absolute before:top-1 before:left-0 before:z-[1] before:size-[9px] before:rounded-full before:border-2 before:content-['']",
              "after:absolute after:top-2 after:right-0 after:left-[9px] after:h-0.5 after:content-[''] last:after:hidden",
              cur ? "font-semibold text-strong before:border-brand before:bg-brand before:shadow-[0_0_0_4px_var(--brand-100)] after:bg-g-200" : done ? "text-ink-4 before:border-ink before:bg-ink after:bg-ink" : "text-subtle before:border-g-300 before:bg-paper after:bg-g-200"
            )}
          >
            {s}
          </li>
        )
      })}
    </ol>
  )
}

/** Static table from rows of cells. */
export function StaticTable({ head, rows, label }: { head: readonly React.ReactNode[]; rows: ReadonlyArray<readonly React.ReactNode[]>; label?: string }) {
  return (
    <Table aria-label={label}>
      <TableHeader>
        <tr>
          {head.map((h, i) => (
            <TableHead key={i}>{h}</TableHead>
          ))}
        </tr>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i}>
            {r.map((c, j) => (
              <TableCell key={j}>{c}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Underline tabs that switch local state (prototype `tabs()`). */
export function TabBar<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: ReadonlyArray<readonly [T, string]> }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)}>
      <TabsList>
        {items.map(([k, label]) => (
          <TabsTrigger key={k} value={k}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

/** Card holding a version bar for maker-checker drafts. */
export function DraftBar({ children }: { children: React.ReactNode }) {
  return <Card className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3">{children}</Card>
}

/** Plain-language note that maker-checker here is simulated. */
export function SimulatedCheckNote() {
  return <p className="m-0 w-full text-xs text-muted-foreground">Maker-checker is simulated in this prototype until the API enforces it.</p>
}

/** Runs an action and shows its toast (or its error as a toast). */
export function useRun() {
  const toast = useToast()
  return React.useCallback(
    async (p: Promise<ActionResult>) => {
      const r = await p
      if (r.ok) {
        if (r.toast) toast(r.toast, r.tone)
      } else toast(r.error, r.tone ?? "bad")
      return r
    },
    [toast]
  )
}

/** Button disabled for read-only roles, with the prototype's hint. */
export function CfgButton({ readOnly, disabled, title, ...props }: React.ComponentProps<typeof Button> & { readOnly?: boolean }) {
  return <Button {...props} disabled={disabled || readOnly} title={readOnly ? "Read-only access" : title} />
}
