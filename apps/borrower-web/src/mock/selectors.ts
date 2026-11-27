import { disclosure, formatPeso, monthlyPayment, type Centavos, type Disclosure, type Grade } from "@aim-ready/core"
import type { BadgeVariant } from "@aim-ready/ui"

import { BANK_MESSAGES, BORROWERS, GRADE_RATE, PRODUCTS } from "./config"
import type { Application, Borrower, BorrowerState, ProductCode } from "./types"

export function currentBorrower(s: BorrowerState): Borrower | null {
  return (s.session && BORROWERS[s.session]) || null
}

/** The borrower's applications, newest first. */
export function myApps(s: BorrowerState): Application[] {
  const b = currentBorrower(s)
  return b ? s.apps.filter((a) => a.borrower === b.id) : []
}

export function myApp(s: BorrowerState): Application | null {
  return myApps(s)[0] ?? null
}

export function productName(code: ProductCode): string {
  return PRODUCTS[code]?.name ?? code
}

/** 1 when the application is waiting on the borrower, else 0. */
export function pendingCount(a: Application | null): number {
  if (!a) return 0
  if (a.stage === "Info requested" || a.stage === "Offer" || (a.stage === "Documentation" && a.borrowerPending === "sign")) return 1
  return 0
}

/** Indicative monthly payment at grade C, as on the apply page. */
export function estimateMonthly(product: ProductCode, amount: Centavos, tenor: number): Centavos {
  if (!(amount > 0) || !(tenor > 0)) return 0
  void product
  return monthlyPayment(amount, tenor, GRADE_RATE.C)
}

/** Disclosure for the current offer (or the request, before an offer). */
export function termsOf(a: Application): Disclosure & { grade: Grade } {
  const o = a.offer ?? { amount: a.amount, tenor: a.tenor, grade: a.decision.grade ?? "C" }
  return {
    ...disclosure({ principal: o.amount, months: o.tenor, monthlyAddOnRatePct: GRADE_RATE[o.grade], feeRate: PRODUCTS[a.product].feeRate }),
    grade: o.grade,
  }
}

export type PlainStatus = {
  pill: readonly [string, BadgeVariant]
  plainPill?: boolean
  h: string
  p: string
  cta: readonly [string, string] | null
}

export function borrowerReason(a: Application): string {
  const t = a.decision.trigger
  if (/knockout/i.test(t)) return "Your application doesn’t meet our lending requirements. You can ask us for the reasons in writing."
  if (/income/i.test(t)) return "We couldn’t verify enough income for this amount. You can apply again with updated documents."
  if (/Debt-to-income/i.test(t)) return "Your current repayments are high compared with your income."
  return "Your application doesn’t meet our lending requirements right now."
}

/** Plain-language status, pill and next action, ported from `plainStatus()`. */
export function plainStatus(a: Application): PlainStatus {
  const b = BORROWERS[a.borrower]
  switch (a.stage) {
    case "Review":
      return { pill: ["In review", "warn"], h: "We’re reviewing your application", p: "A loan specialist is looking at it now. We’ll update you here, so there’s no need to call.", cta: null }
    case "Info requested":
      return {
        pill: ["Action needed", "warn"],
        h: "We need a few more documents",
        p: `Upload ${(a.infoReq || "the requested documents").toLowerCase()} so we can finish reviewing your loan.`,
        cta: ["Upload documents", "/upload"],
      }
    case "Offer": {
      const amt = a.offer?.amount ?? a.amount
      return {
        pill: ["Approved", "ok"],
        h: `You’re approved for ${formatPeso(amt)}`,
        p: `${amt !== a.amount ? `That’s our offer instead of the ${formatPeso(a.amount)} you asked for. ` : ""}Review the terms and accept within 5 days.`,
        cta: ["Review my offer", "/offer"],
      }
    }
    case "Documentation":
      return a.borrowerPending === "sign"
        ? { pill: ["Action needed", "warn"], h: "Sign your loan documents", p: "Your loan agreement and promissory note are ready to sign online.", cta: ["Sign documents", "/sign"] }
        : { pill: ["Accepted", "info"], h: "Preparing your loan documents", p: "You accepted the offer. We’re preparing your documents to sign; we’ll notify you when they’re ready.", cta: null }
    case "Booking":
      return { pill: ["Signed", "info"], h: "Setting up your loan", p: `Everything is signed. We’re creating your loan account; the money goes to your ${b ? b.account : "account"}.`, cta: null }
    case "Disbursed":
      return {
        pill: ["Funds released", "ok"],
        h: `${formatPeso(a.offer?.amount ?? a.amount)} is in your account`,
        p: `Released to ${a.disbTo ?? ""}. Your first payment is due 27 Dec.`,
        cta: ["View my loan", "/loan"],
      }
    case "Declined":
      return { pill: ["Not approved", "bad"], h: "We can’t offer you a loan right now", p: borrowerReason(a), cta: null }
    case "Withdrawn":
      return { pill: ["Closed", "neutral"], plainPill: true, h: "This application is closed", p: `Reason: ${a.withdrawReason || "the offer expired after 5 days"}. You can apply again anytime.`, cta: null }
  }
}

