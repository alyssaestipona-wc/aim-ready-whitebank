"use client"

import { Card, ListView, PageHeader, type ListColumn, type ListFilterDef } from "@aim-ready/ui"
import { formatPeso } from "@aim-ready/core"
import type { StaffApplicationListItem } from "@aim-ready/contracts"
import { useRouter } from "next/navigation"
import * as React from "react"

import { listApplications } from "@/mock/actions/applications"

const STAGE_FILTER: ListFilterDef<StaffApplicationListItem> = {
  key: "stage",
  label: "Stage",
  options: [
    ["Review", "Review"],
    ["Offer", "Offer"],
    ["Declined", "Declined"],
    ["Disbursed", "Disbursed"],
    ["Withdrawn", "Withdrawn"],
  ],
  test: (item, value) => item.stage === value,
}

const PRODUCT_FILTER: ListFilterDef<StaffApplicationListItem> = {
  key: "product",
  label: "Product",
  options: [
    ["PL", "Personal loan"],
    ["SL", "Salary loan"],
  ],
  test: (item, value) => item.productCode === value,
}

const COLUMNS: ListColumn<StaffApplicationListItem>[] = [
  { header: "ID", cell: (a) => <small>{a.id}</small> },
  { header: "Product", cell: (a) => a.productCode },
  { header: "Amount", cell: (a) => formatPeso(a.amount) },
  { header: "Tenor", cell: (a) => `${a.tenor} mo` },
  { header: "Stage", cell: (a) => a.stage },
  { header: "Outcome", cell: (a) => a.outcome },
  { header: "Grade", cell: (a) => a.grade ?? "—" },
]

/**
 * Real applications from apps/api (real-application-intake), read-only -
 * distinct from the simulated "/applications" work queue. No decisioning
 * action lives here yet (staff-application-review's own non-goal).
 */
export default function LiveApplicationsPage() {
  const router = useRouter()
  const [items, setItems] = React.useState<StaffApplicationListItem[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    listApplications().then((res) => {
      if (cancelled) return
      if (res.ok) setItems(res.data)
      else setError(res.error)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <PageHeader
        eyebrow="Applications"
        title="Real applications"
        description="Applications submitted through the real borrower channel, with their decision outcome."
      />
      <Card>
        {error ? (
          <p role="alert">{error}</p>
        ) : items === null ? (
          <p>Loading…</p>
        ) : (
          <ListView
            label="Real applications"
            items={items}
            filters={[STAGE_FILTER, PRODUCT_FILTER]}
            searchPlaceholder="Search application ID"
            searchText={(a) => a.id}
            columns={COLUMNS}
            rowKey={(a) => a.id}
            onRowActivate={(a) => router.push(`/live-applications/${a.id}`)}
            emptyMessage="No real applications yet"
          />
        )}
      </Card>
    </>
  )
}
