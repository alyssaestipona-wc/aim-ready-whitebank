# Design

## Context

`real-application-intake`'s decision pipeline already sorts every submission into `approve` (stage `Offer` immediately), `refer` (stage `Review`), or `decline` (stage `Declined` immediately). `staff-application-review` gave staff read-only visibility into these applications. A `Review`-stage application today has no way forward: the borrower's own client-side simulated bank progression (`apps/web`'s `advanceBank`) only advances `Offer`/`Documentation`/`Booking` — it has no logic for `Review`, because in the mock world a human loan officer/approver was expected to act on it, and now a real one needs to.

`apps/backoffice`'s existing simulated approve-case handler (`src/mock/actions/cases.ts`) already enforces a single hardcoded approver authority profile (`USERS.approver`: amount limit + allowed grades) and a fixed `DECLINE_CODES` list — this change makes that same, narrow check real.

## Goals / Non-Goals

**Goals:**
- A real `PATCH /applications/:id/decide` on `apps/api`: approve or decline a `Review`-stage application, tenant- and approver-role-scoped.
- Enforce the one delegated-authority check that already exists (informally) in the simulated flow: amount limit + allowed grades.
- Show the computed monthly repayment on a successful approval, reusing `packages/core`'s existing loan math.
- Wire Approve/Decline actions into `staff-application-review`'s real detail screen.

**Non-Goals:**
- A loan-officer recommend-then-approver-decide two-step (backlog WF-9's fuller flow) — the real data model has no recommendation entity; the approver acts directly on a referred application. A future change can add a real recommend step if needed.
- Maker-checker self-approval prevention (WF-11) — its premise (a separate recommending officer) doesn't exist yet in the real flow.
- Credit-committee routing for above-authority cases (WF-10) — an above-authority approval attempt is simply refused, not routed anywhere.
- A real, configurable, multi-level approval matrix (WF-8's fuller scope) — this change hardcodes the single seeded approver profile already implicit in the simulated flow, matching `real-application-intake`'s own "seed data lifted verbatim, not invented" precedent for `PRODUCTS`/`POLICY`. The Configuration epic's own future change replaces this with real tenant-editable data.
- A "return to officer" action, or any change to `apps/web`'s borrower-facing flow.

## Decisions

### One new endpoint, not a stage-transition generalization of `close()`
**Decision:** add `decide(user, applicationId, dto)` to `ApplicationsService` and `PATCH /applications/:id/decide` to `ApplicationsController`, `@Roles('approver')` only — distinct from the borrower's own `PATCH /:id/close` (which is a self-reported terminal-stage notification, not a decisioning action, and stays borrower-only).
**Why:** `close()`'s contract (borrower reports a terminal stage their own simulation reached) is a different operation from "staff decides a referred case" — conflating them into one generalized "set stage" endpoint would blur a meaningful authorization boundary (who may move which stage, and why) for a small amount of route reuse.

### Delegated authority and decline reasons: seeded constants in `apps/api`, lifted verbatim
**Decision:** add to `apps/api/src/applications/policy.ts` (or a new `approval.ts` in the same module): `APPROVER_AUTHORITY = { limit: 100_000_000 /* ₱1,000,000 in centavos */, grades: ['A','B','C'] }`, `DECLINE_REASON_CODES` (the same 4 strings as `apps/backoffice`'s `DECLINE_CODES`), and `GRADE_RATE` (the same per-grade add-on-rate table as `apps/backoffice`'s `GRADE_RATE`).
**Why:** identical rationale to `real-application-intake`'s `PRODUCTS`/`POLICY`: these are tenant-configuration values that already exist as hardcoded seed data in the mock layer; lifting them verbatim keeps this change's scope to "make the one existing check real," not "build configurable approval policy."
**Alternative considered:** derive the limit from a `StaffUser`-like table row per approver. Rejected: there is exactly one seeded approver account today (`approver@kalinawbank.ph`); a per-user authority table is real scope creep the Configuration epic owns.

### Monthly repayment via `packages/core`'s existing `monthlyPayment()`, not `disclosure()`
**Decision:** on a successful approval, compute `monthlyPayment(application.amount, application.tenor, GRADE_RATE[decision.grade])` and return it in the response.
**Why:** the spec only asks for "the computed monthly repayment," matching backlog WF-9's AC ("Approval SHALL show the monthly repayment"); the fuller `disclosure()` breakdown (fee, net proceeds, effective rate) is TILA-disclosure-screen scope (`DOC-5`, a separate future epic), not needed here.

### New columns are nullable, additive; no stage-enum or index change
**Decision:** migration adds `reviewer_id uuid NULL` and `decline_reason_code varchar NULL` to `applications`. No FK on `reviewer_id` (the existing `fk_applications_borrower` pattern is per-column-purpose; a reviewer FK to `users` can be added later if a query needs to join it, not required for this change's own scope). `ApplicationStage` is unchanged (`Offer`/`Declined` already exist).
**Why:** both new columns are write-once-on-decide and read-only afterward, with no interaction with the existing partial unique index (open stages only) or its `WHERE` predicate - confirmed by inspecting the index's exact column list and predicate before this design was written.

## Risks / Trade-offs

- **[Risk]** A staff-decided `Offer`/`Declined` stage sits ahead of where the borrower's own client-side simulated bank progression (`apps/web`) expects a `Review`-stage application to be (it has no logic for `Review` today, so nothing currently reads or depends on this transition on the borrower side) - the borrower's UI simply shows whatever stage the server returns next time it polls/loads, the same seam `real-application-intake` already established between server-authoritative stage and the borrower's simulated progression. **Mitigation:** none needed beyond what already exists; flagging for awareness only.
- **[Trade-off]** Hardcoding one approver's authority profile means a second approver account (if ever seeded) would share the same limit/grades. Accepted: matches the single-seeded-approver reality of this codebase today; the Configuration epic removes this limitation for real.

## Migration Plan

1. Migration: add `reviewer_id uuid NULL`, `decline_reason_code varchar NULL` to `applications`.
2. `apps/api/src/applications/policy.ts`: add `APPROVER_AUTHORITY`, `DECLINE_REASON_CODES`, `GRADE_RATE` seeded constants.
3. `ApplicationsService.decide()` + `ApplicationsController`'s `PATCH /:id/decide`, `@Roles('approver')`.
4. `packages/contracts`: request/response schemas for decide.
5. `apps/backoffice`: `decideApplication()` action, Approve/Decline UI on the real detail screen, role- and stage-gated.
- **Rollback:** fully additive; reverting any piece independently restores prior behavior.
