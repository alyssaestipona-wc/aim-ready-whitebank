"use client"

/**
 * Case-handling actions, ported from the prototype's work handlers.
 * SIMULATED ENFORCEMENT: segregation of duties, approval authority and
 * maker-checker are checked here, on the client, until `apps/api` enforces
 * them on the server.
 */
import { simulateDecision, type Centavos, type DecisionInput, type DecisionRecord } from "@aim-ready/core"

import { CUSTOMERS, OVERRIDE_THRESHOLD, USERS } from "../constants"
import { findApp, log, me, now, peso, policyOf, products, termsOf } from "../engine"
import { MODEL_VERSION } from "../seed"
import { getSessionRole } from "../session"
import { getState, update } from "../store"
import type { Application, AssistedDraft, IntakeDraft, ProductCode, StaffState } from "../types"
import { fail, ok, type ActionResult } from "./result"

function withCase(id: string, fn: (s: StaffState, a: Application) => ActionResult): ActionResult {
  return update((s) => {
    const a = findApp(s, id)
    if (!a) return fail("That case no longer exists.", true)
    return fn(s, a)
  })
}

const role = () => getSessionRole()

/** Officer takes an unassigned case into their queue. */
export async function pickCase(id: string): Promise<ActionResult> {
  return withCase(id, (s, a) => {
    a.owner = me(role()).name
    log(s, role(), a, "Picked from the unassigned queue")
    return ok(`${a.name} is now in your queue`)
  })
}

/** Records that the user revealed the masked government ID. */
export async function revealGovId(id: string): Promise<ActionResult> {
  return withCase(id, (s, a) => {
    log(s, role(), a, "Revealed masked government ID")
    return ok()
  })
}

export const INFO_ITEMS = [
  ["ri1", "Bank statements, last 3 months", "Bank statements, 3 months"],
  ["ri2", "Certificate of employment", "Certificate of employment"],
  ["ri3", "Latest income tax return", "Income tax return"],
] as const

export async function requestInfo(id: string, input: { items: string[]; message: string; due: string }): Promise<ActionResult> {
  if (!input.items.length) return fail("Pick at least one item to request.")
  return withCase(id, (s, a) => {
    a.infoReq = input.items.join(", ")
    a.infoMsg = input.message
    a.infoDue = input.due
    a.stage = "Info requested"
    a.sla = 72
    a.borrowerPending = "docs"
    for (const it of input.items) if (!a.docs.some((d) => d[0] === it)) a.docs.push([it, "Missing"])
    log(s, role(), a, `Requested from borrower: ${a.infoReq} (due ${a.infoDue})`)
    return ok("Request sent to the borrower’s online inbox")
  })
}

export type RecommendInput = { decision: "approve" | "counter" | "decline"; amount: Centavos | null; tenor: number; reason: string; note: string }

/** The AI recommendation shown to the officer, defaulting to the request. */
export function aiRecOf(a: Application) {
  return a.aiRec || { decision: "approve" as const, amount: a.amount, tenor: a.tenor }
}

/** How a draft recommendation compares with the AI's, for the live hint. */
export function overrideLevel(a: Application, decision: RecommendInput["decision"], amount: number, tenor: number): { differs: boolean; flip: boolean; gap: number; level: "above" | "below" | null } {
  const ai = aiRecOf(a)
  const flip = (decision === "decline") !== (ai.decision === "decline")
  const differs = flip || (decision !== "decline" && (amount !== ai.amount || tenor !== ai.tenor))
  const gap = Math.abs(amount - ai.amount)
  return { differs, flip, gap, level: differs ? (flip || gap >= OVERRIDE_THRESHOLD ? "above" : "below") : null }
}

