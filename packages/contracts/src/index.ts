import { z } from "zod"

/*
 * Kept as a single file with no internal relative imports: apps/api loads
 * this package at runtime (not just type-checks it), and a multi-file split
 * here broke under more than one of this monorepo's runtimes (Jest's
 * CommonJS resolver, Next.js's bundler, and plain Node's own module loader
 * each resolve a relative specifier differently) - one file sidesteps all
 * three at once.
 */

/**
 * Which frontend app a session belongs to. A session token issued for one
 * scope is rejected by every other app's own session verification, even
 * though all three apps share one identity service (apps/api).
 */
export const appScopeSchema = z.enum(["borrower", "staff", "admin"])
export type AppScope = z.infer<typeof appScopeSchema>

/** The nine PRD roles that can hold a staff-scoped session. */
export const staffRoleSchema = z.enum(["branch", "officer", "approver", "ops", "opssup", "risk", "compliance"])
export type StaffRole = z.infer<typeof staffRoleSchema>

export const roleSchema = z.union([z.literal("borrower"), staffRoleSchema, z.literal("admin")])
export type Role = z.infer<typeof roleSchema>

/** Decoded shape of a session token issued by apps/api's identity service. */
export const sessionTokenPayloadSchema = z.object({
  sub: z.string().min(1),
  tenantId: z.string().min(1),
  appScope: appScopeSchema,
  role: roleSchema,
  email: z.string().email(),
  iat: z.number(),
  exp: z.number(),
})
export type SessionTokenPayload = z.infer<typeof sessionTokenPayloadSchema>

/** Decoded shape of the short-lived token binding a staff/admin login to its pending code step. */
export const pendingTokenPayloadSchema = z.object({
  sub: z.string().min(1),
  tenantId: z.string().min(1),
  appScope: appScopeSchema,
  role: roleSchema,
  email: z.string().email(),
  code: z.string().length(6),
  iat: z.number(),
  exp: z.number(),
})
export type PendingTokenPayload = z.infer<typeof pendingTokenPayloadSchema>

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  appScope: appScopeSchema,
})
export type LoginRequest = z.infer<typeof loginRequestSchema>

/** A borrower logs in with one step and gets a session immediately. */
export const loginSessionResultSchema = z.object({
  ok: z.literal(true),
  kind: z.literal("session"),
  token: z.string().min(1),
  role: roleSchema,
  email: z.string().email(),
})
export type LoginSessionResult = z.infer<typeof loginSessionResultSchema>

/**
 * A staff or admin login with correct credentials doesn't get a session yet
 * - it gets a pending token binding this specific attempt to the six-digit
 * code step. `devCode` is a non-production-only convenience (the real
 * service never sends it over SMS/email in this phase, see proposal.md's
 * non-goals): present outside `NODE_ENV=production`, absent in it. No
 * frontend reads this field; it exists for manual/dev testing only.
 */
export const loginCodeRequiredResultSchema = z.object({
  ok: z.literal(true),
  kind: z.literal("code-required"),
  pendingToken: z.string().min(1),
  devCode: z.string().length(6).optional(),
})
export type LoginCodeRequiredResult = z.infer<typeof loginCodeRequiredResultSchema>

export const loginErrorResultSchema = z.object({
  ok: z.literal(false),
  error: z.string().min(1),
})
export type LoginErrorResult = z.infer<typeof loginErrorResultSchema>

export const loginResponseSchema = z.union([loginSessionResultSchema, loginCodeRequiredResultSchema, loginErrorResultSchema])
export type LoginResponse = LoginSessionResult | LoginCodeRequiredResult | LoginErrorResult

export const verifyCodeRequestSchema = z.object({
  pendingToken: z.string().min(1),
  code: z.string().min(1),
})
export type VerifyCodeRequest = z.infer<typeof verifyCodeRequestSchema>

export const verifyCodeResponseSchema = z.discriminatedUnion("ok", [loginSessionResultSchema, loginErrorResultSchema])
export type VerifyCodeResponse = LoginSessionResult | LoginErrorResult

export const createApplicationRequestSchema = z.object({
  product: z.enum(["PL", "SL"]),
  amount: z.number().int().positive(),
  tenor: z.number().int().positive(),
  income: z.number().int().positive(),
  obligations: z.number().int().min(0),
  purpose: z.string().min(1),
  consentCredit: z.boolean(),
  consentData: z.boolean(),
  consentTerms: z.boolean(),
})
export type CreateApplicationRequest = z.infer<typeof createApplicationRequestSchema>

/**
 * `decision` is the full `DecisionRecord` from `@aim-ready/core`, left
 * untyped here rather than duplicated: ADR-0002 keeps `packages/contracts`
 * and `packages/core` from depending on each other, and both apps/api and
 * apps/web already import `DecisionRecord` from `@aim-ready/core` directly
 * for their own use, so the consumer casts to that shared type rather
 * than this package re-describing it.
 */
