"use client"

/**
 * Configuration actions, ported from `apps/backoffice`'s `actions/config.ts`.
 * SIMULATED ENFORCEMENT: this app has a single role (the tenant
 * administrator), so every gate below is a documentation stub, not a real
 * check — kept so the ported screens and their `canConfigure(...)`-style
 * call sites read the same as `apps/backoffice`'s. Every change is written
 * to the audit log.
 */
import type { CustomCondition, PolicyRule } from "@aim-ready/core"

import { getSessionRole, setFlagsCookie } from "../session"
import { getState, update } from "../store"
import { log, me, products } from "../engine"
import type { AdminState, ProductCode, TriggerKey } from "../types"
import { fail, ok, type ActionResult } from "./result"

const role = () => getSessionRole()

/** Always true here — the single role is the tenant administrator. Kept for parity with `apps/backoffice`'s call sites. */
export function canConfigure(): boolean {
  return true
}

/** Always true here, for the same reason as `canConfigure`. */
export function canConfigureTemplates(): boolean {
  return true
}

const nextVersion = (v: string) => `v${Number(v.slice(1)) + 1}`

/* ---------------- products (maker-checker, split across the app boundary — D6) ---------------- */

export async function createProductDraft(code: ProductCode): Promise<ActionResult> {
  return update((s) => {
    if (s.pdraft) return fail(`A ${products(s)[s.pdraft.code].name} draft is already open. Publish or discard it first.`, true)
    const p = products(s)[code]
    s.pdraft = { code, max: p.max, autoLimit: p.autoLimit, inReview: false, author: null }
    log(s, role(), `Created a draft for ${p.name}`)
    return ok("Draft created")
  })
}

/** Edits the open draft field by field as the user types. Not audited per keystroke; submit, publish and discard are audited. */
export async function setProductDraftField(field: "max" | "autoLimit", value: number | null): Promise<ActionResult> {
  return update((s) => {
    if (!s.pdraft || s.pdraft.inReview) return fail("No draft to edit.", true)
    s.pdraft[field] = value ?? 0
    return ok()
  })
}

export async function discardProductDraft(): Promise<ActionResult> {
  return update((s) => {
    if (s.pdraft) log(s, role(), `Discarded the ${products(s)[s.pdraft.code].name} draft`)
    s.pdraft = null
    return ok("Draft discarded")
  })
}

export async function submitProductDraft(): Promise<ActionResult> {
  return update((s) => {
    const D = s.pdraft
    if (!D) return fail("No draft to submit.", true)
    if (D.inReview) return fail("This draft is already in review.", true)
    const P = products(s)[D.code]
    if (D.autoLimit > D.max) return fail("The auto-approval limit can’t exceed the maximum amount.", true)
    D.inReview = true
    D.author = me(role()).name
    log(s, role(), `Submitted ${P.name} draft: max ${P.max} centavos, auto-approval limit ${P.autoLimit} centavos`)
    return ok("Submitted. A different person in this app must approve it.")
  })
}

export async function publishProductDraft(): Promise<ActionResult> {
  return update((s) => {
    const D = s.pdraft
    if (!D || !D.inReview) return fail("Nothing to publish.", true)
    if (D.author === me(role()).name) return fail("A different person must approve this change", true)
    const P = products(s)[D.code]
    const v = nextVersion(P.version)
    s.prodOverrides[D.code] = { max: D.max, autoLimit: D.autoLimit, version: v }
    s.pdraft = null
    log(s, role(), `Approved and published ${P.name} ${v} (maker-checker; drafted by ${D.author})`)
    return ok(`${P.name} ${v} is live for new applications`)
  })
}

/* ---------------- rule set (maker-checker, split across the app boundary — D6) ---------------- */

export async function createRuleDraft(): Promise<ActionResult> {
  return update((s) => {
    if (s.cfg.draft) return fail("A draft rule set already exists.", true)
    s.cfg.draft = structuredClone({ rules: s.cfg.rules, bands: s.cfg.bands, triggers: s.cfg.triggers })
    log(s, role(), `Created draft rule set ${nextVersion(s.cfg.ruleset.pub)}`)
    return ok(`Draft created. Live decisions still use ${s.cfg.ruleset.pub}`)
  })
}

/** Discards a draft, or returns one in review to its author. */
export async function discardRuleDraft(): Promise<ActionResult> {
  return update((s) => {
    if (!s.cfg.draft) return fail("No draft to discard.", true)
    s.cfg.draft = null
    s.cfg.ruleset.inReview = false
    s.cfg.ruleset.author = null
    log(s, role(), "Discarded or returned the draft rule set")
    return ok("Draft closed")
  })
}

