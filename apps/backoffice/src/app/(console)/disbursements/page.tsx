"use client"

import { Card, ListView, PageHeader } from "@aim-ready/ui"
import { useRouter } from "next/navigation"

import { PRODUCT_FILTER, distinct } from "@/components/app-list"
import { Kpi, KpiGrid } from "@/components/bits"
import { useConsole } from "@/components/use-console"
import { peso } from "@/mock"

export default function DisbursementsPage() {
  const ctx = useConsole()
  const router = useRouter()
  if (!ctx) return null
  const list = ctx.s.apps.filter((a) => a.loanNo)
  const tot = list.reduce((n, a) => n + (a.offer?.amount ?? 0), 0)
  return (
    <>
      <PageHeader eyebrow="Closing and booking" title="Disbursements" description="Loans booked in core and the money released. Balances and schedules are read live from core." />
      <KpiGrid>
        <Kpi label="Shown below" value={list.length} sub={`${peso(tot)} released`} />
        <Kpi label="Bank-wide today" value="1,126" sub="₱486.2M released" />
        <Kpi label="Paid to borrower accounts" value="100%" sub="product default" />
        <Kpi label="Failed, then retried" value={ctx.s.apps.filter((a) => a.booking && a.booking.attempts > 1).length} />
      </KpiGrid>
      <Card>
        <ListView
          label="Disbursements"
          items={list}
          filters={[PRODUCT_FILTER, { key: "channel", label: "Channel", options: distinct(list, (a) => a.channel), test: (a, v) => a.channel === v }]}
          searchPlaceholder="Search borrower or loan account"
          searchText={(a) => `${a.name} ${a.loanNo} ${a.id}`}
          rowKey={(a) => a.id}
          onRowActivate={(a) => router.push(`/applications/${a.id}`)}
          emptyMessage="No disbursements yet"
          columns={[
            { header: "Borrower", cell: (a) => <b className="font-semibold text-strong">{a.name}</b> },
            { header: "Core loan account", cell: (a) => <span className="mono">{a.loanNo}</span> },
            { header: "Amount", cell: (a) => peso(a.offer?.amount ?? a.amount) },
            { header: "Paid to", cell: (a) => a.disbTo || "" },
            { header: "Released", cell: (a) => a.disbAt || "" },
          ]}
        />
      </Card>
    </>
  )
}
