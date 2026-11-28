# Design

## Context

`real-application-intake` persists real applications in `apps/api` (`ApplicationEntity`/`ConsentEntity`, `POST /applications`, `PATCH /:id/close`, both `@Roles('borrower')`). `apps/backoffice`'s existing `/applications` list and `/applications/[id]` detail routes are heavily tested (`src/__tests__/work-screens.test.tsx`) against its own in-memory mock store, with no `fetch()` calls anywhere in the test suite — that suite exercises the console's rich, fully-simulated 14-stage case model (`staff-console`'s "Work queues and SLA watch" / "Case detail" requirements) and must keep working unchanged. Real applications today only ever reach 5 stages and carry a much smaller field set (see proposal's Impact). This change adds a second, separate, read-only view onto the real data rather than touching the existing simulated routes or their tests.

`apps/backoffice` already authenticates staff for real (`real-identity-service`): `checkCredentials`/`verifyCode` call the real `apps/api` `/auth/login`/`/auth/verify-code` and store the JWT in a cookie (`SESSION_COOKIE`, via `writeCookie`/`readCookie` in `apps/backoffice/src/mock/session.ts`). There is no exported `getSessionToken()` there yet (unlike `apps/web`, which already has one and already calls `apps/api` with it — see `apps/web/src/mock/actions.ts`'s `getSessionToken()`/`submitApplication()`).

## Goals / Non-Goals

**Goals:**
- A real, tenant- and role-scoped `GET /applications` and `GET /applications/:id` on `apps/api`.
- A new, separate read-only screen in `apps/backoffice` showing this real data: list + detail with decision summary and consents.
- Reuse `apps/web`'s already-proven cookie-to-Bearer fetch pattern, not invent a new one.

**Non-Goals:** (restated from proposal.md for implementers)
- My/Team/Unassigned queue split, the 14-stage workflow model and every field it implies (docs, checks, booking, recommendation, history, masked government ID, bureau/core data), any decisioning action, SLA/time-in-stage. The existing simulated `/applications` and `/applications/[id]` routes and their tests are untouched by this change.

## Decisions

### A new, separate route, not a change to the existing simulated `/applications` route
**Decision:** add `apps/backoffice/src/app/(console)/live-applications/page.tsx` (list) and `.../live-applications/[id]/page.tsx` (detail), plus a sidebar link. The existing `/applications` and `/applications/[id]` routes, their mock-store wiring, and `work-screens.test.tsx` are not modified.
**Why:** the existing routes are the system of record for the console's rich simulated workflow (staff-console's existing 10+ requirements) and are tested with zero `fetch()` mocking, driving an in-memory store directly; merging real and simulated data into one route/store would either break that suite or silently blend two very different data shapes (5-stage vs. 14-stage, missing fields). A separate route keeps both fully correct and independently testable.
**Alternative considered:** replace `/applications` outright. Rejected: throws away a large, working, spec-backed simulated surface this change's scope never asked to replace.

### Staff fetch helper mirrors `apps/web`'s pattern exactly
**Decision:** add `getSessionToken()` to `apps/backoffice/src/mock/session.ts` (reads `SESSION_COOKIE` the same way `getSessionRole()` already does), and a small `apps/backoffice/src/mock/actions/applications.ts` with `listApplications()`/`getApplication(id)` that read the token, call `apps/api` with `Authorization: Bearer <token>`, and parse the response with new `packages/contracts` schemas — same shape as `apps/web`'s `submitApplication()`.
**Why:** proven pattern, same session mechanics, no new design needed.

### New read endpoints live on `ApplicationsController`, method-level `@Roles` override
**Decision:** add `findAllForTenant(user, query)` / `findOneForTenant(user, id)` to `ApplicationsService`, and `GET /` / `GET /:id` methods on `ApplicationsController` with their own `@Roles('branch','officer','approver','ops','opssup','risk','compliance')` — overriding the controller's class-level `@Roles('borrower')` (Nest resolves `@Roles` at the most specific level; method-level replaces, does not merge with, class-level).
**Why:** keeps all application routes in one controller/service rather than splitting into a parallel "staff applications" module for a two-endpoint, read-only addition.
**Alternative considered:** a separate `StaffApplicationsController`. Rejected as unnecessary indirection for this scope; revisit if a later change needs materially different middleware for staff routes.

### Detail response includes the full `DecisionRecord`, typed `unknown` in `packages/contracts` (ADR-0002)
**Decision:** the new `staffApplicationDetailSchema` types `decision` as `z.unknown()`, exactly like `createApplicationSuccessSchema` already does — `packages/contracts` must not import `@aim-ready/core`'s `DecisionRecord` type.
**Why:** consistent with the existing precedent and ADR-0002's dependency-direction rule; `apps/backoffice`'s own rendering code can narrow the shape locally the same way `apps/api`'s own service does internally.

## Risks / Trade-offs

- **[Trade-off]** A second, parallel "Applications" surface in the console (simulated `/applications` vs. real `/live-applications`) is mildly confusing during this transitional phase. Accepted: this is the same incremental-migration pattern `real-application-intake` used for the borrower side (`apps/web` kept its simulated bank-progression code for everything after submission); a later change retires the simulated routes once enough of the real workflow exists to replace them.
- **[Risk]** `GET /applications` with no pagination could grow unbounded. Mitigated by scope: Phase 1 has a handful of seeded borrowers and this change adds no bulk-intake path, so an unpaginated list is acceptable for now; flagged here for a future change once volume grows.

## Migration Plan

1. `apps/api`: add service query methods, then controller GET routes and their `@Roles` overrides.
2. `packages/contracts`: add the new list/detail response schemas.
3. `apps/backoffice`: add `getSessionToken()`, the `applications.ts` action module, the new `live-applications` routes and a sidebar link.
4. Tests: Jest integration tests for the two new `apps/api` endpoints (tenant scoping, role scoping, 404-not-403 cross-tenant); Vitest tests for the new backoffice routes (mocking `fetch`, the one place in this app that will need it, since the existing suite's convention of driving the mock store directly doesn't apply to a real-data screen).
- **Rollback:** fully additive; reverting either side independently restores prior behavior.
