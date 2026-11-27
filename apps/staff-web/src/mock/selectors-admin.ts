/**
 * Read-only views for reports, compliance and configuration screens, ported
 * from the prototype's admin screens.
 */
import { simulateDecision, toCentavos, type DecisionPolicy, type Outcome, type PolicyRule } from "@aim-ready/core"

import { STAFF_ORDER, USERS } from "./constants"
import { products } from "./engine"
import { MODEL_VERSION } from "./seed"
import type { AuditEntry, StaffState, TriggerKey } from "./types"

/** Decision mix over the cases in this demo. */
export function decisionStats(s: StaffState) {
  const d = s.apps.filter((a) => a.outcome)
  const n = (k: Outcome) => d.filter((a) => a.outcome === k).length
  return { n: d.length, ap: n("approve"), rf: n("refer"), dc: n("decline") }
}

/**
 * Test harness: replays the same 1,240 synthetic personal-loan applications
 * (fixed-seed RNG, as the prototype) through a rule set and counts outcomes.
 */
export function harness(s: StaffState, rules: PolicyRule[], bands: { approve: number; decline: number }, triggers?: Record<TriggerKey, boolean>): Record<Outcome, number> {
  let sd = 7
  const rnd = () => {
    sd = (sd * 16807) % 2147483647
    return sd / 2147483647
  }
  const p = products(s)
  const policy: DecisionPolicy = {
    rules, bands, triggers: triggers || s.cfg.triggers, autoLimits: { PL: p.PL.autoLimit, SL: p.SL.autoLimit }, automation: { PL: "live", SL: "live" },
    killSwitch: false, bureauDown: false, ruleSetVersion: s.cfg.ruleset.pub, modelVersion: MODEL_VERSION,
  }
  const out: Record<Outcome, number> = { approve: 0, refer: 0, decline: 0 }
  for (let i = 0; i < 1240; i++) {
    const amount = 20000 + Math.floor(rnd() * 40) * 10000
    const age = 21 + Math.floor(rnd() * 40)
    const sanctions = rnd() < 0.004
    const defaulted = rnd() < 0.02
    const bureau = rnd() < 0.18 ? "Thin file" : "Full file"
    const years = Math.floor(rnd() * 9)
    const dti = rnd() * 0.55
    const mismatch = rnd() < 0.07 ? 0.25 : 0
    const stable = rnd() < 0.6
    out[simulateDecision({ product: "PL", amount: toCentavos(amount), age, sanctions, defaulted, bureau, years, dti, mismatch, stable }, policy).outcome]++
  }
  return out
}

/** Simulated delivery log: one message per case. [sent, recipient, event, channel, status]. */
export function notificationLog(s: StaffState): Array<[string, string, string, string, string]> {
  return s.apps.map((a, i) => [
    a.created,
    a.name,
    a.stage === "Offer" ? "Offer ready" : a.stage === "Info requested" ? "Document needed" : a.stage === "Declined" ? "Application decision" : a.stage === "Disbursed" ? "Funds released" : "Status update",
    ["SMS", "Push", "Email"][i % 3] as string,
    i % 9 === 4 ? "Failed · retried" : "Delivered",
  ])
}

const OVERRIDES: Array<[string, string, string, string, string, string]> = [
  ["26 Nov, 14:40", "Andrea Lim", "counter-offer ₱120,000 / 18 months", "above", "Lower amount keeps repayments affordable", "APP-2113"], ["26 Nov, 13:05", "Miguel Ramos", "approval ₱200,000 / 24 months", "below", "Verified income supports a higher amount", "APP-2117"], ["26 Nov, 10:22", "Nicole Santos", "counter-offer ₱90,000 / 12 months", "above", "Risk higher than the score suggests", "APP-2121"], ["25 Nov, 16:48", "Carlo Torres", "approval ₱150,000 / 24 months", "below", "Strong deposit relationship with Kalinaw", "APP-2124"], ["25 Nov, 15:10", "Miguel Ramos", "counter-offer ₱180,000 / 36 months", "above", "Lower amount keeps repayments affordable", "APP-2128"],
  ["25 Nov, 11:31", "Andrea Lim", "approval ₱60,000 / 12 months", "below", "Additional documents reduce risk", "APP-2133"], ["25 Nov, 09:02", "Nicole Santos", "decline", "above", "Risk higher than the score suggests", "APP-2137"], ["24 Nov, 17:20", "Carlo Torres", "approval ₱250,000 / 36 months", "above", "Verified income supports a higher amount", "APP-2140"], ["24 Nov, 14:44", "Miguel Ramos", "counter-offer ₱70,000 / 12 months", "below", "Lower amount keeps repayments affordable", "APP-2144"], ["24 Nov, 10:15", "Andrea Lim", "approval ₱110,000 / 18 months", "below", "Strong deposit relationship with Kalinaw", "APP-2148"],
]

