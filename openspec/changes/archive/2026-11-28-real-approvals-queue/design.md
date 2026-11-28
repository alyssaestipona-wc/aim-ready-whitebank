# Design

## Context

See proposal.md - Why. `apps/api`'s `decide()` (`apps/api/src/applications/applications.service.ts`) already computes the real monthly repayment on approval (`monthlyPayment(recommendation.amount, recommendation.tenor, GRADE_RATE[grade])`) and already enforces delegated authority and segregation of duties. `ApplicationEntity` already has `decidedAt` (timestamptz, nullable) and `recommendation` (jsonb, carrying `recommendedAt` and `overrideLevel: 'above' | 'below' | null`) - both real, persisted columns, so queue stats are computable without any new columns. `apps/backoffice`'s simulated `/approvals` page already shows the target KPI shape (`Kpi`/`KpiGrid` from `@/components/bits`, a presentational, non-mock-coupled pair already reused across both simulated and real screens) and `ListView` from `@aim-ready/ui` is the same list component the real `/live-applications` screen already uses. `ConfirmDialog` from `@aim-ready/ui` is the established confirm-before-mutating-action component, already used by `apps/admin`'s real `decisioning-controls` page.

## Goals / Non-Goals

**Goals:**
- One new real approver-scoped queue screen, backed by the existing `GET /applications?stage=Approval` plus one new stats endpoint - the minimum that gives an approver a real place to work from instead of only reaching a case by already knowing its id.
- A real confirm-before-send step on the existing real Approve action, backed by one new read-only preview endpoint that reuses `decide()`'s own repayment calculation exactly, so the previewed figure can never drift from what approving actually produces.

**Non-Goals:**
- WF-8's approval-matrix configuration UI (a read-only matrix view plus an editable `Configuration → Approval matrix` screen in `apps/admin`) - `APPROVER_AUTHORITY` stays a seeded server-side constant this round, same as today. A full config surface (schema, admin UI, api wiring) is roughly as large as this entire change on its own; left `not_started`, matching this session's precedent of leaving a story honestly incomplete rather than force-fitting it in (e.g. `DEC-3` in Epic 3).
- WF-11's "Segregation of duties screen" - the underlying rule is already real and enforced (`decide()`'s `recommendation.by === user.sub` refusal, already tested). Only the visibility screen itself is missing; needs its own audit-trail surface and is left `not_started`.
- Credit committee (WF-10) and restructuring/write-off approvals (WF-12) - both explicitly stretch-tier in the backlog, untouched.
- Any change to the existing simulated `/approvals` screen, or to the existing real `/live-applications` (officer) queue - both keep working exactly as today.

## Decisions

**New endpoints on the existing `ApplicationsController`, not a new controller.** `GET /applications/approvals-summary` and `GET /applications/:id/approve-preview`, both `@Roles('approver')`, same pattern as every other role-scoped route already on this controller.

**Stats are tenant-wide, not per-approver.** There is no per-approver assignment field on `ApplicationEntity` (unlike the officer's `assigneeId`), so "waiting on me", "decided today", "overrides this week" and "median time to decide" are computed tenant-wide across all approvers - consistent with how every other team-level KPI in this codebase (SLA watch, Reports dashboards) is already scoped. This is a deliberate reading of WF-7's "waiting on me" as "waiting on the approver role", not a per-individual queue, since no infrastructure for the latter exists and inventing one is out of scope for this slice.

**Median time to decide is computed in application code, not SQL.** Fetch `decidedAt` and `recommendation->>'recommendedAt'` for applications decided in the last 7 days, compute each gap in minutes, sort, take the middle value (or average the two middle values for an even count) in TypeScript - simpler and more portable than a Postgres `percentile_cont` window function for the data volumes this phase targets, and consistent with this codebase's existing preference for plain TypeORM queries over raw SQL.

**The preview endpoint recomputes `decide()`'s own calculation, not a stored/cached value.** `GET /applications/:id/approve-preview` loads the application, requires `stage === 'Approval'` and a non-null `recommendation` (the same precondition `decide()` itself checks), and returns `monthlyPayment(recommendation.amount, recommendation.tenor, GRADE_RATE[grade])` - the exact same call `decide()` makes on approval. It does not check delegated authority (that's a refusal reason for approving, not for previewing what approving would produce) and writes nothing.

**New real screen at `apps/backoffice/src/app/(console)/live-approvals`**, distinct from the simulated `/approvals` and the real `/live-applications`. Reuses `ListView`/`Kpi`/`KpiGrid` (already proven generic across both simulated and real screens) and the existing `listApplications({stage: "Approval"})` real action from `apps/backoffice/src/mock/actions/applications.ts`, plus one new real action for the stats call.

**The confirm step wraps the existing Approve button with `ConfirmDialog`**, matching `apps/admin`'s own established pattern: clicking Approve opens the dialog (fetching the preview on open), the dialog's body shows the previewed monthly repayment, and `onConfirm` is where the real `decide("approve")` call happens - cancelling calls nothing. Decline and Return keep their existing behavior unchanged (WF-9's own AC only requires confirmation + repayment preview for approving).

## Risks / Trade-offs

**[Risk]** Computing the median in application code loads every decided-this-week row into memory. **Mitigation**: bounded by one tenant's one-week decision volume in this phase (small); revisit with a SQL-side percentile if volume ever grows materially - the computed *value* is spec-visible, the computation method is not, so this can change later without a spec change.

**[Risk]** Tenant-wide (not per-approver) stats may undercount or overcount what an individual approver perceives as "mine" once multiple approvers are seeded. **Mitigation**: named explicitly above as a deliberate reading consistent with existing team-level KPI conventions elsewhere in this codebase, not an oversight.
