# Proposal

## Why

Epic 4 (Approvals & Credit Committee) is partially real as a side effect of `decisioning-recommendation-and-overrides`: `apps/api`'s `decide()` already enforces delegated authority and blocks self-approval, and `apps/backoffice`'s real `live-applications/[id]` detail page already has working Approve/Decline/Return actions. But the approver has no real *queue* to work from — `apps/backoffice`'s `/approvals` screen is still 100% simulated (reads the mock store; its four KPI tiles are literal hardcoded numbers, not computed from anything), and the real Approve action has no confirmation step showing the monthly repayment before the offer is sent to the borrower, which the backlog's own acceptance criteria (WF-9) require. Closing these two gaps is the next most core-feature-building Epic 4 work: it is what makes the already-real decide/decline/return actions usable as a day-to-day approver workflow instead of a page only reachable by already knowing a case's id.

## What Changes

- A new real, approver-scoped applications queue in `apps/backoffice`, distinct from the existing simulated `/approvals` (which keeps working unchanged) and from the existing real `/live-applications` list (which is officer-queue-shaped: My/Team/Unassigned tabs, not an Approval-stage view): reuses the existing `GET /applications?stage=Approval` list.
- A new real stats endpoint backing that queue's KPI tiles (waiting-on-me, decided today, overrides this week, median time to decide) computed from the real `decidedAt`/`recommendation` columns already on `ApplicationEntity` — no new columns needed.
- A new real preview-before-commit step on the existing real Approve action: a confirmation dialog showing the actual monthly repayment (from a new read-only preview endpoint, computed the same way `decide()` itself already computes it) before the real `decide("approve")` call is made — closing WF-9's "shows the monthly repayment and requires confirmation before the offer is sent" gap.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `application-intake`: gains a read-only approval-queue stats endpoint and a read-only approve-preview endpoint, both approver-scoped.
- `staff-console`: gains a real approver-scoped approvals queue screen with real KPIs, and the real Approve action gains a confirm-before-send step.

## Impact

- `apps/api/src/applications/applications.controller.ts`: new `GET /applications/approvals-summary` (or similar), new `GET /applications/:id/approve-preview` (or similar), both `@Roles('approver')`.
- `apps/api/src/applications/applications.service.ts`: new methods computing the stats aggregate (from existing `decidedAt`, `recommendation->>'overrideLevel'` jsonb field) and the repayment preview (reusing `monthlyPayment()`/`GRADE_RATE`, the same calculation `decide()` already performs).
- `packages/contracts/src/index.ts`: new response schemas for both endpoints.
- `apps/backoffice/src/app/(console)/live-approvals/` (new route) — real screen, reusing `ListView`/`Kpi`/`KpiGrid` from `@aim-ready/ui` the same way the simulated `/approvals` and the real `/live-applications` already do.
- `apps/backoffice/src/app/(console)/live-applications/[id]/page.tsx`: Approve button gains a confirm dialog step (reusing `ConfirmDialog` from `@aim-ready/ui`, the same component the admin console's decisioning-controls page already uses for its own confirm-before-toggle pattern).
- RBAC: no new role; both new endpoints are `@Roles('approver')`, matching every other approval-stage action already in this codebase.
- Not touching: `apps/backoffice`'s simulated `/approvals` (unchanged), the existing `/live-applications` officer queue (unchanged), WF-8's approval-matrix configuration UI and WF-11's segregation-of-duties screen — both stay `not_started`/`in_progress`: each needs a new Configuration-style surface (an editable approval matrix in `apps/admin`, a dedicated audit screen) that would roughly double this change's size for a benefit distinct from this slice's own queue-and-confirm focus; left as explicit non-goals rather than force-fitted in, matching this session's established honest-epic-tracking precedent (e.g. `DEC-3` in Epic 3).