/** Overrides of the AI recommendation: live audit entries plus sample history. */
export function overrides(s: StaffState): Array<Pick<AuditEntry, "when" | "who" | "what" | "target">> {
  return [
    ...s.audit.filter((a) => /override/i.test(a.what)),
    ...OVERRIDES.map((r) => ({ when: r[0], who: r[1], what: `Recommended ${r[2]} · override (${r[3]} ₱50,000 threshold): ${r[4]}`, target: r[5] })),
    { when: "26 Nov, 15:12", who: "Carlo Torres", what: "Recommended counter-offer ₱150,000 / 24 months · override (above ₱50,000 threshold): Strong deposit relationship with Kalinaw", target: "APP-2109" },
    { when: "26 Nov, 11:40", who: "Nicole Santos", what: "Recommended approval ₱80,000 / 12 months · override (below ₱50,000 threshold): Verified income supports a higher amount", target: "APP-2104" },
  ]
}

const MORE_USERS: Array<[string, string, string]> = [
  ["Andrea Lim", "Loan officer", "Consumer credit · Metro Manila"], ["Carlo Torres", "Loan officer", "Consumer credit · Metro Manila"], ["Nicole Santos", "Loan officer", "Consumer credit · Visayas"], ["Jose Navarro", "Approver", "Authority ₱1,000,000 · grades A–C"], ["Maria Villareal", "Approver", "Authority ₱1,000,000 · grades A–C"], ["Rowena Dizon", "Branch officer", "Quezon Avenue branch"], ["Jessa Manalo", "Branch officer", "Cebu IT Park branch"], ["Arvin Co", "Branch officer", "Ortigas Center branch"], ["Kevin Uy", "Branch officer", "Davao Lanang branch"], ["Liza Mercado", "Loan operations", "Credit administration · maker"], ["Rommel Dizon", "Loan operations supervisor", "Booking checker"],
  ["Teodoro Lim", "Approver", "Head of credit · L2"], ["Patricia Gomez", "Credit risk manager", "Model risk"], ["Allan Reyes", "Compliance and audit", "Read-only access"], ["Camille Ramos", "Tenant administrator", "Kalinaw Bank IT"], ["Ronald Cruz", "Branch officer", "Alabang Town Center branch"], ["Bianca Sy", "Branch officer", "Iloilo Business Park branch"], ["Vincent Tan", "Loan officer", "Consumer credit · Mindanao"], ["Hazel Garcia", "Loan operations", "Credit administration · maker"], ["Edgar Flores", "Approver", "Authority ₱1,000,000 · grades A–C"], ["Janine Ocampo", "Branch officer", "Baguio Session Road branch"], ["Leo Valdez", "Loan officer", "Consumer credit · Visayas"],
]

export type DirectoryUser = { name: string; title: string; unit: string; id: string }

/** Staff synced from the backoffice identity service (30 shown). */
export function directoryUsers(): DirectoryUser[] {
  return [
    ...STAFF_ORDER.map((k) => ({ name: USERS[k].name, title: USERS[k].title, unit: USERS[k].unit, id: USERS[k].email })),
    ...MORE_USERS.map((r, i) => ({ name: r[0], title: r[1], unit: r[2], id: `EMP-${10240 + i * 17}` })),
  ]
}

/** Tenant pricing grid, for the product screen. */
export { GRADE_RATE } from "./constants"
