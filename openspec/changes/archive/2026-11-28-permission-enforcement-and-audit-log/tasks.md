# Tasks

## 1. apps/api: data model

- [x] 1.1 Add a migration (timestamp > 1795852300000): `audit_log` table — `id uuid` PK, `tenant_id`, `action`, `actor_id`, `actor_email`, `actor_role`, `reason`, `detail jsonb`, `created_at timestamptz`; index on `(tenant_id, created_at)` for the list endpoint's hot path. Verify via `npm run migration:run` against the dev DB, then inspect the table with `psql \d audit_log`.
- [x] 1.2 Add `AuditLogEntity` (`apps/api/src/audit-log/audit-log.entity.ts`) mapping that table. Verify `npx tsc --noEmit` is clean.

## 2. apps/api: AuditLogService and the guard write

- [x] 2.1 Add `AuditLogService` (`apps/api/src/audit-log/audit-log.service.ts`) with `record(entry)` (insert) and `list(tenantId)` (tenant-scoped, newest-first) — no update/delete method anywhere on the service. Verify with a Jest integration test: `record()` then `list()` returns it; two tenants' entries never cross.
- [x] 2.2 Register `AuditLogModule` and inject `AuditLogService` into `SessionRoleGuard`; change `canActivate` to `Promise<boolean>`; on the existing role-mismatch throw (session-role.guard.ts:51-56), `await` a `record()` call wrapped in `try/catch` (catch logs to `console.error`, never rethrows) before throwing the original `UnauthorizedException`. Verify with a Jest integration test: a role-mismatched request against a real guarded endpoint (e.g. `PATCH /applications/:id/pick` called by a non-officer role) is still rejected, and a matching audit-log row now exists afterward.
- [x] 2.3 Verify a logging failure never changes the outcome: Jest test that makes `record()` reject (mock/spy) and confirms the original request is still refused with the same `UnauthorizedException`, not a 500 and not a pass-through.
- [x] 2.4 Verify an allowed request writes nothing: Jest test that a same-role request to a guarded endpoint produces no new audit-log row.
- [x] 2.5 Verify unauthenticated branches (missing/invalid token, guard lines 42/45) still throw `UnauthorizedException` and write no audit-log row (no session to attribute one to) — matches design.md's non-goal.

## 3. apps/api: the read endpoint

- [x] 3.1 Add `GET /audit-log` to a new `AuditLogController`, `@Roles('compliance')`, reading `req.user.tenantId` and calling `AuditLogService.list()`, newest-first. Verify with a Jest integration test: a compliance-role session gets that tenant's entries, newest-first.
- [x] 3.2 Verify a non-compliance role is refused by the existing guard and that refusal itself produces a new audit-log entry (closing the loop: reading the log is itself a permission check the same mechanism protects). Verify with a Jest integration test.
- [x] 3.3 Verify cross-tenant isolation: a compliance session from tenant A never sees tenant B's audit-log entries, even when both have entries. Verify with a Jest integration test.

## 4. Representative server-side enforcement coverage (api-auth's existing requirement)

- [x] 4.1 Add or confirm existing Jest integration tests proving role gating is real backend enforcement (not just controller metadata) across a representative sample of already-built endpoints: applications list, applications detail, decide, pick, request-info, resolve-info. For each, a request from a role outside its `@Roles(...)` set is rejected by the live guard against a real HTTP call, not only asserted via reflected metadata. Where this coverage already exists (likely, given `applications.controller.spec.ts`'s existing role-metadata tests), add the missing live-rejection integration test only for any endpoint that doesn't already have one.

## 5. Cleanup and verification

- [x] 5.1 `npx eslint --fix` on apps/api; `npx tsc --noEmit` on apps/api.
- [x] 5.2 Full monorepo `turbo run typecheck lint build test` (with `DB_NAME=aimready_test` for apps/api's test step), confirming all green, including a repeated isolated `turbo run test --filter=api --force` run.

## Workflow follow-up

- Run `openspec validate permission-enforcement-and-audit-log --strict`.
- Run spec-review, then code-review (fresh session), fixing findings until each reports clean.
- Archive the change, syncing `audit-log` (new) and `api-auth` (modified) into `openspec/specs/`.
- Branch, commit, push, open a PR with a test-plan body, watch CI, merge once green.
- Update the Lending Tracker: mark PLT-10 `done`. With PLT-6 and PLT-11 already `done` and PLT-4/5/7/8/9 deferred, Epic 15 (Identity, Authentication & User Management) reaches 100% core completion.
