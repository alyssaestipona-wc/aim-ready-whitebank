# Tasks

## 1. apps/api: borrower-scoped read

- [x] 1.1 Add `ApplicationsService.findMineForBorrower(user: SessionUser)`: tenant+`borrowerId`-scoped (`WHERE tenantId = :tenantId AND borrowerId = :sub`), ordered newest-first, mapping to the new narrower shape (id, productCode, amount, tenor, stage, outcome, declineReasonCode, createdAt - no score/grade/rules/reviewerId). Verify with a Jest integration test: a borrower's own applications are returned; another borrower's (same tenant) are never included; another tenant's are never included.
- [x] 1.2 Add `GET /applications/mine` to `ApplicationsController` (no `@Roles` override needed - the class-level `@Roles('borrower')` already covers it, matching `create()`/`close()`). Controller-metadata test confirming it inherits the class-level role, matching the existing pattern in `applications.controller.spec.ts`.
- [x] 1.3 Live-HTTP role-enforcement test: add a row to `applications.role-enforcement.e2e.spec.ts`'s table for `GET /applications/mine` with a wrong (staff) role, matching the existing pattern for every other mutating route.

## 2. packages/contracts

- [x] 2.1 Add `borrowerApplicationListItemSchema`/`borrowerApplicationListResponseSchema` - a schema that structurally cannot carry score/grade/rules/reviewerId/ruleSetVersion/modelVersion, so a future change can't accidentally leak them to a borrower through this path.

## 3. apps/web: session identity and the real action module

- [x] 3.1 Add `apps/web/src/lib/decode-session-token.ts`, ported from `apps/backoffice/src/lib/decode-session-token.ts` verbatim except the `appScope` check (`"borrower"`, matching `apps/web/src/lib/session-token.ts`'s own existing check).
- [x] 3.2 Add `apps/web/src/lib/applications.ts` with `listMyApplications()`: real `GET /applications/mine` call, Bearer token from the existing `getSessionToken()` (currently inline in `mock/actions.ts` - export it from there, or duplicate the 4-line cookie-read the same minimal way `mock/actions.ts` itself does; decide based on what's less invasive), response parsed with the new contracts schema via `safeParse`, same `{ok:true,data}|{ok:false,error}` result shape every other real action module in this codebase already uses.
- [x] 3.3 Add `apps/web/src/lib/plain-status.ts`: a pure function mapping a real `ApplicationStage` (+ `declineReasonCode` when declined) to `{pill, h, p, cta: null}` (reusing the `PlainStatus` type from `apps/web/src/mock/selectors.ts` - it's already generic), covering all 7 real stage values per design.md's own per-stage copy decisions. Unit test (Vitest) covering every stage, including the decline-reason-code lookup.

## 4. apps/web: the real status screen

- [x] 4.1 Add `apps/web/src/app/my-applications/page.tsx`: real, non-simulated, reads the real `sub` via `decodeSessionToken(getSessionToken())`, fetches via `listMyApplications()` on mount, renders each application's product/amount/tenor/plain-language status using `StatusPillFor`/`PageTitle`/`PageSkeleton`/`BwCard` (reused from the existing simulated components, per design.md). A declined/withdrawn application stays visible with its final status, never removed.
- [x] 4.2 Add the refetch mechanism: a `requestIdRef` generation-counter guard (matching `apps/backoffice`'s own live-applications list page pattern) around a `setInterval` (30s) refetch plus a `visibilitychange`/`focus`-triggered immediate refetch.
- [x] 4.3 Vitest coverage: renders real applications from the real endpoint; a declined application still shows its reason; an `Approval`-stage application reads as "in review" with no internal stage name shown; the interval/focus refetch actually refires `listMyApplications()` (fake timers / a dispatched `visibilitychange`/`focus` event); a stale in-flight response is dropped if a newer request has already started.

## 5. Cleanup and verification

- [x] 5.1 `npx eslint --fix` on apps/api, apps/web; `npx tsc --noEmit` on apps/api, apps/web, packages/contracts.
- [x] 5.2 Full monorepo `turbo run typecheck lint build test` (`DB_NAME=aimready_test` for apps/api's test step, migrated against both dev and test databases if any new migration is needed - none expected, this change adds no new columns/tables), confirming all green, including a repeated isolated `turbo run test --filter=api --force` and `--filter=web --force` run.

## Workflow follow-up

- Run `openspec validate borrower-real-application-status --strict`.
- Run spec-review, then code-review (fresh session), fixing findings until each reports clean.
- Archive the change, syncing `application-intake` and `borrower-portal` into `openspec/specs/`.
- Branch, commit, push, open a PR with a test-plan body, watch CI, merge once green.
- Update the Lending Tracker: mark SS-1 `done`. SS-0 and SS-1 both done; SS-4/SS-5/SS-7 stay deferred; SS-2/SS-6 are `must`+stretch (don't count against epic completion); SS-3 stays `not_started`, blocked on a real core-banking read (named non-goal, same cross-epic-dependency pattern as DEC-3/Epic 3).
