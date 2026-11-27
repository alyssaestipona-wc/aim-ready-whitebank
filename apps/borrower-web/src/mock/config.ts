import { toCentavos, type DecisionPolicy, type Grade } from "@aim-ready/core"

import type { Borrower, Product, ProductCode, TenantId } from "./types"

/*
 * Simulated tenant configuration (WhiteBank). In production every value
 * here comes from tenant configuration served by apps/api; nothing in the
 * screens hardcodes it.
 */

export const TENANT: TenantId = "whitebank"

/** Demo password for both seeded borrower accounts. */
export const DEMO_PASSWORD = "whitebank2026"

/** Shown in every timestamp; the prototype is pinned to this day. */
export const TODAY = "27 Nov"

/** How long a simulated bank step waits before it runs. */
export const BANK_STEP_MS = 4000

/** Document upload size limit, in MB. */
export const UPLOAD_LIMIT_MB = 10

export const PRODUCTS: Record<ProductCode, Product> = {
  PL: { code: "PL", name: "Personal loan", min: toCentavos(20000), max: toCentavos(500000), tenorMin: 6, tenorMax: 36, feeRate: 0.02 },
  SL: { code: "SL", name: "Salary loan", min: toCentavos(10000), max: toCentavos(300000), tenorMin: 6, tenorMax: 24, feeRate: 0.015 },
}

export const TENOR_CHOICES = [6, 12, 18, 24, 36] as const

/** Flat monthly add-on rate per risk grade, in percent. */
export const GRADE_RATE: Record<Grade, number> = { A: 1.1, B: 1.3, C: 1.5, D: 1.7, E: 1.9 }

export const PURPOSES = ["Home improvement", "Education", "Medical", "Business", "Debt consolidation", "Other"] as const

/** Decision policy (rule set v4) passed to the simulated pipeline. */
export const POLICY: DecisionPolicy = {
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
  triggers: { grey: true, limit: true, thin: true, mismatch: true, dti: true, related: true },
  autoLimits: { PL: toCentavos(200000), SL: toCentavos(150000) },
  automation: { PL: "live", SL: "live" },
  killSwitch: false,
  bureauDown: false,
  ruleSetVersion: "v4",
  modelVersion: "PL-Score 3.2",
}

export const BORROWERS: Record<string, Borrower> = {
  juan: {
    tenantId: TENANT,
    id: "juan",
    email: "juan.delacruz@email.com",
    name: "Juan Dela Cruz",
    first: "Juan",
    cif: "CIF-0061420",
    age: 36,
    employer: "Northgate Energy Corp.",
    since: 2019,
    income: toCentavos(68000),
    obligations: toCentavos(7500),
    balance: toCentavos(184200),
    bureau: "Full file",
    account: "WhiteBank Savings ••4471",
    stable: true,
  },
  carmela: {
    tenantId: TENANT,
    id: "carmela",
    email: "carmela.bautista@email.com",
    name: "Carmela Bautista",
    first: "Carmela",
    cif: "CIF-0058831",
    age: 41,
    employer: "Bautista Dental Clinic (owner)",
    since: 2021,
    income: toCentavos(95000),
    obligations: toCentavos(21000),
    balance: toCentavos(96400),
    bureau: "Full file",
    account: "WhiteBank Savings ••2083",
    stable: false,
  },
}

/** General bank messages in each borrower's inbox: [title, body, date]. */
const BASE_MESSAGES: ReadonlyArray<readonly [string, string, string]> = [
  ["Welcome to WhiteBank online", "Your online access is ready. Keep your password private.", "3 Jan"],
  ["Security reminder", "WhiteBank will never ask for your password or authentication code by phone, SMS or email.", "18 Feb"],
  ["New sign-in from a browser on macOS", "If this wasn’t you, change your password now.", "4 Mar"],
  ["Holy Week branch hours", "Branches close 2–4 April. Online banking stays available.", "28 Mar"],
  ["Updated terms and conditions (v3.2)", "Our loan terms were updated. Review them before your next application.", "1 Apr"],
  ["Your savings statement is ready", "Statement for May 2026 is available in your account.", "3 Jun"],
  ["Independence Day advisory", "Transfers made on 12 June are processed the next business day.", "10 Jun"],
  ["Password changed", "Your password was changed. If this wasn’t you, contact us now.", "22 Jul"],
  ["Your savings statement is ready", "Statement for August 2026 is available in your account.", "3 Sep"],
  ["Scheduled maintenance", "Online banking will be unavailable 2:00–4:00 AM on 19 Oct.", "15 Oct"],
  ["All Saints’ Day branch hours", "Branches close 1–2 November. Online banking stays available.", "28 Oct"],
  ["Bonifacio Day advisory", "Transfers made on 30 November are processed the next business day.", "25 Nov"],
]

export const BANK_MESSAGES: Record<string, ReadonlyArray<readonly [string, string, string]>> = {
  juan: [...BASE_MESSAGES].reverse(),
  carmela: [...BASE_MESSAGES].reverse(),
}
