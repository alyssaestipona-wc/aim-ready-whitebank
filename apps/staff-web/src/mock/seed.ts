/**
 * Seed data for the simulated staff console, ported from the prototype's
 * seed(), extendSeed(), enrichHist() and seed*() builders. Generation is
 * deterministic (a fixed-seed Park–Miller RNG), so every reset produces the
 * same 186 cases. Amounts are worked in pesos exactly as the prototype does,
 * then converted to integer centavos before the state is returned.
 */
import { formatPeso, simulateDecision, toCentavos, type DecisionInput, type Grade, type Outcome } from "@aim-ready/core"

import { BASE_PRODUCTS, BRANCH_OF, STAFF_POOL, TENANT_ID, TODAY, USERS } from "./constants"
import type { Application, AuditEntry, Channel, DecisionConfig, HistEntry, IntakeDraft, ProductCode, Stage, StaffState } from "./types"

export const RULESET_VERSION = "v4"
export const MODEL_VERSION = "PL-Score 3.2"

export function baseCfg(): DecisionConfig {
  return {
    ruleset: { pub: RULESET_VERSION, inReview: false, author: null },
    rules: [
      { id: "age", name: "Applicant age 21–65", type: "Knockout", active: true, locked: true },
      { id: "sanctions", name: "No sanctions or watchlist match", type: "Knockout", active: true, locked: true },
      { id: "default", name: "No existing default", type: "Knockout", active: true },
      { id: "dti", name: "Debt-to-income cap", type: "Referral trigger", active: true, param: 40 },
      { id: "mismatch", name: "Declared vs verified income within 15%", type: "Referral trigger", active: true },
      { id: "thin", name: "Bureau file sufficient", type: "Referral trigger", active: true },
      { id: "limit", name: "Amount within auto-approval limit", type: "Referral trigger", active: true },
    ],
    bands: { approve: 700, decline: 600 },
    triggers: { grey: true, limit: true, thin: true, mismatch: true, dti: true, fraud: true, related: true, confidence: true },
    automation: { PL: "live", SL: "live" },
    killSwitch: false,
    bureauDown: false,
    coreFailNext: false,
    draft: null,
  }
}

export function H(who: string, what: string, when: string): HistEntry {
  return { who, what, when }
}

/** Sort key for "27 Nov, 08:40"-style timestamps; 0 when not a November time. */
export function tOrd(w: string | undefined): number {
  const m = /(\d+) Nov, (\d+):(\d+)/.exec(w || "")
  return m ? Number(m[1]) * 1440 + Number(m[2]) * 60 + Number(m[3]) : 0
}

/** The role shown in the audit log for a named person. */
export function roleOf(who: string): string {
  if (who === "System") return "Decision engine"
  for (const u of Object.values(USERS)) if (u.name === who) return u.title
  if (STAFF_POOL.officer.includes(who)) return "Loan officer"
  if (STAFF_POOL.branch.includes(who)) return "Branch officer"
  if (STAFF_POOL.approver.includes(who)) return "Approver"
  return "Borrower"
}

/** ₱ formatting for seeded peso amounts. */
const peso = (pesos: number) => formatPeso(toCentavos(pesos))

/** Simulated policy built from config, with product limits in centavos. */
function seedPolicy(cfg: DecisionConfig) {
  return {
    rules: cfg.rules,
    bands: cfg.bands,
    triggers: cfg.triggers,
    autoLimits: { PL: BASE_PRODUCTS.PL.autoLimit, SL: BASE_PRODUCTS.SL.autoLimit },
    automation: cfg.automation,
    killSwitch: cfg.killSwitch,
    bureauDown: cfg.bureauDown,
    ruleSetVersion: cfg.ruleset.pub,
    modelVersion: MODEL_VERSION,
  }
}

/** The prototype's decide(), with peso inputs. */
function decidePesos(x: Omit<DecisionInput, "amount"> & { amount: number }, cfg: DecisionConfig) {
  return simulateDecision({ ...x, amount: toCentavos(x.amount) }, seedPolicy(cfg))
}

function aiAmount(income: number, requested: number): number {
  const cap = Math.floor((income * 1.9) / 10000) * 10000
  return Math.max(10000, Math.min(requested, cap))
}

const stdChecks = (file?: string): Application["checks"] => [
  ["eKYC and liveness", "HyperVerge (simulated)", "Pass"],
  ["AML and sanctions", "LSEG World-Check (simulated)", "Clear"],
  ["Fraud signals", "SEON (simulated)", "Low risk"],
  ["Credit bureau", "TransUnion PH (simulated)", file || "Full file"],
]

type Seedable = Partial<Application> & Pick<Application, "id" | "name" | "product" | "amount" | "tenor" | "channel" | "stage" | "created">

function mk(o: Seedable): Application {
  const n = Number(o.id.slice(4))
  return {
    tenantId: TENANT_ID,
    govId: `PSN-${4000 + ((n * 7) % 5000)}-${1000 + ((n * 13) % 8000)}-${2000 + ((n * 31) % 7000)}`,
    consent: true,
    version: "v4",
    recommendation: null,
    offer: null,
    borrowerPending: null,
    booking: null,
    loanNo: null,
    owner: null,
    branch: null,
    bands: { approve: 700, decline: 600 },
    docs: [],
    checks: [],
    rules: [],
    reasons: [],
    hist: [],
    stmt: null,
    infoReq: null,
    borrower: null,
    ruleset: "v4",
    model: MODEL_VERSION,
    sla: null,
    outcome: null,
    score: null,
    grade: null,
    pd: null,
    trigger: "",
    bureau: null,
    core: null,
    ...o,
  }
}

