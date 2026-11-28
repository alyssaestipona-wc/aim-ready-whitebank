"use client"

import { Badge, Button, Card, ListView, PageHeader, Tabs, TabsList, TabsTrigger, useToast, type ListColumn, type ListFilterDef } from "@aim-ready/ui"
import { formatPeso } from "@aim-ready/core"
import type { StaffApplicationListItem } from "@aim-ready/contracts"
import { useRouter } from "next/navigation"
import * as React from "react"

import { useSessionRole } from "@/mock"
import { listApplications, pickApplication } from "@/mock/actions/applications"

type Tab = "mine" | "team" | "unassigned"

const STAGE_FILTER: ListFilterDef<StaffApplicationListItem> = {
  key: "stage",
  label: "Stage",
  options: [
    ["Review", "Review"],
    ["Info requested", "Info requested"],
    ["Offer", "Offer"],
    ["Declined", "Declined"],
    ["Disbursed", "Disbursed"],
    ["Withdrawn", "Withdrawn"],
  ],
  test: (item, value) => item.stage === value,
}

/** Matches the simulated console's own breach (<0) and warning (<=2h) thresholds. */
function SlaCell({ hours }: { hours: number | null }) {
  if (hours === null) return <span>—</span>
  if (hours < 0) return <Badge variant="bad">{hours}h (breached)</Badge>
  if (hours <= 2) return <Badge variant="warn">{hours}h left</Badge>
  return <span>{hours}h left</span>
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

/**
 * Real applications from apps/api - My queue / Team queue / Unassigned tabs
 * (work-queues' own addition to staff-application-review's originally
 * single-list screen), plus a Pick action on the Unassigned tab for the
 * officer role. Distinct from the simulated "/applications" work queue.
 */
export default function LiveApplicationsPage() {
  const router = useRouter()
  const role = useSessionRole()
  const toast = useToast()
  const [tab, setTab] = React.useState<Tab>("mine")
  // Tagged with the tab it was fetched for, so switching tabs shows
  // "Loading…" (rather than a stale previous tab's rows) without ever
  // calling setState synchronously inside the effect below - load()'s own
  // setState calls all happen after its await, the same pattern the
  // sibling detail page's fetch effect already uses.
  const [items, setItems] = React.useState<{ forTab: Tab; data: StaffApplicationListItem[] } | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [picking, setPicking] = React.useState<string | null>(null)
  // Bumped on every fetch kicked off (tab switch or a pick's refetch), so a
  // response that resolves after a newer request has started is dropped
  // instead of clobbering fresher (or differently-tabbed) state - plain
  // `forTab` tagging alone only hides a stale response under the wrong tab
  // name, it doesn't stop a late one from overwriting a fresher result for
  // the same tab.
  const requestIdRef = React.useRef(0)

  const applyListResult = React.useCallback(
    (which: Tab, requestId: number, res: Awaited<ReturnType<typeof listApplications>>) => {
      if (requestId !== requestIdRef.current) return
      if (res.ok) {
        setItems({ forTab: which, data: res.data })
        setError(null)
      } else {
        setError(res.error)
      }
    },
    [],
  )

  React.useEffect(() => {
    const requestId = ++requestIdRef.current
    listApplications({ queue: tab === "team" ? undefined : tab }).then((res) =>
      applyListResult(tab, requestId, res),
    )
  }, [tab, applyListResult])

  async function load(which: Tab) {
    const requestId = ++requestIdRef.current
    const res = await listApplications({ queue: which === "team" ? undefined : which })
    applyListResult(which, requestId, res)
  }

  const displayItems = items && items.forTab === tab ? items.data : null

  async function pick(id: string) {
    setPicking(id)
    const res = await pickApplication(id)
    setPicking(null)
    if (!res.ok) {
      toast(res.error, "bad")
      return
    }
    toast("Picked — moved to your queue")
    await load(tab)
  }

  const canPick = role === "officer"

  const columns: ListColumn<StaffApplicationListItem>[] = [
    { header: "ID", cell: (a) => <small>{a.id}</small> },
    { header: "Product", cell: (a) => a.productCode },
    { header: "Amount", cell: (a) => formatPeso(a.amount) },
    { header: "Tenor", cell: (a) => `${a.tenor} mo` },
    { header: "Stage", cell: (a) => a.stage },
    { header: "Outcome", cell: (a) => a.outcome },
    { header: "Grade", cell: (a) => a.grade ?? "—" },
    { header: "SLA", cell: (a) => <SlaCell hours={a.slaHoursLeft} /> },
    ...(tab === "unassigned" && canPick
      ? [
          {
            header: "",
            cell: (a: StaffApplicationListItem) => (
              <Button
                size="sm"
                disabled={picking === a.id}
                onClick={(e) => {
                  e.stopPropagation()
                  void pick(a.id)
                }}
              >
                Pick
              </Button>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        eyebrow="Applications"
        title="Real applications"
        description="Applications submitted through the real borrower channel, with their decision outcome."
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="mine">My queue</TabsTrigger>
          <TabsTrigger value="team">Team queue</TabsTrigger>
          <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
        </TabsList>
      </Tabs>
      <Card>
        {error ? (
          <p role="alert">{error}</p>
        ) : displayItems === null ? (
          <p>Loading…</p>
        ) : (
          <ListView
            key={tab}
            label="Real applications"
            items={displayItems}
            filters={[STAGE_FILTER, PRODUCT_FILTER]}
            searchPlaceholder="Search application ID"
            searchText={(a) => a.id}
            columns={columns}
            rowKey={(a) => a.id}
            onRowActivate={(a) => router.push(`/live-applications/${a.id}`)}
            emptyMessage="No real applications here"
          />
        )}
      </Card>
    </>
  )
}
