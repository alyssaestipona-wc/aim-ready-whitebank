"use client"

import { BarChart, PageHeader, StatusPill, StaticTable } from "@aim-ready/ui"

import { Kpi, KpiGrid, Section } from "@/components/bits"

const TEAMS: Array<[string, string, string]> = [
  ["Consumer credit · Metro Manila", "6,410", "94%"],
  ["Consumer credit · Visayas", "2,180", "91%"],
  ["Consumer credit · Mindanao", "1,240", "87%"],
  ["Credit administration", "29,410", "97%"],
]

export default function TurnaroundPage() {
  return (
    <>
      <PageHeader eyebrow="Reports" title="Turnaround and SLA" description="Median time in stage and SLA met, last 30 days. Computed from the same stage timestamps as SLA watch, so the two never disagree." />
      <KpiGrid cols={3}>
        <Kpi label="Auto-decided, median" value="48 sec" sub="target under 5 minutes" />
        <Kpi label="Referred, median" value="6.2 h" sub="target under 1 business day" />
        <Kpi label="Approval to cash, unsecured" value="3.1 h" sub="target same day" />
      </KpiGrid>
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <Section title="Median hours by stage, referred cases">
          <BarChart
            label="Median hours by stage"
            max={6}
            data={[
              { label: "Checks", value: 0.1, display: "6 min" },
              { label: "Review", value: 3.4, display: "3.4 h" },
              { label: "Approval", value: 1.6, display: "1.6 h" },
              { label: "Offer acceptance", value: 5.8, display: "5.8 h · trending over" },
              { label: "Booking", value: 0.9, display: "0.9 h" },
            ]}
          />
        </Section>
        <Section title="SLA met by team" flush>
          <StaticTable head={["Team", "Cases", "Met"]} rows={TEAMS.map(([t, n, m]) => [t, <span key="n" className="num">{n}</span>, <StatusPill key="m" tone={parseInt(m, 10) >= 90 ? "ok" : "warn"}>{m}</StatusPill>])} />
        </Section>
      </div>
    </>
  )
}