export type TrackerStep = { label: string; state: "done" | "now" | "todo"; sub: string }

const STEP_LABELS = ["Submitted", "Checks", "Decision", "Offer accepted", "Documents signed", "Funds released"] as const

/** The six-step tracker on Home, ported from `bwSteps()`. */
export function trackerSteps(a: Application): TrackerStep[] {
  const idx: Record<Application["stage"], number> = {
    Review: 2,
    "Info requested": 2,
    Offer: 3,
    Documentation: 4,
    Booking: 5,
    Disbursed: 6,
    Declined: 3,
    Withdrawn: 3,
  }
  const at = idx[a.stage]
  return STEP_LABELS.map((label, i) => {
    let state: TrackerStep["state"] = i < at ? "done" : i === at ? "now" : "todo"
    if (a.stage === "Declined" && i >= 2) state = i === 2 ? "done" : "todo"
    let sub = i === 0 ? a.created : state === "done" ? "Done" : state === "now" ? "In progress" : ""
    if (i === 2 && state === "done") sub = a.stage === "Declined" ? "Not approved" : "Approved"
    return { label, state, sub }
  })
}

export type InboxItem = { title: string; detail: string; due?: string; href: string; action?: boolean }

/** Action items first, then application updates, then bank messages. */
export function inboxItems(s: BorrowerState): InboxItem[] {
  const a = myApp(s)
  const items: InboxItem[] = []
  if (a) {
    if (a.stage === "Info requested")
      items.push({ title: "Documents needed for your loan", detail: a.infoMsg || `Please upload ${a.infoReq || "the requested documents"}.`, due: a.infoDue || "In 3 days", href: "/upload", action: true })
    if (a.stage === "Offer") items.push({ title: "Your loan offer is ready", detail: `Review and accept ${formatPeso(a.offer?.amount ?? a.amount)} within 5 days.`, href: "/offer", action: true })
    if (a.stage === "Documentation" && a.borrowerPending === "sign")
      items.push({ title: "Sign your loan documents", detail: "Your loan agreement and promissory note are ready.", href: "/sign", action: true })
    for (const h of [...a.hist].reverse()) {
      if (h.who === "System" && /Auto-approved|Referred|Core created/.test(h.what)) {
        items.push({
          title: /Auto-approved/.test(h.what) ? "Your application was approved" : /Referred/.test(h.what) ? "Your application is being reviewed" : "Your loan funds were released",
          detail: h.when,
          href: "/",
        })
      }
    }
  }
  const b = currentBorrower(s)
  for (const [t, d, when] of (b && BANK_MESSAGES[b.id]) || []) items.push({ title: t, detail: `${d} · ${when}`, href: "/inbox" })
  return items
}

export type ScheduleRow = { label: string; payment: Centavos; balance: Centavos }

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/**
 * Repayment schedule as returned by (simulated) core banking: one row per
 * month from 27 Dec 2026, balance reducing by principal ÷ term.
 */
export function repaymentSchedule(a: Application): ScheduleRow[] {
  const tm = termsOf(a)
  const prin = tm.principal / tm.months
  return Array.from({ length: tm.months }, (_, i) => {
    const mi = (11 + i) % 12
    const yr = 2026 + Math.floor((11 + i) / 12)
    return {
      label: `${i + 1} · 27 ${MONTHS[mi]} ${yr}`,
      payment: i === tm.months - 1 ? tm.lastPayment : tm.monthlyPayment,
      balance: Math.max(0, Math.round(tm.principal - prin * (i + 1))),
    }
  })
}