export const createApplicationSuccessSchema = z.object({
  ok: z.literal(true),
  applicationId: z.string().min(1),
  decision: z.unknown(),
})
export type CreateApplicationSuccess = z.infer<typeof createApplicationSuccessSchema>

export const createApplicationErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string().min(1),
})
export type CreateApplicationError = z.infer<typeof createApplicationErrorSchema>

export const createApplicationResponseSchema = z.union([createApplicationSuccessSchema, createApplicationErrorSchema])
export type CreateApplicationResponse = CreateApplicationSuccess | CreateApplicationError

/** A tenant-scoped staff list row. `outcome`/`grade` are read off the stored decision record. */
export const staffApplicationListItemSchema = z.object({
  id: z.string().min(1),
  productCode: z.string().min(1),
  amount: z.number().int(),
  tenor: z.number().int(),
  stage: z.string().min(1),
  outcome: z.string().min(1),
  grade: z.string().min(1).nullable(),
  assigneeId: z.string().min(1).nullable(),
  slaHoursLeft: z.number().nullable(),
})
export type StaffApplicationListItem = z.infer<typeof staffApplicationListItemSchema>

export const staffApplicationListResponseSchema = z.array(staffApplicationListItemSchema)
export type StaffApplicationListResponse = z.infer<typeof staffApplicationListResponseSchema>

/**
 * A borrower's own list row. Deliberately narrower than
 * `staffApplicationListItemSchema` - no score, grade, rules, reviewerId,
 * ruleSetVersion, or modelVersion. Structurally distinct (not a subset/pick
 * of the staff schema) so a future change can't accidentally leak staff-only
 * fields to a borrower through this path.
 */
export const borrowerApplicationListItemSchema = z.object({
  id: z.string().min(1),
  productCode: z.string().min(1),
  amount: z.number().int(),
  tenor: z.number().int(),
  stage: z.string().min(1),
  outcome: z.string().min(1),
  declineReasonCode: z.string().min(1).nullable(),
  createdAt: z.coerce.date(),
})
export type BorrowerApplicationListItem = z.infer<typeof borrowerApplicationListItemSchema>

export const borrowerApplicationListResponseSchema = z.array(borrowerApplicationListItemSchema)
export type BorrowerApplicationListResponse = z.infer<typeof borrowerApplicationListResponseSchema>

/** The owning officer's recommendation on a `Review`-stage application, once made. */
export const recommendationSchema = z.object({
  by: z.string().min(1),
  decision: z.enum(["approve", "counter", "decline"]),
  amount: z.number().int(),
  tenor: z.number().int(),
  reasonCode: z.string().min(1).nullable(),
  overrideLevel: z.enum(["above", "below"]).nullable(),
  note: z.string().min(1).nullable(),
  recommendedAt: z.string().min(1),
})
export type RecommendationShape = z.infer<typeof recommendationSchema>

/** The AI's own implicit recommendation for a referred application - derived, never stored separately. */
export const aiRecommendationSchema = z.object({
  decision: z.literal("approve"),
  amount: z.number().int(),
  tenor: z.number().int(),
})
export type AiRecommendationShape = z.infer<typeof aiRecommendationSchema>

/** `decision` is `z.unknown()` for the same ADR-0002 reason as `createApplicationSuccessSchema`. */
export const staffApplicationDetailSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  borrowerId: z.string().min(1),
  productCode: z.string().min(1),
  amount: z.number().int(),
  tenor: z.number().int(),
  income: z.number().int(),
  obligations: z.number().int(),
  purpose: z.string().min(1),
  stage: z.string().min(1),
  decision: z.unknown(),
  createdAt: z.string().min(1),
  assigneeId: z.string().min(1).nullable(),
  slaHoursLeft: z.number().nullable(),
  infoRequestItems: z.array(z.string().min(1)).nullable(),
  infoRequestMessage: z.string().min(1).nullable(),
  recommendation: recommendationSchema.nullable(),
  aiRecommendation: aiRecommendationSchema.nullable(),
  reviewerId: z.string().min(1).nullable(),
  declineReasonCode: z.string().min(1).nullable(),
  decidedAt: z.string().min(1).nullable(),
  consents: z.array(z.object({
    kind: z.string().min(1),
    capturedAt: z.string().min(1),
    termsVersion: z.string().min(1),
  })),
})
export type StaffApplicationDetail = z.infer<typeof staffApplicationDetailSchema>

export const decideApplicationRequestSchema = z.object({
  decision: z.enum(["approve", "decline"]),
  reasonCode: z.string().min(1).optional(),
})
export type DecideApplicationRequest = z.infer<typeof decideApplicationRequestSchema>

