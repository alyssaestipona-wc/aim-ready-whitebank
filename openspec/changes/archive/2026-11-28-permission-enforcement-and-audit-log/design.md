# Design

## Context

`SessionRoleGuard` (`apps/api/src/auth/guards/session-role.guard.ts`) already enforces role boundaries server-side (lines 47-56): it compares `@Roles(...)` metadata against the verified session's `payload.role` and throws `UnauthorizedException` on mismatch. `canActivate()` is currently synchronous (`canActivate(context): boolean`). No audit-log table, entity, or service exists anywhere in `apps/api` (confirmed by a full-repo grep). See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- One real, tenant-scoped, append-only `audit_log` table and `AuditLogService`, with no update/delete path.
- `SessionRoleGuard` writes one audit-log entry on a role-mismatch refusal, without ever letting the audit write itself change the refusal's outcome (a logging failure must not turn a 401 into a 500, and must not accidentally let a refused request through).
- A minimal `GET /audit-log` endpoint, tenant-scoped, `@Roles('compliance')`, newest-first.

**Non-Goals:**
- Full CMP-1 (Epic 11): logging every action across every role, not just permission refusals. This change's `audit_log` table and `AuditLogService` are intentionally generic enough (`action`, `actorId`, `actorRole`, `reason`, free-form `detail`) that a future CMP-1 change can add more call sites without a new table.
- WF-11 self-approval blocking: doesn't exist in the real flow yet (confirmed non-goal in `staff-decisioning-actions`' own design.md), so there is no self-approval event to log here.
- Any audit-log UI/screen. `GET /audit-log` exists for real, but no `apps/backoffice` or `apps/admin` page reads it in this change.
- Logging unauthenticated requests (missing/invalid/expired token, guard lines 42/45). Those have no session to attribute an entry to and no tenant to scope it under; this change only logs the role-mismatch branch (line 51-56), matching the spec's "Role-mismatched request is logged" scenario, which assumes a valid session.
- Retention, archival, or export of audit-log data.

## Decisions

**New module, not an interceptor.** A NestJS interceptor wrapping every controller would be the more "catches everything" approach, but it fights the Non-Goal above (this change logs refusals only, not successes) and would need its own role-mismatch detection duplicating the guard's own `Reflector` logic. Writing directly from inside `SessionRoleGuard`'s existing refusal branch is simpler, colocated with the one decision point that already knows both "required roles" and "actual role," and keeps the future CMP-1 change free to add an interceptor later without this change having built the wrong abstraction first.

**`canActivate` becomes `Promise<boolean>`.** NestJS guards support async `canActivate`; Postgres writes are inherently async. This is the only signature change in the guard.

**Audit write never masks or swallows the original refusal.** The guard's refusal branch becomes: construct the `UnauthorizedException` to throw either way; `await` the audit write in a `try/catch` that only logs-on-failure to `console.error` (never rethrows); then throw the original exception. A broken audit-log write degrades to "refusal happened, nothing recorded" — never to "request silently allowed" and never to "500 instead of 401."

**Entity shape**: `AuditLogEntity` — `id` (uuid), `tenantId`, `action` (string, e.g. `'permission_denied'`), `actorId` (the session's `sub`), `actorEmail`, `actorRole`, `reason` (string, e.g. `'role_mismatch'`), `detail` (jsonb, free-form — here: `{ method, path, requiredRoles }`), `createdAt`. `action`/`reason`/`detail` as separate typed-enough-but-extensible fields (rather than one opaque message string) is what lets a future CMP-1 change reuse this same table for other event types without a migration.

**Immutability is structural, not enforced by a DB trigger.** `AuditLogService` exposes only `record()` (insert) and `list()` (tenant-scoped, newest-first); no `update`/`delete` method exists on the service or repository usage anywhere in the module. A DB-level `REVOKE UPDATE, DELETE` grant is not added in this change (single-tenant dev/demo Postgres instance, same trust model as every other table in this codebase) — "no code path exists to mutate a row" is the same level of guarantee the rest of this codebase relies on (e.g. `ApplicationEntity.decision`'s own "frozen at creation, never edited" convention has no DB trigger either).

**`GET /audit-log` is tenant-scoped via the existing session, not a new concept.** Same pattern as every other `findAllForTenant`-style method already in this codebase (`ApplicationsService.findAllForTenant`): the controller reads `req.user.tenantId` from the verified session and the service filters by it.

## Risks / Trade-offs

**[Risk]** A role-mismatch refusal that also throws before the guard reaches the write (e.g., a Postgres outage) could make an already-slow refusal path slower if the write isn't bounded. **Mitigation**: the audit write happens only on the already-exceptional refusal path (not the hot "allowed" path), and is wrapped so a slow/failing write logs and moves on rather than retrying or blocking.

**[Risk]** Logging the full attempted `path` could incidentally capture a sensitive value if a future route embeds one in its path (none currently do — every ID in this codebase's routes is an opaque uuid, never a secret). **Mitigation**: none needed today; flagged here so a future route design keeps this in mind.
