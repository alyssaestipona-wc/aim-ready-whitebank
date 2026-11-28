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
})
export type StaffApplicationListItem = z.infer<typeof staffApplicationListItemSchema>

export const staffApplicationListResponseSchema = z.array(staffApplicationListItemSchema)
export type StaffApplicationListResponse = z.infer<typeof staffApplicationListResponseSchema>

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
  consents: z.array(z.object({
    kind: z.string().min(1),
    capturedAt: z.string().min(1),
    termsVersion: z.string().min(1),
  })),
})
export type StaffApplicationDetail = z.infer<typeof staffApplicationDetailSchema>
