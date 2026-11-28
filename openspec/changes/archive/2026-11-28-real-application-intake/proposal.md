# Proposal

## Why

Nothing downstream of sign-in can be built for real yet: a loan application today only ever exists in `apps/web`'s own browser-local mock store, decided client-side by a decision pipeline the browser itself runs. Every later epic this backlog calls for — work queues, case review, approvals, documents, booking — needs a real, server-held application and decision record to work against. Application intake is the one epic nothing else can be real without, so it is the natural next step after `real-identity-service`.

## What Changes

- Add an `applications` module to `apps/api`: a real `applications` table, a `POST /applications` endpoint that validates the request, runs the decision pipeline, and persists the application with its immutable decision record.
- The decision pipeline itself is not reinvented: `packages/core`'s `simulateDecision`/`DecisionPolicy` (already a real, deterministic rules-plus-scoring engine — its own doc comment already says "the real pipeline runs in apps/api") moves from being invoked client-side in `apps/web`'s mock store to running server-side in this new module, fed by tenant policy configuration seeded the same way product/policy data already is.
- Consent capture (credit-check, data-processing, terms — each with its own timestamp and terms version) and the duplicate-open-application check move server-side, enforced as the authority (AGENTS.md: frontend validation is UX only). `apps/web`'s existing client-side checks stay, now advisory only.
- `apps/web`'s apply flow (`src/mock/actions.ts`'s `submitApplication`) calls the real endpoint instead of running the pipeline and consent/duplicate checks against its own local store.
- `packages/contracts` gains the shared `CreateApplicationRequest`/`CreateApplicationResponse` DTOs/schemas (and the `DecisionRecord`/`DecisionInput` shapes already defined in `packages/core`, referenced not duplicated).

### Out of scope (deferred to later epics, per the backlog's own build order)
- Branch walk-in and file/bulk intake (INT-2, INT-3) — F3/F4 channels, not F1/F2.
- Everything after submission: info-requests, offer accept/decline, documents, booking, disbursement. These stay on `apps/web`'s existing "simulated bank progression" (`advanceBank`) for this change; each becomes its own real epic in turn, the same way this change follows `real-identity-service`.
- Staff-side reading of real applications (work queues, case review) — Epic 2/3's own future change; this change only makes the borrower's submission real.
- Real bureau/eKYC/AML/OCR integrations — simulated per the PRD's own pre-contract adapter strategy; this change's decision inputs (age, bureau file type, DTI, etc.) come from the same declared/borrower-record data already available, not a new external call.
- Pre-approved-offer eligibility API (INT-6) — Could-priority, not touched.

## Capabilities

### New Capabilities
- `application-intake`: the real `apps/api` endpoint that captures a loan application, runs the decision pipeline, and persists the application and its immutable decision record.

### Modified Capabilities
- `borrower-portal`: "Three-step loan application" now submits to the real `application-intake` endpoint instead of running the pipeline and consent/duplicate checks against the local mock store; add an "application service unavailable" scenario.

## Impact

- **New**: `apps/api/src/applications/` (module, controller, service, entity, migration), using the same TypeORM/PostgreSQL setup `real-identity-service` already wired up.
- **Modified**: `apps/web/src/mock/actions.ts`'s `submitApplication`/`precheckSubmission`; `packages/contracts/src/index.ts`.
- **Roles affected**: borrower only, for this change. Staff/admin involvement (assignment, review) is unaffected — those cases still run entirely in `apps/backoffice`'s own simulation until a later epic makes that side real too.
- **Not touched**: `apps/backoffice`, `apps/admin`, maker-checker/approval logic, documents, booking, disbursement, the auth module `real-identity-service` just shipped.
