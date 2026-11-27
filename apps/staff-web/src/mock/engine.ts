/**
 * Pure helpers over the simulated state: who is acting, the clock, the audit
 * trail, products with published overrides, the decision policy and loan
 * terms. Used by both selectors (read) and actions (inside `update`).
 */
import { disclosure, formatPeso, type Centavos, type DecisionPolicy, type Disclosure, type Grade } from "@aim-ready/core"

import { BASE_PRODUCTS, GRADE_RATE, TODAY, USERS } from "./constants"
import { H, MODEL_VERSION, roleOf } from "./seed"
import type { Application, BaseRole, Product, ProductCode, RoleKey, StaffState, StaffUser } from "./types"

export const peso = (c: Centavos, decimals: 0 | 2 = 0) => formatPeso(c, { decimals })

export function me(role: RoleKey | null): StaffUser {
  return USERS[role ?? "officer"]
}

/** The role whose screens the user sees (the ops supervisor works as loan operations). */
export function baseRole(role: RoleKey | null): BaseRole | null {
  if (!role) return null
  return USERS[role].base ?? (role as BaseRole)
}

export function isReadOnly(role: RoleKey | null): boolean {
  return role === "compliance"
}

export function findApp(s: StaffState, id: string | null | undefined): Application | undefined {
  return id ? s.apps.find((a) => a.id === id) : undefined
}

/** Products with any published maker-checker overrides applied. */
export function products(s: StaffState): Record<ProductCode, Product> {
  const out = structuredClone(BASE_PRODUCTS)
  for (const code of Object.keys(s.prodOverrides) as ProductCode[]) {
    const o = s.prodOverrides[code]
    if (o) Object.assign(out[code], o)
  }
  return out
}

export function prodName(code: string): string {
  return code === "PL" || code === "SL" ? BASE_PRODUCTS[code].name : code
}

/** Advances the simulated clock two minutes and returns "27 Nov, HH:MM". */
export function now(s: StaffState): string {
  s.clock += 1
  let m = 30 + s.clock * 2
  const h = 10 + Math.floor(m / 60)
  m = m % 60
  return `${TODAY}, ${h < 10 ? "0" : ""}${h}:${m < 10 ? "0" : ""}${m}`
}

/**
 * Appends to the case history (when a case is given) and to the audit log.
 * `who` defaults to the signed-in user.
 */
export function log(s: StaffState, role: RoleKey | null, a: Application | null | undefined, what: string, who?: string, roleLabel?: string): void {
  const t = now(s)
  const u = who || me(role).name
  if (a) a.hist.push(H(u, what, t))
  s.audit.unshift({
    tenantId: s.tenantId,
    when: t,
    who: u,
    role: roleLabel || (who ? (who === "System" ? "Decision engine" : roleOf(who)) : me(role).title),
    what,
    target: a ? a.id : "",
  })
}

/** The tenant's decision policy, from the current configuration. */
export function policyOf(s: StaffState): DecisionPolicy {
  const p = products(s)
  return {
    rules: s.cfg.rules,
    bands: s.cfg.bands,
    triggers: s.cfg.triggers,
    autoLimits: { PL: p.PL.autoLimit, SL: p.SL.autoLimit },
    automation: s.cfg.automation,
    killSwitch: s.cfg.killSwitch,
    bureauDown: s.cfg.bureauDown,
    ruleSetVersion: s.cfg.ruleset.pub,
    modelVersion: MODEL_VERSION,
    bankName: "Kalinaw",
  }
}

/**
 * Loan terms for an offer (or the requested amount when there is none yet).
 * Stands in for core banking's calculation API.
 */
export function termsOf(s: StaffState, a: Pick<Application, "product" | "amount" | "tenor" | "grade"> & { offer?: { amount: Centavos; tenor: number; grade: Grade } | null }): Disclosure & { grade: Grade } {
  const o = a.offer || { amount: a.amount, tenor: a.tenor, grade: (a.grade || "C") as Grade }
  const P = products(s)[a.product]
  return { ...disclosure({ principal: o.amount, months: o.tenor, monthlyAddOnRatePct: GRADE_RATE[o.grade] ?? 1.5, feeRate: P.fee }), grade: o.grade }
}

/** "under 1 hour left" / "1 hour left" / "5 hours left". */
export function hrsLeft(h: number): string {
  return h <= 0 ? "under 1 hour left" : h === 1 ? "1 hour left" : `${h} hours left`
}

export const CLOSED_STAGES = ["Disbursed", "Declined", "Withdrawn"] as const
export function isClosed(a: Application): boolean {
  return (CLOSED_STAGES as readonly string[]).includes(a.stage)
}
