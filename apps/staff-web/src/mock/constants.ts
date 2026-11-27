/**
 * Reference data for the simulated staff console, ported from the prototype.
 * In production these come from tenant configuration and the identity
 * provider; here they are fixed sample values.
 */
import { toCentavos, type Grade } from "@aim-ready/core"

import type { Product, ProductCode, RoleKey, StaffUser, Stage } from "./types"

export const TENANT_ID = "kalinaw"

/** Shared demo password for every seeded staff account (sample data only). */
export const DEMO_PASSWORD = "kalinaw2026"

/** The prototype's fixed "today". */
export const TODAY = "27 Nov"

export const USERS: Record<RoleKey, StaffUser> = {
  branch: { id: "branch", email: "branchofficer@kalinawbank.ph", name: "Bea Santiago", init: "BS", title: "Branch officer", unit: "Makati Ayala branch", land: "queues" },
  officer: { id: "officer", email: "loanofficer@kalinawbank.ph", name: "Miguel Ramos", init: "MR", title: "Loan officer", unit: "Consumer credit · Metro Manila", land: "queues" },
  approver: { id: "approver", email: "approver@kalinawbank.ph", name: "Teresa Lim", init: "TL", title: "Approver", unit: "Authority ₱1,000,000 · grades A–C", land: "approvals", limit: toCentavos(1000000), grades: ["A", "B", "C"] },
  ops: { id: "ops", email: "loanops@kalinawbank.ph", name: "Paolo Reyes", init: "PR", title: "Loan operations", unit: "Credit administration · maker", land: "booking" },
  opssup: { id: "opssup", email: "opssupervisor@kalinawbank.ph", name: "Celine Uy", init: "CU", title: "Loan operations supervisor", unit: "Booking checker", land: "booking", base: "ops" },
  risk: { id: "risk", email: "creditrisk@kalinawbank.ph", name: "Rafael Cruz", init: "RC", title: "Credit risk manager", unit: "Credit policy", land: "dash-decision" },
  compliance: { id: "compliance", email: "compliance@kalinawbank.ph", name: "Nina Torres", init: "NT", title: "Compliance and audit", unit: "Read-only access", land: "audit" },
  admin: { id: "admin", email: "admin@kalinawbank.ph", name: "Jonas Mercado", init: "JM", title: "Tenant administrator", unit: "Kalinaw Bank IT", land: "products" },
}

export const STAFF_ORDER: RoleKey[] = ["branch", "officer", "approver", "ops", "opssup", "risk", "compliance", "admin"]

/** Seeded product configuration; published overrides are applied on top. */
export const BASE_PRODUCTS: Record<ProductCode, Product> = {
  PL: { code: "PL", name: "Personal loan", min: toCentavos(20000), max: toCentavos(500000), tmin: 6, tmax: 36, core: "CORE-PL-01", autoLimit: toCentavos(200000), version: "v6", fee: 0.02 },
  SL: { code: "SL", name: "Salary loan", min: toCentavos(10000), max: toCentavos(300000), tmin: 6, tmax: 24, core: "CORE-SL-02", autoLimit: toCentavos(150000), version: "v3", fee: 0.015 },
}

/** Flat monthly add-on rate, percent, by risk grade (tenant pricing grid). */
export const GRADE_RATE: Record<Grade, number> = { A: 1.1, B: 1.3, C: 1.5, D: 1.7, E: 1.9 }

/** Overrides at or above this distance from the AI amount need a second approver. */
export const OVERRIDE_THRESHOLD = toCentavos(50000)

export const STAGES: Stage[] = ["Submitted", "Checks", "Review", "Approval", "Offer", "Documentation", "Booking", "Disbursed"]

export const REASON_CODES = [
  "Verified income supports a higher amount",
  "Strong deposit relationship with Kalinaw",
  "Additional documents reduce risk",
  "Policy exception approved by credit policy",
  "Risk higher than the score suggests",
  "Lower amount keeps repayments affordable",
]

export const DECLINE_CODES = ["Insufficient verified income", "Debt-to-income above policy", "Unable to verify information", "Recent missed payments on other loans"]

export const STAFF_POOL = {
  officer: ["Miguel Ramos", "Andrea Lim", "Carlo Torres", "Nicole Santos"],
  branch: ["Bea Santiago", "Rowena Dizon", "Jessa Manalo", "Arvin Co"],
  approver: ["Teresa Lim", "Jose Navarro", "Maria Villareal"],
}

export const BRANCH_OF: Record<string, string> = { "Bea Santiago": "Makati Ayala", "Rowena Dizon": "Quezon Avenue", "Jessa Manalo": "Cebu IT Park", "Arvin Co": "Ortigas Center" }

