"use client"

import { BarChart, PageHeader, StaticTable, TabBar } from "@aim-ready/ui"
import * as React from "react"

import { Kpi, KpiGrid, Section } from "@/components/bits"

type Channel = "all" | "web" | "branch" | "file"

/** Last-30-day funnel counts by channel (reporting sample). */
const FUNNEL: Record<Channel, [number, number, number, number]> = {
  all: [61240, 47880, 31950, 29410],
  web: [46950, 36240, 24230, 22430],
  branch: [9100, 8120, 5410, 4950],
  file: [5190, 3520, 2310, 2030],
}

const fmt = (n: number) => n.toLocaleString("en-PH")
const pc = (a: number, b: number) => `${Math.round((a / b) * 100)}%`

export default function FunnelPage() {
  const [tab, setTab] = React.useState<Channel>("all")
  const [started, submitted, approved, booked] = FUNNEL[tab]
  return (
    <>
      <PageHeader eyebrow="Reports" title="Origination funnel" description="Last 30 days, bank-wide. Every number is a count over the application records, refreshed daily." />
      <TabBar value={tab} onChange={setTab} items={[["all", "All channels"], ["web", "Web app"], ["branch", "Branch"], ["file", "File intake"]]} />
      <KpiGrid>
        <Kpi label="Started" value={fmt(started)} />
        <Kpi label="Submitted" value={fmt(submitted)} sub={`${pc(submitted, started)} of started`} />
        <Kpi label="Approved" value={fmt(approved)} sub={`${pc(approved, submitted)} of submitted`} />
        <Kpi label="Booked" value={fmt(booked)} sub={`${pc(booked, approved)} of approved`} />
      </KpiGrid>
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <Section title="Funnel">
          <BarChart
            label="Funnel"
            max={started}
            data={[
              { label: "Started", value: started, display: fmt(started) },
              { label: "Submitted", value: submitted, display: fmt(submitted) },
              { label: "Approved", value: approved, display: fmt(approved) },
              { label: "Booked", value: booked, display: fmt(booked) },
            ]}
          />
        </Section>
        <Section title="By product" flush>
          <StaticTable
            head={["Product", "Submitted", "Approval rate", "Booked"]}
            rows={[
              ["Personal loan", <span key="s" className="num">{fmt(Math.round(submitted * 0.54))}</span>, "61%", <span key="b" className="num">{fmt(Math.round(booked * 0.48))}</span>],
              ["Salary loan", <span key="s" className="num">{fmt(Math.round(submitted * 0.46))}</span>, "78%", <span key="b" className="num">{fmt(Math.round(booked * 0.52))}</span>],
            ]}
          />
        </Section>
      </div>
    </>
  )
}
