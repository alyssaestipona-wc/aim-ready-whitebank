"use client"

import { BarChart, ListView, NativeSelect, NativeSelectOption, Note, PageHeader, StatusPill, type ListFilterDef, CheckRow, StaticTable, TabBar } from "@aim-ready/ui"
import * as React from "react"

import { Kpi, KpiGrid, Section } from "@/components/bits"
import { useConsole } from "@/components/use-console"
import { overrides, products, type AuditEntry } from "@/mock"

type Tab = "registry" | "prohibited" | "shadow" | "monitoring" | "fairness" | "overrides" | "automation"
type Ov = Pick<AuditEntry, "when" | "who" | "what" | "target">

const REGISTRY: Array<[string, string, string, string, string, string, string]> = [
  ["PL-Score 3.2", "Personal, salary", "Gradient boosted trees", "Live", "Kalinaw outcomes Jan 2023 – Jun 2026", "60+ DPD in 12 months", "Model risk committee, 2 Sep 2026"],
  ["SL-Score 1.1", "Salary", "Logistic scorecard", "Shadow mode", "Payroll-partner loans 2022 – 2026", "60+ DPD in 12 months", "Pending"],
  ["Cold-start scorecard 1.0", "New products", "Bureau score + expert rules", "Retired", "No loan history needed", "—", "Credit policy, 2025"],
]

const PROHIBITED: Array<[string, string]> = [
  ["Sex or gender", "Fair lending"], ["Religion", "Fair lending; sensitive data under the Data Privacy Act"], ["Ethnicity", "Fair lending"], ["Marital status", "Fair lending"], ["Barangay-level location", "Proxy for protected groups"], ["Health information", "Sensitive data under the Data Privacy Act"],
]

