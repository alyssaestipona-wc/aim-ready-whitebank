---
name: spec-review
description: Validate an implementation against its OpenSpec spec deltas. Use after applying an OpenSpec change, before manual testing or code review.
---

# Spec Review

Checks that what was built matches what was specified — not code quality, not style. That's `code-review`'s job.

## Inputs

- The change under review: `openspec/changes/<change-id>/` (proposal, design, spec deltas, tasks).
- The affected main specs: `openspec/specs/<capability>/spec.md`.
- The diff of the implementation.

## Procedure

1. Read the change's spec deltas and the current main specs for every capability it touches.
2. For each **Requirement**, find where the implementation satisfies it. If you can't find it, that's a finding.
3. For each **Scenario**, trace it through the actual code path (don't just pattern-match function names). Confirm the GIVEN/WHEN/THEN holds.
4. Check task completion against `tasks.md` in the change — every task marked done should have corresponding code; every undone task should have no silently-shipped behavior.
5. Check for scope drift: implementation that does something the spec doesn't describe. Flag it — either the spec is incomplete or the code overreached.
6. Check `packages/contracts` changes have a matching spec update if they alter the API surface between `apps/api` and `apps/web`.

## Output

One finding per line: `<requirement or scenario> — <what's missing or wrong> — <file:line if known>`.

If everything matches, say so plainly: no findings, ready for manual test.

Repeat this skill after fixes until it reports zero findings, per the loop in `AGENTS.md`.
