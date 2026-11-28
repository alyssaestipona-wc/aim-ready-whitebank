# Design

## Context

Three app folders exist today: `apps/web` (an unused stock Next.js
bootstrap stub, package name `web`), `apps/borrower-web` (package name
`borrower-web`), and `apps/staff-web` (package name `staff-web`). See
proposal.md - Why for how this split happened (ADR-0002 planned
`web`/`admin`/`backoffice`; ADR-0003 built `borrower-web`/`staff-web`
instead).

`pnpm-workspace.yaml` uses the glob `apps/*`, and `turbo.json` /
`.github/workflows/ci.yml` contain no app-specific names — none of these
need edits for the rename itself. The two real apps cross-link each other
by URL at runtime:

- `apps/borrower-web/src/lib/env.ts` exports `STAFF_WEB_URL` (from
  `NEXT_PUBLIC_STAFF_WEB_URL`, default `http://localhost:3001`), used in
  `apps/borrower-web/src/components/shell.tsx` for the "Staff console" link.
- `apps/staff-web/src/lib/env.ts` exports `BORROWER_WEB_URL` (from
  `NEXT_PUBLIC_BORROWER_WEB_URL`, default `http://localhost:3002`), used in
  `apps/staff-web/src/components/staff-strip.tsx` for the "Borrower web app"
  link.

Both apps' READMEs document these env vars and reference the old folder
names directly (`staff-web`, `borrower-web`) in prose and `pnpm --filter`
commands.

## Goals / Non-Goals

**Goals:**
- End state: `apps/web` (borrower app) and `apps/backoffice` (staff app)
  only. No `apps/borrower-web`, `apps/staff-web`, or stub `apps/web`
  remain.
- Every reference to the old folder/package names in config, docs, and
  source is updated in this same change, so nothing silently points at a
  deleted path.
- `git mv` used for both renames so file history is preserved.

**Non-Goals:**
- No change to dev ports (3001 stays staff/backoffice, 3002 stays
  borrower/web), cookie names (`wbl_staff_session`, `wbl_borrower_session`),
  or any screen, route, or RBAC behavior.
- No change to `apps/api` or `packages/*`.
- Not re-litigating ADR-0003's decision to keep the two apps separate with
  independent mock stores — only the names change.

## Decisions

**Delete-then-rename order.** Delete `apps/web` first (it's dead code, zero
risk), then `git mv apps/borrower-web apps/web`, then
`git mv apps/staff-web apps/backoffice`. Doing the delete first avoids a
transient collision where two directories would both want the path
`apps/web`.

**Rename the cross-link env var identifiers, not just the folder.**
`STAFF_WEB_URL` → `BACKOFFICE_URL` (env var `NEXT_PUBLIC_STAFF_WEB_URL` →
`NEXT_PUBLIC_BACKOFFICE_URL`), `BORROWER_WEB_URL` → `WEB_URL` (env var
`NEXT_PUBLIC_BORROWER_WEB_URL` → `NEXT_PUBLIC_WEB_URL`). Alternative
considered: leave the identifiers alone since they're internal names that
still function correctly post-rename. Rejected — the proposal commits to
updating "every reference to the old paths/names," and leaving a constant
named `STAFF_WEB_URL` pointing at `apps/backoffice` is exactly the kind of
stale naming this change exists to clean up. UI link text ("Staff console",
"Borrower web app") already describes the app generically and needs no
change.

**ADR-0003 is edited only to add a superseded notice, not rewritten.**
Standard ADR practice: historical decisions stay as a record of what was
decided and why at the time. ADR-0004 (new) records the rename and
supersedes ADR-0002's original `web`/`admin`/`backoffice` plan and
ADR-0003's `borrower-web`/`staff-web` naming. ADR-0003's own `## Status`
line gets a one-line "Superseded by ADR-0004" addition; its Context/
Decision/Consequences body is untouched so the historical reasoning stays
intact.

**`openspec/changes/archive/2026-11-28-port-lending-prototype/` is not
touched.** It's an archived record of a completed change and references
the names that were correct in prose when it was written. Archived changes
are immutable history, not live documentation.

**`pnpm-lock.yaml` is regenerated, not hand-edited.** Running
`pnpm install` after the `package.json` name changes updates the lockfile
automatically.

## Risks / Trade-offs

- [Risk] A reference to the old names is missed somewhere outside the
  patterns already searched (`borrower-web`, `staff-web`, `STAFF_WEB_URL`,
  `BORROWER_WEB_URL`) → Mitigation: tasks.md includes a final repo-wide
  grep for both old names (excluding `node_modules`, `.next`, `.turbo`,
  `pnpm-lock.yaml`, and `openspec/changes/archive/`) as a verification
  step before the change is considered done.
- [Risk] `git mv` on a directory with build artifacts (`.next`, `.turbo`,
  `node_modules`, `tsconfig.tsbuildinfo`) inside it could behave
  unexpectedly or bloat the diff → Mitigation: those paths are
  already gitignored inside each app dir (confirmed via each app's
  `.gitignore`), so they're not tracked and `git mv` only moves tracked
  files; re-run `pnpm install` and let each app rebuild `.next` under its
  new path afterward.
- [Risk] Any teammate's local branch still has `apps/borrower-web` /
  `apps/staff-web` paths → Mitigation: call this out in the PR description
  as a breaking structural change requiring a fresh `pnpm install` and
  path update for in-flight branches.

## Migration Plan

1. Apply this change on a dedicated branch (already `feat/port-lending-prototype`
   per current session, or a new branch — human's call at PR time).
2. `rm -rf apps/web` (the stub), then `git mv apps/borrower-web apps/web`,
   then `git mv apps/staff-web apps/backoffice`.
3. Update `package.json` "name" in the two renamed apps.
4. Rename the env var identifiers and their defaults in `src/lib/env.ts`
   (`NEXT_PUBLIC_*`; neither app has a committed `.env` file — both fall
   back to hardcoded localhost defaults) and the importing components.
5. Update both apps' `README.md` (title, `pnpm --filter` commands, env var
   table, "Disconnected from ..." cross-references).
6. Update `AGENTS.md`'s "Where things live" section and
   `openspec/config.yaml`'s context stack line.
7. Add `docs/adr/0004-rename-apps-to-web-and-backoffice.md`; add a
   superseded notice to ADR-0002 and ADR-0003's Status lines.
8. `pnpm install` to regenerate `pnpm-lock.yaml` and rebuild workspace
   symlinks.
9. Run the repo-wide grep check, then `pnpm turbo run lint build test` to
   confirm nothing references a dead path.

No rollback beyond `git revert` — this is a structural rename with no data
migration, so reverting the commit(s) fully undoes it.

## Open Questions

(none — all decisions above are resolved for this change)