function namedCases(): Application[] {
  const T = TODAY
  return [
    mk({
      id: "APP-2041", name: "Ramon Aquino", product: "PL", amount: 180000, tenor: 24, channel: "Web app", stage: "Review", owner: "Miguel Ramos", created: `${T}, 08:40`, sla: 5,
      age: 27, cif: null, employer: "Brightline BPO Services", income: 52000, verified: null, obligations: 6000,
      outcome: "refer", score: 618, grade: "D", pd: 3.2, trigger: "Thin bureau file · Score in referral band", aiRec: { decision: "approve", amount: 100000, tenor: 24 },
      reasons: [{ t: "Thin bureau file: 1 trade line", pos: false }, { t: "New to bank: no deposit history", pos: false }, { t: "Low debt-to-income (12%)", pos: true }],
      rules: [
        { id: "age", name: "Applicant age 21–65", res: "p", val: "27 yrs" }, { id: "sanctions", name: "No sanctions or watchlist match", res: "p", val: "Clear" }, { id: "default", name: "No existing default", res: "p", val: "None" },
        { id: "dti", name: "Debt-to-income at or below 40%", res: "p", val: "12%" }, { id: "mismatch", name: "Declared vs verified income within 15%", res: "w", val: "Not verified yet" }, { id: "thin", name: "Bureau file sufficient", res: "w", val: "Thin file" },
        { id: "limit", name: "Amount within auto-approval limit", res: "p", val: "limit ₱200,000" },
      ],
      bureau: { provider: "TransUnion PH", file: "Thin file", score: null, lines: 1, util: "42% (1 card)", delinq: "None" }, core: null, checks: stdChecks("Thin file"),
      docs: [["Government ID (PhilSys)", "Verified"], ["Payslip (Oct 2026)", "Received"]],
      recDefault: 100000, recNote: "New to bank with a thin bureau file. Recommend the AI amount unless more income evidence arrives.",
      hist: [H("Ramon Aquino", "Submitted application in the web app; eKYC completed", `${T}, 08:40`), H("System", "Referred: thin bureau file, score 618 in referral band · rule set v4", `${T}, 08:41`), H("System", "Assigned to Miguel Ramos (consumer credit queue, round robin)", `${T}, 08:41`)],
    }),
    mk({
      id: "APP-2043", name: "Liza Ferrer", product: "SL", amount: 120000, tenor: 24, channel: "Web app", stage: "Approval", created: "26 Nov, 11:30", sla: 4,
      age: 30, cif: "CIF-0052201", employer: "Cordillera Foods (payroll partner)", income: 52000, verified: 52000, obligations: 5000,
      outcome: "refer", score: 684, grade: "C", pd: 2.4, trigger: "Score in referral band", aiRec: { decision: "approve", amount: 120000, tenor: 24 },
      reasons: [{ t: "Payroll deduction through partner employer", pos: true }, { t: "Short tenure at employer (8 months)", pos: false }],
      rules: [{ id: "sanctions", name: "No sanctions or watchlist match", res: "p", val: "Clear" }, { id: "dti", name: "Debt-to-income at or below 40%", res: "p", val: "10%" }],
      bureau: { provider: "CIBI (simulated)", file: "Full file", score: 690, lines: 2, util: "30%", delinq: "None" }, core: { since: 2025, balance: 8400, inflow: "₱52,000 monthly", loans: "None" }, checks: stdChecks(),
      docs: [["Payslip (Oct 2026)", "Verified"]],
      recommendation: { by: "Miguel Ramos", decision: "approve", amount: 120000, tenor: 24, reason: null, overLevel: null, note: "Matches the AI recommendation; payroll deduction offsets the short tenure." },
      hist: [H("Liza Ferrer", "Submitted application in WhiteBank online", "26 Nov, 11:30"), H("System", "Referred: score 684 in referral band", "26 Nov, 11:31"), H("Miguel Ramos", "Recommended approval ₱120,000 / 24 months", `${T}, 08:05`)],
    }),
    mk({
      id: "APP-2047", name: "Dennis Yap", product: "PL", amount: 60000, tenor: 12, channel: "Branch", branch: "Makati Ayala", stage: "Draft", created: `${T}, 09:50`, sla: null,
      outcome: null, score: null, grade: null, trigger: "", docs: [["Government ID", "Received"], ["Payslip", "Missing"]],
      naDraft: { cif: "", name: "Dennis Yap", age: "37", employer: "Yap Hardware Trading", product: "PL", amount: 60000, tenor: 12, purpose: "Inventory", income: 45000, obligations: 5000, c1: true, c2: true, c3: false, scans: { id: true }, useVerified: null },
      hist: [H("Bea Santiago", "Started assisted application; payslip outstanding", `${T}, 09:50`)],
    }),
    mk({
      id: "APP-2050", name: "Arturo Santos", product: "PL", amount: 50000, tenor: 12, channel: "Web app", stage: "Declined", created: `${T}, 07:55`, sla: null,
      age: 52, employer: "Undisclosed trading company", income: 60000, obligations: 0,
      outcome: "decline", score: null, grade: null, pd: null, trigger: "Policy knockout: No sanctions or watchlist match", model: "Not scored", aml: "Open",
      reasons: [{ t: "Application does not meet policy requirements", pos: false }],
      rules: [{ id: "age", name: "Applicant age 21–65", res: "p", val: "52 yrs" }, { id: "sanctions", name: "No sanctions or watchlist match", res: "f", val: "Match: OFAC SDN list" }],
      bureau: null, core: null, checks: [["eKYC and liveness", "HyperVerge (simulated)", "Pass"], ["AML and sanctions", "LSEG World-Check (simulated)", "Match · escalated"]], docs: [["Government ID", "Received"]],
      hist: [H("Arturo Santos", "Submitted application in the web app", `${T}, 07:55`), H("System", "Auto-declined: policy knockout (sanctions match). Not scored.", `${T}, 07:55`), H("System", "AML escalation opened for compliance", `${T}, 07:55`)],
    }),
    mk({
      id: "APP-2052", name: "Grace Medina", product: "SL", amount: 70000, tenor: 12, channel: "Web app", stage: "Booking", created: "26 Nov, 09:00", sla: 1,
      age: 33, cif: "CIF-0047710", employer: "Cordillera Foods (payroll partner)", income: 40000, verified: 40000, obligations: 2000,
      outcome: "approve", score: 733, grade: "B", pd: 1.8, trigger: "", reasons: [{ t: "Stable salary credits to a WhiteBank account", pos: true }], rules: [], bureau: { provider: "TransUnion PH", file: "Full file", score: 729, lines: 3, util: "18%", delinq: "None" }, core: { since: 2021, balance: 9900, inflow: "₱40,000 monthly", loans: "None" }, checks: stdChecks(),
      docs: [["Loan agreement", "Signed"], ["Disclosure statement", "Acknowledged"], ["Promissory note", "Signed"]], offer: { amount: 70000, tenor: 12, grade: "B" }, signed: true,
      booking: { status: "failed", maker: "Paolo Reyes", checker: "Celine Uy", key: "bk-APP-2052-7f2a", error: "Core banking timeout after 30s (POST /loans). No account was created.", attempts: 1 },
      hist: [H("System", "Auto-approved: score 733 (B) · rule set v4", "26 Nov, 09:01"), H("Grace Medina", "Accepted offer and e-signed loan documents", "26 Nov, 12:10"), H("Paolo Reyes", "Submitted booking for checker (idempotency key bk-APP-2052-7f2a)", "26 Nov, 15:50"), H("Celine Uy", "Approved booking as checker (maker: Paolo Reyes)", "26 Nov, 16:00"), H("System", "Booking failed: core banking timeout. Moved to booking exceptions.", "26 Nov, 16:01")],
    }),
    mk({
      id: "APP-2054", name: "Victor Salonga", product: "PL", amount: 90000, tenor: 18, channel: "Branch", branch: "Makati Ayala", stage: "Pending checker", created: "26 Nov, 10:00", sla: 3,
      age: 26, cif: "CIF-0049920", employer: "Harbor Pharmacy", income: 38000, verified: 38000, obligations: 3000,
      outcome: "approve", score: 721, grade: "B", pd: 1.9, trigger: "", reasons: [{ t: "Low debt-to-income (8%)", pos: true }], rules: [], bureau: { provider: "TransUnion PH", file: "Full file", score: 719, lines: 3, util: "20%", delinq: "None" }, core: { since: 2023, balance: 12600, inflow: "₱38,000 monthly", loans: "None" }, checks: stdChecks(),
      docs: [["Loan agreement", "Signed"], ["Disclosure statement", "Acknowledged"], ["Promissory note", "Signed"]], offer: { amount: 90000, tenor: 18, grade: "B" }, signed: true,
      booking: { status: "pending", maker: "Paolo Reyes", key: "bk-APP-2054-c41e", attempts: 0 },
      hist: [H("Bea Santiago", "Captured assisted application at Makati Ayala branch", "26 Nov, 10:00"), H("System", "Auto-approved: score 721 (B) · rule set v4", "26 Nov, 10:01"), H("Victor Salonga", "Accepted offer, acknowledged disclosure, e-signed", "26 Nov, 14:20"), H("Paolo Reyes", "Submitted booking for checker (idempotency key bk-APP-2054-c41e)", `${T}, 08:30`)],
    }),
    mk({
      id: "APP-2056", name: "Joy Castillo", product: "PL", amount: 300000, tenor: 36, channel: "Web app", stage: "Review", owner: "Miguel Ramos", created: "26 Nov, 16:10", sla: 1,
      age: 35, cif: "CIF-0040392", employer: "Sierra Telecom", income: 70000, verified: 70000, obligations: 30100,
      outcome: "refer", score: 668, grade: "C", pd: 2.6, trigger: "Debt-to-income above cap · Amount above auto-approval limit", aiRec: { decision: "approve", amount: 180000, tenor: 36 },
      reasons: [{ t: "Debt-to-income 43% is above 40%", pos: false }, { t: "Customer for 5 years", pos: true }, { t: "Established credit bureau history", pos: true }],
      rules: [{ id: "dti", name: "Debt-to-income at or below 40%", res: "w", val: "43%" }, { id: "sanctions", name: "No sanctions or watchlist match", res: "p", val: "Clear" }, { id: "limit", name: "Amount within auto-approval limit", res: "w", val: "limit ₱200,000" }],
      bureau: { provider: "CIBI (simulated)", file: "Full file", score: 671, lines: 5, util: "64%", delinq: "None" }, core: { since: 2021, balance: 15800, inflow: "₱70,000 monthly", loans: "Credit card, current" }, checks: stdChecks(),
      docs: [["Payslip (Oct 2026)", "Verified"]], recDefault: 180000, recNote: "Debt-to-income at 43%; ₱180,000 brings it back under the cap.",
      hist: [H("Joy Castillo", "Submitted application in WhiteBank online", "26 Nov, 16:10"), H("System", "Referred: debt-to-income 43% above 40% cap; amount above auto-approval limit", "26 Nov, 16:11"), H("System", "Assigned to Miguel Ramos (round robin)", "26 Nov, 16:11")],
    }),
    mk({
      id: "APP-2058", name: "Henry Tan", product: "PL", amount: 420000, tenor: 36, channel: "Web app", stage: "Review", created: `${T}, 07:20`, sla: 7,
      age: 44, cif: "CIF-0021180", employer: "Tan Hardware (owner)", income: 180000, verified: 165000, obligations: 35000,
      outcome: "refer", score: 705, grade: "B", pd: 2.1, trigger: "Amount above auto-approval limit", aiRec: { decision: "approve", amount: 400000, tenor: 36 },
      reasons: [{ t: "Customer for 12 years", pos: true }, { t: "Business income verified from 6 months of statements", pos: true }, { t: "Amount above the ₱200,000 auto-approval limit", pos: false }], rules: [{ id: "limit", name: "Amount within auto-approval limit", res: "w", val: "limit ₱200,000" }],
      bureau: { provider: "TransUnion PH", file: "Full file", score: 711, lines: 9, util: "27%", delinq: "None" }, core: { since: 2014, balance: 640000, inflow: "Business account, avg ₱165,000", loans: "None" }, checks: stdChecks(),
      docs: [["Business permit", "Verified"], ["Bank statements, 6 months", "Verified"]], recDefault: 420000, recNote: "Twelve-year relationship and verified business income support the full amount.",
      hist: [H("Henry Tan", "Submitted application in the web app", `${T}, 07:20`), H("System", "Referred: amount above auto-approval limit", `${T}, 07:21`)],
    }),
  ]
}

