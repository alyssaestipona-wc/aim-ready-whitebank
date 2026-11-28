"use client"

import { Button, PageHeader, StatusPill } from "@aim-ready/ui"

import { StaticTable, useRun } from "@/components/admin/bits"
import { Note, Section } from "@/components/bits"
import { useConsole } from "@/components/use-console"
import { isReadOnly, toggleBureauDrill, toggleCoreDrill } from "@/mock"

/** Read-only except the tenant administrator's failure drills. */
export default function IntegrationsPage() {
  const ctx = useConsole()
  const run = useRun()
  if (!ctx) return null
  const { role, s } = ctx
  const C = s.cfg
  const can = role === "admin"
  const title = isReadOnly(role) ? "Read-only access" : can ? undefined : "Tenant administrator only"
  const A: Array<[string, string, string, string, ("bureau" | "core")?]> = [
    ["Credit bureau", "TransUnion PH", C.bureauDown ? "Outage (simulated)" : "Simulated", "42 / 42", "bureau"],
    ["eKYC and liveness", "HyperVerge", "Simulated", "31 / 31"],
    ["AML and sanctions", "LSEG World-Check", "Simulated", "28 / 28"],
    ["Fraud signals", "SEON", "Simulated", "19 / 19"],
    ["E-signature", "DocuSign", "Simulated", "24 / 24"],
    ["OCR and document AI", "Google Document AI", "Simulated", "37 / 37"],
    ["Bank statement analysis", "Perfios", "Simulated", "22 / 22"],
    ["Core banking", "WhiteBank Core", C.coreFailNext ? "Next booking will time out" : "Sandbox", "56 / 56", "core"],
  ]
  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Integrations"
        description="Every provider connects through a standard adapter that runs against a simulated provider, a sandbox or production with no code change. Each adapter passes its conformance suite before it counts as done."
      />
      {C.bureauDown && (
        <Note tone="bad">
          <b>Credit bureau unavailable.</b> New applications are routed to manual review instead of being decided.
        </Note>
      )}
      <Section title="Adapters" tag="Synthetic data only · no network calls to real providers" flush>
        <StaticTable
          head={["Category", "Provider", "Mode", "Conformance tests", "Failure drill"]}
          rows={A.map((r) => [
            r[0],
            <b key="p" className="font-semibold text-strong">{r[1]}</b>,
            <StatusPill key="m" tone={/Outage|time out/.test(r[2]) ? "bad" : r[2] === "Sandbox" ? "info" : "neutral"}>{r[2]}</StatusPill>,
            <StatusPill key="t" tone="ok">{r[3]} passing</StatusPill>,
            r[4] === "bureau" ? (
              <Button key="d" size="sm" disabled={!can} title={title} onClick={() => run(toggleBureauDrill())}>
                {C.bureauDown ? "Restore bureau" : "Simulate outage"}
              </Button>
            ) : r[4] === "core" ? (
              <Button key="d" size="sm" disabled={!can} title={title} onClick={() => run(toggleCoreDrill())}>
                {C.coreFailNext ? "Cancel drill" : "Fail next booking"}
              </Button>
            ) : (
              <span key="d" className="text-subtle">—</span>
            ),
          ])}
        />
      </Section>
    </>
  )
}
