# Design

## Context

`apps/api` now has a real auth module (`real-identity-service`, merged) with TypeORM/PostgreSQL wired up (a `users` table, migrations, a local `aimready`/`aimready_test` database already created). `apps/web`'s apply flow (`src/mock/actions.ts`) runs entirely client-side today: `submitApplication` calls `packages/core`'s `simulateDecision` directly in the browser against a hardcoded `POLICY` object and `PRODUCTS` map (both in `apps/web/src/mock/config.ts`), then pushes the resulting `Application` into a browser-local store (`localStorage`-backed). `simulateDecision`/`DecisionPolicy` in `packages/core` are pure, deterministic functions with no I/O - their own doc comment already states intent: "the real pipeline runs in apps/api ... this deterministic stand-in lets the mock layers produce realistic, reproducible outcomes" (written for the mock layer calling it, not for apps/api running it - this change is what that comment anticipated). See `proposal.md` - Why for the motivation.

## Goals / Non-Goals

**Goals:**
- A real `POST /applications` endpoint in `apps/api`: validates input, enforces consent and duplicate-application rules server-side, runs the decision pipeline, and persists the application and an immutable decision record.
- Reuse `packages/core`'s existing `simulateDecision` engine unchanged - this change moves where it runs, not what it computes.
- `apps/web`'s apply flow calls this endpoint instead of its local store for the decision and persistence; its own client-side checks become UX-only, matching `AGENTS.md`'s validation rule.
- Every row carries a tenant identifier, per this product's single-tenant-now/multi-tenant-later data rule.

**Non-Goals:**
- Tenant-configurable products/policy (a real "Configuration" capability) - product limits and decision policy are seeded, hardcoded data in this change, exactly where they already live today (just moved from `apps/web`'s config to `apps/api`'s), not yet backed by an editable admin screen. That is Epic 12/13's own future change.
- Anything after submission: info-requests, offers, documents, booking, disbursement. `apps/web`'s existing "simulated bank progression" (`advanceBank`) keeps moving a persisted application through those stages exactly as it does today for a local one; a later epic each makes a stage real.
- Staff-side visibility into real applications (work queues, case review) - Epic 2/3's own future change.
- Real bureau/eKYC/AML/fraud/OCR adapters - decision inputs are the same declared/borrower-record values already used today (age, bureau file type from the borrower's seeded record, declared income/obligations), not a new external integration.

## Decisions

### Decision data model: one `applications` table, decision stored as JSONB, consents as their own rows
**Decision:** a single `applications` table (id, tenant_id, borrower_id [FK to `users`], product_code, amount, tenor, income, obligations, purpose, stage, decision — a `jsonb` column holding the full `DecisionRecord`, created_at), plus a `consents` table (id, application_id, kind [credit_check/data_processing/terms], captured_at, terms_version) so each consent is independently queryable and timestamped per the spec's provenance requirement.
**Why:** `DecisionRecord` (score, grade, pd, rules, reasons, trigger, versions, frozen inputs) is a cohesive, already-immutable value object in `packages/core` - storing it as JSONB keeps it exactly as produced, with no lossy relational decomposition, while `stage`/`outcome` (read via a generated or indexed expression on `decision->>'outcome'`) stay queryable for later epics' work queues. Consents get their own table because the spec requires each one independently timestamped and versioned, which a single JSON blob would make awkward to query per-consent later (compliance's consent-records screen, per `INT-4`).
**Alternative considered:** fully normalized decision columns (score, grade, trigger, rules as a join table). Rejected for this phase: adds significant schema surface for data that's read as a whole unit everywhere it's used today (the case-review screen shows the whole decision record together); revisit if a future epic needs to query inside `rules`/`reasons` directly.