const FIRST = ["Mark", "Joanna", "Ramil", "Kristel", "Jerome", "Patricia", "Allan", "Camille", "Rodel", "Trisha", "Noel", "Angelica", "Ronald", "Maricel", "Jayson", "Clarisse", "Bianca", "Vincent", "Lovely", "Arnel", "Shiela", "Danica", "Edgar", "Hazel", "Mylene", "Joseph", "Rica", "Francis", "Aileen", "Gilbert", "Charmaine", "Erwin", "Janine", "Leo", "Katrina", "Benjie"]
const LAST = ["Garcia", "Reyes", "Mendoza", "Flores", "Gonzales", "Villanueva", "Fernandez", "Cruz", "De Guzman", "Lopez", "Perez", "Francisco", "Rivera", "Castro", "Sanchez", "De Leon", "Domingo", "Marquez", "Pascual", "Navarro", "Salazar", "Tolentino", "Ocampo", "Valdez", "Soriano", "Chua", "Sy", "Go"]
const EMPLOYERS = ["Pacific Sun Electronics", "Metro Hospital Group", "Northpoint Call Solutions", "Luzon Grid Services", "Visayas Shipping Lines", "Isla Foods Corporation", "Summit BPO Philippines", "Bayview Pharma Distribution", "Mabuhay Logistics", "Tala Software Studio", "Sta. Rosa Auto Parts", "Self-employed (online retail)", "Self-employed (restaurant)"]
const PAYROLL = ["Cordillera Foods (payroll partner)", "Department of Education (payroll partner)", "Metro Hospital Group"]

