# Tasks

## 1. Backend foundation

- [x] 1.1 Add `@nestjs/typeorm@^11` (pinned below the ESM-only `^12`), `typeorm@^0.3` (pinned per AGENTS.md, not the `1.x` `pnpm add` resolves by default), `pg`, `bcryptjs` (pure-JS, no native build step), `class-validator`, `class-transformer` to `apps/api`'s `package.json`; verified `apps/api` boots (`GET /` returns 200) via `nest start`.
- [x] 1.2 Configured a TypeORM connection (`apps/api/src/database/data-source.ts`) to the local PostgreSQL instance via `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD`/`DB_NAME` env vars, each with a safe local default matching a dedicated `aimready` role/database created for this change; verified `apps/api` connects on boot without error.
- [x] 1.3 Added a `UserEntity` (id, tenant id, email, password hash, app scope, role, name) and migration `1795847440494-CreateUsers` creating the `users` table with a unique `(tenant_id, email)` index; verified the migration runs cleanly against both `aimready` and `aimready_test`.
- [x] 1.4 Added `apps/api/src/database/seed.ts`, inserting one row per existing mock account from all three apps' `USERS`/`BORROWERS` data (same email, role, shared demo password hashed with `bcryptjs`), tagged with tenant `kalinaw`; verified all 10 seeded emails match the apps' "Demo accounts" rosters.

## 2. Identity service endpoints

- [x] 2.1 Implemented the login endpoint (`AuthService.login`) per `specs/api-auth/spec.md`'s "Login verifies credentials against stored accounts" requirement; verified with Jest/real-Postgres integration tests covering unknown email, wrong password, correct borrower credentials, and correct staff credentials.
- [x] 2.2 Implemented the verify-code endpoint (`AuthService.verifyCode`) per "Two-step verification for staff and admin accounts", binding the code to the login attempt via a signed pending token; verified with tests covering correct code, incorrect code, and a code with no valid prior pending token.
- [x] 2.3 Implemented the tenant-administrator refusal on the staff login path; verified with a test asserting the distinct refusal message and no session issued.
- [x] 2.4 Implemented session issuance via a hand-rolled HS256 JWT (`TokenService`, `node:crypto`'s `createHmac`/`timingSafeEqual` — not `jose`/`@nestjs/jwt`, which either broke Jest's CommonJS resolver or added an unneeded abstraction; see design.md) and the `POST /auth/verify-session` endpoint, per "Sessions are signed and independently verifiable"; verified with tests for a valid token, a tampered token, and an expired token (session and pending).
- [x] 2.5 Implemented server-side role-boundary enforcement via `SessionRoleGuard` (default-deny `APP_GUARD`, `@Public()`/`@Roles()` decorators) per "Role boundary is enforced server-side on every request"; verified with guard unit tests and a live cross-role `/auth/admin-only` check.
- [x] 2.6 Implemented the distinct `identity_service_unavailable` (503) failure path per that requirement; verified with a test simulating a repository error and asserting no session is issued.

## 3. Shared contracts

- [x] 3.1 Added `LoginRequest`/`LoginResponse`/`VerifyCodeRequest`/`VerifyCodeResponse` and session-token payload zod schemas/types to `packages/contracts/src/index.ts` (kept as a single file with no internal relative imports, after a multi-file split broke differently under Jest, Next's bundler reasoning, and plain Node's loader in turn — see design.md), replacing the empty `export {}`; verified `apps/api` typechecks against them (frontend wiring is tasks 4-6).
- [x] 3.2 Updated ADR-0002's `packages/contracts` description to cover `apps/backoffice` and `apps/admin`, not only `apps/web`, and to note it stays free of `node:`-prefixed runtime dependencies.

## 4. Borrower portal integration