function editDraft(fn: (d: NonNullable<AdminState["cfg"]["draft"]>, s: AdminState) => void): ActionResult {
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
  return update((s) => {
    if (!s.cfg.draft) return fail("No draft to submit.", true)
    if (s.cfg.ruleset.inReview) return fail("This draft is already in review.", true)
    s.cfg.ruleset.inReview = true
    s.cfg.ruleset.author = me(role()).name
    log(s, role(), "Submitted draft rule set for review")
    return ok("Submitted. A different person in this app must approve it.")
  })
}

/** Guard before the publish confirmation: the author may not publish. */
export async function canPublishRuleSet(): Promise<ActionResult> {
  const s = getState()
  if (s.cfg.ruleset.author === me(role()).name) return fail("You submitted this change; a different person must approve it", true)
  return ok()
}

export async function publishRuleSet(): Promise<ActionResult> {
  const guard = await canPublishRuleSet()
  if (!guard.ok) return guard
  return update((s) => {
    const D = s.cfg.draft
    if (!D || !s.cfg.ruleset.inReview) return fail("Nothing to publish.", true)
    const v = nextVersion(s.cfg.ruleset.pub)
    const author = s.cfg.ruleset.author
    s.cfg.rules = D.rules
    s.cfg.bands = D.bands
    if (D.triggers) s.cfg.triggers = D.triggers
    s.cfg.draft = null
    s.cfg.ruleset = { pub: v, inReview: false, author: null }
    log(s, role(), `Approved and published rule set ${v} (maker-checker; drafted by ${author})`)
    return ok(`Rule set ${v} is live`)
  })
}

/* ---------------- module flag, failure drills ---------------- */

/** Module flag (PRD PLT-2): mirrored to the route-check cookie. */
export async function setAiModule(on: boolean): Promise<ActionResult> {
  const r = update((s) => {
    s.flags.ai = on
    log(s, role(), `Turned ${on ? "on" : "off"} module: AI credit scoring`)
    return ok(`Module ${on ? "on" : "off"}`, on ? "ok" : "warn")
  })
  setFlagsCookie(getState().flags)
  return r
}

export async function toggleBureauDrill(): Promise<ActionResult> {
  return update((s) => {
    s.cfg.bureauDown = !s.cfg.bureauDown
    log(s, role(), s.cfg.bureauDown ? "Failure drill: credit bureau outage simulated" : "Credit bureau restored")
    return s.cfg.bureauDown ? ok("Bureau outage simulated. New applications will go to manual review.", "warn") : ok("Bureau restored")
  })
}

export async function toggleCoreDrill(): Promise<ActionResult> {
  return update((s) => {
    s.cfg.coreFailNext = !s.cfg.coreFailNext
    log(s, role(), s.cfg.coreFailNext ? "Failure drill: next core booking will time out" : "Core booking drill cancelled")
    return s.cfg.coreFailNext ? ok("The next booking a checker approves will time out in core", "warn") : ok("Drill cancelled")
  })
}

/* ---------------- approval matrix (direct edit, no maker-checker — PC-4) ---------------- */

export type MatrixLevelInput = { amount: string; grades: string; exceptions: string }

export async function updateMatrixLevel(level: string, input: MatrixLevelInput): Promise<ActionResult> {
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
    log(s, role(), `Published approval matrix ${s.cfg.matrixVersion}: level ${level} now ${row.amount}, grades ${row.grades}`)
    return ok(`Approval matrix ${s.cfg.matrixVersion} is live`)
  })
}

/* ---------------- documents and templates (direct edit, no maker-checker — PC-5) ---------------- */

export type TemplateFields = { usedFor: string; retention: string; body: string }

export async function saveTemplate(id: string, fields: TemplateFields): Promise<ActionResult> {
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
    log(s, role(), `Published ${t.name} ${t.version}`)
    return ok(`${t.name} ${t.version} is live`)
  })
}

/** Refused while `openCaseDocs` still carries this template's name (this app's stand-in for "an open loan's documents still reference it" — design.md D3). */
export async function deleteTemplate(id: string): Promise<ActionResult> {
  return update((s) => {
    const t = s.cfg.templates.find((x) => x.id === id)
    if (!t) return fail("That template no longer exists.", true)
    if (s.openCaseDocs.includes(t.name)) return fail(`Can’t delete ${t.name}: still referenced by an open loan’s documents.`, true)
    s.cfg.templates = s.cfg.templates.filter((x) => x.id !== id)
    log(s, role(), `Deleted template ${t.name}`)
    return ok(`${t.name} deleted`)
  })
}
