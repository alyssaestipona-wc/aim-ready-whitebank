"use client"

import { ListView, PageHeader, StatusPill, type ListFilterDef, StaticTable, TabBar } from "@aim-ready/ui"
import * as React from "react"

import { Section } from "@/components/bits"
import { useConsole } from "@/components/use-console"
import { notificationLog } from "@/mock"

type Row = [string, string, string, string, string]

/** Read-only in this port: notification templates have no edit or publish path. */
export default function NotificationConfigPage() {
  const ctx = useConsole()
  const [tab, setTab] = React.useState<"tpl" | "log">("tpl")
  if (!ctx) return null
  const lg = notificationLog(ctx.s)
  const filters: ListFilterDef<Row>[] = [
    { key: "ev", label: "Event", options: [...new Set(lg.map((r) => r[2]))].sort().map((v) => [v, v] as const), test: (r, v) => r[2] === v },
    { key: "ch", label: "Channel", options: [["SMS", "SMS"], ["Push", "Push"], ["Email", "Email"]], test: (r, v) => r[3] === v },
    { key: "st", label: "Status", options: [["Delivered", "Delivered"], ["Failed · retried", "Failed · retried"]], test: (r, v) => r[4] === v },
  ]
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Notifications" description="Borrower and staff messages by event and channel, in English and Filipino. A missing translation falls back to English." />
      <TabBar value={tab} onChange={setTab} items={[["tpl", "Templates"], ["log", "Delivery log"]]} />
      {tab === "tpl" ? (
        <Section flush>
          <StaticTable
            head={["Event", "Push", "SMS", "Email", "Languages"]}
            rows={[["Offer ready", "On", "On", "On", "EN, FIL"], ["Document needed", "On", "On", "Off", "EN, FIL"], ["Sign your documents", "On", "On", "On", "EN, FIL"], ["Funds released", "On", "On", "On", "EN, FIL"], ["Staff: SLA warning", "In-app", "Off", "On", "EN"]]}
          />
        </Section>
      ) : (
        <Section flush tag="48,210 messages today, bank-wide">
          <ListView
            label="Delivery log"
            items={lg}
            filters={filters}
            searchPlaceholder="Search recipient"
            searchText={(r) => `${r[1]} ${r[2]}`}
            rowKey={(r) => `${r[0]}|${r[1]}|${lg.indexOf(r)}`}
            emptyMessage="No messages"
            columns={[
              { header: "Sent", cell: (r) => <span className="mono">{r[0]}</span> },
              { header: "Recipient", cell: (r) => r[1] },
              { header: "Event", cell: (r) => r[2] },
              { header: "Channel", cell: (r) => r[3] },
              { header: "Status", cell: (r) => <StatusPill tone={r[4] === "Delivered" ? "ok" : "warn"}>{r[4]}</StatusPill> },
            ]}
          />
        </Section>
      )}
    </>
  )
}
