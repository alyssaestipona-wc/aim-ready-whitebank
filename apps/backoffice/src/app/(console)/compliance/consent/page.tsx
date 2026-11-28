"use client"

import { Card, ListView, PageHeader, type ListFilterDef } from "@aim-ready/ui"
import { useRouter } from "next/navigation"
import * as React from "react"

import { TabBar } from "@/components/admin/bits"
import { useConsole } from "@/components/use-console"
import type { Application } from "@/mock"

type Tab = "all" | "credit" | "data" | "terms"
const TYPE: Record<Exclude<Tab, "all">, string> = { credit: "Credit bureau check", data: "Data processing", terms: "Terms and conditions" }
type Row = { a: Application; t: string }

export default function ConsentPage() {
  const ctx = useConsole()
  const router = useRouter()
  const [tab, setTab] = React.useState<Tab>("all")
  if (!ctx) return null
  const list = ctx.s.apps.filter((a) => a.consent && a.stage !== "Draft")
  const types = tab === "all" ? Object.values(TYPE) : [TYPE[tab]]
  const rows: Row[] = list.flatMap((a) => types.map((t) => ({ a, t })))
  const channels = [...new Set(list.map((a) => a.channel))].sort().map((c) => [c, c] as const)
  const filters: ListFilterDef<Row>[] = [{ key: "channel", label: "Channel", options: channels, test: (r, v) => r.a.channel === v }]
  return (
    <>
      <PageHeader eyebrow="Compliance" title="Consent records" description="Each consent stored separately, with its terms version, channel and time of capture." />
      <TabBar value={tab} onChange={setTab} items={[["all", "All types"], ["credit", "Credit check"], ["data", "Data processing"], ["terms", "Terms"]]} />
      <Card>
        <ListView
          key={tab}
          label="Consent records"
          items={rows}
          filters={filters}
          searchPlaceholder="Search borrower or case ID"
          searchText={(r) => `${r.a.name} ${r.a.id}`}
          rowKey={(r) => `${r.a.id}-${r.t}`}
          onRowActivate={(r) => router.push(`/applications/${r.a.id}`)}
          emptyMessage="No consent records"
          columns={[
            { header: "Borrower", cell: (r) => r.a.name },
            { header: "Case", cell: (r) => <span className="mono">{r.a.id}</span> },
            { header: "Consent", cell: (r) => r.t },
            { header: "Terms", cell: () => "v3.2" },
            { header: "Channel", cell: (r) => r.a.channel },
            { header: "Captured", cell: (r) => <span className="mono">{r.a.created}</span> },
          ]}
        />
      </Card>
    </>
  )
}
