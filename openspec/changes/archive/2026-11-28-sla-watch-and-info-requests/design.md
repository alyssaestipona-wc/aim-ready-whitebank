# Design

## Context

`work-queues` added assignment to real applications; this change adds the other two Epic 2 pieces that round out the officer's working loop: knowing how much time is left in the current stage, and being able to pause on the borrower without declining. Neither exists in the real data model today — `createdAt` is the only timestamp, set once at submission, and there is no `Info requested` stage value.

The simulated console's own SLA values (`apps/backoffice/src/mock/seed.ts`) are random per seeded row, not derived from a real formula — there is nothing to lift for a genuine stage-duration table except the one concrete value the simulated request-info handler actually uses: 72 hours for `Info requested`. `Review`'s own seeded duration has no real precedent anywhere in this codebase; a reasonable default is chosen and documented as seeded, not invented from nothing more than guesswork - the same category of decision as `PRODUCTS`/`POLICY`/`APPROVER_AUTHORITY` before it.

## Goals / Non-Goals

**Goals:**
- Real, computed SLA visibility (hours left, breach/warning flagging) on every application that has a seeded SLA stage.
- A real `Info requested` stage with a request/resolve pair of officer actions.

**Non-Goals:**
- Automatic borrower-triggered resolution — needs real document upload (Documents epic). `resolveInfo()` is a manual officer action instead, the same category of simplification `staff-decisioning-actions` already made for WF-9 (approver acts directly, no recommend step).
- Automatic SLA-breach escalation to a team-lead role, or any notification delivery — no team-lead concept or notification/delivery system exists anywhere in this codebase (WF-6's own deferred scope). This change delivers visibility, not escalation.
- A real, tenant-configurable SLA-duration table (Configuration epic's own future scope) — `SLA_HOURS` is a seeded constant, same pattern as every other seeded constant in this family.
- Any change to `apps/web`'s borrower-facing flow or its own simulated progression — untouched, same seam every prior change in this family has already accepted.
- A separately stored due-date field — unified into the SLA computation itself (`stageEnteredAt` + seeded hours), since a parallel due-date field would just duplicate it.

## Decisions

### `stageEnteredAt`, updated by every stage transition, not a per-transition history table
**Decision:** one `stageEnteredAt timestamptz` column, overwritten every time `stage` changes (`create()`, `decide()`'s `applyDecision()`, `requestInfo()`, `resolveInfo()`); `pick()` leaves it untouched since it never changes `stage`.
**Why:** SLA watch only needs "time in the *current* stage," not a full stage-history audit trail — a history table is real scope the not-yet-built Audit epic owns; this column answers exactly what WF-2 asks for.

### `slaHoursLeft` computed on read, not stored
**Decision:** `SLA_HOURS[stage] - hoursSince(stageEnteredAt)`, computed fresh in `findAllForTenant()`/`findOneForTenant()`, never persisted.
**Why:** a stored value would go stale the instant it's read and need its own refresh job; computing on read is correct by construction and costs nothing extra (the inputs are already loaded).

### `Info requested` folded into `OPEN_STAGES` and the partial unique index
**Decision:** add `'Info requested'` to `ApplicationStage`, to `OPEN_STAGES` (duplicate-open-application check, `close()`'s "already closed" guard), and to `idx_applications_open_per_product`'s predicate (migration drops and recreates the index, since Postgres can't `ALTER` an index predicate in place).
**Why:** a borrower waiting on an info request still has an open application for the duplicate-check's purposes — exactly the same reasoning `Review`/`Offer` already use.

### `request-info`/`resolve-info` as two endpoints, not one generalized stage-set
**Decision:** `PATCH /applications/:id/request-info` and `PATCH /applications/:id/resolve-info`, each with its own stage-guard and its own race-safe conditional UPDATE (reusing `decide()`/`pick()`'s established pattern), rather than a generic "set stage" endpoint.
**Why:** each has a distinct payload (request-info takes items+message; resolve-info takes nothing) and a distinct, narrow precondition — the same reasoning `decide()` and `close()` already stayed separate for.

### Seeded checklist and SLA hours, lifted where a real value exists
**Decision:** `INFO_REQUEST_ITEMS` = the simulated console's exact 3-item checklist (`ri1`/`ri2`/`ri3`, same labels); `SLA_HOURS['Info requested'] = 72` (lifted verbatim); `SLA_HOURS['Review']` = a documented seeded default (no real value exists to lift).
**Why:** consistent with this family's "lift, don't invent" rule wherever a real value exists; where none does, pick one and say so plainly rather than pretending otherwise.

## Risks / Trade-offs

- **[Trade-off]** WF-2 and WF-5 both stay `in_progress` after this change (escalation, borrower-triggered resolution, and tenant-configurable durations are all out of scope). Accepted and stated plainly, per the project's own epic-completion convention — these gaps are blocked by other epics, not abandoned.
- **[Risk]** `Review`'s seeded SLA hours is a guess, not a lifted real value. Mitigated: it's clearly commented as seeded/placeholder in `policy.ts`, and the Configuration epic's own future change replaces every seeded constant in this file with real tenant data.

## Migration Plan

1. Migration: add `stage_entered_at timestamptz` (backfilled from `created_at` for existing rows); drop and recreate `idx_applications_open_per_product` with `'Info requested'` added to its predicate.
2. `apps/api/src/applications/policy.ts`: add `SLA_HOURS`, `INFO_REQUEST_ITEMS`.
3. `ApplicationsService`: SLA computation in `findAllForTenant()`/`findOneForTenant()`; `requestInfo()`/`resolveInfo()`; update `OPEN_STAGES` and every place `create()`/`applyDecision()` sets `stage` to also set `stageEnteredAt`.
4. `ApplicationsController`: `PATCH /:id/request-info`, `PATCH /:id/resolve-info`, both `@Roles('officer')`.
5. `packages/contracts`: `slaHoursLeft` on staff schemas; request-info/resolve-info schemas.
6. `apps/backoffice`: SLA display + breach/warning styling, Request Information / Mark Resolved actions.
- **Rollback:** fully additive; reverting any piece independently restores prior behavior.