/** How many generated cases sit at each stage (the prototype's seed plan). */
export const SEED_PLAN: Array<[string, number]> = [
  ["Review", 30], ["Review-unassigned", 12], ["Info requested", 10], ["Approval", 14], ["Offer", 8], ["Documentation", 12], ["Booking", 13], ["Booking-failed", 11], ["Pending checker", 12], ["Disbursed", 30], ["Declined", 12], ["Withdrawn", 6], ["Draft", 8],
]

function extendSeed(apps: Application[]): void {
  let r = 20261127
  const rnd = () => {
    r = (r * 16807) % 2147483647
    return r / 2147483647
  }
  const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)] as T
  const between = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))
  const used: Record<string, true> = {}
  apps.forEach((a) => (used[a.name] = true))
  const name = () => {
    let n: string
    do n = `${pick(FIRST)} ${pick(LAST)}`
    while (used[n])
    used[n] = true
    return n
  }
  const pad = (v: number) => (v < 10 ? "0" : "") + v
  const time = (dayAgo: number) => {
    const h = dayAgo ? between(8, 18) : between(7, 10)
    const m = between(0, 59)
    return `${27 - dayAgo} Nov, ${pad(h)}:${pad(m)}`
  }
  const plan = SEED_PLAN.flatMap(([v, k]) => Array.from({ length: k }, () => v))
  let n = 2101
  let ofc = 0
  let loanSeq = 1180
  const cfg = baseCfg()

  for (const target of plan) {
    const stage = target.replace("-unassigned", "").replace("-failed", "") as Stage
    if (stage === "Draft") {
      const dn = name()
      const dp: ProductCode = rnd() < 0.6 ? "PL" : "SL"
      const damt = (dp === "PL" ? between(3, 30) : between(2, 15)) * 10000
      const dten = dp === "PL" ? 24 : 12
      const dinc = between(25, 90) * 1000
      const dc = time(rnd() < 0.5 ? 0 : 1)
      const did = `APP-${n++}`
      const govId = `PSN-${between(1000, 9999)}-${between(1000, 9999)}-${between(1000, 9999)}`
      const age = String(between(23, 55))
      const employer = pick(EMPLOYERS)
      const c2 = rnd() < 0.5
      apps.push(
        mk({
          id: did, name: dn, product: dp, amount: damt, tenor: dten, channel: "Branch", branch: "Makati Ayala", stage: "Draft", created: dc,
          consent: false, govId,
          docs: [["Government ID", "Received"], ["Payslip", "Missing"]],
          hist: [H("Bea Santiago", "Started assisted application; payslip outstanding", dc)],
          naDraft: { cif: "", name: dn, age, employer, product: dp, amount: damt, tenor: dten, purpose: "Personal", income: dinc, obligations: Math.round(dinc * 0.1), c1: true, c2, c3: false, scans: { id: true }, useVerified: null },
        })
      )
      continue
    }
    const product: ProductCode = rnd() < 0.6 ? "PL" : "SL"
    const P = { autoLimit: product === "PL" ? 200000 : 150000 }
    const channel = pick<Channel>(["Web app", "Web app", "Web app", "Web app", "Web app", "Branch", "Branch", "File intake"])
    const dayAgo = ["Disbursed", "Declined", "Withdrawn", "Documentation", "Booking", "Pending checker"].includes(stage) ? (rnd() < 0.6 ? 1 : between(2, 4)) : rnd() < 0.75 ? 0 : 1
    const nm = name()
    const employer = product === "SL" ? pick(PAYROLL) : pick(EMPLOYERS)
    let amount = product === "PL" ? between(3, 45) * 10000 : between(2, 22) * 10000
    const tenor = product === "PL" ? pick([12, 18, 24, 36]) : pick([6, 12, 18, 24])
    const income = between(25, 140) * 1000
    const years = between(0, 12)
    const wantRefer = ["Review", "Info requested", "Approval"].includes(stage)
    const wantDecline = stage === "Declined"
    const age = between(23, 58)
    const defaulted = wantDecline && rnd() < 0.3
    const bureauFile = wantRefer && rnd() < 0.4 ? "Thin file" : "Full file"
    const dti = wantRefer && rnd() < 0.4 ? 0.42 + rnd() * 0.05 : 0.08 + rnd() * 0.22
    const stable = years > 0 && rnd() < 0.8
    const x: Omit<DecisionInput, "amount"> & { amount: number } = { product, amount, age, sanctions: false, defaulted, bureau: bureauFile, years, dti, mismatch: 0, stable }
    if (wantDecline && !x.defaulted) x.scoreOverride = between(520, 595)
    else if (!wantRefer) {
      x.scoreOverride = between(705, 790)
      x.amount = amount = Math.min(amount, P.autoLimit)
    } else if (x.bureau === "Full file" && x.dti < 0.4 && amount <= P.autoLimit) x.scoreOverride = between(610, 695)
    let d = decidePesos(x, cfg)
    if (wantRefer && d.outcome !== "refer") {
      x.scoreOverride = between(610, 695)
      d = decidePesos(x, cfg)
    }
    if (!wantRefer && !wantDecline && d.outcome === "decline") {
      x.scoreOverride = between(705, 790)
      d = decidePesos(x, cfg)
    }
    const id = `APP-${n++}`
    const created = time(dayAgo)
    const bo = channel === "Branch" ? (rnd() < 0.6 ? "Bea Santiago" : pick(STAFF_POOL.branch)) : null
    const owner = ["Review", "Info requested"].includes(stage) && !target.includes("unassigned") ? (rnd() < 0.55 ? "Miguel Ramos" : (STAFF_POOL.officer[1 + (ofc++ % 3)] as string)) : null
    const sla = ["Review", "Info requested", "Approval"].includes(stage) ? between(-4, 7) : ["Booking", "Documentation", "Pending checker"].includes(stage) ? between(1, 20) : null
    const cif = years > 0 ? `CIF-00${between(10000, 59999)}` : null
    const a = mk({
      id, name: nm, product, amount, tenor, channel, stage, owner, branch: bo ? (BRANCH_OF[bo] ?? null) : null, created, sla,
      age: x.age, cif, employer, income, verified: income, obligations: Math.round(income * x.dti),
      outcome: d.outcome, score: d.score, grade: d.grade, pd: d.pd, trigger: d.trigger, ruleset: "v4", model: MODEL_VERSION, bands: { approve: 700, decline: 600 }, reasons: d.reasons, rules: d.rules,
      aiRec: d.outcome !== "decline" ? { decision: "approve", amount: aiAmount(income, amount), tenor } : null,
      // Generated cases carry no ID number in the prototype; screens show PSN-0000-0000-0000.
      govId: undefined,
    })
    const provider = rnd() < 0.7 ? "TransUnion PH" : "CIBI (simulated)"
    const bScore = x.bureau === "Full file" && d.score ? d.score + between(-8, 8) : null
    const lines = x.bureau === "Full file" ? between(2, 9) : 1
    const util = `${between(10, 70)}%`
    const delinq = rnd() < 0.85 ? "None" : "1 late payment, 2024"
    a.bureau = { provider, file: x.bureau, score: bScore, lines, util, delinq }
    if (years > 0) {
      const balance = between(5, 900) * 1000
      const loans = rnd() < 0.6 ? "None" : "Credit card, current"
      a.core = { since: 2026 - years, balance, inflow: x.stable ? `${peso(income)} monthly` : "Irregular", loans }
    }
    a.checks = [["eKYC and liveness", "HyperVerge (simulated)", "Pass"], ["AML and sanctions", "LSEG World-Check (simulated)", "Clear"], ["Fraud signals", "SEON (simulated)", "Low risk"], ["Credit bureau", "TransUnion PH (simulated)", x.bureau]]
    a.docs = [["Government ID", "Verified"], ["Payslip (Oct 2026)", "Verified"]]
    if (x.defaulted && wantDecline) {
      a.trigger = "Policy knockout: No existing default"
      a.score = null
      a.grade = null
    }
    const h = (who: string, what: string) => a.hist.push(H(who, what, created))
    h(
      channel === "Branch" ? (bo as string) : channel === "File intake" ? "Andrea Lim" : nm,
      channel === "Branch" ? `Captured assisted application at ${a.branch} branch` : channel === "File intake" ? "Submitted from partner spreadsheet after staff review" : "Submitted application in WhiteBank online"
    )
    h("System", d.outcome === "approve" ? `Auto-approved: score ${d.score} (${d.grade}) · rule set v4` : d.outcome === "refer" ? `Referred: ${d.trigger}` : `Auto-declined: ${a.trigger}`)
    if (owner) h("System", `Assigned to ${owner} (round robin)`)
    const approved = ["Offer", "Documentation", "Booking", "Pending checker", "Disbursed", "Withdrawn"].includes(stage)
    if (d.outcome === "refer" && (approved || stage === "Approval")) {
      const by = pick(STAFF_POOL.officer)
      const amt = a.aiRec ? a.aiRec.amount : amount
      a.recommendation = { by, decision: amt === amount ? "approve" : "counter", amount: amt, tenor, note: "Income and relationship support the recommended amount.", reason: null, overLevel: null }
      h(by, `Recommended ${a.recommendation.decision === "counter" ? "counter-offer " : "approval "}${peso(amt)} / ${tenor} months`)
      if (approved) h(pick(STAFF_POOL.approver), "Approved within authority")
    }
    if (approved) a.offer = { amount: a.recommendation ? a.recommendation.amount : amount, tenor, grade: (a.grade || "B") as Grade }
    if (["Documentation", "Booking", "Pending checker", "Disbursed"].includes(stage)) h(nm, "Accepted offer and acknowledged the disclosure statement")
    if (stage === "Documentation") {
      a.borrowerPending = rnd() < 0.6 ? "sign" : null
      if (a.borrowerPending) {
        a.docs.push(["Loan agreement", "Sent for signature"], ["Disclosure statement", "Sent for signature"], ["Promissory note", "Sent for signature"])
        h("Paolo Reyes", "Generated documents from templates and sent for e-signature")
      }
    }
    if (["Booking", "Pending checker", "Disbursed"].includes(stage)) {
      a.signed = true
      a.docs.push(["Loan agreement", "Signed"], ["Disclosure statement", "Acknowledged"], ["Promissory note", "Signed"])
      h(nm, "E-signed all loan documents")
    }
    if (stage === "Pending checker") {
      a.booking = { status: "pending", maker: "Paolo Reyes", key: `bk-${id}-${Math.floor(rnd() * 65535).toString(16)}`, attempts: 0 }
      h("Paolo Reyes", `Submitted booking for checker (idempotency key ${a.booking.key})`)
    }
    if (stage === "Disbursed") {
      a.loanNo = `LN-2026-${loanSeq++}`
      a.booking = { status: "booked", maker: "Paolo Reyes", checker: "Celine Uy", key: `bk-${id}`, attempts: 1 }
      a.disbTo = `WhiteBank Savings ••${between(1000, 9999)}`
      a.disbAt = created
      h("Celine Uy", "Approved booking as checker (maker: Paolo Reyes)")
      h("System", `Core created loan account ${a.loanNo}; disbursed ${peso((a.offer as { amount: number }).amount)}`)
    }
    if (stage === "Info requested") {
      a.infoReq = "Bank statements, 3 months"
      a.docs.push(["Bank statements, 3 months", "Missing"])
      h(owner as string, "Requested from borrower: bank statements, 3 months")
    }
    if (stage === "Withdrawn") h("System", "Offer expired after 5 days without acceptance")
    if (target === "Booking-failed") {
      const ft = `26 Nov, 16:${10 + between(0, 49)}`
      const key = `bk-${id}-${Math.floor(rnd() * 65535).toString(16)}`
      const error = pick(["Core banking timeout after 30s (POST /loans). No account was created.", "Core banking returned 503 Service Unavailable. No account was created.", "Connection reset by core banking gateway. No account was created."])
      a.booking = { status: "failed", maker: "Paolo Reyes", checker: "Celine Uy", key, error, attempts: 1, failedAt: ft }
      a.sla = between(1, 6)
      a.hist.push(H("Paolo Reyes", `Submitted booking for checker (idempotency key ${key})`, ft))
      a.hist.push(H("Celine Uy", "Approved booking as checker (maker: Paolo Reyes)", ft))
      a.hist.push(H("System", "Booking failed during core banking outage. Moved to booking exceptions.", ft))
    }
    apps.push(a)
  }
}

