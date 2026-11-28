"use client"

import { Card, ListView, PageHeader } from "@aim-ready/ui"
import { useRouter } from "next/navigation"

import { APP_COLUMNS, appFilters, appText } from "@/components/app-list"
import { Kpi, KpiGrid } from "@/components/bits"
import { useConsole } from "@/components/use-console"
import type { Application } from "@/mock"

const ESCALATES: Record<string, string> = { Review: "Credit team lead", "Info requested": "Credit team lead", Approval: "Head of credit", Documentation: "Ops lead", Booking: "Ops lead", "Pending checker": "Ops lead" }

export default function SlaPage() {
  const ctx = useConsole()
  const router = useRouter()
  if (!ctx) return null
  const list = ctx.s.apps.filter((a) => a.sla != null && !["Disbursed", "Declined", "Withdrawn"].includes(a.stage)).sort((x, y) => (x.sla ?? 0) - (y.sla ?? 0))
  const sla = (a: Application) => a.sla ?? 0
  const br = list.filter((a) => sla(a) < 0).length
  const wn = list.filter((a) => sla(a) >= 0 && sla(a) <= 2).length
  return (
    <>
      <PageHeader eyebrow="My work" title="SLA watch" description="Every open case, soonest due first. A breach escalates to the stage’s owner automatically: review breaches go to the credit team lead." />
      <KpiGrid cols={3}>
        <Kpi label="Breached" value={br} sub="escalated automatically" />
        <Kpi label="Due within 2 hours" value={wn} sub="flagged amber in queues" />
        <Kpi label="On track" value={list.length - br - wn} />
      </KpiGrid>
      <Card>
        <ListView
          label="SLA watch"
          items={list}
          filters={appFilters(list, [{ key: "due", label: "SLA status", options: [["breached", "Breached"], ["soon", "Due within 2 hours"], ["ok", "On track"]], test: (a, v) => (v === "breached" ? sla(a) < 0 : v === "soon" ? sla(a) >= 0 && sla(a) <= 2 : sla(a) > 2) }])}
          searchPlaceholder="Search name, case ID or reason"
          searchText={appText}
          columns={[...APP_COLUMNS, { header: "Escalates to", cell: (a) => <small className="text-muted-foreground">{ESCALATES[a.stage] || "—"}</small> }]}
          rowKey={(a) => a.id}
          onRowActivate={(a) => router.push(`/applications/${a.id}`)}
          emptyMessage="No open cases"
        />
      </Card>
    </>
  )
}
