/**
 * Read-only views for the configuration screens, ported from
 * `apps/backoffice`'s `selectors-admin.ts`. This app has no loan-application
 * pipeline of its own, so the sample data these selectors shape (the test
 * harness, the delivery log, overrides, the directory) is synthetic rather
 * than derived from any `apps` array.
 */
import { simulateDecision, toCentavos, type DecisionPolicy, type Outcome, type PolicyRule } from "@aim-ready/core"

import { BANK_NAME, TENANT_ID } from "./constants"
import { products } from "./engine"
import { MODEL_VERSION } from "./seed"
import type { AdminState, AuditEntry, TriggerKey } from "./types"

/**
 * Test harness: replays the same 1,240 synthetic personal-loan applications
 * (fixed-seed RNG, as `apps/backoffice`'s) through a rule set and counts
 * outcomes.
 */
export function harness(s: AdminState, rules: PolicyRule[], bands: { approve: number; decline: number }, triggers?: Record<TriggerKey, boolean>): Record<Outcome, number> {
  let sd = 7
  const rnd = () => {
    sd = (sd * 16807) % 2147483647
    return sd / 2147483647
  }
  const p = products(s)
  const policy: DecisionPolicy = {
    rules, bands, triggers: triggers || s.cfg.triggers, autoLimits: { PL: p.PL.autoLimit, SL: p.SL.autoLimit }, automation: { PL: "live", SL: "live" },
    killSwitch: false, bureauDown: false, ruleSetVersion: s.cfg.ruleset.pub, modelVersion: MODEL_VERSION, bankName: BANK_NAME,
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

/** Simulated delivery log: sample messages, one per synthetic case (no `apps` array here). */
export function notificationLog(): Array<[string, string, string, string, string]> {
  const EVENTS = ["Offer ready", "Document needed", "Application decision", "Funds released", "Status update"] as const
  const NAMES = ["Andrea Valdez", "Rico Manalo", "Lorna Gatchalian", "Grace Medina", "Marco Aquino", "Teresa Lim", "Carlo Torres", "Nicole Santos"]
  const out: Array<[string, string, string, string, string]> = []
  for (let i = 0; i < 24; i++) {
    out.push([`${27 - (i % 3)} Nov, ${String(8 + (i % 10)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`, NAMES[i % NAMES.length] as string, EVENTS[i % EVENTS.length] as string, ["SMS", "Push", "Email"][i % 3] as string, i % 9 === 4 ? "Failed · retried" : "Delivered"])
  }
  return out
}

const OVERRIDES: Array<[string, string, string, string, string, string]> = [
  ["26 Nov, 14:40", "Andrea Lim", "counter-offer ₱120,000 / 18 months", "above", "Lower amount keeps repayments affordable", "APP-2113"], ["26 Nov, 13:05", "Miguel Ramos", "approval ₱200,000 / 24 months", "below", "Verified income supports a higher amount", "APP-2117"], ["26 Nov, 10:22", "Nicole Santos", "counter-offer ₱90,000 / 12 months", "above", "Risk higher than the score suggests", "APP-2121"], ["25 Nov, 16:48", "Carlo Torres", "approval ₱150,000 / 24 months", "below", "Strong deposit relationship with Kalinaw", "APP-2124"], ["25 Nov, 15:10", "Miguel Ramos", "counter-offer ₱180,000 / 36 months", "above", "Lower amount keeps repayments affordable", "APP-2128"],
  ["25 Nov, 11:31", "Andrea Lim", "approval ₱60,000 / 12 months", "below", "Additional documents reduce risk", "APP-2133"], ["25 Nov, 09:02", "Nicole Santos", "decline", "above", "Risk higher than the score suggests", "APP-2137"], ["24 Nov, 17:20", "Carlo Torres", "approval ₱250,000 / 36 months", "above", "Verified income supports a higher amount", "APP-2140"], ["24 Nov, 14:44", "Miguel Ramos", "counter-offer ₱70,000 / 12 months", "below", "Lower amount keeps repayments affordable", "APP-2144"], ["24 Nov, 10:15", "Andrea Lim", "approval ₱110,000 / 18 months", "below", "Strong deposit relationship with Kalinaw", "APP-2148"],
]

/** Overrides of the AI recommendation: live audit entries plus sample history. */
export function overrides(s: AdminState): Array<Pick<AuditEntry, "tenantId" | "when" | "who" | "what" | "target">> {
  return [
    ...s.audit.filter((a) => /override/i.test(a.what)),
    ...OVERRIDES.map((r) => ({ tenantId: s.tenantId, when: r[0], who: r[1], what: `Recommended ${r[2]} · override (${r[3]} ₱50,000 threshold): ${r[4]}`, target: r[5] })),
  ]
}

const MORE_USERS: Array<[string, string, string]> = [
  ["Andrea Lim", "Loan officer", "Consumer credit · Metro Manila"], ["Carlo Torres", "Loan officer", "Consumer credit · Metro Manila"], ["Nicole Santos", "Loan officer", "Consumer credit · Visayas"], ["Jose Navarro", "Approver", "Authority ₱1,000,000 · grades A–C"], ["Maria Villareal", "Approver", "Authority ₱1,000,000 · grades A–C"], ["Rowena Dizon", "Branch officer", "Quezon Avenue branch"], ["Jessa Manalo", "Branch officer", "Cebu IT Park branch"], ["Arvin Co", "Branch officer", "Ortigas Center branch"],
  ["Liza Mercado", "Loan operations", "Credit administration · maker"], ["Rommel Dizon", "Loan operations supervisor", "Booking checker"], ["Patricia Gomez", "Credit risk manager", "Model risk"], ["Rafael Cruz", "Credit risk manager", "Credit policy"], ["Allan Reyes", "Compliance and audit", "Read-only access"], ["Nina Torres", "Compliance and audit", "Read-only access"],
]

export type DirectoryUser = { tenantId: string; name: string; title: string; unit: string; id: string }

/** Staff synced from the backoffice identity service (shown read-only here too). */
export function directoryUsers(): DirectoryUser[] {
  return [
    { tenantId: TENANT_ID, name: "Jonas Mercado", title: "Tenant administrator", unit: "Kalinaw Bank IT", id: "admin@kalinawbank.ph" },
    ...MORE_USERS.map((r, i) => ({ tenantId: TENANT_ID, name: r[0], title: r[1], unit: r[2], id: `EMP-${10240 + i * 17}` })),
  ]
}