function enrichHist(a: Application): void {
  const first = a.hist[0]
  if (!first || a.stage === "Draft") return
  const w = first.when
  const aml = a.aml === "Open"
  const pre = [
    H("System", "Application received; acknowledgement sent to the borrower by email", w),
    H("System", "Consent records stored: credit check, data processing, terms v3.2", w),
    H("System", "eKYC and liveness check passed (HyperVerge, simulated)", w),
    H("System", aml ? "AML screening: possible match found (LSEG World-Check, simulated)" : "AML and sanctions screening clear (LSEG World-Check, simulated)", w),
    H("System", "Fraud signals: low risk (SEON, simulated)", w),
  ]
  if (!aml)
    pre.push(
      H("System", `Credit bureau report pulled (${a.bureau ? a.bureau.provider : "TransUnion PH"}, simulated)`, w),
      H("System", `Policy rules evaluated under rule set ${a.ruleset || "v4"}; knockouts first`, w),
      H("System", `AI score returned in 1.4 s (${a.model || MODEL_VERSION})`, w)
    )
  const post = [H("System", "Status update sent to the borrower (email and push)", (a.hist[1] || first).when)]
  a.hist = [first, ...pre, ...a.hist.slice(1, 2), ...post, ...a.hist.slice(2)]
  if (["Review", "Info requested", "Approval"].includes(a.stage) && a.sla != null && a.sla <= 2)
    a.hist.push(H("System", a.sla < 0 ? "SLA breached; escalated to the credit team lead" : "SLA warning: under 2 hours left in this stage", w))
}

