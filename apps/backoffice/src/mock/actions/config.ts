"use client"

/**
 * Reports, compliance and configuration actions, ported from the prototype's
 * admin handlers. SIMULATED ENFORCEMENT: role checks and maker-checker (a
 * different person publishes) run here, on the client, until `apps/api`
 * enforces them on the server. Every change is written to the audit log.
 */
import type { AutomationMode, CustomCondition, PolicyRule } from "@aim-ready/core"

import { TODAY } from "../constants"
import { isAdmin, isClosed, log, me, peso, products } from "../engine"
import { getSessionRole } from "../session"
import { update } from "../store"
import type { ProductCode, StaffState, TriggerKey } from "../types"
import { fail, ok, type ActionResult } from "./result"

const role = () => getSessionRole()

/** Credit risk configures; everyone else only views. */
export function canConfigure(r = role()): boolean {
  return r === "risk"
}

const nextVersion = (v: string) => `v${Number(v.slice(1)) + 1}`

/* ---------------- regulatory extracts (CIC) ---------------- */

export async function generateCic(): Promise<ActionResult> {
  if (role() !== "risk") return fail(role() === "compliance" ? "Read-only access" : "Your role can’t do this.", true)
  return update((s) => {
    if (s.cic[0]?.[4].startsWith("Submitted")) return fail("The Nov 2026 file was already submitted.", true)
    s.cic = [["CIC_KALINAW_202611.txt", "Nov 2026", "218,400", 2, "Ready", s.tenantId]]
    log(s, role(), null, "Generated CIC submission file for Nov 2026: 2 validation errors (missing TIN on 2 records)")
    return ok("File generated: 2 validation errors to fix", "warn")
  })
}

export async function fixCic(): Promise<ActionResult> {
  if (role() !== "risk") return fail(role() === "compliance" ? "Read-only access" : "Your role can’t do this.", true)
  return update((s) => {
    const f = s.cic[0]
    if (!f) return fail("No file to fix.", true)
    f[3] = 0
    log(s, role(), null, "Corrected 2 records and regenerated CIC file for Nov 2026: 0 errors")
    return ok("Regenerated: 0 errors")
  })
}

export async function submitCic(): Promise<ActionResult> {
  if (role() !== "risk") return fail(role() === "compliance" ? "Read-only access" : "Your role can’t do this.", true)
  return update((s) => {
    const f = s.cic[0]
    if (!f) return fail("No file to submit.", true)
    if (f[3]) return fail("Resolve the validation errors first", true)
    f[4] = `Submitted ${TODAY}`
    log(s, role(), null, "Marked CIC file for Nov 2026 as submitted")
    return ok("Marked submitted")
  })
}

/* ---------------- AML ---------------- */

export async function exportAml(index: number): Promise<ActionResult> {
  if (role() !== "compliance") return fail("Your role can’t do this.", true)
  return update((s) => {
    const m = s.amlCases[index]
    if (!m) return fail("That escalation no longer exists.", true)
    if (m.status !== "Open") return fail("Already exported.", true)
    m.status = "Exported to AML system"
    const a = m.app ? s.apps.find((x) => x.id === m.app) : undefined
    if (a) a.aml = m.status
    log(s, role(), a ?? null, `AML escalation for ${m.name} reviewed and exported to the bank’s AML system`)
    return ok("Escalation exported")
  })
}

/* ---------------- products (maker-checker) ---------------- */

export async function createProductDraft(code: ProductCode): Promise<ActionResult> {
  if (!canConfigure()) return fail("Read-only access", true)
  return update((s) => {
    if (s.pdraft) return fail(`A ${products(s)[s.pdraft.code].name} draft is already open. Publish or discard it first.`, true)
    const p = products(s)[code]
    s.pdraft = { code, max: p.max, autoLimit: p.autoLimit, inReview: false, author: null }
    log(s, role(), null, `Created a draft for ${p.name}`)
    return ok("Draft created")
  })
}

/**
 * Edits the open draft field by field as the user types. Not audited per
 * keystroke, as in the prototype; submit, publish and discard are audited.
 */
export async function setProductDraftField(field: "max" | "autoLimit", value: number | null): Promise<ActionResult> {
  if (!canConfigure()) return fail("Read-only access", true)
  return update((s) => {
    if (!s.pdraft || s.pdraft.inReview) return fail("No draft to edit.", true)
    s.pdraft[field] = value ?? 0
    return ok()
  })
}

export async function discardProductDraft(): Promise<ActionResult> {
  if (!canConfigure()) return fail("Read-only access", true)
  return update((s) => {
    if (s.pdraft) log(s, role(), null, `Discarded the ${products(s)[s.pdraft.code].name} draft`)
    s.pdraft = null
    return ok("Draft discarded")
  })
}