export async function recommend(id: string, input: RecommendInput): Promise<ActionResult> {
  return withCase(id, (s, a) => {
    const P = products(s)[a.product]
    let d = input.decision
    let amt = input.amount ?? Number.NaN
    let ten = input.tenor
    if (d !== "decline" && !(amt >= P.min && amt <= P.max)) return fail(`Amount must be between ${peso(P.min)} and ${peso(P.max)}.`)
    if (d !== "decline" && !(ten >= P.tmin && ten <= P.tmax)) return fail(`Tenor must be ${P.tmin} to ${P.tmax} months.`)
    if (d === "approve") {
      amt = a.amount
      ten = a.tenor
    } else if (d === "counter" && amt === a.amount && ten === a.tenor) d = "approve"
    const ov = overrideLevel(a, d, amt, ten)
    if (ov.differs && !input.reason) return fail("This differs from the AI recommendation. Choose a reason code.")
    a.recommendation = { by: me(role()).name, decision: d, amount: amt, tenor: ten, reason: ov.differs ? input.reason : null, overLevel: ov.level, note: input.note }
    a.stage = "Approval"
    a.owner = null
    a.sla = 8
    log(s, role(), a, `Recommended ${d === "decline" ? "decline" : `${d === "counter" ? "counter-offer " : "approval "}${peso(amt)} / ${ten} months`}${ov.differs ? ` · override (${ov.level} ₱50,000 threshold): ${input.reason}` : ""}`)
    return ok("Recommendation sent to Teresa Lim (approver)")
  })
}

/**
 * First step of Approve: refuses the recommender (segregation of duties),
 * confirms a recommended decline, or says whether the case is within the
 * approver's authority so the UI can ask for confirmation or committee routing.
 */
export async function startApproval(id: string): Promise<ActionResult & { next?: "confirm" | "committee" }> {
  const r = role()
  const s0 = getState()
  const a0 = findApp(s0, id)
  if (!a0 || !a0.recommendation) return fail("That case no longer exists.", true)
  const rc = a0.recommendation
  if (rc.by === me(r).name) {
    withCase(id, (s, a) => {
      log(s, r, a, "Blocked: tried to approve own recommendation (segregation of duties)")
      return ok()
    })
    return fail("You recommended this case. A different approver must decide it.", true)
  }
  if (rc.decision === "decline") {
    // The automated outcome stays as decided; the human decline is the stage.
    return withCase(id, (s, a) => {
      a.stage = "Declined"
      a.sla = null
      log(s, r, a, "Confirmed decline; borrower notified with plain-language reasons")
      return ok("Declined. Borrower notified.")
    })
  }
  const auth = USERS.approver
  if (rc.amount > (auth.limit ?? 0) || !(auth.grades ?? []).includes(a0.grade ?? "E")) return { ok: true, next: "committee" }
  return { ok: true, next: "confirm" }
}

/** Monthly repayment for the recommended terms, for the approval dialog. */
export function recommendedMonthly(a: Application): Centavos {
  const rc = a.recommendation
  if (!rc) return 0
  return termsOf(getState(), { product: a.product, amount: rc.amount, tenor: rc.tenor, grade: a.grade, offer: { amount: rc.amount, tenor: rc.tenor, grade: a.grade ?? "C" } }).monthlyPayment
}

export async function routeToCommittee(id: string): Promise<ActionResult> {
  return withCase(id, (s, a) => {
    a.stage = "Committee"
    log(s, role(), a, "Routed to credit committee: above individual authority")
    return ok()
  })
}

export async function approve(id: string): Promise<ActionResult> {
  return withCase(id, (s, a) => {
    const rc = a.recommendation
    if (!rc) return fail("Nothing to approve.", true)
    a.offer = { amount: rc.amount, tenor: rc.tenor, grade: a.grade ?? "C" }
    a.stage = "Offer"
    a.sla = null
    a.offerSent = now(s)
    log(s, role(), a, `Approved ${rc.decision === "counter" ? "counter-offer " : "offer "}${peso(rc.amount)} / ${rc.tenor} months within authority${rc.reason ? (rc.overLevel === "above" ? " (second sign-off on an override above threshold)" : " (override below threshold)") : ""}`)
    return ok("Approved. Offer sent to the borrower.")
  })
}

export async function returnToOfficer(id: string): Promise<ActionResult> {
  return withCase(id, (s, a) => {
    a.owner = a.recommendation ? a.recommendation.by : null
    a.stage = "Review"
    a.sla = 8
    log(s, role(), a, "Returned to the officer for more analysis")
    return ok(`Returned to ${a.owner || "the review queue"}`)
  })
}

