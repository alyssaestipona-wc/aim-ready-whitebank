"use client"

import { BarChart, PageHeader, StatusPill } from "@aim-ready/ui"

import { StaticTable } from "@/components/admin/bits"
import { Kpi, KpiGrid, Note, Section } from "@/components/bits"
import { useConsole } from "@/components/use-console"
import { decisionStats, MODEL_VERSION, products } from "@/mock"

export default function DecisioningDashboard() {
  const ctx = useConsole()
  if (!ctx) return null
  const { s } = ctx
  const st = decisionStats(s)
  const C = s.cfg
  const P = products(s)
  return (
    <>
      <PageHeader eyebrow="Reports" title="Decisioning dashboard" description="Straight-through rate, decision mix and overrides per product. Shows automation mode next to the mix, so a mode change explains a shift." />
      {(C.killSwitch || C.bureauDown) && (
        <Note tone="warn">
          <b>{C.killSwitch ? "Kill switch is on." : "Credit bureau unavailable."}</b> Every new application is going to manual review, which is why referrals are up.
        </Note>
      )}
      <KpiGrid>
        <Kpi label="Straight-through rate" value="64%" sub="30 days · target 60%+" />
        <Kpi label="Override rate" value="7.8%" sub="of referred cases" />
        <Kpi label="Auto-approved, 30+ DPD" value="0.9%" sub="within the 2% risk appetite" />
        <Kpi label="Decisions today" value="1,642" sub={`bank-wide · ${st.n} in this demo`} />
      </KpiGrid>
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <Section title="Decision mix, 30 days">
          <BarChart
            label="Decision mix"
            max={100}
            data={[
              { label: "Auto-approve", value: 58, display: "58%" },
              { label: "Refer", value: 34, display: "34%" },
              { label: "Auto-decline", value: 8, display: "8%" },
            ]}
          />
        </Section>
        <Section title="Top referral triggers">
          <BarChart
            label="Top referral triggers"
            max={41}
            data={[
              { label: "Score in referral band", value: 41, display: "41%" },
              { label: "Thin bureau file", value: 23, display: "23%" },
              { label: "Amount above limit", value: 17, display: "17%" },
              { label: "Debt-to-income above cap", value: 12, display: "12%" },
              { label: "Income mismatch", value: 7, display: "7%" },
            ]}
          />
        </Section>
      </div>
      <Section title="Automation by product" flush className="mt-3.5">
        <StaticTable
          head={["Product", "Mode", "Model", "Straight-through", "Mix (approve / refer / decline)"]}
          rows={(["PL", "SL"] as const).map((k) => {
            const m = C.automation[k]
            const label = C.killSwitch ? "Kill switch on" : C.bureauDown ? "Bureau down: manual" : m === "live" ? "Live" : m === "shadow" ? "Shadow mode" : "Off"
            return [
              P[k].name,
              <StatusPill key="m" tone={C.killSwitch || C.bureauDown ? "bad" : m === "live" ? "ok" : "warn"}>{label}</StatusPill>,
              <span key="mo" className="mono">{MODEL_VERSION}</span>,
              k === "PL" ? "61%" : "72%",
              k === "PL" ? "55 / 36 / 9" : "64 / 30 / 6",
            ]
          })}
        />
      </Section>
    </>
  )
}
