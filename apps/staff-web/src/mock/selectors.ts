/**
 * Read-only views over the simulated state, ported from the prototype's
 * myQueue(), teamQueue(), counts(), notifications() and staffNotifs().
 */
import { TODAY } from "./constants"
import { baseRole, hrsLeft, me, peso } from "./engine"
import { tOrd } from "./seed"
import type { Application, RoleKey, StaffState } from "./types"

const OPEN = ["Review", "Info requested", "Approval", "Committee", "Documentation", "Booking", "Pending checker", "Offer"]

export function myQueue(s: StaffState, role: RoleKey | null): Application[] {
  const A = s.apps
  switch (baseRole(role)) {
    case "branch":
      return A.filter((a) => a.branch === "Makati Ayala" && (a.stage === "Draft" || OPEN.includes(a.stage)))
    case "officer":
      return A.filter((a) => a.owner === me(role).name && ["Review", "Info requested"].includes(a.stage))
    case "approver":
      return A.filter((a) => ["Approval", "Committee"].includes(a.stage))
    case "ops":
      return role === "opssup" ? A.filter((a) => a.stage === "Pending checker") : A.filter((a) => ["Documentation", "Booking"].includes(a.stage))
    default:
      return A.filter((a) => OPEN.includes(a.stage))
  }
}

export function teamQueue(s: StaffState, role: RoleKey | null): Application[] {
  const A = s.apps
  switch (baseRole(role)) {
    case "branch":
      return A.filter((a) => a.channel === "Branch" && !["Disbursed", "Declined", "Withdrawn"].includes(a.stage))
    case "officer":
      return A.filter((a) => ["Review", "Info requested"].includes(a.stage))
    case "approver":
      return A.filter((a) => ["Approval", "Committee"].includes(a.stage))
    case "ops":
      return A.filter((a) => ["Documentation", "Booking", "Pending checker"].includes(a.stage))
    default:
      return A.filter((a) => !["Disbursed", "Declined", "Withdrawn", "Draft"].includes(a.stage))
  }
}

export function unassigned(s: StaffState): Application[] {
  return s.apps.filter((a) => a.stage === "Review" && !a.owner)
}

export type NavCounts = Partial<Record<string, number | null>>

/** Badge counts beside sidebar items. */
export function counts(s: StaffState, role: RoleKey | null): NavCounts {
  const A = s.apps
  return {
    queues: myQueue(s, role).length,
    approvals: A.filter((a) => a.stage === "Approval").length,
    booking: A.filter((a) => (a.stage === "Booking" && !(a.booking && a.booking.status === "failed")) || a.stage === "Pending checker").length,
    signing: A.filter((a) => a.stage === "Documentation").length,
    exceptions: A.filter((a) => a.booking && a.booking.status === "failed").length,
    intake: s.drafts.filter((d) => d.status === "Draft").length || null,
    aml: s.amlCases.filter((m) => m.status === "Open").length,
  }
}

/** Live alerts for the role: [text, when]. */
function alerts(s: StaffState, role: RoleKey | null): Array<[string, string]> {
  const c = counts(s, role)
  const n: Array<[string, string]> = []
  const r = role
  if (r === "officer") {
    const q = myQueue(s, role)
    if (q.length) n.push([`${q.length} referred case(s) in your queue`, "now"])
    const soon = q.find((a) => a.sla != null && a.sla <= 2)
    if (soon && soon.sla != null) n.push([`SLA warning: ${soon.name} has ${soon.sla < 0 ? "breached" : hrsLeft(soon.sla)}`, "10:28"])
  }
  if (r === "approver" && c.approvals) n.push([`${c.approvals} item(s) waiting for your approval`, "now"])
  if (r === "ops") {
    if (c.booking) n.push([`${c.booking} approved loan(s) ready to book`, "now"])
    if (c.signing) n.push([`${c.signing} case(s) in documentation`, "now"])
    if (c.exceptions) n.push(["A booking failed: core timeout", "yesterday"])
  }
  if (r === "opssup") {
    const p = s.apps.filter((a) => a.stage === "Pending checker").length
    if (p) n.push([`${p} booking(s) waiting for your check`, "now"])
    n.push(["Reconciliation with core: 0 duplicates yesterday", "06:00"])
  }
  if (r === "compliance" && c.aml) n.push([`${c.aml} AML escalation(s) open`, "07:55"])
  if (r === "risk" && s.cfg.ruleset.inReview) n.push(["Your rule set draft is in review", "now"])
  if (r === "admin" && s.cfg.ruleset.inReview) n.push(["Rule set change waiting for your approval", "now"])
  if (r === "admin" && s.pdraft && s.pdraft.inReview) n.push(["Product change waiting for your approval", "now"])
  if (r === "branch") {
    const d = s.apps.find((a) => a.stage === "Draft" && a.branch === "Makati Ayala")
    if (d) n.push([`${d.name}: draft still has documents outstanding`, "09:50"])
  }
  if (s.cfg.bureauDown) n.unshift(["Credit bureau unavailable: new applications go to manual review", "now"])
  if (s.cfg.killSwitch) n.unshift(["Kill switch is on: every new application goes to manual review", "now"])
  return n
}