function seedDrafts(apps: Application[]): IntakeDraft[] {
  const fi = apps.filter((a) => a.channel === "File intake")
  const src = ["DepEd payroll file, row ", "Metro Hospital HR file, row ", "Cordillera Foods HR file, row "]
  const out: IntakeDraft[] = fi.map((a, i) => ({
    name: a.name, product: a.product, amount: a.amount, tenor: a.tenor, income: a.income ?? 0, age: a.age ?? 30,
    source: `${src[i % 3]}${4 + i} (2${4 + (i % 3)} Nov)`, flag: null, status: "Submitted", app: a.id,
  }))
  const extra: Array<[string, ProductCode, number, number, number, number, string, string | null]> = [
    ["Benjie Lopez", "PL", 120000, 24, 52000, 44, "Email from b.lopez@… with 2 attachments", null],
    ["Erwin Domingo", "PL", 90000, 18, 47000, 37, "Email from e.domingo@… with 3 attachments", "Signed consent form missing"],
    ["Francis Yap", "SL", 30000, 6, 25000, 26, "Metro Hospital HR file, row 19 (27 Nov)", "Government ID number missing"],
  ]
  for (const r of extra) out.unshift({ name: r[0], product: r[1], amount: r[2], tenor: r[3], income: r[4], age: r[5], source: r[6], flag: r[7], status: "Draft" })
  return out
}

