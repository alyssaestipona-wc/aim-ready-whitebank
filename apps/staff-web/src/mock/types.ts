/**
 * Shapes of the staff console's simulated records. Ported from the
 * prototype's state object. Money fields are integer centavos.
 */
import type { Centavos, DecisionInput, Grade, Outcome, PolicyRule, Reason, RuleResult, AutomationMode } from "@aim-ready/core"

export type RoleKey = "branch" | "officer" | "approver" | "ops" | "opssup" | "risk" | "compliance" | "admin"
/** The role whose screens a user sees; the ops supervisor shares loan operations' screens. */
export type BaseRole = Exclude<RoleKey, "opssup">

export type StaffUser = {
  id: RoleKey
  email: string
  name: string
  init: string
  title: string
  unit: string
  /** Route the user lands on after sign-in. */
  land: string
  /** Approval authority, in centavos. */
  limit?: Centavos
  grades?: Grade[]
  base?: BaseRole
}

export type ProductCode = "PL" | "SL"

export type Product = {
  code: ProductCode
  name: string
  min: Centavos
  max: Centavos
  tmin: number
  tmax: number
  core: string
  autoLimit: Centavos
  version: string
  /** Processing fee as a fraction of the amount. */
  fee: number
}

export type Stage =
  | "Draft"
  | "Submitted"
  | "Checks"
  | "Review"
  | "Info requested"
  | "Approval"
  | "Committee"
  | "Offer"
  | "Documentation"
  | "Booking"
  | "Pending checker"
  | "Disbursed"
  | "Declined"
  | "Withdrawn"

export type Channel = "Web app" | "Branch" | "File intake"

export type HistEntry = { who: string; what: string; when: string }

/** [document name, status], e.g. ["Payslip (Oct 2026)", "Verified"]. */
export type DocEntry = [string, string]

/** [check, provider, result]. */
export type CheckEntry = [string, string, string]

export type Recommendation = {
  by: string
  decision: "approve" | "counter" | "decline"
  amount: Centavos
  tenor: number
  reason: string | null
  overLevel: "above" | "below" | null
  note: string
}

export type Offer = { amount: Centavos; tenor: number; grade: Grade }

export type Booking = {
  status: "pending" | "booked" | "failed"
  maker: string
  checker?: string
  key: string
  attempts: number
  error?: string
  failedAt?: string
}

export type BureauSummary = { provider: string; file: string; score: number | null; lines: number; util: string; delinq: string }
export type CoreSummary = { since: number; balance: Centavos; inflow: string; loans: string }

export type AssistedDraft = {
  cif: string
  name: string
  age: string
  employer: string
  product: ProductCode
  amount: Centavos | null
  tenor: number
  purpose: string
  income: Centavos | null
  obligations: Centavos | null
  c1: boolean
  c2: boolean
  c3: boolean
  scans: { id?: boolean; payslip?: boolean }
  useVerified: boolean | null
}

export type StatementAnalysis = { salary: Centavos; months: number; obligations: Centavos; adb: Centavos; returned: number }

export type Application = {
  tenantId: string
  id: string
  name: string
  product: ProductCode
  amount: Centavos
  tenor: number
  channel: Channel
  stage: Stage
  owner: string | null
  branch: string | null
  created: string
  /** Hours left in the stage; negative when breached; null when no SLA applies. */
  sla: number | null
  age?: number
  cif?: string | null
  employer?: string
  income?: Centavos
  verified?: Centavos | null
  obligations?: Centavos
  outcome: Outcome | null
  score: number | null
  grade: Grade | null
  pd?: number | null
  trigger: string
  ruleset: string
  model: string
  bands?: { approve: number; decline: number }
  reasons: Reason[]
  rules: RuleResult[]
  aiRec?: { decision: "approve" | "decline"; amount: Centavos; tenor: number } | null
  bureau: BureauSummary | null
  core: CoreSummary | null
  checks: CheckEntry[]
  docs: DocEntry[]
  consent: boolean
  version: string
  recommendation: Recommendation | null
  offer: Offer | null
  borrowerPending: "docs" | "sign" | null
  booking: Booking | null
  loanNo: string | null
  hist: HistEntry[]
  stmt: StatementAnalysis | null
  infoReq: string | null
  infoMsg?: string
  infoDue?: string
  govId?: string
  borrower?: string | null
  recDefault?: Centavos
  recNote?: string
  naDraft?: AssistedDraft
  aml?: string
  signed?: boolean
  accepted?: boolean
  disbTo?: string
  disbAt?: string
  offerSent?: string
  declineReason?: string
  withdrawReason?: string
  /**
   * The immutable decision record produced when the application was
   * submitted (inputs, rule-set and model versions, outcome). Absent on
   * seeded cases, which carry the equivalent fields directly.
   */
  decision?: DecisionSnapshot
}

/** Frozen copy of a simulated decision, stored on the case. */
export type DecisionSnapshot = {
  outcome: Outcome
  score: number | null
  grade: Grade | null
  trigger: string
  ruleSetVersion: string
  modelVersion: string
  inputs: DecisionInput
  decidedAt: string
}

export type AuditEntry = { when: string; who: string; role: string; what: string; target: string }

export type RuleSetConfig = {
  pub: string
  inReview: boolean
  author: string | null
}

export type TriggerKey = "grey" | "limit" | "thin" | "mismatch" | "dti" | "fraud" | "related" | "confidence"

export type DecisionConfig = {
  ruleset: RuleSetConfig
  rules: PolicyRule[]
  bands: { approve: number; decline: number }
  triggers: Record<TriggerKey, boolean>
  automation: Record<ProductCode, AutomationMode>
  killSwitch: boolean
  bureauDown: boolean
  coreFailNext: boolean
  /** Draft rule set being edited, or null. */
  draft: { rules: PolicyRule[]; bands: { approve: number; decline: number }; triggers?: Record<TriggerKey, boolean> } | null
}

export type IntakeDraft = {
  name: string
  product: ProductCode
  amount: Centavos
  tenor: number
  income: Centavos
  age: number
  source: string
  flag: string | null
  status: "Draft" | "Submitted"
  app?: string
}

export type AmlCase = { app: string | null; name: string; match: string; status: string }

/** [file, period, records, errors, status]. */
export type CicRow = [string, string, string, number, string]

export type ProductDraft = {
  code: ProductCode
  max: Centavos
  autoLimit: Centavos
  inReview: boolean
  author: string | null
}

export type StaffState = {
  tenantId: string
  apps: Application[]
  cfg: DecisionConfig
  audit: AuditEntry[]
  intakeFile: string | null
  clock: number
  seq: number
  flags: { ai: boolean }
  prodOverrides: Partial<Record<ProductCode, { max: Centavos; autoLimit: Centavos; version: string }>>
  pdraft: ProductDraft | null
  cic: CicRow[]
  drafts: IntakeDraft[]
  amlCases: AmlCase[]
  cicHist: CicRow[]
  related: string[][]
  campaigns: string[][]
  /** "role:notificationId" → read. */
  notifRead: Record<string, boolean>
}
