import type { AutomationMode, Centavos, CustomCondition, PolicyRule } from "@aim-ready/core"

export type RoleKey = "admin"

export type StaffUser = { id: RoleKey; email: string; name: string; init: string; title: string; unit: string }

export type AuditEntry = { tenantId: string; when: string; who: string; role: string; what: string; target: string }

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

export type ProductDraft = {
  code: ProductCode
  max: Centavos
  autoLimit: Centavos
  inReview: boolean
  author: string | null
}

export type RuleSetConfig = { pub: string; inReview: boolean; author: string | null }

export type TriggerKey = "grey" | "limit" | "thin" | "mismatch" | "dti" | "fraud" | "related" | "confidence"

/**
 * One row of the approval matrix. Amounts are free text ("Up to ₱1,000,000")
 * rather than `Centavos`: this configures what the screen displays, not a
 * value fed into a real approval-authority check (a separate, unbuilt
 * concern — see backlog WF-8).
 */
export type AuthorityLevel = { level: string; who: string; amount: string; products: string; grades: string; exceptions: string }

/** One document/e-signature template, with its merge-field body. */
export type Template = { id: string; name: string; usedFor: string; retention: string; version: string; body: string }

export type DecisionConfig = {
  ruleset: RuleSetConfig
  rules: PolicyRule[]
  bands: { approve: number; decline: number }
  triggers: Record<TriggerKey, boolean>
  automation: Record<ProductCode, AutomationMode>
  killSwitch: boolean
  bureauDown: boolean
  coreFailNext: boolean
  matrix: AuthorityLevel[]
  matrixVersion: string
  templates: Template[]
  /** Draft rule set being edited, or null. */
  draft: { rules: PolicyRule[]; bands: { approve: number; decline: number }; triggers?: Record<TriggerKey, boolean> } | null
}

/** The admin console's simulated persisted state, independent of `apps/backoffice`'s (ADR-0005). */
export type AdminState = {
  tenantId: string
  audit: AuditEntry[]
  flags: { ai: boolean }
  clock: number
  cfg: DecisionConfig
  prodOverrides: Partial<Record<ProductCode, { max: Centavos; autoLimit: Centavos; version: string }>>
  pdraft: ProductDraft | null
  /** Campaign rows; the last column is the tenant ID. */
  campaigns: string[][]
  /**
   * Template names currently referenced by an open (not-yet-closed) loan's
   * documents — this app has no case pipeline of its own, so this is the
   * minimal stand-in for `apps/backoffice`'s "not-yet-closed case still
   * references this template" check (design.md D3).
   */
  openCaseDocs: string[]
}

export type { CustomCondition }
