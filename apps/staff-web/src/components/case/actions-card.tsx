"use client"

import { Button, Checkbox, ConfirmDialog, Input, Label, MoneyInput, NativeSelect, NativeSelectOption, Textarea, useToast } from "@aim-ready/ui"
import { fromCentavos, toCentavos } from "@aim-ready/core"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"

import {
  DECLINE_CODES,
  INFO_ITEMS,
  OVERRIDE_THRESHOLD,
  REASON_CODES,
  USERS,
  aiRecOf,
  approve,
  baseRole,
  canCheckBooking,
  checkBooking,
  confirmDecline,
  declineCase,
  generateDocs,
  isReadOnly,
  me,
  overrideLevel,
  peso,
  pickCase,
  products,
  recommend,
  recommendedMonthly,
  requestInfo,
  resendSignature,
  returnToOfficer,
  routeToCommittee,
  startApproval,
  termsOf,
  withdrawCase,
  type ActionResult,
  type Application,
  type RecommendInput,
  type RoleKey,
  type StaffState,
} from "@/mock"

import { CoreLabel, MessageChip, Note, Rows, Section } from "../bits"
import { DisclosureRows } from "./disclosure"

type Dialog = null | "req-info" | "recommend" | "approve" | "committee" | "decline" | "withdraw" | "disclosure" | "check" | "confirm-decline"

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 grid gap-[5px]">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

/** A button that is disabled with a "Read-only access" hint for compliance. */
function ActButton({ ro, allowRO, ...props }: React.ComponentProps<typeof Button> & { ro: boolean; allowRO?: boolean }) {
  const blocked = ro && !allowRO
  return <Button {...props} disabled={props.disabled || blocked} title={blocked ? "Read-only access" : props.title} />
}