export async function declineCase(id: string, reason: string): Promise<ActionResult> {
  return withCase(id, (s, a) => {
    a.stage = "Declined"
    a.sla = null
    a.declineReason = reason
    log(s, role(), a, `Declined by approver: ${reason}`)
    return ok()
  })
}

export async function withdrawCase(id: string, reason: string): Promise<ActionResult> {
  return withCase(id, (s, a) => {
    a.withdrawReason = reason.toLowerCase()
    a.stage = "Withdrawn"
    a.sla = null
    a.owner = null
    log(s, role(), a, `Withdrew application: ${reason}`)
    return ok("Application withdrawn")
  })
}

export async function generateDocs(id: string): Promise<ActionResult> {
  return withCase(id, (s, a) => {
    a.borrowerPending = "sign"
    a.docs = a.docs.filter((d) => !/agreement|Promissory/i.test(d[0])).concat([["Loan agreement", "Sent for signature"], ["Promissory note", "Sent for signature"]])
    log(s, role(), a, "Generated loan agreement and promissory note from templates (v5, v2) and sent for e-signature")
    return ok("Documents sent for e-signature")
  })
}

export async function resendSignature(id: string): Promise<ActionResult> {
  return withCase(id, (s, a) => {
    log(s, role(), a, "Resent e-signature request")
    return ok("Reminder sent to the borrower")
  })
}

/* ---------------- booking (maker-checker) ---------------- */

function randomKeySuffix(): string {
  return Math.random().toString(16).slice(2, 6)
}

/** Pre-booking checklist: [item, passed, detail]. */
export function checklist(a: Application): Array<[string, boolean, string]> {
  return [
    ["Approvals complete", !!a.offer, a.offer ? `${peso(a.offer.amount)} / ${a.offer.tenor} months` : "No approved offer"],
    ["Documents signed", !!a.signed, a.signed ? "Agreement, note signed · disclosure acknowledged" : "Signatures outstanding"],
    ["KYC valid within 12 months", true, "Refreshed at application"],
    ["Disbursement account verified", true, "Borrower’s own Kalinaw account"],
  ]
}

/** Maker submits a signed case for booking, with one idempotency key. */
export async function submitBooking(id: string): Promise<ActionResult> {
  return withCase(id, (s, a) => {
    if (a.stage !== "Booking" || a.booking?.status === "failed") return fail("Already submitted. Duplicate blocked.", true, "warn")
    a.booking = { status: "pending", maker: me(role()).name, key: `bk-${a.id}-${randomKeySuffix()}`, attempts: 0 }
    a.stage = "Pending checker"
    log(s, role(), a, `Submitted booking for checker (idempotency key ${a.booking.key})`)
    return ok("Submitted. Waiting for a second person to approve.")
  })
}

function bookIt(s: StaffState, a: Application): void {
  s.seq += 1
  a.loanNo = `LN-2026-${s.seq}`
  a.stage = "Disbursed"
  a.sla = null
  if (a.booking) a.booking.status = "booked"
  a.disbTo = `Kalinaw Savings ••${String(1000 + s.seq).slice(-4)}`
  a.disbAt = now(s)
}

/**
 * Checker guard for "Approve and book": refuses the maker and anyone who is
 * not a loan operations supervisor. Returns ok when the dialog may open.
 */
export async function canCheckBooking(id: string): Promise<ActionResult> {
  const r = role()
  const a = findApp(getState(), id)
  if (!a || !a.booking) return fail("That case no longer exists.", true)
  if (a.booking.maker === me(r).name) {
    withCase(id, (s, x) => {
      log(s, r, x, "Blocked: maker tried to check their own booking")
      return ok()
    })
    return fail("You prepared this booking; a different person must approve it.", true)
  }
  if (r !== "opssup") return fail("Only a loan operations supervisor can check bookings.", true)
  return ok()
}

