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
- `apps/web` — Next.js 16 frontend (React 19, Tailwind CSS 4, shadcn/ui, Vitest).
- `packages/core` — shared domain logic. No app-specific code.
- `packages/contracts` — shared types/DTOs/schemas used across `apps/api` and `apps/web`. Change these only when the API contract is actually changing.
- `packages/base` — shared `tsconfig`/`eslint` config. Apps and packages extend this, they don't redefine it.
- `packages/ui` — shared React/shadcn components. Build here once, use in every app.
- `openspec/specs/<capability>/spec.md` — current, flat specs. One file per capability, requirements plus scenarios.
- `openspec/changes/` — in-flight proposals; `openspec/changes/archive/` — completed ones.
- `docs/adr/` — binding architectural decisions, numbered.

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

## Commit and PR format

- Commits: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`), scoped to the app or package touched when useful, e.g. `feat(api): add health endpoint`.
- PR title: same Conventional Commits style as the summary of the overall change.
- PR body: use `.github/pull_request_template.md`. Link the OpenSpec change id and the ADRs it touches, if any.

## Keep this file lean

Do not grow this file into a style guide or tutorial. Project conventions that an agent can infer by reading the code (lint config, test runner, folder layout beyond what's listed above) belong in the code, not here. If you're about to add a paragraph explaining something discoverable, don't.
