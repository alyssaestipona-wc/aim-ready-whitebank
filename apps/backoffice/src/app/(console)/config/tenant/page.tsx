"use client"

import { ListView, PageHeader, type ListFilterDef, CheckRow, Toggle } from "@aim-ready/ui"

import { KeyValues, Section } from "@/components/bits"
import { useConsole } from "@/components/use-console"
import { HOLIDAYS } from "@/mock"

type Holiday = (typeof HOLIDAYS)[number]
/** Sort key for "today" (27 Nov) in the holiday calendar. */
const TODAY_KEY = 1127

const FILTERS: ListFilterDef<Holiday>[] = [
  { key: "type", label: "Type", options: [["Regular", "Regular"], ["Special non-working", "Special non-working"]], test: (r, v) => r[2] === v },
  { key: "when", label: "When", options: [["past", "Past"], ["upcoming", "Upcoming"]], test: (r, v) => (v === "past") === r[3] < TODAY_KEY },
]

/** Read-only here: the module switch (PRD PLT-2) moved to the admin console. */
export default function TenantPage() {
  const ctx = useConsole()
  if (!ctx) return null
  const { s } = ctx
  const on = s.flags.ai
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Tenant settings" description="One bank in Phase 1. Every bank-specific setting lives here as configuration, never code." />
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <Section title="Kalinaw Bank">
          <KeyValues
            items={[
              ["Tenant ID", <span key="t" className="mono">tnt_kalinaw</span>],
              ["Deployment", "Dedicated, single bank"],
              ["Data residency", "Philippines (Manila region)"],
              ["Languages", "English, Filipino"],
              ["Currency and dates", "PHP · 27 Nov 2026"],
              ["Branding", "Kalinaw logo"],
            ]}
          />
        </Section>
        <Section title="Modules" tag="Turning a module off keeps its records">
          <CheckRow label="AI credit scoring" value={<Toggle on={on} label="AI credit scoring" disabled title="Tenant administrator only, in the admin console" onToggle={() => {}} />} />
          <CheckRow label="Origination and decisioning" value="Always on" />
        </Section>
      </div>
      <Section title="Holiday calendar · PH 2026" tag="SLA timers and due dates skip these like weekends" flush className="mt-3.5">
        <ListView
          label="Holiday calendar"
          items={HOLIDAYS}
          filters={FILTERS}
          searchPlaceholder="Search holiday"
          searchText={(r) => `${r[0]} ${r[1]}`}
          rowKey={(r) => `${r[0]}-${r[1]}`}
          emptyMessage="No holidays"
          columns={[
            { header: "Date", cell: (r) => <span className="mono">{r[0]}</span> },
            { header: "Holiday", cell: (r) => r[1] },
            { header: "Type", cell: (r) => r[2] },
          ]}
        />
      </Section>
    </>
  )
}
