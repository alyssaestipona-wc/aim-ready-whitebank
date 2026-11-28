# Design

## Context

Each of the three frontend apps (`apps/web`, `apps/backoffice`, `apps/admin`) currently implements its own placeholder session: a **client-side** sign-in action (`"use client"`, not a Next.js Server Action — corrected after reading the actual code) checks credentials against an in-memory `USERS`/`BORROWERS` array and sets an unsigned cookie via `document.cookie` (`wbl_borrower_session` / `wbl_staff_session` / `wbl_admin_session`); that app's own `src/proxy.ts` (Next.js 16's renamed `middleware.ts`) then gates every route by checking only whether the cookie is *present*, never whether it is valid. Each `proxy.ts` carries a comment that this is a placeholder, replaced "when apps/api auth lands". `apps/api` is a bare `nest new` scaffold — no auth module, no database, no dependencies beyond the default NestJS set. `packages/contracts/src/index.ts` is currently empty (`export {};`). A local PostgreSQL 18.4 server is already running and reachable on port 5432. See `proposal.md` - Why for the motivation.

## Goals / Non-Goals

**Goals:**
- Real, server-verified credential checking and session issuance for all three apps, through one shared `apps/api` identity service.
- Each app keeps its own cookie name and its own `proxy.ts` — no shared session store, no single sign-on across apps.
- Seeded accounts preserve every existing demo email/role/password so each app's own README stays accurate.
- Server-side role enforcement on every `apps/api` request, independent of frontend UI.
- `proxy.ts` verification stays fast and edge-compatible — no network round-trip to `apps/api` on every page request.

**Non-Goals:**
- External bank SSO federation, invite-and-claim account creation, or real MFA code delivery (SMS/email) — all explicitly deferred per `proposal.md`.
- Single sign-on between the three apps, or a shared session cookie — each app's separate-session architecture is preserved, not collapsed.
- Any change to `packages/core` domain/decisioning logic, or to the apps' own mock loan/case data — only identity moves to a real backend.
- Multi-tenant account management UI — accounts stay seeded via fixtures/migration.

## Decisions

