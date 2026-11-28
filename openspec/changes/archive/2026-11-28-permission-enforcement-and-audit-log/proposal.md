# Proposal

## Why

Epic 15 (Identity, Authentication & User Management) has one core story left before it reaches 100% complete: PLT-10, "Enforce every permission at the server, not only in the menu." The server-side half is already built and already specified (`api-auth`'s "Role boundary is enforced server-side on every request" requirement, implemented by `SessionRoleGuard`) — there is no gap there. The remaining gap is the other half of PLT-10's own acceptance criteria: "A refusal is logged the same way an attempted self-approval is... rather than failing silently." No audit-log mechanism exists anywhere in this codebase (confirmed by a full `apps/api` grep), so today every permission refusal fails silently from an audit standpoint, with nothing to inspect after the fact.

This closes PLT-10 and, with it, closes out Epic 2's sibling epic — Epic 15 — to 100% core completion (PLT-6 and PLT-11 are already done; PLT-4/5/7/8/9 are explicitly deferred and don't block epic completion).

## What Changes

- Add a new, real, Postgres-backed, tenant-scoped, append-only `audit_log` table and `AuditLogService` — no update or delete path exists for a row once written.
- `SessionRoleGuard` writes one `audit_log` row every time it refuses a request for a role mismatch, capturing who attempted it, what they attempted, when, and why it was refused.
- Add a minimal real `GET /audit-log` endpoint, tenant-scoped and gated to the `compliance` role (the PRD's own role for this kind of screen), returning refusal entries newest-first. No UI screen is built in this change — a future Compliance-epic change owns the real audit screen; this change only guarantees the underlying table and a real, role-gated way to read it back.
- Add integration test coverage proving the guard's existing role enforcement is real backend enforcement (not just frontend hiding) across a representative sample of already-built endpoints (applications list/detail/decide/pick/request-info/resolve-info), plus coverage of the new audit-write-on-refusal and audit-list behaviors.

## Capabilities

### New Capabilities
- `audit-log`: a tenant-scoped, append-only record of permission-refusal events, with a role-gated endpoint to read them back. Owns the `audit_log` table/entity and its own requirements; future changes (e.g. full CMP-1 general action-logging) extend this same capability rather than inventing a second log.

### Modified Capabilities
- `api-auth`: the existing "Role boundary is enforced server-side on every request" requirement gains a new scenario — a refused request writes an audit-log entry, rather than only throwing with no further trace.

## Impact

- `apps/api/src/auth/guards/session-role.guard.ts`: refusal path now also writes an audit-log entry (via a new `AuditLogService` it depends on).
- New: `apps/api/src/audit-log/` module (entity, service, controller, DTO) and a migration adding the `audit_log` table.
- New: integration tests under `apps/api/src/audit-log/` and additions to existing `applications`/`auth` integration specs confirming server-side role enforcement end-to-end.
- No schema or API contract change to any existing endpoint's request/response shape — this is additive only (a new table, a new read endpoint, and a side-effect inside an existing guard).
- RBAC/role impact: adds one new role-gated read surface (`GET /audit-log`, `compliance` only); does not change who can call any existing endpoint.
- Not touching credit policy, decision bands, documents, workflows, external-service adapters, booking/disbursement, or scoring — none of those binding guiding-principle checks apply to this change.
