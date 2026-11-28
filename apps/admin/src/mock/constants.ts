import { toCentavos, type Grade } from "@aim-ready/core"

import type { Product, ProductCode, RoleKey, StaffUser } from "./types"

export const TENANT_ID = "kalinaw"

/** The tenant bank's display name (used in decision reasons and documents). */
export const BANK_NAME = "Kalinaw"

/** Shared demo password for the seeded account (sample data only). */
export const DEMO_PASSWORD = "kalinaw2026"

/** The prototype's fixed "today". */
export const TODAY = "27 Nov"

/** The single seeded tenant administrator account — same identity as `apps/backoffice`'s, now signing into its own app. */
export const USERS: Record<RoleKey, StaffUser> = {
  admin: { id: "admin", email: "admin@kalinawbank.ph", name: "Jonas Mercado", init: "JM", title: "Tenant administrator", unit: "Kalinaw Bank IT" },
}

/** Seeded product configuration; published overrides are applied on top. */
export const BASE_PRODUCTS: Record<ProductCode, Product> = {
  PL: { code: "PL", name: "Personal loan", min: toCentavos(20000), max: toCentavos(500000), tmin: 6, tmax: 36, core: "CORE-PL-01", autoLimit: toCentavos(200000), version: "v6", fee: 0.02 },
  SL: { code: "SL", name: "Salary loan", min: toCentavos(10000), max: toCentavos(300000), tmin: 6, tmax: 24, core: "CORE-SL-02", autoLimit: toCentavos(150000), version: "v3", fee: 0.015 },
}

/** Flat monthly add-on rate, percent, by risk grade (tenant pricing grid). */
export const GRADE_RATE: Record<Grade, number> = { A: 1.1, B: 1.3, C: 1.5, D: 1.7, E: 1.9 }

export const STAGES = ["Submitted", "Checks", "Review", "Approval", "Offer", "Documentation", "Booking", "Disbursed"]

/** [date, holiday, type, sort key]. */
export const HOLIDAYS: Array<[string, string, string, number]> = [
  ["1 Jan", "New Year’s Day", "Regular", 101], ["17 Feb", "Chinese New Year", "Special non-working", 217], ["25 Feb", "EDSA People Power anniversary", "Special non-working", 225], ["2 Apr", "Maundy Thursday", "Regular", 402], ["3 Apr", "Good Friday", "Regular", 403], ["4 Apr", "Black Saturday", "Special non-working", 404], ["9 Apr", "Araw ng Kagitingan", "Regular", 409], ["1 May", "Labor Day", "Regular", 501], ["12 Jun", "Independence Day", "Regular", 612], ["21 Aug", "Ninoy Aquino Day", "Special non-working", 821], ["31 Aug", "National Heroes Day", "Regular", 831], ["1 Nov", "All Saints’ Day", "Special non-working", 1101], ["2 Nov", "All Souls’ Day", "Special non-working", 1102], ["30 Nov", "Bonifacio Day", "Regular", 1130], ["8 Dec", "Feast of the Immaculate Conception", "Special non-working", 1208], ["24 Dec", "Christmas Eve", "Special non-working", 1224], ["25 Dec", "Christmas Day", "Regular", 1225], ["30 Dec", "Rizal Day", "Regular", 1230], ["31 Dec", "Last day of the year", "Special non-working", 1231],
]

/** Overrides at or above this distance from the AI amount need a second approver. */
export const OVERRIDE_THRESHOLD = toCentavos(50000)

/** Approval authority used only for the Products screen's workflow blurb (not a real enforcement check). */
export const APPROVER_LIMIT = toCentavos(1000000)
export const APPROVER_GRADES = "A–C"
