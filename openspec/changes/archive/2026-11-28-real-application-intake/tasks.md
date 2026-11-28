# Tasks

## 1. Backend data model

- [x] 1.1 Added `ApplicationEntity` (id, tenant id, borrower id, product code, amount, tenor, income, obligations, purpose, stage, `decision` jsonb, created_at) and migration `CreateApplications` creating the `applications` table; verified the migration runs cleanly against both `aimready` and `aimready_test`.
- [x] 1.2 Added `ConsentEntity` (id, application id, kind, captured_at, terms_version) in the same migration; verified the unique `(application_id, kind)` constraint.
- [x] 1.3 Added `BorrowerProfileEntity`/`borrower_profiles` (age, bureau file type, years as customer, stable flag, plus sanctions/defaulted - both always false, matching the existing client code's hardcoded values) and extended `seed.ts` to populate it from the exact values in `apps/web/src/mock/config.ts`'s `BORROWERS`; verified both seeded borrowers have a matching profile row.
- [x] 1.4 Added `apps/api/src/applications/policy.ts` with the same `PRODUCTS`/`POLICY` values `apps/web/src/mock/config.ts` hardcodes, with a comment documenting the manual-sync expectation (a cross-app equality test was judged not worth the cross-package test-wiring it would need - see design.md).

## 2. Application intake endpoint

- [x] 2.1 Implemented `POST /applications` (`ApplicationsService.create`) per `specs/application-intake/spec.md`'s "Submitting an application validates required fields and consents" requirement; verified with Jest/real-Postgres tests covering a missing consent and an out-of-range amount, plus a live manual curl walkthrough.
- [x] 2.2 Implemented consent persistence per "Consent is captured with full provenance"; verified with a test reading back all three consents' timestamps and terms versions (`v3.2`).
- [x] 2.3 Implemented the duplicate-open-application check; verified for both the blocked case and the allowed-once-closed case (added `PATCH /applications/:id/close`, letting the owning borrower report a terminal stage - necessary so the check stays correct once a loan finishes under `apps/web`'s still-simulated later stages; see design.md's migration plan).
- [x] 2.4 Wired `packages/core`'s `simulateDecision` in, sourcing non-form inputs from `BorrowerProfileEntity`; verified with tests covering approve, decline (knockout, no score), and that the stored decision record is unchanged after a later stage change. (`packages/core` itself needed the same single-file consolidation `real-identity-service` applied to `packages/contracts`, to run under apps/api's raw Node loader - see below.)
- [x] 2.5 Implemented the distinct `application_service_unavailable` (503) failure path; verified with a test simulating a repository error and asserting no application is created.
- [x] 2.6 Enforced the tenant-identifier-on-every-write requirement; verified by reading back an application's `tenantId`.

## 3. Shared contracts

- [x] 3.1 Added `CreateApplicationRequest`/`CreateApplicationResponse` (and a borrower-ownership-checked `PATCH .../close` DTO) to `packages/contracts/src/index.ts`; `decision` is typed `unknown` there rather than duplicating `DecisionRecord` (ADR-0002 keeps `packages/contracts` from depending on `packages/core`) - `apps/api`'s own `ApplicationsService` keeps a more precise, structurally-compatible local return type for its own callers and tests. Verified `apps/api` typechecks against the contracts types (frontend wiring is task 4).

## 4. Borrower portal integration

- [x] 4.1 Replaced `apps/web/src/mock/actions.ts`'s `submitApplication`'s decision computation with a call to the real `/applications` endpoint (added `Application.serverId` and a `getSessionToken()` helper to attach the Bearer session token); `precheckSubmission` stays as a client-side UX pre-check only, the server's own re-validation is the authority. Removed the now-dead artificial 1.2s `wait()` (the real network round-trip replaces it; simplified `submitInstant`/a stale fake-timer test accordingly - see design.md note). Verified `specs/borrower-portal/spec.md`'s modified scenarios pass (54/54 Vitest, including the new application-service-unavailable scenario).
- [x] 4.2 Added a `PATCH /applications/:id/close` call (fire-and-forget, best-effort) in `advanceBank`'s Booking→Disbursed transition, using the application's `serverId`; this is the one later-stage sync this change needs (see design.md's migration-plan addendum) - everything else in the simulated progression (info request, offer, documents, booking) stays entirely client-side, unchanged. Verified the existing bank-progression tests still pass.

## 5. Cleanup and verification

- [x] 5.1 Removed the local `simulateDecision`/`POLICY` call and the now-dead `ActionOptions.wait`/`realWait` plumbing from `apps/web`'s mock store; the rest of that app's mock data (stage-progression simulation, document/offer/signing flows) is untouched. Verified via lint (no unused-import warnings) and typecheck.
- [x] 5.2 Ran the full test suite (Jest for `apps/api`: 34/34 across 6 suites; Vitest for `apps/web`: 54/54, `apps/backoffice`: 191/191, `apps/admin`: 46/46, `packages/ui`: 42/42, `packages/core`: 34/34) and typecheck/lint/build across the monorepo via `turbo run typecheck|lint|build|test`; everything green.

## Workflow follow-up

- Run `spec-review` against this change before manual testing.
- Manually submit an application as a seeded borrower (Juan) end to end and confirm the persisted decision record matches what the UI shows.
- Run `code-review` (fresh session) before archiving.
- Archive the change once spec-review and code-review report zero findings and all tasks above are complete.
- Create a branch, commit, open a PR, watch CI, and merge once green, per the user's standing instruction for this workstream.