### Product/policy data: seeded constants in `apps/api`, lifted verbatim from `apps/web`'s config
**Decision:** add `apps/api/src/applications/policy.ts` (or similar) with the same `PRODUCTS`/`POLICY` values `apps/web/src/mock/config.ts` already hardcodes, imported by the new endpoint; `apps/web`'s own copies stay as they are (still used for client-side estimate/UX, now advisory).
**Why:** matches `real-identity-service`'s own precedent (seed data lifted verbatim from existing mock rosters, not invented) and keeps this change's scope to "make submission real," not "build tenant configuration" (an explicit non-goal, and PC/Epic-12-13's own future scope).
**Alternative considered:** a shared `packages/core` constant. Rejected: these are tenant *configuration* values (explicitly called out as such in `apps/web/src/mock/config.ts`'s own comment - "In production every value here comes from tenant configuration served by apps/api"), not domain logic; `packages/core` stays logic-only per ADR-0002, and duplicating the values once (api + web) now is cheaper than inventing a shared-config package for values that get a real home in the Configuration epic anyway.

### Decision inputs sourced from the borrower's own seeded account, not re-collected
**Decision:** fields `simulateDecision` needs but the apply form doesn't collect (age, bureau file type, years as customer, stable-income flag, sanctions/defaulted flags) are read from the authenticated borrower's seeded record (the same `BORROWERS` fixture data `real-identity-service` already migrated conceptually as account rows - this change extends that seed, or reads the still-separate `apps/web` borrower fixtures server-side, whichever the seed script already covers), keyed by the session's `sub`.
**Why:** these are exactly the fields the current client-side `submitApplication` already pulls from its local `BORROWERS` record rather than the form; moving the pipeline server-side means the server needs the same lookup, sourced from the authenticated session rather than trusted client input (a borrower cannot submit a form field claiming a different bureau file status than their own record, closing a trust gap the client-side version always had).
**Alternative considered:** collect these fields in the form. Rejected: changes the three-step form's scope and the PRD's own field list, not something this change should do incidentally.

## Risks / Trade-offs

- **[Risk]** Seeding borrower-specific decision inputs (bureau file, years, stable flag) needs a home - if the `users` table (auth) doesn't carry them, a second seed/table is needed. → **Mitigation:** add a `borrower_profiles` table (or extra nullable columns on `users` scoped to `appScope=borrower`) in this change's migration, seeded from the same `BORROWERS` fixture `apps/web` already has; keeps the "lift, don't invent" rule from `real-identity-service` intact.
- **[Trade-off]** JSONB decision storage means this phase can't efficiently query inside `rules`/`reasons` from SQL. Accepted per the "Alternative considered" above; revisit only if a future epic needs it.
- **[Risk]** Running `simulateDecision` server-side changes nothing about its output for the stories/tests `apps/web` already has (same pure function, same inputs) - but a mismatch between the server's seeded policy and the browser's local `POLICY`/`PRODUCTS` constants (if one is edited without the other) would silently produce different offers for the same inputs. → **Mitigation**: both specify the same values at this change's authoring time; the Configuration epic eventually replacing seed data with a real admin-editable source removes the duplication risk entirely.

## Migration Plan

1. Add an `applications` and `consents` table (migration) and a `borrower_profiles` table (or equivalent) seeded from `apps/web`'s existing `BORROWERS` fixture, extending the pattern `real-identity-service` started.
2. Add `apps/api/src/applications/` (module, controller, service, entities) implementing `POST /applications` per `specs/application-intake/spec.md`, reusing `packages/core`'s `simulateDecision` unchanged.
3. Add the shared `CreateApplicationRequest`/`CreateApplicationResponse` DTOs/schemas to `packages/contracts`.
4. Switch `apps/web/src/mock/actions.ts`'s `submitApplication` to call the real endpoint; keep client-side amount/consent checks as UX-only pre-checks.
5. Remove the now-unused server-side-duplicated logic from the client's local store only once the real path is verified end to end (consent/duplicate enforcement, decision computation) - the client keeps its own simulated-bank-progression code (stages after submission) untouched.
- **Rollback:** each step is independently revertible; reverting `apps/web`'s `submitApplication` to its local-store version restores prior behavior without touching `apps/api`.

### Addenda discovered during implementation

- **`PATCH /applications/:id/close`.** Not in the original plan above. Without it, the server's duplicate-open-application check would never learn that a loan the client's simulated bank progression later marks Disbursed is actually closed, permanently blocking that borrower from applying for the same product again - a real correctness gap in the exact F1 golden path this change serves. Added as a small, borrower-ownership-checked endpoint; `apps/web`'s `advanceBank` calls it (fire-and-forget, best-effort) only at the Booking→Disbursed transition, the one later stage the duplicate check cares about. Added `Application.serverId` to the client's local type to carry the real id for this one call.
- **`packages/core` needed the same single-file consolidation `real-identity-service` already applied to `packages/contracts`.** `apps/api` now imports `simulateDecision` as a *value* (not just types), and `packages/core`'s multi-file internal relative imports broke under apps/api's raw Node loader the same way `packages/contracts`' did in that change, for the same reason (plain Node never remaps a `.js` import specifier to a sibling `.ts` file). Fixed by merging `money.ts`/`loan.ts`/`decision.ts` into `index.ts`; no behavior or public export changed, only the file layout.
- **The artificial 1.2s `wait()` in `submitApplication` is gone.** It existed only to make the "Just a moment…" loading state reliably observable in tests; the real network round-trip removes the need for it (and removing it let one test's fake-timer dance, now meaningless, be simplified away).
