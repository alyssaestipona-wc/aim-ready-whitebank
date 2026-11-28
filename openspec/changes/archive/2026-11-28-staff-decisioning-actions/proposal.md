# Proposal

## Why

`staff-application-review` gave staff read-only visibility into real applications, but a real referred application (stage `Review`) can never actually move forward — only a borrower's own client-side simulation advances stages, and it has no path out of `Review`. An approver needs a real action to decide a referred case, with delegated-authority enforcement, before any case started through the real intake pipeline can reach an offer or a decline for real.

## What Changes

- Add `PATCH /applications/:id/decide` to `apps/api`, staff-only (`approver` role), moving a `Review`-stage application to `Offer` (approve) or `Declined` (decline).
- **Approve**: refused with a specific "above your authority" error when the amount exceeds the approver's seeded limit or the decision's grade isn't in the approver's seeded allowed grades (the single hardcoded authority profile already implicit in `apps/backoffice`'s simulated approve handler, lifted — not a real configurable approval matrix, which stays out of scope). On success, returns the computed monthly repayment (reusing `packages/core`'s existing loan math).
- **Decline**: requires a reason code from a fixed, seeded 4-item list (lifted verbatim from `apps/backoffice`'s existing `DECLINE_CODES`).
- A migration adds two nullable columns to `applications` (`reviewer_id`, `decline_reason_code`) recording who decided and why.
- `apps/backoffice`'s `/live-applications/[id]` detail screen gets Approve/Decline actions, visible only to the approver role, only while the application is in `Review`.
- **Non-goals, deferred** (see design.md for the full list and why): a loan-officer recommend-then-approver-decide two-step; maker-checker self-approval prevention; credit-committee routing for above-authority cases; a real configurable multi-level approval matrix; a "return to officer" action.

No breaking changes: additive endpoint, additive columns, additive UI actions. The borrower-facing `apps/web` apply/offer flow and its own simulated bank progression are untouched.

## Capabilities

### Modified Capabilities
- `application-intake`: adds a requirement for a real approve/decline decision on a referred application, with delegated-authority enforcement and a fixed decline reason-code list.
- `staff-console`: adds a requirement for the real applications detail screen to offer these actions to the approver role.

## Impact

- `apps/api/src/applications/application.entity.ts`, a new migration, `applications.service.ts`, `applications.controller.ts`: new columns, new service method, new controller route.
- `apps/api/src/applications/policy.ts` (or a new file in the same module): seeded approver authority profile, seeded decline reason codes, seeded per-grade add-on rate table.
- `packages/contracts`: new request/response schemas for the decide endpoint.
- `apps/backoffice/src/mock/actions/applications.ts`, `src/app/(console)/live-applications/[id]/page.tsx`: new action call and new UI controls.
