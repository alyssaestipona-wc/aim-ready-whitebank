"use client"

/**
 * Reports, compliance and configuration actions, ported from the prototype's
 * admin handlers. SIMULATED ENFORCEMENT: role checks and maker-checker (a
 * different person publishes) run here, on the client, until `apps/api`
 * enforces them on the server. Every change is written to the audit log.
 */
import type { AutomationMode, CustomCondition, PolicyRule } from "@aim-ready/core"

import { TODAY } from "../constants"
import { log, me, peso, products } from "../engine"
import { getSessionRole, setFlagsCookie } from "../session"
import { getState, update } from "../store"
import type { ProductCode, StaffState, TriggerKey } from "../types"
import { fail, ok, type ActionResult } from "./result"

const role = () => getSessionRole()

/** Credit risk and the tenant administrator configure; everyone else only views. */
export function canConfigure(r = role()): boolean {
  return r === "risk" || r === "admin"
}

const nextVersion = (v: string) => `v${Number(v.slice(1)) + 1}`

/* ---------------- regulatory extracts (CIC) ---------------- */

export async function generateCic(): Promise<ActionResult> {
  if (role() === "compliance") return fail("Read-only access", true)
  return update((s) => {
    s.cic = [["CIC_KALINAW_202611.txt", "Nov 2026", "218,400", 2, "Ready", s.tenantId]]
    log(s, role(), null, "Generated CIC submission file for Nov 2026: 2 validation errors (missing TIN on 2 records)")
    return ok("File generated: 2 validation errors to fix", "warn")
  })
}

export async function fixCic(): Promise<ActionResult> {
  if (role() === "compliance") return fail("Read-only access", true)
  return update((s) => {
    const f = s.cic[0]
    if (!f) return fail("No file to fix.", true)
    f[3] = 0
    log(s, role(), null, "Corrected 2 records and regenerated CIC file for Nov 2026: 0 errors")
    return ok("Regenerated: 0 errors")
  })
}

export async function submitCic(): Promise<ActionResult> {
  if (role() === "compliance") return fail("Read-only access", true)
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
  return update((s) => {
    const m = s.amlCases[index]
    if (!m) return fail("That escalation no longer exists.", true)
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
    const P = products(s)[D.code]
    if (D.autoLimit > D.max) return fail("The auto-approval limit can’t exceed the maximum amount.", true)
    D.inReview = true
    D.author = me(role()).name
    log(s, role(), null, `Submitted ${P.name} draft: max ${peso(D.max)}, auto-approval limit ${peso(D.autoLimit)}`)
    return ok(`Submitted. ${role() === "risk" ? "Jonas Mercado" : "Rafael Cruz"} can approve it.`)
  })
}

export async function publishProductDraft(): Promise<ActionResult> {
  if (!canConfigure()) return fail("Read-only access", true)
  return update((s) => {
    const D = s.pdraft
    if (!D || !D.inReview) return fail("Nothing to publish.", true)
    if (D.author === me(role()).name) return fail("A different person must approve this change", true)
    const P = products(s)[D.code]
    const v = nextVersion(P.version)
    s.prodOverrides[D.code] = { max: D.max, autoLimit: D.autoLimit, version: v }
    s.pdraft = null
    log(s, role(), null, `Approved and published ${P.name} ${v} (maker-checker; drafted by ${D.author})`)
    return ok(`${P.name} ${v} is live for new applications`)
  })
}

/* ---------------- rule set (maker-checker) ---------------- */

export async function createRuleDraft(): Promise<ActionResult> {
  if (!canConfigure()) return fail("Read-only access", true)
  return update((s) => {
    s.cfg.draft = structuredClone({ rules: s.cfg.rules, bands: s.cfg.bands, triggers: s.cfg.triggers })
    log(s, role(), null, `Created draft rule set ${nextVersion(s.cfg.ruleset.pub)}`)
    return ok(`Draft created. Live decisions still use ${s.cfg.ruleset.pub}`)
  })
}

/** Discards a draft, or returns one in review to its author. */
export async function discardRuleDraft(): Promise<ActionResult> {
  if (!canConfigure()) return fail("Read-only access", true)
  return update((s) => {
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
  if (!Number.isFinite(param) || param <= 0 || param > 100) return fail("Enter a debt-to-income cap between 1 and 100%.")
  return editDraft((d) => {
    const r = d.rules.find((x) => x.id === "dti")
    if (r) r.param = param
  })
}

export async function setDraftBand(which: "approve" | "decline", value: number): Promise<ActionResult> {
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
    s.cfg.ruleset.inReview = true
    s.cfg.ruleset.author = me(role()).name
    log(s, role(), null, "Submitted draft rule set for review")
    return ok(`Submitted. ${role() === "risk" ? "Jonas Mercado" : "Rafael Cruz"} can approve it.`)
  })
}

/** Guard before the publish confirmation: the author may not publish. */
export async function canPublishRuleSet(): Promise<ActionResult> {
  if (!canConfigure()) return fail("Read-only access", true)
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
    log(s, role(), null, `Approved and published rule set ${v} (maker-checker; drafted by ${author})`)
    return ok(`Rule set ${v} is live`)
  })
}

/* ---------------- automation, kill switch, modules, drills ---------------- */

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

/** Module flag (PRD PLT-2): tenant administrator only; mirrored to the route-check cookie. */
export async function setAiModule(on: boolean): Promise<ActionResult> {
  if (role() !== "admin") return fail("Tenant administrator only", true)
  const r = update((s) => {
    s.flags.ai = on
    log(s, role(), null, `Turned ${on ? "on" : "off"} module: AI credit scoring`)
    return ok(`Module ${on ? "on" : "off"}`, on ? "ok" : "warn")
  })
  setFlagsCookie(getState().flags)
  return r
}

export async function toggleBureauDrill(): Promise<ActionResult> {
  if (role() !== "admin") return fail("Tenant administrator only", true)
  return update((s) => {
    s.cfg.bureauDown = !s.cfg.bureauDown
    log(s, role(), null, s.cfg.bureauDown ? "Failure drill: credit bureau outage simulated" : "Credit bureau restored")
    return s.cfg.bureauDown ? ok("Bureau outage simulated. New applications will go to manual review.", "warn") : ok("Bureau restored")
  })
}

export async function toggleCoreDrill(): Promise<ActionResult> {
  if (role() !== "admin") return fail("Tenant administrator only", true)
  return update((s) => {
    s.cfg.coreFailNext = !s.cfg.coreFailNext
    log(s, role(), null, s.cfg.coreFailNext ? "Failure drill: next core booking will time out" : "Core booking drill cancelled")
    return s.cfg.coreFailNext ? ok("The next booking a checker approves will time out in core", "warn") : ok("Drill cancelled")
  })
}
