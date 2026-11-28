"use client"

import { Button, Card, ListView, PageHeader, Tabs, TabsCount, TabsList, TabsTrigger, useToast, type ListColumn } from "@aim-ready/ui"
import { useRouter } from "next/navigation"
import * as React from "react"

import { APP_COLUMNS, appFilters, appText } from "@/components/app-list"
import { Kpi, KpiGrid } from "@/components/bits"
import { NewAppButton } from "@/components/new-app-button"
import { useConsole } from "@/components/use-console"
import { baseRole, myQueue, pickCase, teamQueue, unassigned, type Application } from "@/mock"

type Tab = "mine" | "team" | "unassigned"

const DESC: Record<string, string> = {
  branch: "Applications from Makati Ayala branch, including drafts that still need documents.",
  officer: "Referred cases assigned to you. Open a case to review it, ask the borrower for more, or recommend a decision.",
  approver: "Recommendations waiting for your decision.",
}

export default function QueuesPage() {
  const ctx = useConsole()
  const router = useRouter()
  const toast = useToast()
  const [tab, setTab] = React.useState<Tab>("mine")
  if (!ctx) return null
  const { role, s } = ctx
  const r = baseRole(role)
  const q = myQueue(s, role)
  const team = teamQueue(s, role)
  const un = unassigned(s)
  const list = tab === "mine" ? q : tab === "team" ? team : un
  const desc = r === "ops" ? (role === "opssup" ? "Bookings prepared by loan operations that need your check before core creates the loan." : "Approved loans to document, book and disburse.") : (r && DESC[r]) || "All cases in progress."
  const canPick = tab === "unassigned" && r === "officer"

  const columns: ListColumn<Application>[] = [
    ...APP_COLUMNS,
    { header: "Owner", cell: (a) => <small>{a.owner || (a.stage === "Approval" ? "Approvers" : ["Documentation", "Booking", "Pending checker"].includes(a.stage) ? "Credit administration" : "Unassigned")}</small> },
    ...(canPick
      ? [
          {
            header: "",
            cell: (a: Application) => (
              <Button
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation()
                  const res = await pickCase(a.id)
                  if (!res.ok) toast(res.error, "bad")
                  else if (res.toast) toast(res.toast)
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
      <PageHeader eyebrow="My work" title="Work queues" description={desc} actions={r === "branch" || r === "officer" ? <NewAppButton /> : undefined} />
      <KpiGrid>
        <Kpi label="In my queue" value={q.length} />
        <Kpi label="Team queue" value={team.length} />
        <Kpi label="Past SLA" value={team.filter((a) => a.sla != null && a.sla < 0).length} sub="escalated to team lead" />
        <Kpi label="Bank-wide open today" value="1,284" sub="all products and channels" />
      </KpiGrid>
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="mine">
            My queue<TabsCount>{q.length}</TabsCount>
          </TabsTrigger>
          <TabsTrigger value="team">
            Team queue<TabsCount>{team.length}</TabsCount>
          </TabsTrigger>
          <TabsTrigger value="unassigned">
            Unassigned<TabsCount>{un.length}</TabsCount>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Card>
        <ListView
          key={tab}
          label="Work queue"
          items={list}
          filters={appFilters(list)}
          searchPlaceholder="Search name, case ID or reason"
          searchText={appText}
          columns={columns}
          rowKey={(a) => a.id}
          onRowActivate={(a) => router.push(`/applications/${a.id}`)}
          emptyMessage="Queue is clear"
        />
      </Card>
    </>
  )
}
