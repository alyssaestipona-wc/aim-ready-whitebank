---
name: code-review
description: Review a diff for conventions, architecture, and security issues. Use after spec review passes, before archiving an OpenSpec change. Run in a fresh session, not the one that wrote the code.
---

# Code Review

Checks code quality and safety — not whether it matches the spec. That's `spec-review`'s job. Run this in a **fresh session** so the review is independent of whatever reasoning produced the code.

## Checks

### Conventions
- Follows `AGENTS.md` non-negotiables: no `packages/*` importing from `apps/*`, shared UI in `packages/ui`, shared config extends `packages/base`.
- Conventional Commits used for the commit history on this branch.
- Naming, file placement consistent with the rest of the touched app/package.

### Architecture
- Changes to `packages/contracts` are intentional API-surface changes, not incidental.
- No duplicated logic that belongs in `packages/core` or `packages/ui`.
- Dependency direction stays one-way: `apps` depend on `packages`, never the reverse.
- New ADR-worthy decisions (framework choice, data model change, cross-cutting pattern) are actually recorded in `docs/adr/`, not left implicit in the diff.

### Security
- No secrets, tokens, or credentials committed.
- Input from HTTP requests (apps/api) is validated before use (DTO/class-validator or zod via `packages/contracts`).
- No raw SQL string interpolation; TypeORM query builder or parameterized queries only.
- Auth/authorization checks aren't weakened or bypassed by the change.

### Tests
- `apps/api` changes have Jest coverage for new branches.
- `apps/web` changes have Vitest coverage for new logic/components where behavior isn't purely visual.

## Output

One finding per line: `path:line — severity — problem — fix`. No praise, no scope creep into style nits that don't change behavior or readability.

If clean, say so plainly. Repeat until this skill reports zero findings, per the loop in `AGENTS.md`.
