# 4. Rename apps to `web` and `backoffice`

## Status
Accepted. Supersedes ADR-0002's `apps/web`/`apps/admin`/`apps/backoffice`
plan and ADR-0003's `apps/borrower-web`/`apps/staff-web` naming.

## Context
ADR-0002 planned three web apps: `apps/web`, `apps/admin`, `apps/backoffice`.
ADR-0003 built the borrower and staff channels instead as `apps/borrower-web`
and `apps/staff-web`, and left a stock, unused Next.js bootstrap stub in
place at `apps/web` ("for now" — ADR-0003's "Known deviation: `apps/web`
theme" consequence). `apps/admin` was never built; the tenant administrator
role lives inside the staff app. The result was three app folders for two
real apps, with the two real ones carrying non-obvious names
(`borrower-web`, `staff-web`) instead of the two the kit always intended
(`web`, `backoffice`).

## Decision
- Delete the unused `apps/web` stub.
- Rename `apps/borrower-web` → `apps/web`. This is the borrower-facing app.
- Rename `apps/staff-web` → `apps/backoffice`. This is the staff console
  app, including the tenant administrator screens it already contains.
  There is no separate `apps/admin`.
- This is a structural rename only: no change to routes, RBAC, screens,
  ports, cookie names, or the mock-data-only nature of both apps (ADR-0003
  still governs that).

## Consequences
- `apps/web` and `apps/backoffice` are the only two web apps. ADR-0002's
  and ADR-0003's folder names are historical; their surrounding reasoning
  (dependency direction, shared packages, separate mock stores, placeholder
  sessions) still holds.
- Package names, cross-app env vars (`NEXT_PUBLIC_BACKOFFICE_URL`,
  `NEXT_PUBLIC_WEB_URL`), docs, and tooling scope tables are updated in the
  same change (OpenSpec change `rename-apps-web-backoffice`) to avoid a
  stale reference pointing at a deleted path.
- A future ADR is required to introduce a third web app (e.g. a real
  `apps/admin` split out of `apps/backoffice`) rather than quietly adding
  one.