export default function ModelsPage() {
  const ctx = useConsole()
  const [tab, setTab] = React.useState<Tab>("registry")
  if (!ctx) return null
  const { s } = ctx
  const C = s.cfg
  const P = products(s)
  const ov = overrides(s)
  const ovFilters: ListFilterDef<Ov>[] = [
    { key: "lvl", label: "Threshold", options: [["above", "Above ₱50,000"], ["below", "Below ₱50,000"]], test: (a, v) => a.what.includes(`(${v} `) },
    { key: "who", label: "Officer", options: [...new Set(ov.map((a) => a.who))].sort().map((v) => [v, v] as const), test: (a, v) => a.who === v },
  ]

  return (
    <>
      <PageHeader eyebrow="Configuration" title="AI models" description="Registry, shadow mode, monitoring, fairness and automation controls. The model recommends; rules and bands decide." />
      <TabBar
        value={tab}
        onChange={setTab}
        items={[["registry", "Registry"], ["prohibited", "Prohibited features"], ["shadow", "Shadow mode"], ["monitoring", "Monitoring"], ["fairness", "Fairness"], ["overrides", "Overrides"], ["automation", "Automation controls"]]}
      />
      {tab === "registry" && (
        <Section flush tag="Entries are immutable once deployed">
          <StaticTable
            head={["Model", "Products", "Algorithm", "Status", "Training data", "Outcome", "Approved by"]}
            rows={REGISTRY.map((r) => [
              <b key="m" className="mono font-semibold text-strong">{r[0]}</b>,
              r[1],
              r[2],
              <StatusPill key="s" tone={r[3] === "Live" ? "ok" : r[3] === "Retired" ? "neutral" : "warn"}>{r[3]}</StatusPill>,
              <small key="t">{r[4]}</small>,
              <small key="o">{r[5]}</small>,
              <small key="a">{r[6]}</small>,
            ])}
          />
        </Section>
      )}
      {tab === "prohibited" && (
        <Section title="Prohibited features" tag="Jurisdiction: Philippines · checked on every build" flush>
          <StaticTable head={["Attribute", "Why", "Enforced at"]} rows={PROHIBITED.map((r) => [r[0], r[1], "Training and scoring"])} />
        </Section>
      )}
      {tab === "shadow" && (
        <>
          <KpiGrid cols={3}>
            <Kpi label="Applications scored" value="3,410" sub="SL, last 90 days; people decided" />
            <Kpi label="Agreement with people" value="88%" sub="threshold 85%" />
            <Kpi label="Defaults where model said decline" value="3 of 21" sub="people approved" />
          </KpiGrid>
          <Section title="Ready to leave shadow mode?" tag="SL-Score 1.1">
            <CheckRow state="p" label="Agreement above 85%" />
            <CheckRow state="p" label="Validation report approved" />
            <CheckRow state="p" label="Fairness test passed" />
            <CheckRow state="w" label="Committee sign-off" />
            <p className="mt-2.5 mb-0 text-[12.5px] text-muted-foreground">Automation can’t move to live until every item passes.</p>
          </Section>
        </>
      )}
      {tab === "monitoring" && (
        <Section title="Production monitoring · PL-Score 3.2" tag="Computed nightly · last run 27 Nov, 02:00">
          <BarChart
            label="Production monitoring"
            max={2.5}
            data={[
              { label: "Score drift (PSI)", value: 0.06, display: "0.06 · stable" },
              { label: "Feature drift, max", value: 0.11, display: "0.11 · alert" },
              { label: "Approval-rate change", value: 2.1, display: "+2.1 pts" },
              { label: "30+ DPD, auto-approved", value: 0.9, display: "0.9%" },
            ]}
          />
          <Note tone="warn" flat className="mt-3">
            <b>Alert raised to credit risk.</b> Feature drift on months-with-employer crossed the 0.10 threshold on 25 Nov.
          </Note>
        </Section>
      )}
      {tab === "fairness" && (
        <Section title="Fairness test · approval rate by group" tag="Passed · parity ratio 0.90 (threshold 0.80) · run 1 Nov">
          <BarChart
            label="Approval rate by group"
            max={70}
            data={[
              { label: "Women", value: 61, display: "61%" },
              { label: "Men", value: 59, display: "59%" },
              { label: "Age 21–30", value: 56, display: "56%" },
              { label: "Age 31–50", value: 62, display: "62%" },
              { label: "Age 51–65", value: 58, display: "58%" },
            ]}
          />
        </Section>
      )}
      {tab === "overrides" && (
        <Section title="Overrides of the AI recommendation" flush>
          <ListView
            label="Overrides"
            items={ov}
            filters={ovFilters}
            searchPlaceholder="Search officer, reason or case ID"
            searchText={(a) => `${a.who} ${a.what} ${a.target}`}
            rowKey={(a) => `${a.when}|${a.target}|${a.what}`}
            emptyMessage="No overrides"
            columns={[
              { header: "When", cell: (a) => <span className="mono">{a.when}</span> },
              { header: "Who", cell: (a) => a.who },
              { header: "Action", cell: (a) => a.what },
              { header: "Case", cell: (a) => <span className="mono">{a.target}</span> },
            ]}
          />
        </Section>
      )}
      {tab === "automation" && (
        <Section title="Automation controls" tag="Credit risk only, in the staff console" flush>
          <StaticTable
            head={["Product", "Mode", "Change"]}
            rows={(["PL", "SL"] as const).map((k) => {
              const m = C.automation[k]
              return [
                <b key="n" className="font-semibold text-strong">{P[k].name}</b>,
                <StatusPill key="m" tone={m === "live" ? "ok" : "warn"}>{m === "live" ? "Live" : m === "shadow" ? "Shadow mode" : "Off"}</StatusPill>,
                <NativeSelect key="c" size="sm" aria-label={`Mode for ${P[k].name}`} value={m} disabled title="Credit risk only, in the staff console">
                  <NativeSelectOption value="off">Off</NativeSelectOption>
                  <NativeSelectOption value="shadow">Shadow mode</NativeSelectOption>
                  <NativeSelectOption value="live">Live</NativeSelectOption>
                </NativeSelect>,
              ]
            })}
          />
          <div className="flex flex-wrap items-center gap-3 border-t border-border-soft px-4 py-3.5">
            <div className="min-w-[220px] flex-1">
              <b className="font-semibold text-strong">Kill switch</b> {C.killSwitch ? <StatusPill tone="bad">On</StatusPill> : <StatusPill>Off</StatusPill>}
              <br />
              <span className="text-[12.5px] text-muted-foreground">A single-user emergency control for credit risk, in the staff console. Sends every new application to manual review at once.</span>
            </div>
          </div>
        </Section>
      )}
    </>
  )
}