function seedAml(): StaffState["amlCases"] {
  return [
    { app: "APP-2050", name: "Arturo Santos", match: "OFAC SDN list · 94% name match", status: "Open" }, { app: null, name: "Mylene Castillo", match: "Domestic PEP list · mayor’s spouse", status: "Open" }, { app: null, name: "Rolando Bernal", match: "UN sanctions list · 82% name match", status: "Open" }, { app: null, name: "Cynthia Ong", match: "Adverse media · fraud case 2023", status: "Open" },
    { app: null, name: "Jerome De Leon", match: "UN sanctions list · 71% name match", status: "Cleared: false positive (birth date differs)" }, { app: null, name: "Marvin Tan", match: "OFAC SDN list · 68% name match", status: "Cleared: false positive (nationality differs)" }, { app: null, name: "Lourdes Reyes", match: "Domestic PEP list · barangay captain", status: "Exported to AML system" }, { app: null, name: "Patrick Sy", match: "EU sanctions list · 74% name match", status: "Cleared: false positive (middle name differs)" },
    { app: null, name: "Joanna Flores", match: "Adverse media · estafa complaint 2024", status: "Exported to AML system" }, { app: null, name: "Rey Villamor", match: "Domestic PEP list · provincial board member", status: "Exported to AML system" }, { app: null, name: "Ana Lim", match: "OFAC SDN list · 66% name match", status: "Cleared: false positive (birth date differs)" }, { app: null, name: "Dennis Uy", match: "UN sanctions list · 70% name match", status: "Cleared: false positive (address differs)" },
  ]
}

function seedCic(): StaffState["cicHist"] {
  const m = ["Oct", "Sep", "Aug", "Jul", "Jun", "May", "Apr", "Mar", "Feb", "Jan"]
  const out: StaffState["cicHist"] = []
  const recs = 216880
  m.forEach((mo, i) => {
    const mm = `0${10 - i}`.slice(-2)
    const next = m[i - 1] || "Nov"
    out.push([`CIC_WHITEBANK_2026${mm}.txt`, `${mo} 2026`, (recs - i * 2760).toLocaleString("en-PH"), 0, `Submitted ${4 + (i % 3)} ${next}`])
    if (i % 3 === 0) out.push([`BSP_FRP_CONSUMER_2026${mm}.xlsx`, `${mo} 2026`, "—", 0, `Submitted 10 ${next}`])
  })
  return out
}

