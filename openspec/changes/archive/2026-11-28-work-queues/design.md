# Design

## Context

Real applications (`real-application-intake`, `staff-application-review`, `staff-decisioning-actions`) have no ownership concept at all — every staff user with the right role sees every application. The simulated console's own queue model (`apps/backoffice/src/mock/selectors.ts`/`actions/cases.ts`) is the reference: an officer's `myQueue` filters by `owner === <their name>` and stage; `teamQueue` shows the same stages with no owner filter; `unassigned` is `Review`-stage with no owner; `pickCase` claims one, guarded to the officer role and refusing an already-owned case.

The full backlog story (WF-1) also describes branch-officer, approver, and loan-operations queue views over stages (`Approval`, `Committee`, `Documentation`, `Booking`, `Pending checker`) that don't exist anywhere in the real data model and belong to other epics entirely. Per the project's own by-epic planning (not by isolated story), this change still only delivers the slice that's actually buildable now: the loan-officer's queue.

## Goals / Non-Goals

**Goals:**
- A real, race-safe way for an officer to claim an unassigned referred application.
- `GET /applications`'s existing tenant-scoped list extended with a `queue` filter, not a new endpoint (keeps one list surface, matching `staff-application-review`'s existing design).
- Queue tabs and a Pick action on the real applications screen.

**Non-Goals:**
- Branch-officer, approver, and loan-operations queue views (need stages `Approval`/`Committee`/`Documentation`/`Booking`/`Pending checker`, owned by Epic 4's committee routing (WF-10), Epic 5 (Documents), and Epic 7 (Booking) respectively).
- KPI tiles summarizing bank-wide open counts (same stage dependency).
- SLA/time-left-in-queue-rows — the sibling change (`sla-watch-and-info-requests`) adds real SLA data; this change's rows show only what's already real.
- A staff roster/"list officers in this tenant" query — not needed: `mine` is scoped to the caller's own id, `team` has no assignee filter at all (same as the mock's own `teamQueue`), `unassigned` just checks for a null assignee.

## Decisions

### `queue` as a list filter, not a separate endpoint
**Decision:** extend `ListApplicationsDto` with an optional `queue?: 'mine' | 'unassigned'` alongside the existing `stage`/`product` filters, interpreted in `findAllForTenant()`.
**Why:** `GET /applications` is already the one tenant-scoped list surface (`staff-application-review`); a second "queue" endpoint would duplicate its tenant-scoping, stage/product filtering, and response shape for no behavioral gain.

### `pick()` reuses `decide()`'s conditional-update race-safety pattern
**Decision:** `pick()` claims ownership via `createQueryBuilder().update().set({assigneeId, assignedAt}).where('id = :id AND stage = :stage AND assignee_id IS NULL', ...)`, checking `affected === 1`.
**Why:** identical TOCTOU shape to `decide()` (two concurrent requests racing to change the same row based on a condition read earlier) — reuse the exact pattern `staff-decisioning-actions` already established and had independently code-reviewed, rather than inventing a second race-safety mechanism.

### `assigneeId` stores the user id, not a display name
**Decision:** `assigneeId uuid`, matching `reviewerId`'s existing pattern — not the officer's display name (what the mock's `owner` field stores).
**Why:** consistent with every other person-reference column already on this table (`borrowerId`, `reviewerId`); resolving a display name from an id is a presentation concern, not a storage one.

## Risks / Trade-offs

- **[Trade-off]** WF-1 remains `in_progress` in the tracker after this change — its full AC list needs stages this change deliberately doesn't build. Accepted and stated plainly (per the project's own epic-completion convention: an epic's completion is measured against its non-deferred stories, and this story's own remaining scope is blocked by other epics, not abandoned).

## Migration Plan

1. Migration: add nullable `assignee_id uuid`, `assigned_at timestamptz` to `applications`.
2. `ListApplicationsDto` gains `queue?: 'mine' | 'unassigned'`; `ApplicationsService.findAllForTenant()` interprets it.
3. `ApplicationsService.pick()` + `ApplicationsController`'s `PATCH /:id/pick`, `@Roles('officer')`.
4. `packages/contracts`: `assigneeId` on the staff list/detail schemas, a pick response schema.
5. `apps/backoffice`: queue tabs + Pick button on `/live-applications`.
- **Rollback:** fully additive; reverting any piece independently restores prior behavior.