export type StaffNotification = {
  id: string
  text: string
  when: string
  type: string
  /** "route" or "route:param", e.g. "case:APP-2041"; null when there is nowhere to go. */
  go: string | null
  read: boolean
}

/** Standing notifications per role: [text, when, type, go]. */
const STANDING: Partial<Record<RoleKey, Array<[string, string, string, string | null]>>> = {
  risk: [["Model monitoring alert: feature drift on months-with-employer crossed 0.10", "25 Nov, 02:00", "Models", "models"], ["Shadow mode report ready: SL-Score 1.1", "26 Nov, 08:00", "Models", "models"], ["Rule set v4 published by Jonas Mercado", "20 Nov, 16:40", "Configuration", "decisioning"], ["Fairness retest due for PL-Score 3.2", "24 Nov, 09:00", "Models", "governance"], ["Straight-through rate 64% this month (target 60%+)", "26 Nov, 07:00", "Reports", "dash-decision"], ["Override rate rose to 7.8% this week", "25 Nov, 07:00", "Reports", "dash-decision"], ["CIC submission for Oct 2026 accepted", "5 Nov, 14:20", "Reports", "dash-reg"], ["Governance finding due: SL shadow override reasons", "23 Nov, 09:00", "Models", "governance"], ["Personal loan v6 published", "18 Nov, 11:30", "Configuration", "products"], ["Bureau provider latency above 1 s for 10 minutes", "22 Nov, 15:42", "Integrations", null], ["Monthly portfolio pack sent to risk committee", "3 Nov, 08:00", "Reports", "dash-funnel"], ["Validation report RA-2026-14 approved", "2 Sep, 10:00", "Models", "governance"]],
  admin: [["Integration conformance suite passed for all 8 adapters", "27 Nov, 06:00", "Integrations", "integrations"], ["Personal loan v6 published (drafted by Rafael Cruz)", "18 Nov, 11:30", "Configuration", "products"], ["Rule set v4 published", "20 Nov, 16:40", "Configuration", "decisioning"], ["Holiday calendar updated: 30 Nov Bonifacio Day", "15 Nov, 09:00", "Configuration", "tenant"], ["Notification template “Sign your documents” v2 live", "14 Nov, 13:10", "Configuration", "notifications"], ["Workflow SLAs v3 published", "12 Nov, 10:05", "Configuration", "workflows"], ["Approval matrix v2 published", "10 Nov, 16:30", "Configuration", "matrix"], ["Backoffice identity sync completed: 1,840 staff", "27 Nov, 05:00", "Access", "users"], ["Core banking sandbox maintenance completed", "26 Nov, 04:00", "Integrations", "integrations"], ["Document template “Loan agreement” v5 live", "8 Nov, 11:00", "Configuration", "templates"], ["Audit log export for Q3 delivered to compliance", "3 Oct, 09:00", "Compliance", "audit"], ["Module check: AI credit scoring on", "1 Nov, 08:00", "Configuration", "tenant"]],
  compliance: [["Quarterly audit log export ready", "3 Oct, 09:00", "Compliance", "audit"], ["Model governance finding resolved: prohibited-feature check", "25 Aug, 16:00", "Models", "governance"], ["Consent terms updated to v3.2", "1 Apr, 09:00", "Compliance", "consent"]],
  officer: [["Statement analysis ready for Joy Castillo", "26 Nov, 16:40", "Cases", "case:APP-2056"]],
  approver: [],
  ops: [],
  branch: [],
}

