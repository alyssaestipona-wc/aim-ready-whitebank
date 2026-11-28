# Proposal

## Why

`work-queues` gave officers a real My/Team/Unassigned queue, but a `Review`-stage application has no time pressure attached and no way to pause on the borrower without declining it outright. The second of two changes delivering backlog Epic 2 (Work Management) together: this one covers WF-2 (SLA watch) and WF-5 (request information).

## What Changes

- Add `stageEnteredAt` to `applications`, set at creation and updated on every stage transition, powering a computed `slaHoursLeft` on every list/detail response.
- Seed `SLA_HOURS` per open stage (`Review`, and the new `Info requested`), lifting the one real value that exists in this codebase (`Info requested`: 72 hours, from the simulated request-info handler) and choosing a documented seeded default for `Review`.
- Add a real `Info requested` stage: `PATCH /applications/:id/request-info` (officer role, `Review`-only) moves an application there with a checklist (from a seeded 3-item list) and a message; `PATCH /applications/:id/resolve-info` (officer role, `Info requested`-only) moves it back to `Review` — a manual staff action standing in for the borrower's own response, since real document upload doesn't exist yet.
- `apps/backoffice`'s real applications screen shows hours left (with the simulated console's own warning/breach thresholds: ≤2h warning, <0 breached) and gets Request Information / Mark Resolved actions.
- **Non-goals, deferred** (see design.md): automatic borrower-triggered resolution (needs real document upload — Documents epic); automatic SLA-breach escalation or any notification delivery (no team-lead role or notification system exists — WF-6's own deferred scope); a real, tenant-configurable SLA-duration table (Configuration epic's own future scope — this change hardcodes seeded hours, same as every other seeded constant in this family). WF-2 and WF-5 both stay `in_progress` in the tracker after this change for these reasons, stated plainly.

No breaking changes: additive column, additive stage value, additive endpoints, additive UI. `apps/web`'s own simulated bank progression is untouched.

## Capabilities

### Modified Capabilities
- `application-intake`: adds SLA-visibility and request-info/resolve-info requirements.
- `staff-console`: adds a requirement for the real applications screen to show SLA status and offer the two new actions.

## Impact

- `apps/api/src/applications/`: migration (new column + new stage value folded into the partial unique index's predicate), `policy.ts` (`SLA_HOURS`, `INFO_REQUEST_ITEMS`), `applications.service.ts` (`requestInfo()`/`resolveInfo()`, SLA computation), `applications.controller.ts` (two new routes).
- `packages/contracts`: `slaHoursLeft` on the staff list/detail schemas; request-info/resolve-info request/response schemas.
- `apps/backoffice/src/mock/actions/applications.ts`, `live-applications/page.tsx`, `live-applications/[id]/page.tsx`: new actions, SLA display, breach/warning styling.
