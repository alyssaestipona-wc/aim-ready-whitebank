# Proposal

## Why

Every sign-in in this product — borrower portal, staff console, admin console — still checks credentials against an in-memory/localStorage mock array inside each frontend's own Server Action, then sets an unsigned cookie. `apps/api` is a bare NestJS scaffold with no auth module, no database connection, and no endpoints beyond the root health route. This closes SS-0, PLT-6 and PLT-11 for real: a real backend identity service that issues and verifies sessions, backing all three apps' existing sign-in screens, so credential checking and role enforcement happen server-side in `apps/api` instead of being trusted to each frontend's own mock data.

## What Changes

- Add a real auth module to `apps/api`: a `users` table (TypeORM/PostgreSQL) seeded from each app's existing mock `USERS`/`BORROWERS` rosters (same emails, same shared demo password, same roles), password hashing (bcrypt), a login endpoint, a verify-code endpoint for the two-step staff/admin flow, and signed session issuance.
- Each frontend app's own sign-in Server Action (`apps/web/src/mock/actions.ts`'s `signIn`, `apps/backoffice/src/mock/actions/session.ts`'s `checkCredentials`/`verifyCode`, `apps/admin`'s equivalents) now calls `apps/api` over HTTP instead of checking an in-memory array.
- Each app keeps its own, separately named session cookie (`wbl_borrower_session` / `wbl_staff_session` / `wbl_admin_session`) and its own `src/proxy.ts` server-side route gate — this part of the architecture is unchanged. What changes is that the cookie now carries a real signed session token issued by `apps/api`, and each `proxy.ts` verifies it against `apps/api` (or a shared verification path) instead of trusting an unsigned value it set itself.
- `apps/api` enforces each account's role boundary server-side on every authenticated request (closes PLT-10's backend half).
- **BREAKING**: the three apps' mock `checkCredentials`/`signIn`/`verifyCode` functions change from synchronous in-memory lookups to async HTTP calls; any test or caller assuming synchronous mock behavior needs updating.
- `packages/contracts`'s stated scope ("types/DTOs crossing the `apps/api` ↔ `apps/web` boundary") is extended to cover `apps/backoffice` and `apps/admin` too, since the new auth DTOs cross that boundary for all three frontends, not just `apps/web`.

### Out of scope (unchanged from the backlog's own deferrals)
- External bank SSO federation (PLT-4, PLT-5, PLT-7, PLT-8, PLT-9) — there is no external WhiteBank SSO to federate with in this environment.
- The invite-and-claim account-creation flow (Epic 15) — accounts stay seeded directly (fixtures/migration), not self-registered.
- Real MFA delivery (SMS/email code dispatch) — the six-digit code step is verified against a real backend-issued code, but delivery stays simulated (the code is still shown/logged for demo purposes, not actually texted).

## Capabilities

### New Capabilities
- `api-auth`: the backend identity service in `apps/api` — login, two-step verification-code issuance/verification, session token issuance/verification, password storage, and per-request role enforcement, shared across all three frontend apps.

### Modified Capabilities
- `borrower-portal`: "Borrower sign-in by email" now calls the real `api-auth` backend instead of checking an in-memory mock array; add a scenario for the identity service being unavailable.
- `staff-console`: "Staff sign-in is two-step" now calls the real `api-auth` backend for both the password and code steps; add a scenario for the identity service being unavailable.
- `admin-console`: "Admin sign-in is two-step" now calls the real `api-auth` backend for both steps; add a scenario for the identity service being unavailable.

## Impact

- **New**: `apps/api/src/auth/` (module, controller, service, entities), a `users` table migration/seed, `@nestjs/jwt`, `@nestjs/passport`, `@nestjs/typeorm`, `pg`, `bcrypt` added to `apps/api`'s dependencies.
- **Modified**: `apps/web/src/mock/actions.ts`, `apps/backoffice/src/mock/actions/session.ts`, `apps/admin`'s equivalent session action, and all three apps' `src/proxy.ts`.
- **Modified**: `packages/contracts` — new auth request/response DTOs/schemas; its scope description extended to all three frontends.
- **Roles affected**: all 9 roles sign in through this path; RBAC visibility itself (which routes/screens a role sees) is unchanged — only how the session proving that role is established changes, from a self-asserted mock cookie to a server-verified one.
- **Not touched**: `packages/core` (domain/decisioning logic), loan application data, any of the three apps' own mock loan/case datasets (those stay simulated; only identity moves to a real backend).
