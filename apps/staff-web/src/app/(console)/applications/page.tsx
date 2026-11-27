"use client"

import { Card, ListView, PageHeader, Tabs, TabsCount, TabsList, TabsTrigger } from "@aim-ready/ui"
import { useRouter } from "next/navigation"
import * as React from "react"

import { APP_COLUMNS, appFilters, appText } from "@/components/app-list"
import { OutcomePill } from "@/components/bits"
import { NewAppButton } from "@/components/new-app-button"
import { useConsole } from "@/components/use-console"
import { baseRole, isClosed } from "@/mock"

type Tab = "open" | "closed" | "all"

export default function ApplicationsPage() {
  const ctx = useConsole()
  const router = useRouter()
  const [tab, setTab] = React.useState<Tab>("open")
  if (!ctx) return null
  const { role, s } = ctx
  const open = s.apps.filter((a) => !isClosed(a))
  const closed = s.apps.filter(isClosed)
  const list = tab === "open" ? open : tab === "closed" ? closed : s.apps
  const r = baseRole(role)
  return (
    <>
      <PageHeader
        eyebrow="Applications"
        title="All applications"
        description="From WhiteBank online, branches and email or file intake. Every channel uses the same decision pipeline."
        actions={r === "branch" || r === "officer" ? <NewAppButton /> : undefined}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="open">
            In progress<TabsCount>{open.length}</TabsCount>
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed<TabsCount>{closed.length}</TabsCount>
          </TabsTrigger>
          <TabsTrigger value="all">
            All<TabsCount>{s.apps.length}</TabsCount>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Card>
        <ListView
          key={tab}
          label="Applications"
          items={list}
          filters={appFilters(list, [{ key: "outcome", label: "Decision", options: [["approve", "Auto-approve"], ["refer", "Refer"], ["decline", "Auto-decline"]], test: (a, v) => a.outcome === v }])}
          searchPlaceholder="Search name, case ID, CIF or reason"
          searchText={appText}
          columns={[...APP_COLUMNS, { header: "Outcome", cell: (a) => <OutcomePill outcome={a.outcome} /> }]}
          rowKey={(a) => a.id}
          onRowActivate={(a) => router.push(`/applications/${a.id}`)}
          emptyMessage="No applications"
        />
      </Card>
    </>
  )
}
