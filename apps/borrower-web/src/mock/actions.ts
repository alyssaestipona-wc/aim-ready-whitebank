import { formatPeso, simulateDecision, type Centavos, type DecisionRecord } from "@aim-ready/core"

import { BANK_STEP_MS, BORROWERS, DEMO_PASSWORD, POLICY, PRODUCTS, TENANT, TODAY, UPLOAD_LIMIT_MB } from "./config"
import { currentBorrower, myApp, productName } from "./selectors"
import type { Store } from "./store"
import type { Application, BorrowerState, ProductCode, Result } from "./types"

/*
 * Every borrower action, ported from the prototype's handlers. Each one is
 * async and returns { ok } or { ok: false, error } so a later change can swap
 * this module for API calls without touching the screens.
 *
 * SIMULATED: this module also stands in for the bank's staff (see
 * `advanceBank`), because the portal has no shared back office yet.
 */

export const SESSION_COOKIE = "wbl_borrower_session"
export const SIMULATED_STEP = "(simulated bank step)"

/** "27 Nov, 10:32": the prototype's logical clock, two minutes per event. */
function stamp(s: BorrowerState): string {
  s.clock += 1
  let m = 30 + s.clock * 2
  const h = 10 + Math.floor(m / 60)
  m %= 60
  return `${TODAY}, ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function log(s: BorrowerState, a: Application, what: string, who: string) {
  a.hist.push({ who, what, when: stamp(s) })
}

function setCookie(value: string | null) {
  if (typeof document === "undefined") return
  document.cookie = value
    ? `${SESSION_COOKIE}=${encodeURIComponent(value)}; path=/; SameSite=Lax`
    : `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`
}

export type ApplicationForm = {
  product: ProductCode
  amount: Centavos | null
  tenor: number
  income: Centavos | null
  obligations: Centavos | null
  purpose: string
  consentCredit: boolean
  consentData: boolean
  consentTerms: boolean
}

export type UploadChoice = "" | "ok" | "type" | "size"

export type ActionOptions = {
  now?: () => number
  /** Simulated network/check latency; tests pass an instant one. */
  wait?: (ms: number) => Promise<void>
}

const realWait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function createActions(store: Store, opts: ActionOptions = {}) {
  const now = opts.now ?? (() => Date.now())
  const wait = opts.wait ?? realWait

  function respondInfo(s: BorrowerState, a: Application) {
    const b = BORROWERS[a.borrower]
    a.docs = a.docs.map((d) => (/statements/i.test(d[0]) ? ([d[0], "Verified"] as const) : d))
    if (!a.docs.some((d) => /statements/i.test(d[0]))) a.docs.push(["Bank statements, 3 months", "Verified"])
    a.stage = "Review"
    a.borrowerPending = null
    // Statement analysis (simulated), as in the prototype's analyseStatements().
    const salaryPesos = b?.id === "carmela" ? 98500 : Math.round(((a.income / 100) * 1.03) / 100) * 100
    const supported = Math.floor((salaryPesos * 2.7) / 10000) * 10000 * 100
    a.recDefault = Math.max(PRODUCTS[a.product].min, Math.min(a.amount, supported))
    log(s, a, "Uploaded bank statements in Kalinaw Bank online", a.name)
    log(s, a, `Bank statement analysis: credits ${formatPeso(salaryPesos * 100)} monthly; obligations ${formatPeso(a.obligations)}; recommended ${formatPeso(a.recDefault)}`, "System")
    a.waitingSince = now()
  }

  /**
   * SIMULATED bank progression: moves each application that has waited at
   * least BANK_STEP_MS on the bank one step forward. Called on a timer and on
   * load, so a step that fell due while the page was closed catches up.
   */
  function advanceBank(at: number = now()): number {
    let moved = 0
    const due = store.getState().apps.some((a) => a.waitingSince !== null && at - a.waitingSince >= BANK_STEP_MS)
    if (!due) return 0
    store.update((s) => {
      for (const a of s.apps) {
        if (a.waitingSince === null || at - a.waitingSince < BANK_STEP_MS) continue
        moved++
        a.waitingSince = null
        if (a.stage === "Review" && !a.infoRequested) {
          a.infoRequested = true
          a.infoReq = "Bank statements, 3 months"
          a.infoMsg = `Hi ${a.name.split(" ")[0]}, to finish reviewing your loan please upload your last 3 months of bank statements.`
          a.infoDue = "In 3 days (30 Nov)"
          a.stage = "Info requested"
          a.borrowerPending = "docs"
          if (!a.docs.some((d) => d[0] === a.infoReq)) a.docs.push([a.infoReq, "Missing"])
          log(s, a, `Requested from borrower: ${a.infoReq} (due ${a.infoDue}) ${SIMULATED_STEP}`, "Miguel Ramos")
        } else if (a.stage === "Review") {
          const amount = a.recDefault ?? a.amount
          a.offer = { amount, tenor: a.tenor, grade: a.decision.grade ?? "C" }
          a.stage = "Offer"
          log(s, a, `Approved ${amount !== a.amount ? "counter-offer" : "offer"} ${formatPeso(amount)} / ${a.tenor} months within authority ${SIMULATED_STEP}`, "Teresa Lim")
        } else if (a.stage === "Documentation" && a.borrowerPending === null) {
          a.borrowerPending = "sign"
          a.docs = a.docs.filter((d) => !/agreement|Promissory/i.test(d[0])).concat([["Loan agreement", "Sent for signature"], ["Promissory note", "Sent for signature"]])
          log(s, a, `Generated loan agreement and promissory note from templates (v5, v2) and sent for e-signature ${SIMULATED_STEP}`, "Paolo Reyes")
        } else if (a.stage === "Booking") {
          s.seq += 1
          const b = BORROWERS[a.borrower]
          a.loanNo = `LN-2026-${s.seq}`
          a.stage = "Disbursed"
          a.disbTo = b ? b.account : "your Kalinaw account"
          log(s, a, `Core created loan account ${a.loanNo}; disbursed ${formatPeso(a.offer?.amount ?? a.amount)} to ${a.disbTo} ${SIMULATED_STEP}`, "System")
        } else {
          moved--
        }
      }
    })
    return moved
  }

  const api = {
    advanceBank,

    async signIn(email: string, password: string): Promise<Result<{ borrowerId: string }>> {
      const e = String(email || "").trim().toLowerCase()
      const who = Object.values(BORROWERS).find((b) => b.email === e)
      if (!who || password !== DEMO_PASSWORD) return { ok: false, error: "Email or password is incorrect." }
      store.update((s) => {
        s.session = who.id
      })
      setCookie(who.id)
      return { ok: true, borrowerId: who.id }
    },

    async signOut(): Promise<Result> {
      store.update((s) => {
        s.session = null
      })
      setCookie(null)
      return { ok: true }
    },

    /** Step checks for the apply form, with the prototype's exact messages. */
    validateStep(step: 1 | 2, f: ApplicationForm): string | null {
      const P = PRODUCTS[f.product]
      if (step === 1 && !(f.amount !== null && f.amount >= P.min && f.amount <= P.max)) return `Enter an amount between ${formatPeso(P.min)} and ${formatPeso(P.max)}.`
      if (step === 2 && !(f.income !== null && f.income > 0)) return "Enter your monthly income."
      return null
    },

    /** Consent and duplicate checks that run before the simulated checks start. */
    precheckSubmission(f: ApplicationForm): string | null {
      const s0 = store.getState()
      const b = currentBorrower(s0)
      if (!b) return "Your session has ended. Sign in again."
      const P = PRODUCTS[f.product]
      const missing = (
        [
          [f.consentCredit, "credit check consent"],
          [f.consentData, "data processing consent"],
          [f.consentTerms, "terms and conditions"],
        ] as const
      )
        .filter(([v]) => !v)
        .map(([, label]) => label)
      if (missing.length) return `Please tick the ${missing.join(", ")} to submit.`
      const dup = s0.apps.find((a) => a.borrower === b.id && a.product === f.product && !["Disbursed", "Declined", "Withdrawn"].includes(a.stage))
      if (dup) return `You already have an open ${P.name.toLowerCase()} application (${dup.id}). We’ll update you on that one first.`
      if (f.amount === null || f.income === null || !(f.income > 0)) return "Enter your monthly income."
      return null
    },

    /** Runs the simulated checks and decision, then creates the application. */
    async submitApplication(f: ApplicationForm): Promise<Result<{ id: string }>> {
      const pre = api.precheckSubmission(f)
      if (pre) return { ok: false, error: pre }
      const b = currentBorrower(store.getState()) as NonNullable<ReturnType<typeof currentBorrower>>
      if (f.amount === null || f.income === null) return { ok: false, error: "Enter your monthly income." }

      await wait(1200)

      const income = f.income
      const obligations = f.obligations ?? 0
      const decision: DecisionRecord = simulateDecision(
        { product: f.product, amount: f.amount, age: b.age, sanctions: false, defaulted: false, bureau: b.bureau, years: 2026 - b.since, dti: obligations / income, mismatch: 0, stable: b.stable },
        POLICY
      )
      let id = ""
      store.update((s) => {
        s.seq += 1
        id = `APP-${3000 + s.seq}`
        const created = stamp(s)
        const a: Application = {
          tenantId: TENANT,
          id,
          borrower: b.id,
          name: b.name,
          product: f.product,
          amount: f.amount as Centavos,
          tenor: f.tenor,
          income,
          obligations,
          purpose: f.purpose,
          channel: "Web app",
          cif: b.cif,
          employer: b.employer,
          govId: `PSN-2281-${b.id === "juan" ? "5530-1420" : "7712-8831"}`,
          created,
          stage: decision.outcome === "approve" ? "Offer" : decision.outcome === "refer" ? "Review" : "Declined",
          borrowerPending: null,
          offer: decision.outcome === "approve" ? { amount: f.amount as Centavos, tenor: f.tenor, grade: decision.grade ?? "C" } : null,
          decision,
          infoRequested: false,
          infoReq: null,
          infoMsg: null,
          infoDue: null,
          recDefault: null,
          docs: [
            ["Government ID (PhilSys)", "Verified"],
            [b.stable ? "Payslip (Oct 2026)" : "Business permit", "Verified"],
          ],
          hist: [],
          loanNo: null,
          disbTo: null,
          withdrawReason: null,
          waitingSince: decision.outcome === "refer" ? now() : null,
        }
        log(s, a, "Submitted application in Kalinaw Bank online; three consents recorded (terms v3.2)", b.name)
        const d = decision
        log(
          s,
          a,
          d.outcome === "approve"
            ? `Auto-approved: score ${d.score} (${d.grade}) · rule set ${d.ruleSetVersion}`
            : d.outcome === "refer"
              ? `Referred: ${d.trigger}${d.score ? ` · score ${d.score} (${d.grade})` : ""}`
              : `Auto-declined: ${d.trigger}`,
          "System"
        )
        if (d.outcome === "refer") log(s, a, "Assigned to Miguel Ramos (consumer credit queue, round robin)", "System")
        s.apps.unshift(a)
      })
      return { ok: true, id }
    },

    async uploadDocuments(choice: UploadChoice): Promise<Result> {
      const a = myApp(store.getState())
      if (!a || a.stage !== "Info requested") return { ok: false, error: "We don’t need anything from you right now." }
      if (!choice) return { ok: false, error: "Choose a file to upload." }
      if (choice === "type") return { ok: false, error: "HEIC files aren’t accepted. Upload a PDF, JPG or PNG." }
      if (choice === "size") return { ok: false, error: `This file is 41 MB. The limit is ${UPLOAD_LIMIT_MB} MB.` }
      store.update((s) => {
        const x = s.apps.find((y) => y.id === a.id)
        if (x) respondInfo(s, x)
      })
      return { ok: true }
    },

    async acceptOffer(acknowledged: boolean): Promise<Result> {
      const a = myApp(store.getState())
      if (!a || a.stage !== "Offer" || !a.offer) return { ok: false, error: "No offer right now" }
      if (!acknowledged) return { ok: false, error: "Acknowledge the disclosure statement first" }
      store.update((s) => {
        const x = s.apps.find((y) => y.id === a.id)
        if (!x || !x.offer) return
        x.stage = "Documentation"
        x.borrowerPending = null
        x.docs = x.docs.filter((d) => !/agreement|Disclosure|Promissory/i.test(d[0])).concat([["Disclosure statement", "Acknowledged"]])
        log(s, x, `Accepted offer of ${formatPeso(x.offer.amount)} / ${x.offer.tenor} months; acknowledged the disclosure statement`, x.name)
        x.waitingSince = now()
      })
      return { ok: true }
    },

    async signDocuments(typedName: string, agree: boolean): Promise<Result> {
      const s0 = store.getState()
      const a = myApp(s0)
      const b = currentBorrower(s0)
      if (!a || !b || !(a.stage === "Documentation" && a.borrowerPending === "sign")) return { ok: false, error: "Nothing to sign" }
      if (String(typedName).trim().toLowerCase() !== b.name.toLowerCase()) return { ok: false, error: `Type your name exactly as it appears on your account: ${b.name}.` }
      if (!agree) return { ok: false, error: "Tick the box to agree to sign electronically." }
      store.update((s) => {
        const x = s.apps.find((y) => y.id === a.id)
        if (!x) return
        x.borrowerPending = null
        x.stage = "Booking"
        x.docs = x.docs.map((d) => (/Sent for signature/.test(d[1]) ? ([d[0], "Signed"] as const) : d))
        log(s, x, "E-signed loan agreement and promissory note; signature certificate stored", x.name)
        x.waitingSince = now()
      })
      return { ok: true }
    },

    productName,
  }
  return api
}

export type Actions = ReturnType<typeof createActions>
