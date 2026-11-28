"use client"

import { Badge, Button, Card, NativeSelect, NativeSelectOption, PageHeader, useToast } from "@aim-ready/ui"
import { formatPeso } from "@aim-ready/core"
import type { StaffApplicationDetail } from "@aim-ready/contracts"
import { useParams } from "next/navigation"
import * as React from "react"

import { useSessionRole } from "@/mock"
import { DECLINE_CODES } from "@/mock/constants"
import { decideApplication, getApplication } from "@/mock/actions/applications"

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
 * Real application detail from apps/api - decision summary, consents, and
 * (for an approver, while the application is in Review) an Approve/Decline
 * action - staff-decisioning-actions' own addition to staff-application-
 * review's originally read-only screen.
 */
export default function LiveApplicationDetailPage() {
  const params = useParams<{ id: string }>()
  const role = useSessionRole()
  const toast = useToast()
  const [data, setData] = React.useState<StaffApplicationDetail | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [reasonCode, setReasonCode] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const load = React.useCallback(async () => {
    const res = await getApplication(params.id)
    if (res.ok) {
      setData(res.data)
      setError(null)
    } else {
      setError(res.error)
    }
  }, [params.id])

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

  async function decide(decision: "approve" | "decline") {
    if (decision === "decline" && !reasonCode) {
      toast("Choose a reason before declining.", "bad")
      return
    }
    setSubmitting(true)
    try {
      const res = await decideApplication(params.id, { decision, reasonCode: reasonCode || undefined })
      if (!res.ok) {
        toast(res.error, "bad")
        return
      }
      setReasonCode("")
      if (res.data.ok && res.data.stage === "Offer") {
        toast(`Approved — monthly repayment ${formatPeso(res.data.monthlyPayment)}.`)
      } else {
        toast("Application declined.")
      }
      // Keep the actions disabled (`submitting`) until this reload lands,
      // so the stage-gated Approve/Decline controls can't be clicked again
      // on stale data before they know the application was already decided.
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  if (error) return <p role="alert">{error}</p>
  if (!data) return <p>Loading…</p>

  const decision = data.decision as Decision
  const canDecide = role === "approver" && data.stage === "Review"

  return (
    <>
      <PageHeader
        eyebrow={data.productCode}
        title={`Application ${data.id}`}
        description={`${formatPeso(data.amount)} over ${data.tenor} months — ${data.purpose}`}
        actions={
          canDecide ? (
            <>
              <NativeSelect aria-label="Decline reason" value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
                <NativeSelectOption value="">Decline reason…</NativeSelectOption>
                {DECLINE_CODES.map((c) => (
                  <NativeSelectOption key={c} value={c}>
                    {c}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <Button variant="ghost" disabled={submitting} onClick={() => decide("decline")}>
                Decline
              </Button>
              <Button disabled={submitting} onClick={() => decide("approve")}>
                Approve
              </Button>
            </>
          ) : undefined
        }
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