export async function submitProductDraft(): Promise<ActionResult> {
  if (!canConfigure()) return fail("Read-only access", true)
  return update((s) => {
    const D = s.pdraft
    if (!D) return fail("No draft to submit.", true)
    if (D.inReview) return fail("This draft is already in review.", true)
    const P = products(s)[D.code]
    if (D.autoLimit > D.max) return fail("The auto-approval limit can’t exceed the maximum amount.", true)
    D.inReview = true
    D.author = me(role()).name
    log(s, role(), null, `Submitted ${P.name} draft: max ${peso(D.max)}, auto-approval limit ${peso(D.autoLimit)}`)
    return ok("Submitted. The tenant administrator can approve it in the admin console.")
  })
}

/* ---------------- rule set (maker-checker) ---------------- */

export async function createRuleDraft(): Promise<ActionResult> {
  if (!canConfigure()) return fail("Read-only access", true)
  return update((s) => {
    if (s.cfg.draft) return fail("A draft rule set already exists.", true)
    s.cfg.draft = structuredClone({ rules: s.cfg.rules, bands: s.cfg.bands, triggers: s.cfg.triggers })
    log(s, role(), null, `Created draft rule set ${nextVersion(s.cfg.ruleset.pub)}`)
    return ok(`Draft created. Live decisions still use ${s.cfg.ruleset.pub}`)
  })
}

/** Discards a draft, or returns one in review to its author. */
export async function discardRuleDraft(): Promise<ActionResult> {
  if (!canConfigure()) return fail("Read-only access", true)
  return update((s) => {
    if (!s.cfg.draft) return fail("No draft to discard.", true)
    s.cfg.draft = null
    s.cfg.ruleset.inReview = false
    s.cfg.ruleset.author = null
    log(s, role(), null, "Discarded or returned the draft rule set")
    return ok("Draft closed")
  })
}

function editDraft(fn: (d: NonNullable<StaffState["cfg"]["draft"]>, s: StaffState) => void): ActionResult {
  if (!canConfigure()) return fail("Read-only access", true)
  return update((s) => {
    if (!s.cfg.draft || s.cfg.ruleset.inReview) return fail("Create a draft to change", true)
    fn(s.cfg.draft, s)
    return ok()
  })
}

export async function toggleDraftRule(index: number): Promise<ActionResult> {
  return editDraft((d) => {
    const r = d.rules[index]
    if (r && !r.locked) r.active = !r.active
  })
}

export async function setDraftDti(param: number): Promise<ActionResult> {
  if (!Number.isFinite(param) || param < 1 || param > 100) return fail("Enter a debt-to-income cap between 1 and 100%.")
  return editDraft((d) => {
    const r = d.rules.find((x) => x.id === "dti")
    if (r) r.param = param
  })
}

/** Band sliders: approve 620–780, decline 520–(approve − 5). */
export async function setDraftBand(which: "approve" | "decline", value: number): Promise<ActionResult> {
  const [lo, hi] = which === "approve" ? [620, 780] : [520, 780]
  if (!Number.isFinite(value) || value < lo || value > hi) return fail(`Enter a ${which} band between ${lo} and ${hi}.`, true)
  return editDraft((d) => {
    d.bands[which] = value
    if (d.bands.decline >= d.bands.approve) d.bands.decline = d.bands.approve - 5
  })
}

/** Fraud and related-party triggers are locked on. */
export const LOCKED_TRIGGERS: TriggerKey[] = ["fraud", "related"]

export async function toggleDraftTrigger(key: TriggerKey): Promise<ActionResult> {
  return editDraft((d, s) => {
    d.triggers = d.triggers || structuredClone(s.cfg.triggers)
    if (LOCKED_TRIGGERS.includes(key)) return
    d.triggers[key] = !d.triggers[key]
  })
}

export type NewRuleInput = { name: string; type: PolicyRule["type"]; logic: "AND" | "OR"; conds: CustomCondition[] }

export async function addDraftRule(input: NewRuleInput): Promise<ActionResult> {
  const nm = input.name.trim()
  if (!nm) return fail("Give the rule a name.")
  if (!input.conds.length || input.conds.some((c) => !Number.isFinite(c.val))) return fail("Enter a number for every condition.")
  const r = editDraft((d) => {
    d.rules.push({ id: `c${Date.now().toString(36)}`, name: nm, type: input.type, active: true, custom: true, logic: input.logic, conds: input.conds })
  })
  return r.ok ? ok("Rule added to the draft. Check the test harness.") : r
}

