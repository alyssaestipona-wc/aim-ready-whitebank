# Tasks

## 1. apps/api: data model
- [x] 1.1 Add a migration (timestamp > 1795851842410) adding nullable `reviewer_id uuid` and `decline_reason_code varchar` to `applications`, with matching `down()`.
- [x] 1.2 Add `reviewerId`/`declineReasonCode` nullable columns to `ApplicationEntity`.
- [x] 1.3 Add `APPROVER_AUTHORITY` (`{ limit: Centavos, grades: Grade[] }`), `DECLINE_REASON_CODES` (4 strings), and `GRADE_RATE` (`Record<Grade, number>`) seeded constants to `apps/api/src/applications/policy.ts`, lifted verbatim from `apps/backoffice/src/mock/constants.ts`'s `USERS.approver`, `DECLINE_CODES`, `GRADE_RATE`.

## 2. apps/api: decide endpoint
- [x] 2.1 Add `dto/decide-application.dto.ts` (`decision: 'approve' | 'decline'`, `reasonCode?: string`) with class-validator.
- [x] 2.2 Add `ApplicationsService.decide(user, applicationId, dto)`: tenant-scoped lookup (404 for missing/cross-tenant, matching `findOneForTenant`'s pattern); refuses if stage isn't `Review`; on approve, refuses above-authority (amount or grade) naming the limit, otherwise sets stage `Offer`, `reviewerId`, and returns the computed monthly repayment; on decline, refuses a missing/invalid reason code naming the valid list, otherwise sets stage `Declined`, `reviewerId`, `declineReasonCode`.
- [x] 2.3 Add `PATCH /applications/:id/decide` to `ApplicationsController`, `@Roles('approver')`.

## 3. packages/contracts
- [x] 3.1 Add `decideApplicationRequestSchema`, `decideApplicationSuccessSchema` (includes `monthlyPayment` on approve), `decideApplicationErrorSchema`, `decideApplicationResponseSchema` and their inferred types.

## 4. apps/backoffice
- [x] 4.1 Add `decideApplication(id, dto)` to `apps/backoffice/src/mock/actions/applications.ts`, calling the new endpoint with the same Bearer-token pattern as `listApplications`/`getApplication`.
- [x] 4.2 Add Approve/Decline controls to `live-applications/[id]/page.tsx`: visible only to the approver role and only while `stage === 'Review'`; Decline requires picking a reason code from `DECLINE_REASON_CODES` before it can be sent; both refetch the detail on success and show the returned error on failure.

## 5. Tests
- [x] 5.1 `apps/api`: Jest integration tests for `decide()` — approve within authority (stage, reviewerId, monthly repayment), approve above amount limit (refused, stays Review), approve with an out-of-authority grade (refused), decline with a valid reason code, decline with a missing/invalid reason code (refused), deciding a non-Review-stage application (refused), cross-tenant 404, non-approver role refused.
- [x] 5.2 `apps/backoffice`: Vitest tests for the new actions — approver sees Approve/Decline on a Review-stage application, actions hidden once decided, actions hidden for a non-approver role, decline requires a reason code before sending, a refused decide (e.g. above authority) shows the server's error.

## 6. Cleanup and verification
- [x] 6.1 `npx eslint --fix` on apps/api and apps/backoffice; `npx tsc --noEmit` on apps/api, apps/backoffice, and `packages/contracts`.
- [x] 6.2 Full monorepo `turbo run typecheck lint build test` (with `DB_NAME=aimready_test` for `apps/api`'s test step), confirming all green, including repeated parallel `turbo run test --force` runs for `apps/api`.