export const decideApplicationSuccessSchema = z.union([
  z.object({ ok: z.literal(true), stage: z.literal("Offer"), monthlyPayment: z.number().int() }),
  z.object({ ok: z.literal(true), stage: z.literal("Declined") }),
])
export type DecideApplicationSuccess = z.infer<typeof decideApplicationSuccessSchema>

export const decideApplicationErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string().min(1),
})
export type DecideApplicationError = z.infer<typeof decideApplicationErrorSchema>

export const decideApplicationResponseSchema = z.union([decideApplicationSuccessSchema, decideApplicationErrorSchema])
export type DecideApplicationResponse = DecideApplicationSuccess | DecideApplicationError

export const pickApplicationResponseSchema = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: z.string().min(1) }),
])
export type PickApplicationResponse = z.infer<typeof pickApplicationResponseSchema>

export const requestInfoRequestSchema = z.object({
  items: z.array(z.string().min(1)).min(1),
  message: z.string().min(1),
})
export type RequestInfoRequest = z.infer<typeof requestInfoRequestSchema>

export const requestInfoResponseSchema = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: z.string().min(1) }),
])
export type RequestInfoResponse = z.infer<typeof requestInfoResponseSchema>

export const resolveInfoResponseSchema = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: z.string().min(1) }),
])
export type ResolveInfoResponse = z.infer<typeof resolveInfoResponseSchema>

export const recommendApplicationRequestSchema = z.object({
  decision: z.enum(["approve", "counter", "decline"]),
  amount: z.number().int().positive().nullable().optional(),
  tenor: z.number().int().positive(),
  reasonCode: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
})
export type RecommendApplicationRequest = z.infer<typeof recommendApplicationRequestSchema>

export const recommendApplicationResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    stage: z.literal("Approval"),
    overrideLevel: z.enum(["above", "below"]).nullable(),
  }),
  z.object({ ok: z.literal(false), error: z.string().min(1) }),
])
export type RecommendApplicationResponse = z.infer<typeof recommendApplicationResponseSchema>

export const returnToOfficerResponseSchema = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: z.string().min(1) }),
])
export type ReturnToOfficerResponse = z.infer<typeof returnToOfficerResponseSchema>

/** Tenant-wide team KPIs for the real approvals queue - never per-approver. See design.md of `real-approvals-queue`. */
export const approvalsSummarySchema = z.object({
  waitingOnMe: z.number().int().nonnegative(),
  decidedToday: z.number().int().nonnegative(),
  overridesThisWeek: z.number().int().nonnegative(),
  medianMinutesToDecide: z.number().nonnegative().nullable(),
})
export type ApprovalsSummaryResponse = z.infer<typeof approvalsSummarySchema>

export const approvePreviewResponseSchema = z.union([
  z.object({ ok: z.literal(true), monthlyPayment: z.number().int() }),
  z.object({ ok: z.literal(false), error: z.string().min(1) }),
])
export type ApprovePreviewResponse = z.infer<typeof approvePreviewResponseSchema>

export const tenantConfigResponseSchema = z.object({
  killSwitch: z.boolean(),
  bureauDown: z.boolean(),
})
export type TenantConfigResponse = z.infer<typeof tenantConfigResponseSchema>

export const updateTenantConfigRequestSchema = z.object({
  killSwitch: z.boolean().optional(),
  bureauDown: z.boolean().optional(),
})
export type UpdateTenantConfigRequest = z.infer<typeof updateTenantConfigRequestSchema>

/**
 * The one seeded checklist for requesting information from a borrower -
 * single source of truth for both apps/api's `@IsIn` validation whitelist
 * and apps/backoffice's real (not simulated) request-info checklist UI, so
 * the two can never silently drift apart. Labels lifted verbatim from the
 * simulated console's own `INFO_ITEMS` (apps/backoffice/src/mock/actions/
 * cases.ts) at the time this was written.
 */
export const INFO_REQUEST_ITEMS = [
  ["ri1", "Bank statements, last 3 months"],
  ["ri2", "Certificate of employment"],
  ["ri3", "Latest income tax return"],
] as const
export const INFO_REQUEST_ITEM_IDS = INFO_REQUEST_ITEMS.map(([id]) => id)

/**
 * The seeded, fixed reason-code list for an officer's recommendation that
 * differs from the AI's own - single source of truth for both apps/api's
 * validation whitelist and apps/backoffice's real recommend-a-decision UI,
 * same reasoning as `INFO_REQUEST_ITEMS` above. Lifted verbatim from the
 * simulated console's own `REASON_CODES` (apps/backoffice/src/mock/
 * constants.ts) at the time this was written.
 */
export const OVERRIDE_REASON_CODES = [
  "Verified income supports a higher amount",
  "Strong deposit relationship with Kalinaw",
  "Additional documents reduce risk",
  "Policy exception approved by credit policy",
  "Risk higher than the score suggests",
  "Lower amount keeps repayments affordable",
] as const