/** The stage- and role-driven "Next action" card, with its dialogs. */
export function ActionsCard({ s, a, role }: { s: StaffState; a: Application; role: RoleKey }) {
  const toast = useToast()
  const router = useRouter()
  const [dialog, setDialog] = React.useState<Dialog>(null)
  const r = baseRole(role)
  const ro = isReadOnly(role)

  function report(res: ActionResult): string | void {
    if (!res.ok) {
      if (res.asToast) {
        toast(res.error, res.tone)
        return
      }
      return res.error
    }
    if (res.toast) toast(res.toast, res.tone)
    if (res.go) router.push(res.go)
  }

  const pre = ["Draft", "Review", "Info requested", "Approval", "Offer", "Documentation"].includes(a.stage)
  const tools = pre && (r === "officer" || r === "branch") ? [<ActButton key="w" ro={ro} size="sm" onClick={() => setDialog("withdraw")}>Withdraw</ActButton>] : []

  let body: React.ReactNode
  if (a.stage === "Review" && (r === "officer" || ro)) {
    if (!a.owner && r === "officer") {
      body = (
        <>
          <p className="mt-0 mb-3 text-muted-foreground">Unassigned. Pick it to work it.</p>
          <ActButton ro={ro} variant="primary" onClick={async () => report(await pickCase(a.id))}>
            Pick this case
          </ActButton>
        </>
      )
    } else if (a.owner && a.owner !== me(role).name && r === "officer") {
      body = <p className="m-0 text-muted-foreground">Owned by {a.owner}.</p>
    } else {
      body = (
        <>
          <p className="mt-0 mb-3 text-muted-foreground">Review the evidence, then ask the borrower for more or send a recommendation to an approver.</p>
          <div className="flex flex-wrap gap-2">
            <ActButton ro={ro} onClick={() => setDialog("req-info")}>Request information</ActButton>
            <ActButton ro={ro} variant="primary" onClick={() => setDialog("recommend")}>Recommend decision</ActButton>
          </div>
        </>
      )
    }
  } else if (a.stage === "Info requested") {
    body = (
      <Note tone="info" flat>
        <b>Waiting for the borrower.</b> Requested: {a.infoReq || "documents"}. The request is in their online inbox and status tracker; the case returns to review when they respond.
      </Note>
    )
  } else if (a.stage === "Approval" && (r === "approver" || ro) && a.recommendation) {
    const rc = a.recommendation
    const ai = a.aiRec
    body = (
      <>
        <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <MessageChip className="block">
            <span className="text-xs text-muted-foreground">AI recommends</span>
            <br />
            <b>{ai ? `${ai.decision === "approve" ? "Approve " : "Decline "}${peso(ai.amount)}` : "—"}</b>
          </MessageChip>
          <MessageChip className="block">
            <span className="text-xs text-muted-foreground">{rc.by} recommends</span>
            <br />
            <b>{rc.decision === "decline" ? "Decline" : `${rc.decision === "counter" ? "Counter-offer " : "Approve "}${peso(rc.amount)}`}</b>
          </MessageChip>
        </div>
        {rc.reason && (
          <p className="m-0 text-sm">
            <span className="text-muted-foreground">Override reason:</span> {rc.reason}
          </p>
        )}
        <p className="mt-1.5 mb-0 text-sm text-muted-foreground">“{rc.note || ""}”</p>
        {rc.reason &&
          (rc.overLevel === "above" ? (
            <p className="mt-2.5 mb-0">
              <span className="mr-1 inline-flex rounded-full border border-g-300 bg-g-100 px-2 py-0.5 text-xs font-medium text-ink-3">Override above threshold</span> Your approval is the required second sign-off.
            </p>
          ) : (
            <p className="mt-2.5 mb-0">
              <span className="mr-1 inline-flex rounded-full border border-border bg-paper px-2 py-0.5 text-xs font-medium text-ink-4">Override below threshold</span> Reason code recorded; standard approval.
            </p>
          ))}
        <p className="my-3 text-[12.5px] text-muted-foreground">
          Your authority: {peso(USERS.approver.limit ?? 0)}, grades A–C. {rc.by} cannot give this approval.
        </p>
        <div className="flex flex-wrap gap-2">
          <ActButton
            ro={ro}
            variant="primary"
            onClick={async () => {
              const res = await startApproval(a.id)
              if (!res.ok) return report(res)
              if (res.next === "committee") setDialog("committee")
              else if (res.next === "confirm-decline") setDialog("confirm-decline")
              else if (res.next === "confirm") setDialog("approve")
              else report(res)
            }}
          >
            {rc.decision === "decline" ? "Confirm decline" : "Approve"}
          </ActButton>
          <ActButton ro={ro} onClick={async () => report(await returnToOfficer(a.id))}>
            Return to officer
          </ActButton>
          {rc.decision !== "decline" && (
            <ActButton ro={ro} variant="danger" onClick={() => setDialog("decline")}>
              Decline
            </ActButton>
          )}
        </div>
      </>
    )
  } else if (a.stage === "Committee") {
    body = (
      <Note flat>
        <b>With credit committee.</b> Above individual authority, so the case was routed to committee under the approval matrix.
      </Note>
    )
  } else if (a.stage === "Pending checker" && a.booking && (role === "opssup" || ro)) {
    body = (
      <>
        <MessageChip className="mb-3">
          Maker <b>{a.booking.maker}</b>
          <span className="mono text-muted-foreground">{a.booking.key}</span>
        </MessageChip>
        <ActButton
          ro={ro}
          variant="primary"
          onClick={async () => {
            const res = await canCheckBooking(a.id)
            if (res.ok) setDialog("check")
            else report(res)
          }}
        >
          Approve booking as checker
        </ActButton>
      </>
    )
  } else if (a.stage === "Pending checker" && a.booking) {
    body = (
      <Note tone="info" flat>
        <b>Waiting for checker.</b> Prepared by {a.booking.maker}. A loan operations supervisor approves before core creates the loan.
      </Note>
    )
  } else if (a.stage === "Booking" && (r === "ops" || ro)) {
    const failed = a.booking?.status === "failed"
    body = (
      <>
        <p className="mt-0 mb-3 text-muted-foreground">{failed ? "The last booking attempt failed in core." : "Approved and signed. Run the pre-booking checklist to book in core."}</p>
        <Button asChild variant="primary">
          <Link href={failed ? "/exceptions" : `/booking?case=${a.id}`}>{failed ? "Open booking exceptions" : "Open booking checklist"}</Link>
        </Button>
      </>
    )
  } else if (a.stage === "Documentation" && (r === "ops" || ro)) {
    body = (
      <>
        <p className="mt-0 mb-3 text-muted-foreground">{a.borrowerPending === "sign" ? "Sent for e-signature. Waiting for the borrower." : "The borrower accepted the offer. Generate the closing documents and send them for e-signature."}</p>
        <div className="flex flex-wrap gap-2">
          {a.borrowerPending === "sign" ? (
            <ActButton ro={ro} onClick={async () => report(await resendSignature(a.id))}>
              Resend signature request
            </ActButton>
          ) : (
            <ActButton ro={ro} variant="primary" onClick={async () => report(await generateDocs(a.id))}>
              Generate documents and send for e-signature
            </ActButton>
          )}
          <ActButton ro={ro} allowRO onClick={() => setDialog("disclosure")}>
            Preview disclosure
          </ActButton>
        </div>
      </>
    )
  } else if (a.stage === "Disbursed" && a.offer) {
    const tm = termsOf(s, a)
    body = (
      <>
        <Rows rows={[["Core loan account", <span key="l" className="mono">{a.loanNo}</span>], ["Disbursed", peso(a.offer.amount)], ["Monthly", peso(tm.monthlyPayment, 2)], ["Paid to", a.disbTo || ""]]} />
        <p className="mt-3 mb-0">
          <CoreLabel />
        </p>
      </>
    )
  } else if (a.stage === "Declined") {
    body = (
      <p className="m-0 text-muted-foreground">
        Closed. Borrower notified with plain-language reasons.
        {a.aml && (
          <>
            {" "}AML escalation: <b className="font-semibold text-strong">{a.aml}</b>.
          </>
        )}
      </p>
    )
  } else if (a.stage === "Offer" && a.offer) {
    body = (
      <>
        <Note tone="info" className="mb-3">
          <b>Offer sent to the borrower.</b> {peso(a.offer.amount)} over {a.offer.tenor} months. Waiting for the borrower to accept online; it expires after 5 days.
        </Note>
        <ActButton ro={ro} allowRO onClick={() => setDialog("disclosure")}>
          Preview disclosure
        </ActButton>
      </>
    )
  } else if (a.stage === "Draft") {
    body = (
      <>
        <p className="mt-0 mb-3 text-muted-foreground">Draft started at {a.branch || "the branch"}. Resume it to finish documents and consent, then submit.</p>
        {(r === "branch" || r === "officer") && (
          <Button asChild variant="primary">
            <Link href={`/applications/new?draft=${a.id}`}>Resume application</Link>
          </Button>
        )}
      </>
    )
  } else if (a.stage === "Withdrawn") {
    body = <p className="m-0 text-muted-foreground">Closed: {a.withdrawReason || "withdrawn or expired"}.</p>
  } else {
    body = <p className="m-0 text-muted-foreground">No action for your role at this stage.</p>
  }

  return (
    <>
      <Section title="Next action">
        {body}
        {tools.length > 0 && <div className="mt-3.5 flex flex-wrap gap-2 border-t border-border-soft pt-3">{tools}</div>}
      </Section>
      {dialog === "req-info" && <RequestInfoDialog a={a} onClose={() => setDialog(null)} report={report} />}
      {dialog === "recommend" && <RecommendDialog s={s} a={a} onClose={() => setDialog(null)} report={report} />}
      {dialog === "approve" && a.recommendation && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          title={`Approve ${peso(a.recommendation.amount)} over ${a.recommendation.tenor} months?`}
          description={`Monthly repayment ${peso(recommendedMonthly(a), 2)} at grade ${a.grade}, calculated by core banking (simulated). The ${a.recommendation.decision === "counter" ? "counter-offer" : "offer"} goes to ${a.name} online.`}
          okLabel="Approve and send offer"
          onConfirm={async () => report(await approve(a.id))}
        />
      )}
      {dialog === "confirm-decline" && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          title="Confirm the recommended decline?"
          description="The borrower sees a plain-language decline with reason codes and no internal score."
          okLabel="Confirm decline"
          danger
          onConfirm={async () => report(await confirmDecline(a.id))}
        />
      )}
      {dialog === "committee" && a.recommendation && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          title="Above your authority"
          description={`${peso(a.recommendation.amount)} at grade ${a.grade} is outside your limit of ${peso(USERS.approver.limit ?? 0)}, grades A–C. Route it to credit committee instead.`}
          okLabel="Route to committee"
          onConfirm={async () => report(await routeToCommittee(a.id))}
        />
      )}
      {dialog === "decline" && <ReasonDialog title="Decline this application?" description="The borrower sees a plain-language decline with reason codes and no internal score." label="Reason code" id="dr" options={DECLINE_CODES} ok="Decline" onClose={() => setDialog(null)} onConfirm={async (v) => report(await declineCase(a.id, v))} />}
      {dialog === "withdraw" && <ReasonDialog title="Withdraw this application?" description="The borrower is notified and the case closes. It cannot be reopened." label="Reason" id="wd" options={["Customer request", "Duplicate application", "Customer unreachable"]} ok="Withdraw" onClose={() => setDialog(null)} onConfirm={async (v) => report(await withdrawCase(a.id, v))} />}
      {dialog === "disclosure" && (
        <ConfirmDialog open onOpenChange={(o) => !o && setDialog(null)} title="Disclosure statement (Truth in Lending)" description="Generated from the approved terms. The borrower acknowledges it before signing." okLabel="Close" noCancel onConfirm={() => undefined}>
          <DisclosureRows terms={termsOf(s, a)} />
          <p className="mt-3 mb-0 text-[12.5px] text-muted-foreground">Every figure is calculated by WhiteBank core banking (simulated in this prototype).</p>
        </ConfirmDialog>
      )}
      {dialog === "check" && a.offer && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          title={`Approve booking for ${a.name}?`}
          description={`Creates the loan account in core for ${peso(a.offer.amount)} over ${a.offer.tenor} months and releases the funds.`}
          okLabel="Approve and book"
          onConfirm={async () => report(await checkBooking(a.id))}
        />
      )}
    </>
  )
}

