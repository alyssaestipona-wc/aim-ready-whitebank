# Proposal

## Why

Per the Lending Backlog, `SS-0` (borrower sign-in), `PLT-6` (staff sign-in) and
`PLT-11` (admin sign-in) are all `must`/`mvp` stories. All three are already
built and already specced (`openspec/specs/borrower-portal`,
`staff-console`, `admin-console`). Auditing each acceptance criterion
against the actual code found the behavior correct everywhere, but two of
`apps/web`'s acceptance criteria for `SS-0` have no test asserting them,
even though `borrower-portal`'s "Borrower sign-in by email" requirement
already states them as required behavior.

## What Changes

- No behavior changes. `apps/web/src/mock/actions.ts`'s sign-in check
  (`!who || password !== DEMO_PASSWORD`) already treats an unknown email
  and a wrong password identically, and the portal's store already scopes
  every read to the signed-in borrower's own session — both acceptance
  criteria already hold in the running code.
- Add the missing test coverage in `apps/web/src/__tests__/pages.test.tsx`:
  - An unknown email (not just a wrong password for a known one) gets the
    same generic "Email or password is incorrect." error.
  - Signing in as one borrower never shows the other seeded borrower's
    application (the mock data already seeds both `juan` and `carmela`).
- `apps/backoffice` (`PLT-6`) and `apps/admin` (`PLT-11`) were also
  audited and found already adequately covered by their existing sign-in
  test suites (`sign-in.test.tsx` in each app) — no changes proposed there.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
(none — `borrower-portal`'s "Borrower sign-in by email" requirement
already states both behaviors this change adds test coverage for; no
requirement text is changing)

## Impact

- `apps/web/src/__tests__/pages.test.tsx`: two new test cases, no other
  files change. `.openspec.yaml` sets `skip_specs: true` since no
  spec-level behavior changes.
