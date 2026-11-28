import type { Centavos, DecisionRecord, Grade } from "@aim-ready/core"

/*
 * Shapes of the simulated borrower-side data. Every record carries the tenant
 * identifier, even in this single-tenant Phase 1 deployment.
 */

export type TenantId = "kalinaw"

export type ProductCode = "PL" | "SL"

export type Product = {
  code: ProductCode
  name: string
  min: Centavos
  max: Centavos
  tenorMin: number
  tenorMax: number
  /** Processing fee as a fraction of principal. */
  feeRate: number
}

export type Borrower = {
  tenantId: TenantId
  id: string
  email: string
  name: string
  first: string
  cif: string
  age: number
  employer: string
  since: number
  income: Centavos
  obligations: Centavos
  balance: Centavos
  bureau: "Full file" | "Thin file" | "No file"
  account: string
  stable: boolean
}

export type Stage =
  | "Review"
  | "Info requested"
  | "Offer"
  | "Documentation"
  | "Booking"
  | "Disbursed"
  | "Declined"
  | "Withdrawn"

export type HistoryEntry = { who: string; what: string; when: string }

/** [document name, status], e.g. ["Loan agreement", "Sent for signature"]. */
export type DocEntry = readonly [string, string]

export type Offer = { amount: Centavos; tenor: number; grade: Grade }

export type Application = {
  tenantId: TenantId
  id: string
  /** The real application id apps/api persisted this under (real-application-intake). */
  serverId: string
  borrower: string
  name: string
  product: ProductCode
  amount: Centavos
  tenor: number
  income: Centavos
  obligations: Centavos
  purpose: string
  channel: "Web app"
  cif: string
  employer: string
  govId: string
  created: string
  stage: Stage
  /** What the borrower must do next, if anything. */
  borrowerPending: "docs" | "sign" | null
  offer: Offer | null
  /** The immutable decision record produced at submission. */
  decision: DecisionRecord
  /** Set once the (simulated) bank has asked for documents. */
  infoRequested: boolean
  infoReq: string | null
  infoMsg: string | null
  infoDue: string | null
  /** Amount the statement analysis supports, for the offer after review. */
  recDefault: Centavos | null
  docs: DocEntry[]
  hist: HistoryEntry[]
  loanNo: string | null
  disbTo: string | null
  withdrawReason: string | null
  /** When (ms) the case started waiting on a simulated bank step, or null. */
  waitingSince: number | null
}

export type BorrowerState = {
  version: 1
  tenantId: TenantId
  /** Logical clock for "27 Nov, 10:32"-style timestamps. */
  clock: number
  seq: number
  session: string | null
  apps: Application[]
}

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }
