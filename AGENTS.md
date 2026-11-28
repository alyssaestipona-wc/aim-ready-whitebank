# AGENTS.md

Spec-driven development rules for this repo. Read this before making any change.

## Product

Building **WhiteBank Lending**: a white-label loan origination, decisioning,
and collections platform in front of WhiteBank's core banking system. Phase 1
covers personal, salary, and home loans in the Philippines. Full PRD:
https://claude.ai/artifact/TVUan7fBfNSkv6sy8UdX8q

Full product context (roles, decision pipeline, adapter rules, data model
constraints) lives in `openspec/config.yaml` under `context:` — every
proposal is checked against it. The three guiding principles that govern
every change:

- **Configurability is the product** — credit policy, decision bands,
  workflows, approval matrix, documents live in tenant config, never code.
- **Clear line with core** — lending owns the application and decision; core
  owns the booked loan account. Balances/schedules are always read live from
  core, never duplicated.
- **Compliance built in** — consent, audit trail, maker-checker, and model
  governance ship as standard features of every relevant capability, not
  follow-up work.

## Workflow (non-negotiable)

Every change follows this loop, in order:

1. **Explore** — `/opsx:explore` (or the `openspec-explore` skill). Clarify the problem before proposing anything.
2. **Propose** — `/opsx:propose` (or the `openspec-propose` skill). Produces design, spec deltas, and tasks under `openspec/changes/<change-id>/`.
3. **Verify** — run the `proposal-verifier` agent (`.claude/agents/proposal-verifier.md`) against the proposal before writing code.
4. **Apply** — `/opsx:apply` (or the `openspec-apply-change` skill). Implement tasks one at a time.
5. **Spec review** — `/spec-review`. Repeat until clean.
6. **Manual test** — walk every Scenario in the touched specs by hand.
7. **Code review** — `/code-review`. Repeat until clean.
8. **Archive** — `/opsx:archive` (or the `openspec-archive-change` skill). Syncs specs and moves the change to `openspec/changes/archive/`.
9. **PR** — push the branch and open a pull request using `.github/pull_request_template.md`. A human merges; agents do not self-merge.

Do not skip steps. Do not start writing implementation code before a proposal has been verified.

## Where things live

- `apps/api` — NestJS 11 backend (Node 22, TypeORM 0.3, PostgreSQL 15+, Jest).
- `apps/web` — Next.js 16 borrower app (React 19, Tailwind CSS 4, shadcn/ui, Vitest). Mock-data-only prototype per ADR-0003/ADR-0004.
- `apps/backoffice` — Next.js 16 staff console (same stack as `apps/web`). Mock-data-only prototype per ADR-0003/ADR-0004.
- `packages/core` — shared domain logic. No app-specific code.
- `packages/contracts` — shared types/DTOs/schemas used across `apps/api` and `apps/web`. Change these only when the API contract is actually changing.
- `packages/base` — shared `tsconfig`/`eslint` config. Apps and packages extend this, they don't redefine it.
- `packages/ui` — shared React/shadcn components. Build here once, use in every app.
- `openspec/specs/<capability>/spec.md` — current, flat specs. One file per capability, requirements plus scenarios.
- `openspec/changes/` — in-flight proposals; `openspec/changes/archive/` — completed ones.
- `docs/adr/` — binding architectural decisions, numbered.

## TypeScript

- `strict: true` is non-negotiable, enforced via `packages/base/tsconfig.base.json`. Don't disable it per-file.
- No `any` outside generated code (migrations, OpenAPI clients) — use `unknown` and narrow.
- Prefer `type` aliases; use `interface` only for class contracts.
- All inputs at system boundaries are validated: HTTP bodies/queries with `class-validator` DTOs in `apps/api`, forms and query params with `zod` in `apps/web`. A raw, untyped request body never reaches a service method.
- Shapes crossing the `apps/api` ↔ `apps/web` boundary live in `packages/contracts`. `apps/web` imports them `import type` only — a value import drags backend runtime code into the frontend bundle.

## Backend conventions (apps/api)

- One NestJS module per capability from the PRD's 12 core capabilities (application intake, work management, case review, decisioning, AI scoring, documents, collateral, booking/disbursement, collections, analytics, notifications, configuration). Don't merge unrelated capabilities into one module.
- Controllers stay thin: request/response shape, status codes, DTO binding. Business logic — including policy rules and decision-band evaluation — lives in services, called only from `app`-layer controllers (never the reverse).
- Guards enforce RBAC for the 9 roles; default-deny. A route with no explicit role/permission check is a bug.
- Idempotency keys are required on booking, disbursement, and any decision- or payment-producing POST endpoint. A duplicate request returns the original result or `409`, never a second side effect.
- Throw `HttpException` subclasses. A centralized exception filter formats responses and never leaks stack traces or internal error detail to the client.

## Data (TypeORM + PostgreSQL)

- Never edit a migration that's already run outside a local dev database — write a new migration.
- Table and column names are `snake_case`; map explicitly (`@Column({ name: "..." })`) rather than relying on default casing.
- Money is a `numeric`/`decimal` column or integer minor units — never `float`/`double`.
- Wrap any service method that performs more than one write in a transaction (`dataSource.transaction(...)`). Example: updating a decision record and writing its audit event must both succeed or both fail.
- Index every foreign key and every column used in a `WHERE`/`ORDER BY` on a hot path (work queues, portfolio reporting).
- No raw SQL in business logic — query builder or repository methods only. A raw query is reserved for read-only reporting and needs review.

## Frontend conventions (apps/web)