function seedRelated(): string[][] {
  return [
    ["Benjie Sy", "Brother of a director", "LN-2026-1131 · personal loan ₱300,000", "Board credit committee", "14 Oct 2026"], ["Rica Chua", "Spouse of a senior vice president", "LN-2026-1127 · personal loan ₱150,000", "Board credit committee", "14 Oct 2026"], ["Gilbert Go", "Branch manager, Iloilo", "LN-2026-1109 · salary loan ₱90,000", "Head of credit (L2)", "11 Nov 2026"], ["Teodoro Lim", "Director", "Personal loan ₱450,000 · in review", "Awaiting board", "—"],
    ["Aurora Cruz", "Mother of a director", "LN-2026-1088 · personal loan ₱200,000", "Board credit committee", "9 Sep 2026"], ["Victor Uy", "Senior vice president", "LN-2026-1061 · salary loan ₱250,000", "Board credit committee", "9 Sep 2026"], ["Lea Santos", "Branch manager, Makati Ayala", "LN-2026-1044 · salary loan ₱120,000", "Head of credit (L2)", "12 Aug 2026"], ["Paul Chua", "Son of a senior vice president", "LN-2026-1020 · personal loan ₱180,000", "Board credit committee", "12 Aug 2026"],
    ["Grace Tan", "Vice president, treasury", "LN-2026-0998 · salary loan ₱150,000", "Head of credit (L2)", "15 Jul 2026"], ["Noel Sy", "Brother-in-law of a director", "LN-2026-0971 · personal loan ₱350,000", "Board credit committee", "15 Jul 2026"], ["Irene Go", "Assistant vice president, operations", "LN-2026-0945 · salary loan ₱100,000", "Head of credit (L2)", "10 Jun 2026"], ["Ramon Lim", "Nephew of a director", "LN-2026-0920 · personal loan ₱220,000", "Board credit committee", "10 Jun 2026"],
  ]
}

function seedCampaigns(): string[][] {
  return [
    ["Salary loan top-up · DepEd teachers", "12,400 eligible", "1,980 accepted", "₱148.5M booked", "Running"], ["Personal loan · payroll partners, grade A", "8,900 eligible", "1,120 accepted", "₱201.6M booked", "Running"], ["Personal loan · existing depositors", "6,150 eligible", "410 accepted", "₱52.0M booked", "Ended 15 Nov"], ["Salary loan · Metro Hospital nurses", "2,300 eligible", "390 accepted", "₱27.3M booked", "Running"],
    ["Personal loan · Christmas 2026", "15,200 eligible", "—", "—", "Starts 1 Dec"], ["Salary loan · BPO payroll partners", "9,800 eligible", "1,460 accepted", "₱102.2M booked", "Ended 31 Oct"], ["Personal loan · grade A repeat borrowers", "4,100 eligible", "820 accepted", "₱131.2M booked", "Ended 30 Sep"], ["Salary loan · back-to-school", "11,600 eligible", "2,240 accepted", "₱156.8M booked", "Ended 31 Jul"],
    ["Personal loan · OFW families", "3,700 eligible", "280 accepted", "₱39.2M booked", "Ended 30 Jun"], ["Salary loan · summer 2026", "10,900 eligible", "1,710 accepted", "₱119.7M booked", "Ended 31 May"], ["Personal loan · new depositors 2025", "5,300 eligible", "300 accepted", "₱36.0M booked", "Ended 30 Apr"], ["Salary loan · Holy Week", "8,200 eligible", "1,050 accepted", "₱73.5M booked", "Ended 5 Apr"],
  ]
}

const c = (pesos: number) => toCentavos(pesos)
const cn = (pesos: number | null | undefined) => (pesos == null ? pesos : toCentavos(pesos))

/** Converts a peso-valued seeded case to integer centavos in place. */
function toCentavosCase(a: Application): Application {
  a.amount = c(a.amount)
  if (a.income != null) a.income = c(a.income)
  if (a.verified != null) a.verified = c(a.verified)
  if (a.obligations != null) a.obligations = c(a.obligations)
  if (a.recDefault != null) a.recDefault = c(a.recDefault)
  if (a.offer) a.offer.amount = c(a.offer.amount)
  if (a.recommendation) a.recommendation.amount = c(a.recommendation.amount)
  if (a.aiRec) a.aiRec.amount = c(a.aiRec.amount)
  if (a.core) a.core.balance = c(a.core.balance)
  if (a.naDraft) {
    a.naDraft.amount = cn(a.naDraft.amount) ?? null
    a.naDraft.income = cn(a.naDraft.income) ?? null
    a.naDraft.obligations = cn(a.naDraft.obligations) ?? null
  }
  return a
}

/** Fresh seed state. Deterministic: the same result on every call. */
export function seed(): StaffState {
  const apps = namedCases()
  extendSeed(apps)
  apps.forEach(enrichHist)

  const audit: AuditEntry[] = []
  for (const a of apps) for (const h of a.hist) audit.push({ when: h.when, who: h.who, role: roleOf(h.who), what: h.what, target: a.id })
  audit.push({ when: "20 Nov, 16:40", who: "Jonas Mercado", role: "Tenant administrator", what: "Approved and published rule set v4 (maker-checker; drafted by Rafael Cruz)", target: "" })
  audit.sort((x, y) => tOrd(y.when) - tOrd(x.when))

  const drafts = seedDrafts(apps).map((d) => ({ ...d, amount: c(d.amount), income: c(d.income) }))
  apps.forEach(toCentavosCase)

  return {
    tenantId: TENANT_ID,
    apps,
    cfg: baseCfg(),
    audit,
    intakeFile: null,
    clock: 0,
    seq: 1300,
    flags: { ai: true },
    prodOverrides: {},
    pdraft: null,
    cic: [],
    drafts,
    amlCases: seedAml(),
    cicHist: seedCic(),
    related: seedRelated(),
    campaigns: seedCampaigns(),
    notifRead: {},
  }
}

export type { Outcome }
