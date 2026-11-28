"use client"

import { Button, Card, ListView, PageHeader, StatusPill, type ListFilterDef } from "@aim-ready/ui"
import Link from "next/link"

import { useRun } from "@/components/admin/bits"
import { useConsole } from "@/components/use-console"
import { exportAml, type AmlCase } from "@/mock"

const FILTERS: ListFilterDef<AmlCase>[] = [
  { key: "st", label: "Status", options: [["open", "Open"], ["closed", "Closed"]], test: (m, v) => (v === "open" ? m.status === "Open" : m.status !== "Open") },
]

export default function AmlPage() {
  const ctx = useConsole()
  const run = useRun()
  if (!ctx) return null
  const cases = ctx.s.amlCases
  return (
    <>
      <PageHeader eyebrow="Compliance" title="AML escalations" description="Sanctions and watchlist matches escalated from screening. Mark reviewed and export to the bank’s AML system." />
      <Card>
        <ListView
          label="AML escalations"
          items={cases}
          filters={FILTERS}
          searchPlaceholder="Search name or case ID"
          searchText={(m) => `${m.name} ${m.app || ""} ${m.match}`}
          rowKey={(m) => `${m.name}-${m.match}`}
          emptyMessage="No escalations"
          columns={[
            { header: "Name", cell: (m) => <b className="font-semibold text-strong">{m.name}</b> },
            { header: "Case", cell: (m) => (m.app ? <Link href={`/applications/${m.app}`} className="mono">{m.app}</Link> : <span className="text-subtle">Onboarding</span>) },
            { header: "Match", cell: (m) => m.match },
            { header: "Status", cell: (m) => <StatusPill tone={m.status === "Open" ? "bad" : "ok"}>{m.status}</StatusPill> },
            {
              header: "",
              cell: (m) =>
                m.status === "Open" ? (
                  <Button size="sm" variant="primary" onClick={() => run(exportAml(cases.indexOf(m)))}>
                    Mark reviewed and export
                  </Button>
                ) : null,
            },
          ]}
        />
      </Card>
    </>
  )
}
