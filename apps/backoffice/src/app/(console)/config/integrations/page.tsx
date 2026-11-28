"use client"

import { Button, PageHeader, StatusPill, StaticTable } from "@aim-ready/ui"

import { Note, Section } from "@/components/bits"
import { useConsole } from "@/components/use-console"

/** Read-only here: the failure drills moved to the admin console. */
export default function IntegrationsPage() {
  const ctx = useConsole()
  if (!ctx) return null
  const { s } = ctx
  const C = s.cfg
  const title = "Tenant administrator only, in the admin console"
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
              <Button key="d" size="sm" disabled title={title}>
                {C.bureauDown ? "Restore bureau" : "Simulate outage"}
              </Button>
            ) : r[4] === "core" ? (
              <Button key="d" size="sm" disabled title={title}>
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