/** Checker approves; core creates the loan, or the simulated timeout fails it. */
export async function checkBooking(id: string): Promise<ActionResult> {
  return withCase(id, (s, a) => {
    if (!a.booking || !a.offer || a.stage !== "Pending checker") return fail("Nothing to book.", true)
    if (a.booking.maker === me(role()).name || role() !== "opssup") return fail("Only a loan operations supervisor who did not prepare this booking can check it.", true)
    a.booking.attempts += 1
    a.booking.checker = me(role()).name
    log(s, role(), a, `Approved booking as checker (maker: ${a.booking.maker})`)
    if (s.cfg.coreFailNext) {
      s.cfg.coreFailNext = false
      a.booking.status = "failed"
      a.booking.failedAt = now(s)
      a.booking.error = "Core banking timeout after 30s (POST /loans). No account was created."
      a.stage = "Booking"
      log(s, role(), a, "Booking failed: core banking timeout. Moved to booking exceptions.", "System")
      return ok("Core timed out. Moved to booking exceptions.", "bad")
    }
    bookIt(s, a)
    log(s, role(), a, `Core created loan account ${a.loanNo}; disbursed ${peso(a.offer.amount)} to ${a.disbTo}`, "System")
    return ok(`Booked ${a.loanNo}. Funds released.`)
  })
}

/** Retries a failed booking with the SAME idempotency key. */
export async function retryBooking(id: string): Promise<ActionResult> {
  return withCase(id, (s, a) => {
    if (!a.booking || !a.offer || a.booking.status !== "failed") return fail("Nothing to retry.", true)
    a.booking.attempts += 1
    bookIt(s, a)
    log(s, role(), a, `Retried booking with the same idempotency key ${a.booking.key}`)
    log(s, role(), a, `Core confirmed no earlier account exists; created ${a.loanNo} and disbursed ${peso(a.offer.amount)}`, "System")
    return ok(`Retry succeeded: ${a.loanNo}`)
  })
}

/* ---------------- new cases: assisted application and intake ---------------- */

function aiAmount(income: Centavos, requested: Centavos): Centavos {
  const cap = Math.floor((income * 1.9) / 1000000) * 1000000
  return Math.max(1000000, Math.min(requested, cap))
}

type NewCaseInput = Pick<Application, "name" | "product" | "amount" | "tenor" | "channel" | "branch" | "age" | "cif" | "employer" | "income" | "verified" | "obligations" | "core" | "docs">

/**
 * Creates a case from a simulated decision. The decision record (inputs,
 * versions, outcome) is frozen onto the case and never edited afterwards.
 */
function newCase(s: StaffState, id: string, o: NewCaseInput, d: DecisionRecord): Application {
  const created = now(s)
  const a: Application = {
    tenantId: s.tenantId,
    id,
    bands: d.bands,
    govId: `PSN-${1000 + Math.floor(Math.random() * 8999)}-4471-${1000 + Math.floor(Math.random() * 8999)}`,
    owner: null,
    created,
    consent: true,
    version: s.cfg.ruleset.pub,
    hist: [],
    recommendation: null,
    borrowerPending: null,
    booking: null,
    loanNo: null,
    stmt: null,
    infoReq: null,
    offer: null,
    outcome: d.outcome,
    score: d.score,
    grade: d.grade,
    pd: d.pd,
    trigger: d.trigger,
    ruleset: d.ruleSetVersion,
    model: d.modelVersion,
    reasons: d.reasons,
    rules: d.rules,
    aiRec: d.outcome !== "decline" ? { decision: "approve", amount: aiAmount(o.income ?? 0, o.amount), tenor: o.tenor } : null,
    bureau: d.bureauDown ? null : d.score ? { provider: "TransUnion PH", file: d.inputs.bureau, score: d.inputs.bureau === "Full file" ? d.score + 4 : null, lines: d.inputs.bureau === "Full file" ? 4 : 1, util: "26%", delinq: "None" } : null,
    checks: [["eKYC and liveness", "HyperVerge (simulated)", "Pass"], ["AML and sanctions", "LSEG World-Check (simulated)", d.inputs.sanctions ? "Match · escalated" : "Clear"], ["Fraud signals", "SEON (simulated)", "Low risk"], ["Credit bureau", "TransUnion PH (simulated)", d.bureauDown ? "Unavailable" : d.inputs.bureau]],
    stage: d.outcome === "approve" ? "Offer" : d.outcome === "refer" ? "Review" : "Declined",
    sla: d.outcome === "refer" ? 8 : null,
    bureauDown: d.bureauDown,
    decision: Object.freeze({ outcome: d.outcome, score: d.score, grade: d.grade, trigger: d.trigger, ruleSetVersion: d.ruleSetVersion, modelVersion: d.modelVersion, inputs: Object.freeze({ ...d.inputs }), decidedAt: created }),
    ...o,
  }
  if (d.outcome === "approve" && d.grade) {
    a.offer = { amount: a.amount, tenor: a.tenor, grade: d.grade }
    a.offerSent = a.created
  }
  if (d.outcome === "refer") a.owner = "Miguel Ramos"
  if (d.inputs.sanctions) {
    a.aml = "Open"
    s.amlCases.unshift({ tenantId: s.tenantId, app: id, name: a.name, match: "OFAC SDN list · 92% name match", status: "Open" })
  }
  s.apps.unshift(a)
  return a
}

