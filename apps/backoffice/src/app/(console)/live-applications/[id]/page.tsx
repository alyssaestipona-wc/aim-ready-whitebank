"use client"

import { Badge, Button, Card, Checkbox, NativeSelect, NativeSelectOption, Textarea, useToast, PageHeader } from "@aim-ready/ui"
import { formatPeso } from "@aim-ready/core"
import { INFO_REQUEST_ITEMS, type StaffApplicationDetail } from "@aim-ready/contracts"
import { useParams } from "next/navigation"
import * as React from "react"

import { useSessionRole } from "@/mock"
import { DECLINE_CODES } from "@/mock/constants"
import { decideApplication, getApplication, requestInfo, resolveInfo } from "@/mock/actions/applications"

const INFO_REQUEST_ITEM_LABELS = new Map<string, string>(INFO_REQUEST_ITEMS)

function SlaLine({ hours }: { hours: number | null }) {
  if (hours === null) return null
  if (hours < 0) return <p>SLA: <Badge variant="bad">{hours}h (breached)</Badge></p>
  if (hours <= 2) return <p>SLA: <Badge variant="warn">{hours}h left</Badge></p>
  return <p>SLA: {hours}h left</p>
}

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
  const [requestItems, setRequestItems] = React.useState<string[]>([])
  const [requestMessage, setRequestMessage] = React.useState("")

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

  async function sendRequestInfo() {
    if (requestItems.length === 0) {
      toast("Choose at least one item to request.", "bad")
      return
    }
    if (!requestMessage.trim()) {
      toast("Write a message to the borrower.", "bad")
      return
    }
    setSubmitting(true)
    try {
      const res = await requestInfo(params.id, { items: requestItems, message: requestMessage })
      if (!res.ok) {
        toast(res.error, "bad")
        return
      }
      setRequestItems([])
      setRequestMessage("")
      toast("Information requested from the borrower.")
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  async function markResolved() {
    setSubmitting(true)
    try {
      const res = await resolveInfo(params.id)
      if (!res.ok) {
        toast(res.error, "bad")
        return
      }
      toast("Marked resolved — back in Review.")
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  if (error) return <p role="alert">{error}</p>
  if (!data) return <p>Loading…</p>

  const decision = data.decision as Decision
  const canDecide = role === "approver" && data.stage === "Review"
  const canRequestInfo = role === "officer" && data.stage === "Review"
  const canResolveInfo = role === "officer" && data.stage === "Info requested"

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
          ) : canResolveInfo ? (
            <Button disabled={submitting} onClick={() => markResolved()}>
              Mark resolved
            </Button>
          ) : undefined
        }
      />
      <SlaLine hours={data.slaHoursLeft} />
      {canRequestInfo && (
        <Card>
          <h2>Request information</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {INFO_REQUEST_ITEMS.map(([id, label]) => (
              <li key={id}>
                <label>
                  <Checkbox
                    checked={requestItems.includes(id)}
                    onCheckedChange={(checked) =>
                      setRequestItems((prev) =>
                        checked ? [...prev, id] : prev.filter((x) => x !== id),
                      )
                    }
                  />{" "}
                  {label}
                </label>
              </li>
            ))}
          </ul>
          <Textarea
            aria-label="Message to borrower"
            placeholder="Message to the borrower…"
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
          />
          <Button disabled={submitting} onClick={() => sendRequestInfo()}>
            Send request
          </Button>
        </Card>
      )}
      {data.stage === "Info requested" && (
        <Card>
          <h2>Information requested</h2>
          {data.infoRequestMessage && <p>{data.infoRequestMessage}</p>}
          {data.infoRequestItems && (
            <ul>
              {data.infoRequestItems.map((id) => (
                <li key={id}>{INFO_REQUEST_ITEM_LABELS.get(id) ?? id}</li>
              ))}
            </ul>
          )}
        </Card>
      )}
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