/** Every notification for the role, newest first, with read state. */
export function staffNotifs(s: StaffState, role: RoleKey | null): StaffNotification[] {
  const r = role
  const A = s.apps
  const out: StaffNotification[] = []
  const seen = new Set<string>()
  const add = (id: string, text: string, when: string, type: string, go: string | null = null) => {
    if (seen.has(id)) return
    seen.add(id)
    out.push({ id, text, when, type, go, read: false })
  }
  for (const [text, when] of alerts(s, role)) {
    add(`now-${r}-${text.replace(/[^a-z0-9]/gi, "").slice(0, 40)}`, text, when === "now" ? `${TODAY}, now` : /^\d/.test(when) && !when.includes("Nov") ? `${TODAY}, ${when}` : when, "Alert")
  }
  const k = baseRole(role)
  const nm = me(role).name
  if (k === "officer") {
    for (const a of A.filter((x) => x.owner === nm)) {
      add(`ref-${a.id}`, `${a.name} was referred to you: ${(a.trigger || "manual review").split(" · ")[0]}`, a.created, "Cases", `case:${a.id}`)
      if (a.sla != null && a.sla <= 2) add(`sla-${a.id}`, `${a.sla < 0 ? "SLA breached: " : "SLA warning: "}${a.name}${a.sla < 0 ? ` is ${-a.sla}h over` : ` has ${hrsLeft(a.sla)}`}`, a.created, "SLA", `case:${a.id}`)
      if (a.stage === "Info requested") add(`info-${a.id}`, `Waiting on ${a.name} to upload bank statements`, a.created, "Cases", `case:${a.id}`)
    }
    for (const a of A.filter((x) => x.recommendation && x.recommendation.by === nm && x.stage !== "Approval")) add(`dec-${a.id}`, `Your recommendation for ${a.name} was approved`, a.created, "Approvals", `case:${a.id}`)
  } else if (k === "approver") {
    for (const a of A.filter((x) => x.stage === "Approval")) {
      const rc = a.recommendation
      add(`apr-${a.id}`, `Recommendation waiting: ${a.name} · ${peso(rc?.amount || a.amount)}${rc?.reason && rc.overLevel === "above" ? " (override, 2nd approval)" : ""}`, a.created, "Approvals", `case:${a.id}`)
    }
    for (const a of A.filter((x) => ["Documentation", "Booking", "Disbursed"].includes(x.stage) && x.recommendation)) add(`acc-${a.id}`, `${a.name} accepted the offer you approved`, a.created, "Cases", `case:${a.id}`)
  } else if (k === "ops") {
    if (r === "opssup") {
      for (const a of A.filter((x) => x.stage === "Pending checker")) add(`chk-${a.id}`, `Booking waiting for your check: ${a.name} · ${peso(a.offer?.amount ?? a.amount)}`, a.created, "Booking", `booking:${a.id}`)
      for (const a of A.filter((x) => x.stage === "Disbursed")) add(`bk-${a.id}`, `Booked and disbursed: ${a.name} (${a.loanNo})`, a.disbAt || a.created, "Booking", `case:${a.id}`)
    } else {
      for (const a of A.filter((x) => x.stage === "Documentation")) add(`doc-${a.id}`, `${a.borrowerPending === "sign" ? "Waiting for signature: " : "Offer accepted, documents to generate: "}${a.name}`, a.created, "Documents", `case:${a.id}`)
      for (const a of A.filter((x) => x.stage === "Booking")) {
        const failed = a.booking && a.booking.status === "failed"
        add(`rdy-${a.id}`, `${failed ? "Booking failed: " : "Ready to book: "}${a.name}`, a.booking?.failedAt || a.created, "Booking", failed ? "exceptions" : `booking:${a.id}`)
      }
    }
  } else if (k === "branch") {
    for (const a of A.filter((x) => x.branch === "Makati Ayala")) add(`br-${a.id}`, a.stage === "Draft" ? `Draft still missing documents: ${a.name}` : `Update on walk-in ${a.name}: ${a.stage.toLowerCase()}`, a.created, "Cases", `case:${a.id}`)
  } else if (k === "compliance") {
    s.amlCases.forEach((m, i) => add(`aml-${i}`, `AML escalation: ${m.name} · ${m.match}`, i < 4 ? `${TODAY}, 07:5${i}` : `${20 + (i % 6)} Nov, 10:1${i % 10}`, "Compliance", "aml"))
    s.audit.filter((x) => /^Refused|Blocked/.test(x.what)).forEach((x, i) => add(`ref-${i}${x.when}`, `${x.who}: ${x.what}`, x.when, "Access", "audit"))
  }
  const standing = (r && STANDING[r]) || (k && STANDING[k]) || []
  standing.forEach((st, i) => add(`st-${r}-${i}`, st[0], st[1], st[2], st[3]))
  for (const n of out) {
    const day = /(\d+) Nov/.exec(n.when || "")
    const recent = n.type === "Alert" || (day && Number(day[1]) >= 27)
    n.read = s.notifRead[`${r}:${n.id}`] ? true : !recent
  }
  out.sort((x, y) => Number(y.type === "Alert") - Number(x.type === "Alert") || Number(/now/.test(y.when)) - Number(/now/.test(x.when)) || (tOrd(y.when) || 0) - (tOrd(x.when) || 0))
  return out
}
