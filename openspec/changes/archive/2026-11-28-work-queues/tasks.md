# Tasks

## 1. apps/api: data model
- [x] 1.1 Add a migration (timestamp > 1795852100000) adding nullable `assignee_id uuid` and `assigned_at timestamptz` to `applications`, with matching `down()`.
- [x] 1.2 Add `assigneeId`/`assignedAt` nullable columns to `ApplicationEntity`.

## 2. apps/api: queue filter and pick endpoint
- [x] 2.1 Add `queue?: 'mine' | 'unassigned'` to `ListApplicationsDto` with class-validator.
- [x] 2.2 Update `ApplicationsService.findAllForTenant()` to interpret `queue`: `mine` → `assigneeId = callerSub`; `unassigned` → `stage = 'Review' AND assigneeId IS NULL`; omitted → unchanged (no assignee filter).
- [x] 2.3 Add `ApplicationsService.pick(user, applicationId)`: tenant-scoped lookup (404 for missing/cross-tenant); refuses (400) if stage isn't `Review` or already assigned; race-safe conditional UPDATE (`WHERE stage = 'Review' AND assignee_id IS NULL`), refusing if another request won the race.
- [x] 2.4 Add `PATCH /applications/:id/pick` to `ApplicationsController`, `@Roles('officer')`.

## 3. packages/contracts
- [x] 3.1 Add `assigneeId` to `staffApplicationListItemSchema`/`staffApplicationDetailSchema`. Add a pick response schema (`{ok:true}` / `{ok:false,error}`).

## 4. apps/backoffice
- [x] 4.1 Add `pickApplication(id)` to `apps/backoffice/src/mock/actions/applications.ts`, same Bearer-token pattern as the other real actions.
- [x] 4.2 Add My queue / Team queue / Unassigned tabs to `live-applications/page.tsx` (reusing `@aim-ready/ui`'s `Tabs`, mirroring the simulated `queues/page.tsx`'s own tab pattern), passing the `queue` filter through to `listApplications()`.
- [x] 4.3 Add a Pick button on Unassigned-tab rows, visible only to the officer role; refetches the current tab's list on success.

## 5. Tests
- [x] 5.1 `apps/api`: Jest integration tests — `mine`/`unassigned`/omitted-filter list behavior, pick success (assigneeId/assignedAt recorded), pick on a non-Review stage refused, pick on an already-assigned application refused, two concurrent picks on the same application (exactly one wins), cross-tenant 404, non-officer role refused (controller metadata test, matching the `decide` pattern).
- [x] 5.2 `apps/backoffice`: Vitest tests — tab switching calls the list action with the right `queue` filter, Pick button visible only to officer role and only on the Unassigned tab, a successful pick refetches and the row leaves Unassigned.

## 6. Cleanup and verification
- [x] 6.1 `npx eslint --fix` on apps/api and apps/backoffice; `npx tsc --noEmit` on apps/api, apps/backoffice, and `packages/contracts`.
- [x] 6.2 Full monorepo `turbo run typecheck lint build test` (with `DB_NAME=aimready_test` for `apps/api`'s test step), confirming all green, including repeated parallel `turbo run test --force` runs for `apps/api`.
