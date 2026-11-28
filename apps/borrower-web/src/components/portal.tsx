"use client"

import { CoreLabel as SimCoreLabel } from "@aim-ready/ui"
import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { cn } from "@aim-ready/ui"

import { currentBorrower, myApp, useBorrowerState, type Application, type Borrower } from "@/mock"

export type Portal = { borrower: Borrower; app: Application | null }

/** The signed-in borrower and their latest application, or null until hydrated. */
export function usePortal(): Portal | null {
  const state = useBorrowerState()
  if (!state) return null
  const borrower = currentBorrower(state)
  if (!borrower) return null
  return { borrower, app: myApp(state) }
}

/** Placeholder shown until browser state has loaded. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse pt-7">
      <div className="mb-5 h-7 w-44 rounded-md bg-g-150" />
      <div className="mb-3 h-28 rounded-3xl bg-g-150" />
      <div className="h-40 rounded-3xl bg-g-150" />
    </div>
  )
}

/** Page title row with an optional back link, as the prototype's `phTop`. */
export function PageTitle({ title, back }: { title: string; back?: string }) {
  return (
    <div className="flex items-center gap-3 pt-7 pb-4">
      {back && (
        <Link
          href={back}
          aria-label="Back"
          className="flex size-[34px] flex-none items-center justify-center rounded-full border border-border-strong bg-paper text-ink"
        >
          <ArrowLeftIcon className="size-4" />
        </Link>
      )}
      <h2 className="min-w-0 flex-1 text-2xl tracking-[-0.025em]">{title}</h2>
    </div>
  )
}

/** The borrower app's rounded card; `dark` is the ink balance/offer card. */
export function BwCard({ dark = false, className, ...props }: React.ComponentProps<"div"> & { dark?: boolean }) {
  return (
    <div
      className={cn(
        "mb-3 rounded-3xl border p-4",
        dark ? "border-ink bg-ink text-white [&_h3]:text-white" : "border-border bg-paper",
        className
      )}
      {...props}
    />
  )
}

/** Large tabular amount. */
export function Amount({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-[30px] leading-[1.1] font-semibold tracking-[-0.03em] tabular-nums", className)} {...props} />
}

/** Label/value rows in a bordered list. */
export function BwList({ rows, className }: { rows: ReadonlyArray<readonly [React.ReactNode, React.ReactNode]>; className?: string }) {
  return (
    <div className={cn("mb-3 overflow-hidden rounded-2xl border border-border bg-paper", className)}>
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-center justify-between gap-2.5 border-t border-border-soft px-3.5 py-[11px] text-sm first:border-t-0">
          <span className="text-muted-foreground">{k}</span>
          <b className="text-right font-semibold text-strong tabular-nums">{v}</b>
        </div>
      ))}
    </div>
  )
}

/** The red inline error note. */
export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="mt-3 mb-3.5 rounded-lg border border-danger-line bg-danger-bg px-3.5 py-3 text-sm text-danger">
      <b className="font-semibold text-danger">{children}</b>
    </div>
  )
}

/** A checkbox row with its label, as the prototype's `.chk`. */
export function CheckRow({ id, children, control }: { id: string; children: React.ReactNode; control: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5 text-sm">
      {control}
      <label htmlFor={id}>{children}</label>
    </div>
  )
}

export { Note, SectionLabel } from "@aim-ready/ui"

/** Core figures in the portal are a simulated core response. */
export function CoreLabel() {
  return <SimCoreLabel simulated />
}
