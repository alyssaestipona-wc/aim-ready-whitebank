# Tasks

## 1. Borrower sign-in test coverage (`apps/web`)

- [x] 1.1 Add a test asserting an unknown email (not a wrong password for a known one) gets the same generic "Email or password is incorrect." error, per `borrower-portal`'s "Borrower sign-in by email" requirement; verify `pnpm --filter web test` passes with the new test included.
- [x] 1.2 Add a test asserting signing in as one seeded borrower (`juan`) never shows the other seeded borrower's (`carmela`) application data; verify the same test run passes and that the assertion would actually fail if the session scoping were removed (sanity-checked by reading the store code, not by breaking it). Used each borrower's distinct account number (`••4471` vs `••2083`) on Home as the observable assertion, with an explicit `unmount()` between the two renders in one test to avoid a stale-DOM false pass (the same pitfall debugged earlier in `split-admin-console`'s `TemplateView` tests).

## 2. Confirm no regression

- [x] 2.1 Run `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint` and confirm all green, with zero other files changed. 50/50 tests pass (48 existing + 2 new), typecheck clean, lint clean. Only `apps/web/src/__tests__/pages.test.tsx` changed.

## Workflow follow-up

- Run `/spec-review` (expected to report "no findings" since no spec changed).
- Run `/code-review` on the diff, repeat until clean.
- Archive the change with the `openspec-archive-change` skill.
- Push the branch and open a PR using `.github/pull_request_template.md`; a human merges.
