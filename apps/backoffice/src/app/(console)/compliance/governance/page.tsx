"use client"

import { Card, ListView, PageHeader, StatusPill, type ListFilterDef, StaticTable } from "@aim-ready/ui"

import { Section } from "@/components/bits"
import { FINDINGS } from "@/mock"

type Finding = (typeof FINDINGS)[number]

const MODELS: Array<[string, string, string, string, string, string]> = [
  ["PL-Score 3.2", "Live", "Passed · Aug 2026 · Risk Analytics", "Model risk committee, 2 Sep 2026", "Aug 2027", "Passed · ratio 0.90"],
  ["SL-Score 1.1", "Shadow mode", "Passed · Oct 2026", "Pending committee sign-off", "—", "Passed · ratio 0.88"],
  ["Cold-start scorecard 1.0", "Retired", "Passed · 2025", "Credit policy", "—", "—"],
]

const FILTERS: ListFilterDef<Finding>[] = [
  { key: "st", label: "Status", options: [["Open", "Open"], ["Resolved", "Resolved"]], test: (r, v) => r[4] === v },
  { key: "sev", label: "Severity", options: [["High", "High"], ["Medium", "Medium"], ["Low", "Low"]], test: (r, v) => r[1] === v },
]

export default function GovernancePage() {
  return (
    <>
      <PageHeader eyebrow="Compliance" title="Model governance" description="Validation, approval and the revalidation calendar for every model. A model can’t go live while a governance step is open." />
      <Card>
        <StaticTable
          head={["Model", "Status", "Independent validation", "Approved by", "Next revalidation", "Fairness"]}
          rows={MODELS.map((r) => [
            <b key="m" className="mono font-semibold text-strong">{r[0]}</b>,
            <StatusPill key="s" tone={r[1] === "Live" ? "ok" : r[1] === "Retired" ? "neutral" : "warn"}>{r[1]}</StatusPill>,
            <small key="v">{r[2]}</small>,
            <small key="a">{r[3]}</small>,
            r[4],
            r[5],
          ])}
        />
      </Card>
      <Section title="Findings" flush className="mt-3.5">
        <ListView
          label="Findings"
          items={FINDINGS}
          filters={FILTERS}
          searchPlaceholder="Search finding or model"
          searchText={(r) => `${r[0]} ${r[5]}`}
          rowKey={(r) => r[0]}
          emptyMessage="No findings"
          columns={[
            { header: "Finding", cell: (r) => r[0] },
            { header: "Model", cell: (r) => <span className="mono">{r[5]}</span> },
            { header: "Severity", cell: (r) => <StatusPill tone={r[1] === "Low" ? "neutral" : r[1] === "High" ? "bad" : "warn"}>{r[1]}</StatusPill> },
            { header: "Owner", cell: (r) => r[2] },
            { header: "Due", cell: (r) => r[3] },
            { header: "Status", cell: (r) => <StatusPill tone={r[4] === "Resolved" ? "ok" : "warn"}>{r[4]}</StatusPill> },
          ]}
        />
      </Section>
    </>
  )
}
