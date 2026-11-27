"use client"

import * as React from "react"
import { formatPeso } from "@aim-ready/core"
import { EmptyState, Pager, paginate } from "@aim-ready/ui"

import { Amount, BwCard, BwList, CoreLabel, PageSkeleton, PageTitle, SectionLabel } from "@/components/portal"
import { myApps, productName, repaymentSchedule, termsOf, useBorrowerState, currentBorrower } from "@/mock"

const PAGE_SIZE = 12

export default function LoanPage() {
  const state = useBorrowerState()
  const [page, setPage] = React.useState(1)
  if (!state || !currentBorrower(state)) return <PageSkeleton />
  const a = myApps(state).find((x) => x.stage === "Disbursed")
  if (!a) {
    return (
      <div>
        <PageTitle title="My loan" back="/" />
        <EmptyState title="No active loan" hint="Once your loan is released it shows here." />
      </div>
    )
  }
  const tm = termsOf(a)
  const sched = repaymentSchedule(a)
  const pg = paginate(sched, page, PAGE_SIZE)
  return (
    <div>
      <PageTitle title="My loan" back="/" />
      <p className="mt-0 mb-2.5">
        <CoreLabel />
      </p>
      <BwCard dark>
        <div className="text-xs text-white/60">Outstanding balance · {a.loanNo}</div>
        <Amount className="text-white">{formatPeso(tm.principal, { decimals: 2 })}</Amount>
        <div className="mt-0.5 text-[12.5px] text-white/60">Next payment {formatPeso(tm.monthlyPayment, { decimals: 2 })} on 27 Dec</div>
      </BwCard>
      <BwList
        rows={[
          ["Loan", productName(a.product)],
          ["Released", `${formatPeso(tm.netProceeds)} to ${a.disbTo}`],
          ["Term", `${tm.months} months`],
          ["Effective rate", `${tm.effectiveRatePct.toFixed(2)}% a year`],
        ]}
      />
      <SectionLabel>Repayment schedule · {tm.months} payments</SectionLabel>
      <div className="overflow-hidden rounded-2xl border border-border bg-paper">
        <ul aria-label="Repayment schedule" className="m-0 list-none p-0">
          {pg.rows.map((r) => (
            <li key={r.label} className="flex justify-between gap-2.5 border-t border-border-soft px-3.5 py-[11px] text-sm first:border-t-0">
              <span className="text-muted-foreground">{r.label}</span>
              <b className="text-right font-semibold text-strong tabular-nums">
                {formatPeso(r.payment, { decimals: 2 })}
                <br />
                <small className="font-normal text-muted-foreground">balance {formatPeso(r.balance, { decimals: 2 })}</small>
              </b>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-2 mb-3 rounded-xl border border-border bg-paper">
        <Pager page={pg} onPage={setPage} className="border-t-0" />
      </div>
    </div>
  )
}