function logDecision(s: StaffState, a: Application, d: DecisionRecord): void {
  const r = role()
  const x = d.inputs
  log(s, r, a, `Decision record stored: rule set ${d.ruleSetVersion} · model ${d.modelVersion} · inputs amount ${peso(x.amount)}, age ${x.age}, bureau ${x.bureau}, debt-to-income ${Math.round(x.dti * 100)}%, customer ${x.years} yrs`, "System")
  log(s, r, a, d.outcome === "approve" ? `Auto-approved: score ${d.score} (${d.grade}) · rule set ${d.ruleSetVersion}` : d.outcome === "refer" ? `Referred: ${d.trigger}${d.score ? ` · score ${d.score} (${d.grade})` : ""} · rule set ${d.ruleSetVersion}` : `Auto-declined: ${d.trigger} · rule set ${d.ruleSetVersion}`, "System")
  if (d.outcome === "refer") log(s, r, a, "Assigned to Miguel Ramos (consumer credit queue, round robin)", "System")
  if (a.aml === "Open") log(s, r, a, "AML escalation opened for compliance", "System")
}

export function blankAssisted(): AssistedDraft {
  return { cif: "", name: "", age: "", employer: "", product: "PL", amount: 15000000, tenor: 24, purpose: "Home improvement", income: null, obligations: null, c1: false, c2: false, c3: false, scans: {}, useVerified: null }
}

export type AssistedErrors = Partial<Record<"name" | "age" | "amount" | "tenor" | "income" | "consent" | "verify", string>>

/** Income mismatch between declared income and the scanned payslip (0 when none). */
export function payslipMismatch(n: AssistedDraft): number {
  const cust = CUSTOMERS.find((c) => c.cif === n.cif)
  return n.scans.payslip && cust ? (cust.income - cust.payslip) / cust.payslip : 0
}

/** Field errors for the assisted application, using the prototype's copy. */
export function validateAssisted(n: AssistedDraft): AssistedErrors {
  const P = products(getState())[n.product]
  const e: AssistedErrors = {}
  if (!n.name.trim()) e.name = "Enter the customer’s full name."
  if (!(Number(n.age) > 0)) e.age = "Enter the customer’s age."
  if (!(n.amount != null && n.amount >= P.min && n.amount <= P.max)) e.amount = `Amount must be between ${peso(P.min)} and ${peso(P.max)}.`
  if (!(n.tenor >= P.tmin && n.tenor <= P.tmax)) e.tenor = `Tenor must be ${P.tmin} to ${P.tmax} months.`
  if (!(n.income != null && n.income > 0)) e.income = "Enter declared monthly income."
  if (!(n.c1 && n.c2 && n.c3)) e.consent = "All three consents are required before submitting."
  if (payslipMismatch(n) > 0.15 && n.useVerified == null) e.verify = "Choose which income figure to use."
  return e
}