### Session token: hand-rolled HS256 JWT, verified locally in each `proxy.ts`
**Decision:** `apps/api`'s login/verify-code endpoints issue a short-lived signed JWT (HS256 compact JWS, shared secret via `AUTH_JWT_SECRET`) containing account id, role, tenant id and app scope. The client-side sign-in action stores it as that app's existing cookie (via `document.cookie`), unchanged in name. Each `proxy.ts` verifies the JWT's signature and expiry **locally**, without calling `apps/api`. The JWT itself is implemented with `node:crypto`'s `createHmac`/`timingSafeEqual` directly (encode/decode/sign/verify, ~60 lines), not a library (`jose`, `jsonwebtoken`) — `jose` ships ESM-only and broke Jest's CommonJS resolution; `jsonwebtoken`/`@nestjs/jwt`+`@nestjs/passport` add a dependency and an abstraction layer for a primitive this simple. The helper is duplicated once per consumer (`apps/api`, and once, nearly identically, in each of the three frontends' own `src/lib/session-token.ts` — see below) rather than factored into `packages/contracts`, after that package's own internal file-splitting broke differently under three of this monorepo's runtimes in turn (Jest's resolver, Next's bundler reasoning, and finally plain Node's own loader, which — unlike `tsc`/`ts-node` — never remaps a `.js` import specifier to a sibling `.ts` file); `packages/contracts` is now a single file with zero internal relative imports, which avoids all three.
**Why:** `proxy.ts` is confirmed to always run on the Node.js runtime in Next.js 16 (never Edge, and not configurable), so `node:crypto` is safe to use there with no edge-runtime shim needed. A network call to `apps/api` on every request would add latency and a new failure mode to every page load; local signature verification keeps `proxy.ts` fast, while still being real authentication (an attacker can no longer forge a cookie — any tampering invalidates the signature).
**Alternative considered:** server-side session store (opaque token + `apps/api` lookup on every request). Rejected for this phase: adds a network hop to every middleware invocation across three apps, with no benefit at this scale; revisit if token revocation-on-demand becomes a requirement.

### One shared identity service, three independent session scopes
**Decision:** a single `apps/api/src/auth` module serves all three apps, but each login/verify-code request carries which app/role-class it's for (borrower vs. staff vs. admin), and issued tokens are scoped accordingly — a borrower token is rejected by the staff or admin verification path and vice versa, even if the underlying signature is valid.
**Why:** matches the existing architecture decision (each app's own cookie, own gate) and prevents a borrower credential from ever being usable to access staff/admin surfaces, or the reverse, even though they now share a backend.
**Alternative considered:** three separate auth modules/services. Rejected: the three apps' account rosters, password hashing, and two-step-code logic are identical in shape; one module with scoped issuance avoids tripling the same code for no isolation benefit (the scoping, not process separation, is what provides isolation here).

### Seed data: migration-driven, reusing existing mock rosters verbatim
**Decision:** a TypeORM migration creates the `users` table (TypeORM pinned to `^0.3.31`, not the newer `1.x` line `pnpm add` resolves by default, per AGENTS.md's stated `TypeORM 0.3`; `@nestjs/typeorm` similarly pinned to `^11` rather than `^12`, which ships ESM-only and breaks ts-jest) and a seed script (run once per environment) inserts one row per existing mock account (same email, same role, same shared demo password, hashed with `bcryptjs` — a pure-JS drop-in for `bcrypt`, chosen to avoid a native-binding build step in this environment), tagged with a tenant identifier.
**Why:** the proposal's explicit constraint — this is a lift of existing seed data, not an invented roster — and keeps every app's "Demo accounts" README table accurate without edits.
**Alternative considered:** seed via an admin-console UI action. Rejected: no such UI exists yet (admin-console's own spec has no account-management screen), and inventing one is out of scope for an auth backend change.

### `packages/contracts`: scope description widened, DTOs added
**Decision:** add `LoginRequest`/`LoginResponse`/`VerifyCodeRequest`/`VerifyCodeResponse` (or equivalent) types/schemas to `packages/contracts`, and update ADR-0002's description of that package from "crossing the `apps/api` ↔ `apps/web` boundary" to cover all three frontends.
**Why:** `packages/contracts`'s whole purpose is shared types crossing the `apps/api` boundary; the new auth DTOs cross it for `apps/backoffice` and `apps/admin` too, not just `apps/web`, so the existing description is now inaccurate and must be corrected alongside the actual DTOs (code-review already treats stale ADR text as a defect in this codebase).
**Alternative considered:** duplicate DTOs per app. Rejected: directly against ADR-0002's stated purpose for this package.

## Risks / Trade-offs

- **[Risk]** A leaked JWT secret compromises all three apps' sessions at once (shared signing key). → **Mitigation:** store the secret only in `apps/api`'s and each frontend's server-side env (never client-exposed), document rotation as a follow-up task; acceptable for this phase given single-tenant, non-production scope.
- **[Risk]** Local JWT verification in `proxy.ts` can't detect a session invalidated server-side (e.g., a disabled account) until the token naturally expires. → **Mitigation:** keep token lifetime short (e.g., a few hours) for this phase; a revocation list is out of scope here and can be added later without changing this design's externally observable behavior.
- **[Trade-off]** The staff/admin two-step flow means the password step's response must carry enough state (without yet being a session) to bind the subsequent code step to the same attempt, slightly more complex than a single-call login. Accepted because it mirrors the existing frontend-only two-step UX exactly, so no spec-level behavior changes beyond "now server-verified."

## Migration Plan

1. Add `apps/api` dependencies (`@nestjs/typeorm@^11`, `typeorm@^0.3`, `pg`, `bcryptjs`, `class-validator`, `class-transformer`) and a TypeORM connection to the already-running local PostgreSQL instance (a dedicated `aimready`/`aimready_test` role and database, documented in the apply notes below).
2. Add the `users` table (migration) and a seed script populating it from each app's current mock roster.
3. Build the `apps/api` auth module (login, verify-code, token verification) per `specs/api-auth/spec.md`.
4. Add the shared auth DTOs to `packages/contracts`; update ADR-0002's package description.
5. Switch each app's client-side sign-in action to call `apps/api` instead of its in-memory array; keep the cookie name and UI unchanged.
6. Switch each app's `proxy.ts` to verify the JWT locally instead of checking only presence.
7. Remove each app's now-unused in-memory mock credential-check code, keeping the rest of that app's mock data (loans/cases) untouched.
- **Rollback:** each step is independently revertible (the old mock sign-in code is deleted only in step 7, after steps 1-6 are verified); reverting any frontend to its mock sign-in action restores prior behavior without touching `apps/api`.

**Local environment, for a developer running this for the first time:** a local PostgreSQL server must be running; this change creates its own role and two databases once (`createuser aimready --login --pwprompt` with password `aimready_dev`, or adjust env vars; `createdb aimready -O aimready` and `createdb aimready_test -O aimready`), then `pnpm --filter api migration:run` (repeat with `DB_NAME=aimready_test`) and `pnpm --filter api seed`. Every env var (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `AUTH_JWT_SECRET`) has a safe local default in code, so no `.env` file is required to run this locally — only to override a default or to deploy anywhere real.
