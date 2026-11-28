"use client"

import { Card, CardHeader, CardTag, CardTitle, ListView, PageHeader, type ListColumn } from "@aim-ready/ui"
import { formatPeso } from "@aim-ready/core"
import type { ApprovalsSummaryResponse, StaffApplicationListItem } from "@aim-ready/contracts"
import { useRouter } from "next/navigation"
import * as React from "react"

import { Kpi, KpiGrid } from "@/components/bits"
import { getApprovalsSummary, listApplications } from "@/mock/actions/applications"

function medianText(minutes: number | null): string {
  if (minutes === null) return "—"
  return `${(minutes / 60).toFixed(1)} h`
}

/**
 * Real `Approval`-stage applications and real KPI tiles, backed by
 * apps/api - distinct from the simulated `/approvals` (mock store, hardcoded
 * KPI numbers) and from `/live-applications` (shaped for the officer's
 * My/Team/Unassigned queues, not this approver-scoped view).
 */
export default function LiveApprovalsPage() {
  const router = useRouter()
  const [items, setItems] = React.useState<StaffApplicationListItem[] | null>(null)
  const [summary, setSummary] = React.useState<ApprovalsSummaryResponse | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  // Dropped if a newer fetch has already started, matching the sibling
  // live-applications list page's own stale-response guard.
  const requestIdRef = React.useRef(0)

  React.useEffect(() => {
    const requestId = ++requestIdRef.current
    Promise.all([listApplications({ stage: "Approval" }), getApprovalsSummary()]).then(
      ([listRes, summaryRes]) => {
        if (requestId !== requestIdRef.current) return
        if (!listRes.ok) {
          setError(listRes.error)
          return
        }
        if (!summaryRes.ok) {
          setError(summaryRes.error)
          return
        }
        setItems(listRes.data)
        setSummary(summaryRes.data)
        setError(null)
      },
    )
  }, [])

  const columns: ListColumn<StaffApplicationListItem>[] = [
    { header: "ID", cell: (a) => <small>{a.id}</small> },
    { header: "Product", cell: (a) => a.productCode },
    { header: "Amount", cell: (a) => formatPeso(a.amount) },
    { header: "Tenor", cell: (a) => `${a.tenor} mo` },
    { header: "Grade", cell: (a) => a.grade ?? "—" },
  ]

  return (
    <>
      <PageHeader
        eyebrow="My work"
        title="Real approvals"
        description="Applications recommended for your decision, from the real borrower channel."
      />
      <KpiGrid>
        <Kpi label="Waiting on you" value={summary?.waitingOnMe ?? "—"} />
        <Kpi label="Decided today" value={summary?.decidedToday ?? "—"} />
        <Kpi label="Overrides this week" value={summary?.overridesThisWeek ?? "—"} />
        <Kpi label="Median time to decide" value={summary ? medianText(summary.medianMinutesToDecide) : "—"} />
      </KpiGrid>
      <Card>
        <CardHeader>
          <CardTitle>Credit decisions</CardTitle>
          <CardTag>{items?.length ?? 0} waiting</CardTag>
        </CardHeader>
        {error ? (
          <p role="alert">{error}</p>
        ) : items === null ? (
          <p>Loading…</p>
        ) : (
          <ListView
            label="Real approvals"
            items={items}
            filters={[]}
            searchPlaceholder="Search application ID"
            searchText={(a) => a.id}
            columns={columns}
            rowKey={(a) => a.id}
            onRowActivate={(a) => router.push(`/live-applications/${a.id}`)}
            emptyMessage="No real applications waiting"
          />
        )}
      </Card>
    </>
  )
}
