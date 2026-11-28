# Proposal

## Why

Staff can now see and decide real applications (`staff-application-review`, `staff-decisioning-actions`), but there is no concept of ownership yet — every staff user sees every application with no way to claim one, and no "Unassigned" queue for a new referral to land in. The first of two changes delivering backlog Epic 2 (Work Management) together: this one covers the buildable slice of WF-1 (My/Team/Unassigned queues with a Pick action); the next covers WF-2 (SLA watch) and WF-5 (request information).

## What Changes

- Add `assigneeId` (nullable) and `assignedAt` (nullable) to `applications`.
- `GET /applications` gains an optional `queue` filter: `mine` (assigned to the caller) or `unassigned` (`Review`-stage, no assignee); omitted shows the team view (every tenant application, matching how the existing simulated "team queue" never filters by owner either).
- A new `PATCH /applications/:id/pick` (`officer` role only): claims an unassigned `Review`-stage application, race-safe against two officers picking the same case at once.
- `apps/backoffice`'s real `/live-applications` list screen gains My queue / Team queue / Unassigned tabs and a Pick action, mirroring the simulated console's own `Tabs` component for visual consistency.
- **Non-goals, deferred** (see design.md): branch-officer, approver, and loan-operations queue views — those need stages (`Approval`, `Committee`, `Documentation`, `Booking`, `Pending checker`) that don't exist on real applications and belong to other epics (Approvals/committee routing, Documents, Booking). WF-1 stays `in_progress` even after this change; that is expected, not an oversight, and is stated plainly here and in the tracker.

No breaking changes: additive columns, an additive query filter (default behavior unchanged), an additive endpoint, additive UI.

## Capabilities

### Modified Capabilities
- `application-intake`: adds requirements for assignee-scoped listing and the pick action.
- `staff-console`: adds a requirement for the real applications screen's queue tabs and Pick control.

## Impact

- `apps/api/src/applications/`: migration, entity columns, `ListApplicationsDto`, `ApplicationsService.pick()`/updated `findAllForTenant()`, `ApplicationsController`'s new route.
- `packages/contracts`: new query param on the list request shape, new pick response schema, `assigneeId` added to the staff list/detail schemas.
- `apps/backoffice/src/mock/actions/applications.ts`, `src/app/(console)/live-applications/page.tsx`: new `pickApplication()` action, queue tabs, Pick button.
