# AGENTS.md

Spec-driven development rules for this repo. Read this before making any change.

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

## Commit and PR format

- Commits: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`), scoped to the app or package touched when useful, e.g. `feat(api): add health endpoint`.
- PR title: same Conventional Commits style as the summary of the overall change.
- PR body: use `.github/pull_request_template.md`. Link the OpenSpec change id and the ADRs it touches, if any.

## Keep this file lean

Do not grow this file into a style guide or tutorial. Project conventions that an agent can infer by reading the code (lint config, test runner, folder layout beyond what's listed above) belong in the code, not here. If you're about to add a paragraph explaining something discoverable, don't.