export async function submitRuleDraft(): Promise<ActionResult> {
  if (!canConfigure()) return fail("Read-only access", true)
  return update((s) => {
    if (!s.cfg.draft) return fail("No draft to submit.", true)
    if (s.cfg.ruleset.inReview) return fail("This draft is already in review.", true)
    s.cfg.ruleset.inReview = true
    s.cfg.ruleset.author = me(role()).name
    log(s, role(), null, "Submitted draft rule set for review")
    return ok("Submitted. The tenant administrator can approve it in the admin console.")
  })
}

/* ---------------- automation, kill switch ---------------- */

export async function setAutomation(code: ProductCode, mode: AutomationMode): Promise<ActionResult> {
  if (role() !== "risk") return fail("Credit risk only", true)
  return update((s) => {
    s.cfg.automation[code] = mode
    const name = products(s)[code].name
    log(s, role(), null, `Set ${name} automation to ${mode}`)
    return ok(`${name}: ${mode === "live" ? "automation live" : mode === "shadow" ? "shadow mode" : "automation off"}`)
  })
}

/** Single-user emergency control (PRD AIS-7): credit risk only, both directions audited. */
export async function setKillSwitch(on: boolean): Promise<ActionResult> {
  if (role() !== "risk") return fail("Credit risk only", true)
  return update((s) => {
    s.cfg.killSwitch = on
    log(s, role(), null, on ? "Turned kill switch ON: all new applications to manual review" : "Turned kill switch off")
    return ok(on ? "Kill switch on" : "Automation resumed", on ? "warn" : "ok")
  })
}

/* ---------------- approval matrix (direct edit, no maker-checker — PC-4) ---------------- */

export type MatrixLevelInput = { amount: string; grades: string; exceptions: string }

/**
 * Edits one authority level and publishes immediately: PC-4's acceptance
 * criteria never ask for a draft/submit/review step, unlike products or the
 * rule set. Available to the same roles as `canConfigure` (credit risk, and
 * the administrator while that role still exists in this app).
 */
export async function updateMatrixLevel(level: string, input: MatrixLevelInput): Promise<ActionResult> {
  if (!canConfigure()) return fail("Read-only access", true)
  const amount = input.amount.trim()
  const grades = input.grades.trim()
  if (!amount) return fail("Amount limit is required.")
  if (!grades) return fail("Grades is required.")
  return update((s) => {
    const row = s.cfg.matrix.find((r) => r.level === level)
    if (!row) return fail("That authority level no longer exists.", true)
    row.amount = amount
    row.grades = grades
    row.exceptions = input.exceptions.trim()
    s.cfg.matrixVersion = nextVersion(s.cfg.matrixVersion)
    log(s, role(), null, `Published approval matrix ${s.cfg.matrixVersion}: level ${level} now ${row.amount}, grades ${row.grades}`)
    return ok(`Approval matrix ${s.cfg.matrixVersion} is live`)
  })
}

/* ---------------- documents and templates (direct edit, no maker-checker — PC-5) ---------------- */

export type TemplateFields = { usedFor: string; retention: string; body: string }

/** Tenant administrator only — credit risk and compliance see the same detail page read-only. */
export function canConfigureTemplates(r = role()): boolean {
  return isAdmin(r)
}

export async function saveTemplate(id: string, fields: TemplateFields): Promise<ActionResult> {
  if (!canConfigureTemplates()) return fail("Tenant administrator only", true)
  const usedFor = fields.usedFor.trim()
  const retention = fields.retention.trim()
  const body = fields.body.trim()
  if (!usedFor || !retention || !body) return fail("Every field is required.")
  return update((s) => {
    const t = s.cfg.templates.find((x) => x.id === id)
    if (!t) return fail("That template no longer exists.", true)
    t.usedFor = usedFor
    t.retention = retention
    t.body = body
    t.version = nextVersion(t.version)
    log(s, role(), null, `Published ${t.name} ${t.version}`)
    return ok(`${t.name} ${t.version} is live`)
  })
}

/** Refused while any not-yet-closed case's documents still carry this template's name. */
export async function deleteTemplate(id: string): Promise<ActionResult> {
  if (!canConfigureTemplates()) return fail("Tenant administrator only", true)
  return update((s) => {
    const t = s.cfg.templates.find((x) => x.id === id)
    if (!t) return fail("That template no longer exists.", true)
    const inUse = s.apps.some((a) => !isClosed(a) && a.docs.some(([name]) => name === t.name))
    if (inUse) return fail(`Can’t delete ${t.name}: still referenced by an open loan’s documents.`, true)
    s.cfg.templates = s.cfg.templates.filter((x) => x.id !== id)
    log(s, role(), null, `Deleted template ${t.name}`)
    return ok(`${t.name} deleted`)
  })
}