/** Saves the assisted application as a resumable draft. */
export async function saveAssistedDraft(n: AssistedDraft, draftId: string | null): Promise<ActionResult> {
  if (!n.name.trim()) return fail("Enter at least the customer’s name to save a draft.")
  return update((s) => {
    let a = draftId ? findApp(s, draftId) : undefined
    if (!a) {
      s.seq += 1
      a = {
        tenantId: s.tenantId, id: `APP-${3000 + s.seq}`, stage: "Draft", channel: "Branch", branch: "Makati Ayala", owner: null, created: now(s), sla: null, outcome: null, score: null, grade: null, pd: null, trigger: "",
        reasons: [], rules: [], checks: [], docs: [], hist: [], consent: false, version: s.cfg.ruleset.pub, govId: "PSN-0000-0000-0000", ruleset: s.cfg.ruleset.pub, model: MODEL_VERSION,
        name: n.name, product: n.product, amount: n.amount ?? 0, tenor: n.tenor, bureau: null, core: null, recommendation: null, offer: null, borrowerPending: null, booking: null, loanNo: null, stmt: null, infoReq: null,
      }
      s.apps.unshift(a)
    }
    a.name = n.name
    a.product = n.product
    a.amount = n.amount ?? 0
    a.tenor = n.tenor || 0
    a.naDraft = structuredClone(n)
    a.docs = [["Government ID", n.scans.id ? "Received" : "Missing"], ["Payslip", n.scans.payslip ? "Received" : "Missing"]]
    log(s, role(), a, "Saved draft application; resumable for 30 days from any channel")
    return ok("Draft saved", "ok", `/applications/${a.id}`)
  })
}

/** Runs the simulated pipeline on an assisted application and opens the case. */
export async function submitAssisted(n: AssistedDraft, draftId: string | null): Promise<ActionResult> {
  const s0 = getState()
  const P = products(s0)[n.product]
  const dup = s0.apps.find((a) => a.name === n.name && a.product === n.product && a.id !== draftId && !["Disbursed", "Declined", "Withdrawn", "Draft"].includes(a.stage))
  if (dup) return fail(`${n.name} already has an open ${P.name} application (${dup.id})`, true)
  return update((s) => {
    const cust = CUSTOMERS.find((x) => x.cif === n.cif)
    const income = n.income ?? 0
    const verified = cust && n.scans.payslip ? cust.payslip : income
    const useVer = n.useVerified === true
    const x: DecisionInput = {
      product: n.product, amount: n.amount ?? 0, age: Number(n.age), sanctions: false, defaulted: false, bureau: cust ? cust.bureau : "Thin file", years: cust ? 2026 - cust.since : 0,
      dti: (n.obligations ?? 0) / (useVer ? verified : income), mismatch: useVer ? 0 : Math.max(0, (income - verified) / verified), stable: !!cust,
    }
    const d = simulateDecision(x, policyOf(s))
    if (draftId) s.apps = s.apps.filter((z) => z.id !== draftId)
    s.seq += 1
    const id = draftId || `APP-${3000 + s.seq}`
    const a = newCase(s, id, {
      name: n.name, product: n.product, amount: n.amount ?? 0, tenor: n.tenor, channel: "Branch", branch: "Makati Ayala", age: Number(n.age), cif: n.cif || null, employer: n.employer, income,
      verified: useVer ? verified : cust && n.scans.payslip ? verified : null, obligations: n.obligations ?? 0,
      core: cust ? { since: cust.since, balance: cust.balance, inflow: cust.inflow, loans: "None" } : null,
      docs: [["Government ID", n.scans.id ? "Verified" : "Missing"], ["Payslip", n.scans.payslip ? (x.mismatch > 0.15 ? "Received · mismatch" : "Verified") : "Missing"], ["Signed consent form", "Verified"]],
    }, d)
    log(s, role(), a, "Captured assisted application at Makati Ayala branch; three consents recorded on the customer’s behalf (terms v3.2)")
    if (cust && n.scans.payslip && (income - verified) / verified > 0.15) log(s, role(), a, `OCR flagged income mismatch: declared ${peso(income)} vs payslip ${peso(verified)}; ${useVer ? "officer chose the verified figure" : "officer kept the declared figure and flagged it for review"}`)
    logDecision(s, a, d)
    const msg = d.outcome === "approve" ? "Auto-approved. Offer sent to the customer." : d.outcome === "refer" ? `Referred: ${d.trigger.split(" · ")[0]}` : "Auto-declined"
    return ok(msg, d.outcome === "decline" ? "bad" : d.outcome === "refer" ? "warn" : "ok", `/applications/${id}`)
  })
}