- App Router route groups mirror role-scoped areas (e.g. `(loan-ops)`, `(credit-risk)`). RBAC is enforced server-side (middleware/session check) — a hidden nav item is not access control.
- Forms: `react-hook-form` + `zod`; the zod schema matches the corresponding type in `packages/contracts`.
- Reusable UI goes in `packages/ui`; app-local composition stays in `apps/web/src`.
- Style values come from the Tailwind theme (`tailwind.config`/CSS variables) — no inline hex codes.

## Non-negotiables

- Specs are written before code. If a change has no proposal, it does not get implemented.
- `packages/*` never imports from `apps/*`. Dependency direction is one-way.
- Shared UI goes in `packages/ui`; do not fork components per app.
- API contract changes (anything in `packages/contracts`) require a spec update in the same change.
- Code review happens in a fresh session, not the session that wrote the code.
- Agents do not merge PRs or force-push. A human merges.
- Decisions recorded in `docs/adr/` are binding until superseded by a new ADR; don't quietly work around them.

## Engineering standards

- **Enforce rules on the backend.** Validate business rules, permissions, and authority limits (approval limits, maker-checker, role scope) in `apps/api`. Frontend validation is UX only, never the authority.
- **Handle money precisely.** Represent monetary values as integer minor units (centavos) or an exact decimal type — never floating point. Document interest and rounding formulas wherever they're implemented.
- **Make decisions reproducible.** Every decision record stores its inputs, rule version, and model version, per `openspec/config.yaml`'s reproducibility rule. 100% of decisions must be explainable after the fact.
- **Maintain data consistency.** Application state, decision records, loan accounts, repayment schedules, and disbursement records must agree. Core is the system of record for accounts/balances/schedules (see Product principle P2) — don't let a local copy drift from it.
- **Prevent duplicate transactions.** Handle retried/duplicate requests safely (idempotency keys or equivalent). Document any concurrency limitations plainly rather than leaving them implicit.
- **Make outcomes clear.** Approval, referral, decline, and pending states must be unambiguous in the UI and API. Confirm consequential actions (disbursement, override, write-off) before executing them. Error messages must say what went wrong, not just that something did.
- **Test expected and invalid behavior.** Every capability needs automated tests for the happy path, invalid input, and unauthorized access — not just the happy path.
- **Be transparent about simulated services.** Any feature backed by a simulated adapter, a shortcut, or an incomplete implementation says so plainly (in the spec, the code, or both) — never silently.
- **Isolate simulated services.** Each simulated external service (bureau, eKYC, AML, fraud, e-signature, OCR, SMS/email, income, appraisal, collateral, collections) sits behind its own interface in the adapter/integration hub, so swapping in a real provider later needs no change to workflow or decision logic. Each simulated adapter must support triggering a failure mode (timeout, outage) so the fallback-to-human path can be tested.

## Security

- TLS 1.2+ end-to-end; no plaintext HTTP, including internal calls.
- Secrets only via the platform secrets manager/vault. Never commit `.env` with real values; document every variable a new environment needs with a safe local default, or note it as required with no default.
- RBAC is default-deny: every endpoint declares its required role/permission explicitly.
- Maker-checker (a second user's sign-off) is enforced server-side on approvals, overrides, bookings, disbursements, and configuration publishes — never only in the UI.
- Input validation whitelists known fields and rejects unknown ones at the DTO boundary.
- No string-built SQL. No `dangerouslySetInnerHTML` without sanitization and review.
- Errors returned to clients are generic; stack traces and internal detail stay in server-side structured logs.

## Logging & observability

- Structured logs only; no `console.log` in committed app code.
- Every log line includes `tenantId`, `requestId`, and `userId` (not PII) where applicable.
- No PII in logs — redact names, contact details, government IDs.
- Every write that changes application, decision, booking, or configuration state is audit-logged — this is the 100% audit-trail requirement in `openspec/config.yaml`, not an optional per-feature add-on.

## Resilience

- Every adapter in the integration hub sits behind a circuit breaker (defaults: 5 failures / 30s → open for 60s) and can simulate a failure (timeout, outage) for testing the fallback path.
- An adapter outage degrades to human referral, never to auto-decline or a silent retry loop.
- Notification sends (SMS/email/push) go through an async/queued path, not inline in the request that triggers them.

## Testing

- Every capability change lands with a happy-path test, an invalid-input test, and an unauthorized-access test — not just the happy path.
- `apps/api` integration tests that touch TypeORM run against a real PostgreSQL instance, not a mocked repository — mocking the DB at that layer hides the bugs it exists to catch. Pure logic (decision-band math, formatters) may unit-test with mocks.
- The 8 PRD Phase 1 user flows (F1–F8) are the end-to-end golden paths. As each becomes functional, it gets a corresponding end-to-end test — this is part of "done," not a follow-up.
- External services (bureau, eKYC, AML, etc.) are mocked at the HTTP boundary via their simulated adapter, never by stubbing the service class that calls them.

## What an agent should not do without asking

- Add a new dependency without justifying it in the proposal or PR description.
- Change a migration that's already run outside a local dev database.
- Change RBAC roles, approval limits, or any security default.
- Disable a test, lint rule, or CI gate.
- Modify `AGENTS.md` itself without raising it as its own change first.
- Commit or push directly to `main` — branch protection blocks it; don't look for a workaround either.

## Commit and PR format

- Commits: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`), scoped to the app or package touched when useful, e.g. `feat(api): add health endpoint`.
- PR title: same Conventional Commits style as the summary of the overall change.
- PR body: use `.github/pull_request_template.md`. Link the OpenSpec change id and the ADRs it touches, if any.

## Keep this file lean

Do not grow this file into a style guide or tutorial. Project conventions that an agent can infer by reading the code (lint config, test runner, folder layout beyond what's listed above) belong in the code, not here. If you're about to add a paragraph explaining something discoverable, don't.
