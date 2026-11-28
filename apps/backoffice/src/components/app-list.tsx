"use client"

import type { ListColumn, ListFilterDef } from "@aim-ready/ui"

import { prodName, peso, type Application } from "@/mock"

import { GradeBadge, SlaBadge, StagePill, WhoCell } from "./bits"

/** The prototype's APPCOLS + appRow(): applicant, product, amount, stage, reason, grade, SLA. */
export const APP_COLUMNS: ListColumn<Application>[] = [
  { header: "Applicant", cell: (a) => <WhoCell name={a.name} sub={a.id} /> },
  {
    header: "Product",
    cell: (a) => (
      <>
        {prodName(a.product)}
        <br />
        <small className="text-muted-foreground">{a.channel}</small>
      </>
    ),
  },
  {
    header: "Amount",
    cell: (a) => (
      <>
        <span className="font-semibold text-strong tabular-nums">{peso(a.amount)}</span>
        <br />
        <small className="text-muted-foreground">{a.tenor} months</small>
      </>
    ),
  },
  { header: "Stage", cell: (a) => <StagePill stage={a.stage} /> },
  { header: "Reason", cell: (a) => (a.trigger ? <small>{a.trigger.split(" · ")[0]}</small> : <span className="text-subtle">—</span>) },
  { header: "Grade", cell: (a) => <GradeBadge grade={a.grade} /> },
  { header: "SLA", cell: (a) => <SlaBadge hours={a.sla} /> },
]

/** Search text for case lists: name, ID, owner, reason and CIF. */
export function appText(a: Application): string {
  return `${a.name} ${a.id} ${a.owner || ""} ${a.trigger || ""} ${a.cif || ""}`
}

function distinct<T>(list: readonly T[], fn: (x: T) => string | null | undefined): Array<[string, string]> {
  const seen = new Set<string>()
  for (const x of list) {
    const v = fn(x)
    if (v) seen.add(v)
  }
  return [...seen].sort().map((v) => [v, v])
}

/** Stage, product and channel filters, plus any extras (the prototype's appFilters). */
export function appFilters(list: readonly Application[], extra: ListFilterDef<Application>[] = []): ListFilterDef<Application>[] {
  return [
    { key: "stage", label: "Stage", options: distinct(list, (a) => a.stage), test: (a, v) => a.stage === v },
    { key: "product", label: "Product", options: [["PL", "Personal loan"], ["SL", "Salary loan"]], test: (a, v) => a.product === v },
    { key: "channel", label: "Channel", options: distinct(list, (a) => a.channel), test: (a, v) => a.channel === v },
    ...extra,
  ]
}

export { distinct }

export const PRODUCT_FILTER: ListFilterDef<Application> = { key: "product", label: "Product", options: [["PL", "Personal loan"], ["SL", "Salary loan"]], test: (a, v) => a.product === v }