export async function uploadPartnerSpreadsheet(): Promise<ActionResult> {
  return update((s) => {
    s.intakeFile = "Cordillera Foods HR · salary loan requests Nov 2026.xlsx"
    const rows: IntakeDraft[] = [
      { tenantId: s.tenantId, name: "Ramil Ocampo", product: "SL", amount: 5000000, tenor: 12, income: 3200000, age: 29, source: "Partner spreadsheet, row 2", flag: null, status: "Draft" },
      { tenantId: s.tenantId, name: "Joy Fernandez", product: "SL", amount: 9000000, tenor: 18, income: 4100000, age: 36, source: "Partner spreadsheet, row 3", flag: null, status: "Draft" },
      { tenantId: s.tenantId, name: "Elmer Sison", product: "SL", amount: 7000000, tenor: 12, income: 3550000, age: 44, source: "Partner spreadsheet, row 4", flag: "Government ID number missing", status: "Draft" },
    ]
    s.drafts = rows.concat(s.drafts.filter((d) => d.status !== "Draft"))
    log(s, role(), null, "Uploaded partner spreadsheet: 3 rows extracted into drafts")
    return ok("3 draft applications created")
  })
}

export async function uploadEmailBundle(): Promise<ActionResult> {
  return update((s) => {
    s.drafts.unshift({ tenantId: s.tenantId, name: "Grace Villamor", product: "PL", amount: 12000000, tenor: 24, income: 5800000, age: 33, source: "Email from g.villamor@… with 3 attachments", flag: null, status: "Draft" })
    log(s, role(), null, "Extracted an email bundle into a draft application")
    return ok("Email bundle extracted into a draft")
  })
}

/** Submits a reviewed intake draft (by its index in the drafts list). */
export async function submitIntakeDraft(index: number, input: { amount: Centavos | null; tenor: number; govId: string; consent: boolean }): Promise<ActionResult> {
  if (!input.govId.trim()) return fail("Enter the government ID number before submitting.")
  if (!input.consent) return fail("Confirm the signed consent form is on file.")
  return update((s) => {
    const d = s.drafts[index]
    if (!d) return fail("That draft no longer exists.", true)
    const P = products(s)[d.product as ProductCode]
    const amt = input.amount ?? Number.NaN
    if (!(amt >= P.min && amt <= P.max)) return fail(`Amount must be between ${peso(P.min)} and ${peso(P.max)}.`)
    const x: DecisionInput = { product: d.product, amount: amt, age: d.age, sanctions: false, defaulted: false, bureau: "Full file", years: 3, dti: 0.12, mismatch: 0, stable: true }
    const r = simulateDecision(x, policyOf(s))
    s.seq += 1
    const id = `APP-${3000 + s.seq}`
    const a = newCase(s, id, {
      name: d.name, product: d.product, amount: amt, tenor: input.tenor, channel: "File intake", branch: null, age: d.age, cif: null, employer: d.product === "SL" ? "Cordillera Foods (payroll partner)" : "—",
      income: d.income, verified: d.income, obligations: Math.round(d.income * 0.12), core: null, docs: [["Partner spreadsheet row", "Verified"], ["Signed consent form", "Verified"]],
    }, r)
    log(s, role(), a, `Submitted from ${d.source} after staff review`)
    logDecision(s, a, r)
    d.status = "Submitted"
    d.app = id
    d.flag = null
    return ok(`${d.name}: ${r.outcome === "approve" ? "auto-approved" : r.outcome === "refer" ? "referred for review" : "declined"}`, r.outcome === "approve" ? "ok" : "warn")
  })
}