/** [date, name, type, sort key, tenantId]. */
export const HOLIDAYS: Array<[string, string, string, number, string]> = [
  ["1 Jan", "New Year’s Day", "Regular", 101, TENANT_ID], ["17 Feb", "Chinese New Year", "Special non-working", 217, TENANT_ID], ["25 Feb", "EDSA People Power anniversary", "Special non-working", 225, TENANT_ID], ["2 Apr", "Maundy Thursday", "Regular", 402, TENANT_ID], ["3 Apr", "Good Friday", "Regular", 403, TENANT_ID], ["4 Apr", "Black Saturday", "Special non-working", 404, TENANT_ID], ["9 Apr", "Araw ng Kagitingan", "Regular", 409, TENANT_ID], ["1 May", "Labor Day", "Regular", 501, TENANT_ID], ["12 Jun", "Independence Day", "Regular", 612, TENANT_ID], ["21 Aug", "Ninoy Aquino Day", "Special non-working", 821, TENANT_ID], ["31 Aug", "National Heroes Day", "Regular", 831, TENANT_ID], ["1 Nov", "All Saints’ Day", "Special non-working", 1101, TENANT_ID], ["2 Nov", "All Souls’ Day", "Special non-working", 1102, TENANT_ID], ["30 Nov", "Bonifacio Day", "Regular", 1130, TENANT_ID], ["8 Dec", "Feast of the Immaculate Conception", "Special non-working", 1208, TENANT_ID], ["24 Dec", "Christmas Eve", "Special non-working", 1224, TENANT_ID], ["25 Dec", "Christmas Day", "Regular", 1225, TENANT_ID], ["30 Dec", "Rizal Day", "Regular", 1230, TENANT_ID], ["31 Dec", "Last day of the year", "Special non-working", 1231, TENANT_ID],
]

/** [finding, severity, owner, due, status, model, tenantId]. */
export const FINDINGS: Array<[string, string, string, string, string, string, string]> = [
  ["Feature drift on months-with-employer above watch level", "Low", "Rafael Cruz", "15 Dec", "Open", "PL-Score 3.2", TENANT_ID], ["Document override reasons for SL shadow disagreements", "Medium", "Rafael Cruz", "30 Nov", "Open", "SL-Score 1.1", TENANT_ID], ["Fairness retest due after rule set v4", "Medium", "Patricia Gomez", "10 Dec", "Open", "PL-Score 3.2", TENANT_ID], ["Shadow mode sample below 3,000 for grade D", "Low", "Patricia Gomez", "20 Dec", "Open", "SL-Score 1.1", TENANT_ID],
  ["Validation report missing data-lineage appendix", "Medium", "Rafael Cruz", "2 Sep", "Resolved", "PL-Score 3.2", TENANT_ID], ["Prohibited-feature check not run on retrain", "High", "Patricia Gomez", "25 Aug", "Resolved", "PL-Score 3.2", TENANT_ID], ["Calibration drift for income under ₱30,000", "Medium", "Rafael Cruz", "15 Aug", "Resolved", "PL-Score 3.2", TENANT_ID], ["Override reason codes too broad", "Low", "Rafael Cruz", "30 Jul", "Resolved", "PL-Score 3.2", TENANT_ID],
  ["Monitoring alert thresholds not documented", "Low", "Patricia Gomez", "15 Jul", "Resolved", "PL-Score 3.2", TENANT_ID], ["Approval-rate parity below 0.85 for age 21–25", "High", "Patricia Gomez", "30 Jun", "Resolved", "PL-Score 3.1", TENANT_ID], ["Training window excludes pandemic period without rationale", "Medium", "Rafael Cruz", "15 Jun", "Resolved", "PL-Score 3.1", TENANT_ID], ["Champion model retirement plan missing", "Low", "Rafael Cruz", "31 May", "Resolved", "Cold-start scorecard 1.0", TENANT_ID],
]

/** Existing customers an officer can pick on the assisted application (pesos converted). */
export const CUSTOMERS = [
  { tenantId: TENANT_ID, cif: "CIF-0048213", name: "Andrea Valdez", age: 34, employer: "Meridian Logistics Inc.", since: 2022, income: toCentavos(85000), payslip: toCentavos(64000), obligations: toCentavos(9000), balance: toCentavos(48250), inflow: "₱64,000 monthly, 18 months", bureau: "Full file" as const },
  { tenantId: TENANT_ID, cif: "CIF-0051907", name: "Rico Manalo", age: 29, employer: "Northwind Retail Corp.", since: 2024, income: toCentavos(42000), payslip: toCentavos(42000), obligations: toCentavos(3500), balance: toCentavos(21900), inflow: "₱42,000 monthly, 10 months", bureau: "Full file" as const },
  { tenantId: TENANT_ID, cif: "CIF-0039114", name: "Lorna Gatchalian", age: 46, employer: "Harbor Foods Trading", since: 2018, income: toCentavos(120000), payslip: toCentavos(118000), obligations: toCentavos(31000), balance: toCentavos(186400), inflow: "₱118,000 monthly", bureau: "Full file" as const },
]
