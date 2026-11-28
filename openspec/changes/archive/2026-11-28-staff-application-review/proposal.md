# Proposal

## Why

`real-application-intake` made borrower loan applications real in `apps/api`, but nobody on staff can see them: `apps/backoffice`'s applications list and case-detail screens still run entirely against its own in-memory mock store. Staff cannot work a real application at all today. This change gives staff read-only visibility into real applications — the minimum needed before any later change can let staff act on them (approve/decline, request info).

## What Changes

- Add `GET /applications` (tenant-scoped list, filterable by stage and product) and `GET /applications/:id` (detail) to `apps/api`, restricted to staff roles (`branch`, `officer`, `approver`, `ops`, `opssup`, `risk`, `compliance`) — the existing `POST /` and `PATCH /:id/close` stay borrower-only.
- Add a new `ApplicationsService.findAllForTenant()` / `findOneForTenant()` query path (the service currently only has `create()`/`close()`, written for the borrower's own applications).
- Add a small server-side fetch helper in `apps/backoffice` that reads the staff session cookie and forwards it as `Authorization: Bearer <token>` to `apps/api` (backoffice's real staff session, from `real-identity-service`, is held in a cookie today, never forwarded to apps/api).
- Add a real "Applications" list and detail view in `apps/backoffice`, reading only real `apps/api` data (not merged with the mock store): list shows id, product, amount, tenor, stage, decision outcome/grade; detail shows the full decision summary (score, grade, PD, rule-by-rule results, reasons, rule-set/model versions) and the three consent records.
- **Non-goals, deferred**: the My/Team/Unassigned queue split (no `assignee` column exists on `ApplicationEntity` yet); the 14-stage workflow state machine and every field it implies (documents, checks, booking, recommendation, activity history, masked government ID, bureau/core-banking data) — real applications today only ever reach `Review`/`Offer`/`Declined`/`Disbursed`/`Withdrawn`; any decisioning action (approve/decline/request-info) — this change is read-only, a planned follow-on change adds staff actions; SLA/time-in-stage (no SLA configuration exists yet).

No breaking changes: this is additive (new endpoints, new screen); the existing fully-simulated "Work queues and SLA watch" and "Case detail" requirements in `staff-console` continue to describe the console's simulated-data screens unchanged, since real applications don't yet carry the fields those screens need.

## Capabilities

### Modified Capabilities
- `application-intake`: adds staff-facing read requirements (list and detail) to the capability that already owns the real `apps/api` applications data.
- `staff-console`: adds a new requirement for a real, read-only applications screen, alongside (not replacing) the existing simulated work-queue/case-detail requirements.

## Impact

- `apps/api/src/applications/applications.controller.ts`, `applications.service.ts`: new GET routes and query methods.
- `apps/backoffice/src/`: new server-side fetch helper (cookie → Bearer), new Applications list/detail screen(s) and their tests.
- No schema/migration changes: reuses `ApplicationEntity`/`ConsentEntity` as persisted by `real-application-intake`.
- No `packages/contracts` breaking changes: adds response schemas for the new GET endpoints only.