- [x] 4.1 Replaced `apps/web/src/mock/actions.ts`'s `signIn` in-memory check with an HTTP call (client-side `fetch`) to the identity service's login endpoint, keeping the `wbl_borrower_session` cookie name and existing error copy; added `apps/web/src/mock/config.ts`'s `API_BASE_URL` (public env var, since this runs client-side) and a global test-only `fetch` stub in `vitest.setup.ts`; verified `specs/borrower-portal/spec.md`'s modified scenarios pass (53/53 Vitest tests, including the new identity-service-unavailable scenario).
- [x] 4.2 Added `apps/web/src/lib/session-token.ts` (verify-only HS256, `node:crypto`) and updated `apps/web/src/proxy.ts` to verify the JWT locally instead of checking only cookie presence; verified signed-out, invalid/unsigned-token, and cross-scope (staff-token-on-borrower-app) requests all redirect to sign-in, and a valid token passes.

## 5. Staff console integration

- [x] 5.1 Replaced `apps/backoffice/src/mock/actions/session.ts`'s `checkCredentials`/`verifyCode` with HTTP calls to the identity service's login/verify-code endpoints (now returning `pendingToken` and the authoritative `role`, not a pre-verification guess), keeping the `wbl_staff_session` cookie name and existing error copy. Added `src/lib/decode-session-token.ts` (browser-safe, shape-only, for `useSessionRole`'s UI reads) and `src/lib/session-token.ts` (server-only, signature-verified, for `proxy.ts`); `setSessionToken` replaces the old `setSessionRole` as the real sign-in path, while `setSessionRole` is kept as a test-only direct-role helper (builds an unsigned-but-decodable token). Verified `specs/staff-console/spec.md`'s modified scenarios pass (191/191 Vitest tests, including both new identity-service-unavailable scenarios).
- [x] 5.2 Updated `apps/backoffice/src/proxy.ts` to verify the JWT locally; verified signed-out, invalid/unsigned-token, and borrower-scoped-token requests all redirect to sign-in, and every role's allowed/forbidden route still resolves correctly with a real signed token.

## 6. Admin console integration

- [x] 6.1 Replaced `apps/admin`'s equivalent session action with HTTP calls to the identity service's login/verify-code endpoints, keeping the `wbl_admin_session` cookie name and existing error copy; same `decode-session-token.ts`/`session-token.ts` split as `apps/backoffice`. Verified `specs/admin-console/spec.md`'s modified scenarios pass (46/46 Vitest tests, including both new identity-service-unavailable scenarios).
- [x] 6.2 Updated `apps/admin/src/proxy.ts` to verify the JWT locally; verified signed-out, invalid/unsigned-token, and staff-scoped-token requests all redirect to sign-in, and a valid admin token passes.

## 7. Cleanup and verification

- [x] 7.1 Removed each app's in-memory credential-check logic (the password/role lookup inside `signIn`/`checkCredentials`), replaced by the real HTTP call; `USERS`/`BORROWERS` rosters themselves are untouched, since the rest of each app's simulation (names, cases, loans) still reads them. `DEMO_PASSWORD` stays, now consumed only by each app's own test fetch-mock and demo documentation. Verified via lint (no unused-import warnings) and typecheck across all three apps.
- [x] 7.2 Ran the full test suite (Jest for `apps/api`: 21/21; Vitest for `apps/web`: 53/53, `apps/backoffice`: 191/191, `apps/admin`: 46/46, `packages/ui`: 42/42, `packages/core`: 34/34) and typecheck/lint across the monorepo via `turbo run typecheck|lint|test`; everything green.

## Workflow follow-up

- Run `spec-review` against this change before manual testing.
- Manually sign in as a seeded account in each of the three apps (correct and incorrect credentials, and the two-step code for staff/admin) against the real backend.
- Run `code-review` (fresh session) before archiving.
- Archive the change once spec-review and code-review report zero findings and all tasks above are complete.
- Create a branch, commit, open a PR, watch CI, and merge once green, per the user's standing instruction for this workstream.
