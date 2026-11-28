"use client"

import { Badge, Card, PageHeader } from "@aim-ready/ui"
import { formatPeso } from "@aim-ready/core"
import type { StaffApplicationDetail } from "@aim-ready/contracts"
import { useParams } from "next/navigation"
import * as React from "react"

import { getApplication } from "@/mock/actions/applications"

type Decision = {
  score: number | null
  grade: string | null
  pd: number | null
  outcome: string
  trigger: string
  ruleSetVersion: string
  modelVersion: string
  reasons: { t: string; pos: boolean }[]
  rules: { id: string; name: string; res: "p" | "w" | "f"; val: string }[]
}

/**
 * Real application detail from apps/api - decision summary and consents,
 * read-only (staff-application-review's own non-goal: no decisioning
 * action here yet).
 */
export default function LiveApplicationDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = React.useState<StaffApplicationDetail | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    getApplication(params.id).then((res) => {
      if (cancelled) return
      if (res.ok) setData(res.data)
      else setError(res.error)
    })
    return () => {
      cancelled = true
    }
  }, [params.id])

  if (error) return <p role="alert">{error}</p>
  if (!data) return <p>Loading…</p>

  const decision = data.decision as Decision

  return (
    <>
      <PageHeader
        eyebrow={data.productCode}
        title={`Application ${data.id}`}
        description={`${formatPeso(data.amount)} over ${data.tenor} months — ${data.purpose}`}
      />
      <Card>
        <h2>Decision summary</h2>
        <p>
          Outcome: <Badge>{decision.outcome}</Badge>
          {decision.grade && <> · Grade {decision.grade}</>}
          {decision.score !== null && <> · Score {decision.score}</>}
        </p>
        {decision.trigger && <p>Trigger: {decision.trigger}</p>}
        <p>
          Rule-set {decision.ruleSetVersion} · Model {decision.modelVersion}
        </p>
        {decision.reasons.length > 0 && (
          <ul>
            {decision.reasons.map((r, i) => (
              <li key={i}>
                {r.pos ? "+" : "−"} {r.t}
              </li>
            ))}
          </ul>
        )}
        {decision.rules.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Rule</th>
                <th>Result</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {decision.rules.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.res === "p" ? "Pass" : r.res === "f" ? "Fail" : "Warn"}</td>
                  <td>{r.val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card>
        <h2>Consent records</h2>
        <table>
          <thead>
            <tr>
              <th>Kind</th>
              <th>Captured at</th>
              <th>Terms version</th>
            </tr>
          </thead>
          <tbody>
            {data.consents.map((c, i) => (
              <tr key={i}>
                <td>{c.kind}</td>
                <td>{c.capturedAt}</td>
                <td>{c.termsVersion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}
