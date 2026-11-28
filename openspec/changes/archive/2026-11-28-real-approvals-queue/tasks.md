# Tasks

## 1. apps/api: stats and preview endpoints

- [x] 1.1 Add `ApplicationsService.approvalsSummary(user)`: tenant-scoped, computing `{waitingOnMe, decidedToday, overridesThisWeek, medianMinutesToDecide}` from real `stage`/`decidedAt`/`recommendation` data (median computed in application code per design.md - fetch decided-this-week rows, compute `decidedAt - recommendation.recommendedAt` in minutes per row, median of the sorted list). Jest integration tests: correct counts with a mix of waiting/decided-today/decided-earlier/overridden applications; zero-data tenant returns zeros, not an error; another tenant's applications never counted.
- [x] 1.2 Add `GET /applications/approvals-summary` to `ApplicationsController`, `@Roles('approver')`. Controller-metadata test; live-HTTP role-enforcement row (wrong staff role refused).
- [x] 1.3 Add `ApplicationsService.previewApproval(user, id)`: requires `stage === 'Approval'` and a non-null `recommendation` (else refuse, matching `decide()`'s own precondition), returns `{monthlyPayment}` computed exactly as `decide()` computes it on approval, writing nothing. Jest integration tests: correct repayment for a recommended application; refused for a non-`Approval`-stage application; refused when the application has no recommendation; another tenant's application is not found.
- [x] 1.4 Add `GET /applications/:id/approve-preview` to `ApplicationsController`, `@Roles('approver')`. Controller-metadata test; live-HTTP role-enforcement row.

## 2. packages/contracts

- [x] 2.1 Add `approvalsSummarySchema`/`ApprovalsSummaryResponse` (`waitingOnMe`, `decidedToday`, `overridesThisWeek`, `medianMinutesToDecide` - all non-negative integers, `medianMinutesToDecide` nullable for a zero-decided week) and `approvePreviewResponseSchema`/`ApprovePreviewResponse` (`{monthlyPayment: number}`).

## 3. apps/backoffice: real actions and the queue screen

- [x] 3.1 Add `getApprovalsSummary()` and `previewApproval(id)` to `apps/backoffice/src/mock/actions/applications.ts`, matching the existing `Result<T>` shape and `getSessionToken()`/`API_BASE_URL` pattern every other function in that file already uses.
- [x] 3.2 Add `apps/backoffice/src/app/(console)/live-approvals/page.tsx`: real, non-simulated, `@Roles`-equivalent gated to the approver role via `useSessionRole()` (matching the existing real screens' pattern), fetches `listApplications({stage: "Approval"})` and `getApprovalsSummary()` on mount, renders the list via `ListView` (same columns style as `/live-applications`: id, product, amount, tenor, grade, recommendation/override badge) and the four KPI tiles via `Kpi`/`KpiGrid`. Distinct route from both the simulated `/approvals` and the real `/live-applications`.
- [x] 3.3 Vitest coverage: renders real `Approval`-stage applications and real KPI values from the real endpoints; a non-approver role does not see the nav link to this screen (if the sidebar is role-filtered the same way other real screens are - confirm the actual pattern during implementation); a store-unreachable response shows a distinct error.

## 4. apps/backoffice: confirm-before-send on the real Approve action

- [x] 4.1 In `apps/backoffice/src/app/(console)/live-applications/[id]/page.tsx`, wrap the existing Approve action in a `ConfirmDialog` (from `@aim-ready/ui`, matching `apps/admin`'s `decisioning-controls` page's own established pattern): clicking Approve opens the dialog and fetches the preview (`previewApproval(id)`) to show the real monthly repayment in its body; `onConfirm` performs the existing real `decideApplication(id, {decision: "approve"})` call and refetches the application on success, returning an error string on failure (matching `ConfirmDialog`'s own `onConfirm` contract) instead of a toast. Cancelling calls nothing and leaves the application unchanged. Decline and Return to officer are unaffected.
- [x] 4.2 Vitest coverage: selecting Approve opens the confirm dialog showing the previewed monthly repayment, not yet calling `decide`; confirming calls `decide("approve")` and the screen updates to `Offer`; cancelling calls neither `decide` nor changes the screen; a preview-fetch failure shows a distinct error in the dialog without blocking Decline/Return.

## 5. Cleanup and verification

- [x] 5.1 `npx eslint --fix` on apps/api, apps/backoffice; `npx tsc --noEmit` on apps/api, apps/backoffice, packages/contracts.
- [x] 5.2 Full monorepo `turbo run typecheck lint build test` (`DB_NAME=aimready_test` for apps/api's test step; no new migration expected - no new columns), confirming all green, including a repeated isolated `turbo run test --filter=api --force` and `--filter=backoffice --force` run.

## Workflow follow-up

- Run `openspec validate real-approvals-queue --strict`.
- Run spec-review, then code-review (fresh session), fixing findings until each reports clean.
- Archive the change, syncing `application-intake` and `staff-console` into `openspec/specs/`.
- Branch, commit, push, open a PR with a test-plan body, watch CI, merge once green.
- Update the Lending Tracker: mark WF-7 `done`. WF-9 `done` (was `in_progress`, now meets its own AC in full). WF-8 and WF-11 stay `in_progress`/`not_started` (their remaining scope - approval-matrix config UI, segregation-of-duties screen - is named non-goal this round); WF-10/WF-12 stay stretch, untouched. Epic 4 is NOT 100% since WF-8/WF-11 aren't deferred/stretch - honest, matching Epic 3's own DEC-3 precedent.
