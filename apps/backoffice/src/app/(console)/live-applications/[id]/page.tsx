"use client"

import { Badge, Button, Card, Checkbox, Input, NativeSelect, NativeSelectOption, Textarea, useToast, PageHeader } from "@aim-ready/ui"
import { formatPeso, fromCentavos, toCentavos } from "@aim-ready/core"
import { INFO_REQUEST_ITEMS, OVERRIDE_REASON_CODES, type StaffApplicationDetail } from "@aim-ready/contracts"
import { useParams } from "next/navigation"
import * as React from "react"

import { useSessionRole } from "@/mock"
import { DECLINE_CODES } from "@/mock/constants"
import { getSessionToken } from "@/mock/session"
import { decodeSessionToken } from "@/lib/decode-session-token"
import {
  decideApplication,
  getApplication,
  recommendApplication,
  requestInfo,
  resolveInfo,
  returnToOfficer,
} from "@/mock/actions/applications"

const INFO_REQUEST_ITEM_LABELS = new Map<string, string>(INFO_REQUEST_ITEMS)

function SlaLine({ hours }: { hours: number | null }) {
  if (hours === null) return null
  if (hours < 0) return <p>SLA: <Badge variant="bad">{hours}h (breached)</Badge></p>
  if (hours <= 2) return <p>SLA: <Badge variant="warn">{hours}h left</Badge></p>
  return <p>SLA: {hours}h left</p>
}

function currentSub(): string | null {
  const token = getSessionToken()
  if (!token) return null
  return decodeSessionToken(token)?.sub ?? null
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
 * Real application detail from apps/api - decision summary, consents, the
 * officer's recommend action, the approver's approve/decline/return
 * actions, and the AI-recommendation/final-decision distinction
 * (decisioning-recommendation-and-overrides' own addition, replacing
 * staff-decisioning-actions' temporary "approver decides Review directly"
 * simplification).
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
  const [recDecision, setRecDecision] = React.useState<"approve" | "counter" | "decline">("approve")
  const [recAmount, setRecAmount] = React.useState("")
  const [recTenor, setRecTenor] = React.useState("")
  const [recReasonCode, setRecReasonCode] = React.useState("")
  const [recNote, setRecNote] = React.useState("")

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
      if (res.ok) {
        setData(res.data)
        setRecAmount(String(fromCentavos(res.data.aiRecommendation?.amount ?? res.data.amount)))
        setRecTenor(String(res.data.tenor))
      } else {
        setError(res.error)
      }
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
    if (data?.recommendation?.by === currentSub()) {
      toast("You recommended this case. A different approver must decide it.", "bad")
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

  async function returnCase() {
    setSubmitting(true)
    try {
      const res = await returnToOfficer(params.id)
      if (!res.ok) {
        toast(res.error, "bad")
        return
      }
      toast("Returned to the officer for more analysis.")
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  async function sendRecommendation() {
    const amountPesos = Number(recAmount)
    if (recDecision !== "decline" && !(amountPesos > 0)) {
      toast("Enter an amount.", "bad")
      return
    }
    const tenorMonths = Number(recTenor)
    if (recDecision !== "decline" && !(tenorMonths > 0)) {
      toast("Enter a tenor.", "bad")
      return
    }
    const ai = data?.aiRecommendation
    const flip = recDecision === "decline"
    const differs = ai != null && (flip || toCentavos(amountPesos) !== ai.amount || tenorMonths !== ai.tenor)
    if (differs && !recReasonCode) {
      toast("This differs from the AI recommendation. Choose a reason code.", "bad")
      return
    }
    setSubmitting(true)
    try {
      const res = await recommendApplication(params.id, {
        decision: recDecision,
        amount: recDecision === "decline" ? null : toCentavos(amountPesos),
        tenor: tenorMonths || 0,
        reasonCode: recReasonCode || undefined,
        note: recNote || undefined,
      })
      if (!res.ok) {
        toast(res.error, "bad")
        return
      }
      toast("Recommendation sent to the approver.")
      setRecReasonCode("")
      setRecNote("")
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
  const sub = currentSub()
  const canRecommend = role === "officer" && data.stage === "Review" && data.assigneeId === sub
  const canDecide = role === "approver" && data.stage === "Approval" && data.recommendation !== null
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
              <Button variant="ghost" disabled={submitting} onClick={() => returnCase()}>
                Return to officer
              </Button>
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
      {canRecommend && (
        <Card>
          <h2>Recommend a decision</h2>
          {data.aiRecommendation && (
            <p>
              AI recommendation: approve {formatPeso(data.aiRecommendation.amount)} / {data.aiRecommendation.tenor} months
            </p>
          )}
          <NativeSelect aria-label="Recommendation" value={recDecision} onChange={(e) => setRecDecision(e.target.value as typeof recDecision)}>
            <NativeSelectOption value="approve">Approve</NativeSelectOption>
            <NativeSelectOption value="counter">Counter-offer</NativeSelectOption>
            <NativeSelectOption value="decline">Decline</NativeSelectOption>
          </NativeSelect>
          {recDecision !== "decline" && (
            <>
              <Input
                aria-label="Recommended amount"
                type="number"
                value={recAmount}
                onChange={(e) => setRecAmount(e.target.value)}
              />
              <Input
                aria-label="Recommended tenor"
                type="number"
                value={recTenor}
                onChange={(e) => setRecTenor(e.target.value)}
              />
            </>
          )}
          <NativeSelect aria-label="Reason code" value={recReasonCode} onChange={(e) => setRecReasonCode(e.target.value)}>
            <NativeSelectOption value="">Reason (if it differs from the AI)…</NativeSelectOption>
            {OVERRIDE_REASON_CODES.map((c) => (
              <NativeSelectOption key={c} value={c}>
                {c}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Textarea
            aria-label="Note"
            placeholder="Note for the approver (optional)…"
            value={recNote}
            onChange={(e) => setRecNote(e.target.value)}
          />
          <Button disabled={submitting} onClick={() => sendRecommendation()}>
            Send recommendation
          </Button>
        </Card>
      )}
      {data.recommendation && (
        <Card>
          <h2>Officer recommendation</h2>
          <p>
            {data.recommendation.decision === "decline"
              ? "Decline"
              : `${data.recommendation.decision === "counter" ? "Counter-offer" : "Approve"} ${formatPeso(data.recommendation.amount)} / ${data.recommendation.tenor} months`}
            {data.recommendation.overrideLevel && (
              <> · <Badge variant={data.recommendation.overrideLevel === "above" ? "warn" : undefined}>override ({data.recommendation.overrideLevel} threshold)</Badge></>
            )}
          </p>
          {data.recommendation.reasonCode && <p>Reason: {data.recommendation.reasonCode}</p>}
          {data.recommendation.note && <p>Note: {data.recommendation.note}</p>}
        </Card>
      )}
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
      {data.aiRecommendation && !data.decidedAt && (
        <Card>
          <h2>AI recommendation</h2>
          <p>
            Approve {formatPeso(data.aiRecommendation.amount)} / {data.aiRecommendation.tenor} months
          </p>
        </Card>
      )}
      {data.decidedAt && (
        <Card>
          <h2>Final decision</h2>
          <p>
            {data.stage === "Offer" ? "Approved" : "Declined"} by {data.reviewerId} on {data.decidedAt}
            {data.declineReasonCode && <> · {data.declineReasonCode}</>}
          </p>
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
