import { toCentavos } from "@aim-ready/core"

import { TENANT_ID } from "./constants"
import type { AdminState, DecisionConfig } from "./types"

export const RULESET_VERSION = "v4"
export const MODEL_VERSION = "PL-Score 3.2"

function baseCfg(): DecisionConfig {
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
    matrixVersion: "v2",
    matrix: [
      { level: "L1", who: "Approvers (3)", amount: "Up to ₱1,000,000", products: "Personal, salary", grades: "A–C", exceptions: "Second sign-off on overrides" },
      { level: "L2", who: "Head of credit", amount: "Up to ₱3,000,000", products: "Personal, salary", grades: "A–D", exceptions: "Policy exceptions" },
      { level: "L3", who: "Credit committee", amount: "Above ₱3,000,000", products: "All", grades: "All", exceptions: "Related-party and insider loans" },
    ],
    templates: [
      { id: "agreement", name: "Loan agreement", usedFor: "All products", retention: "Closure + 10 years", version: "v5", body: "This agreement is between {{lender_name}} (the Lender) and {{borrower_name}} (the Borrower). The Lender agrees to lend {{amount}} ({{product_name}}), released to the Borrower’s own Kalinaw account net of a {{fee}} processing fee. Repayment: {{tenor}} equal monthly payments of {{monthly_payment}}, starting one month after release. Late payment: 3% of the amount due for each month it remains unpaid." },
      { id: "disclosure", name: "Disclosure statement (Truth in Lending)", usedFor: "All products", retention: "Closure + 10 years", version: "v3", body: "Amount financed {{amount_financed}}. Fee {{fee}}. Net proceeds {{net_proceeds}}. Term {{term}}. Monthly amortisation {{monthly}}. Total of payments {{total_payments}}. Finance charge {{finance_charge}}. Effective interest rate {{eir}}." },
      { id: "note", name: "Promissory note", usedFor: "All products", retention: "Closure + 10 years", version: "v2", body: "For value received, I, {{borrower_name}}, promise to pay {{lender_name}} the sum of {{amount}} in {{tenor}} monthly instalments of {{monthly_payment}}." },
      { id: "approval", name: "Approval letter", usedFor: "Referred cases", retention: "Closure + 5 years", version: "v2", body: "Congratulations {{borrower_name}}, your {{product_name}} application for {{amount}} has been approved." },
      { id: "decline", name: "Decline letter", usedFor: "Declined cases", retention: "5 years", version: "v4", body: "Dear {{borrower_name}}, after careful review we’re unable to approve your application at this time. Reason: {{decline_reason}}." },
    ],
    draft: null,
  }
}

function seedCampaigns(): string[][] {
  return [
    ["Salary loan top-up · DepEd teachers", "12,400 eligible", "1,980 accepted", "₱148.5M booked", "Running"], ["Personal loan · payroll partners, grade A", "8,900 eligible", "1,120 accepted", "₱201.6M booked", "Running"], ["Personal loan · existing depositors", "6,150 eligible", "410 accepted", "₱52.0M booked", "Ended 15 Nov"], ["Salary loan · Metro Hospital nurses", "2,300 eligible", "390 accepted", "₱27.3M booked", "Running"],
    ["Personal loan · Christmas 2026", "15,200 eligible", "—", "—", "Starts 1 Dec"], ["Salary loan · BPO payroll partners", "9,800 eligible", "1,460 accepted", "₱102.2M booked", "Ended 31 Oct"], ["Personal loan · grade A repeat borrowers", "4,100 eligible", "820 accepted", "₱131.2M booked", "Ended 30 Sep"], ["Salary loan · back-to-school", "11,600 eligible", "2,240 accepted", "₱156.8M booked", "Ended 31 Jul"],
    ["Personal loan · OFW families", "3,700 eligible", "280 accepted", "₱39.2M booked", "Ended 30 Jun"], ["Salary loan · summer 2026", "10,900 eligible", "1,710 accepted", "₱119.7M booked", "Ended 31 May"], ["Personal loan · new depositors 2025", "5,300 eligible", "300 accepted", "₱36.0M booked", "Ended 30 Apr"], ["Salary loan · Holy Week", "8,200 eligible", "1,050 accepted", "₱73.5M booked", "Ended 5 Apr"],
  ]
}

/** Fresh seed state. Deterministic: the same result on every call. */
export function seed(): AdminState {
  const cfg = baseCfg()
  // The rule-set draft itself mirrors the published rules until credit risk's
  // real edits are modeled; what matters for 5.4 is the submitted/in-review
  // state, not its content.
  cfg.draft = structuredClone({ rules: cfg.rules, bands: { approve: 705, decline: 595 }, triggers: cfg.triggers })
  cfg.ruleset.inReview = true
  cfg.ruleset.author = "Rafael Cruz"

  return {
    tenantId: TENANT_ID,
    audit: [
      { tenantId: TENANT_ID, when: "26 Nov, 11:15", who: "Rafael Cruz", role: "Credit risk manager", what: "Submitted personal loan draft: max ₱600,000, auto-approval limit ₱220,000", target: "" },
      { tenantId: TENANT_ID, when: "26 Nov, 11:10", who: "Rafael Cruz", role: "Credit risk manager", what: "Created a draft for Personal loan", target: "" },
      { tenantId: TENANT_ID, when: "26 Nov, 10:40", who: "Rafael Cruz", role: "Credit risk manager", what: "Submitted draft rule set for review", target: "" },
      { tenantId: TENANT_ID, when: "20 Nov, 09:00", who: "Jonas Mercado", role: "Tenant administrator", what: "Admin console provisioned", target: "" },
    ],
    flags: { ai: true },
    clock: 0,
    cfg,
    prodOverrides: {},
    pdraft: { code: "PL", max: toCentavos(600000), autoLimit: toCentavos(220000), inReview: true, author: "Rafael Cruz" },
    campaigns: seedCampaigns().map((r) => [...r, TENANT_ID]),
    openCaseDocs: ["Decline letter"],
  }
}