function ReasonDialog({ title, description, label, id, options, ok, onClose, onConfirm }: { title: string; description: string; label: string; id: string; options: readonly string[]; ok: string; onClose: () => void; onConfirm: (v: string) => Promise<string | void> }) {
  const [v, setV] = React.useState(options[0] ?? "")
  return (
    <ConfirmDialog open onOpenChange={(o) => !o && onClose()} title={title} description={description} okLabel={ok} danger onConfirm={() => onConfirm(v)}>
      <Field id={id} label={label}>
        <NativeSelect id={id} value={v} onChange={(e) => setV(e.target.value)}>
          {options.map((o) => (
            <NativeSelectOption key={o}>{o}</NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    </ConfirmDialog>
  )
}

function RequestInfoDialog({ a, onClose, report }: { a: Application; onClose: () => void; report: (r: ActionResult) => string | void }) {
  const [picked, setPicked] = React.useState<Record<string, boolean>>({ ri1: true })
  const [msg, setMsg] = React.useState(`Hi ${a.name.split(" ")[0]}, to finish reviewing your loan please upload your last 3 months of bank statements.`)
  const [due, setDue] = React.useState("In 3 days (30 Nov)")
  const [tried, setTried] = React.useState(false)
  const noneBad = tried && !INFO_ITEMS.some(([k]) => picked[k])
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Request information from the borrower"
      description="The request appears in the borrower’s online inbox and on their status tracker."
      okLabel="Send request"
      onConfirm={async () => {
        setTried(true)
        return report(await requestInfo(a.id, { items: INFO_ITEMS.filter(([k]) => picked[k]).map(([, , v]) => v), message: msg, due }))
      }}
    >
      {INFO_ITEMS.map(([k, label]) => (
        <div key={k} className="flex items-start gap-2.5 py-1.5 text-sm">
          <Checkbox id={k} checked={!!picked[k]} aria-invalid={noneBad || undefined} onCheckedChange={(c) => setPicked((p) => ({ ...p, [k]: c === true }))} />
          <Label htmlFor={k} className="font-normal">
            {label}
          </Label>
        </div>
      ))}
      <div className="mt-2.5">
        <Field id="rimsg" label="Message the borrower sees">
          <Textarea id="rimsg" value={msg} onChange={(e) => setMsg(e.target.value)} />
        </Field>
      </div>
      <Field id="ridue" label="Due">
        <NativeSelect id="ridue" value={due} onChange={(e) => setDue(e.target.value)}>
          <NativeSelectOption>In 3 days (30 Nov)</NativeSelectOption>
          <NativeSelectOption>In 5 days (2 Dec)</NativeSelectOption>
        </NativeSelect>
      </Field>
    </ConfirmDialog>
  )
}

function RecommendDialog({ s, a, onClose, report }: { s: StaffState; a: Application; onClose: () => void; report: (r: ActionResult) => string | void }) {
  const ai = aiRecOf(a)
  const start = a.recDefault != null ? a.recDefault : ai.amount
  const [decision, setDecision] = React.useState<RecommendInput["decision"]>(start === a.amount ? "approve" : "counter")
  const [amount, setAmount] = React.useState<number | null>(fromCentavos(start))
  const [tenor, setTenor] = React.useState(String(a.tenor))
  const [reason, setReason] = React.useState("")
  const [note, setNote] = React.useState(a.recNote || `Recommend ${peso(ai.amount)} in line with the AI recommendation.`)
  const amtC = amount == null ? Number.NaN : toCentavos(amount)
  const ov = overrideLevel(a, decision, amtC, Number(tenor))
  const [tried, setTried] = React.useState(false)
  const P = products(s)[a.product]
  const amountBad = tried && decision !== "decline" && !(amtC >= P.min && amtC <= P.max)
  const tenorBad = tried && decision !== "decline" && !(Number(tenor) >= P.tmin && Number(tenor) <= P.tmax)
  const reasonBad = tried && ov.differs && !reason
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Recommend a decision"
      description={`AI recommends ${ai.decision} ${peso(ai.amount)} over ${ai.tenor} months. Anything different needs a reason code; ${peso(OVERRIDE_THRESHOLD)} or more away also needs a second approver.`}
      okLabel="Send to approver"
      onConfirm={async () => {
        setTried(true)
        return report(await recommend(a.id, { decision, amount: amount == null ? null : amtC, tenor: Number(tenor), reason, note }))
      }}
    >
      <Field id="rd" label="Recommendation">
        <NativeSelect
          id="rd"
          value={decision}
          onChange={(e) => {
            const d = e.target.value as RecommendInput["decision"]
            setDecision(d)
            if (d === "approve") {
              setAmount(fromCentavos(a.amount))
              setTenor(String(a.tenor))
            }
          }}
        >
          <NativeSelectOption value="approve">Approve as requested</NativeSelectOption>
          <NativeSelectOption value="counter">Counter-offer</NativeSelectOption>
          <NativeSelectOption value="decline">Decline</NativeSelectOption>
        </NativeSelect>
      </Field>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-3">
        <Field id="ra" label="Amount">
          <MoneyInput id="ra" value={amount} onValueChange={setAmount} aria-invalid={amountBad || undefined} />
        </Field>
        <Field id="rt" label="Tenor (months)">
          <Input id="rt" type="number" value={tenor} onChange={(e) => setTenor(e.target.value)} aria-invalid={tenorBad || undefined} />
        </Field>
      </div>
      {!ov.differs ? (
        <Note tone="ok">
          <b>Matches the AI recommendation.</b> No reason code needed.
        </Note>
      ) : ov.level === "above" ? (
        <Note tone="warn">
          <b>
            Override above threshold{ov.flip ? "" : ` (${peso(ov.gap)} from AI)`}.
          </b>{" "}
          Needs a reason code and a second sign-off from an approver.
        </Note>
      ) : (
        <Note>
          <b>Override below threshold ({peso(ov.gap)} from AI).</b> Reason code recorded; standard approval.
        </Note>
      )}
      <Field id="rr" label="Reason code" hint="Required when different from the AI recommendation.">
        <NativeSelect id="rr" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={reasonBad || undefined}>
          <NativeSelectOption value="">Select a reason</NativeSelectOption>
          {REASON_CODES.map((c) => (
            <NativeSelectOption key={c}>{c}</NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field id="rn" label="Rationale for the approver">
        <Textarea id="rn" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </ConfirmDialog>
  )
}
