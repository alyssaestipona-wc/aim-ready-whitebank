# Tasks

## 1. Remove the stub and move the apps

- [x] 1.1 Delete `apps/web` (the stock bootstrap stub) and verify `apps/web` no longer exists: `test ! -d apps/web`
- [x] 1.2 `git mv apps/borrower-web apps/web` and verify git recognizes it as a rename: `git status` shows `renamed:` entries, not separate add/delete
- [x] 1.3 `git mv apps/staff-web apps/backoffice` and verify the same: `git status` shows `renamed:` entries for staff-web → backoffice

## 2. Update package identity

- [x] 2.1 In `apps/web/package.json` (the former borrower-web), change `"name"` from `"borrower-web"` to `"web"` and verify: `grep '"name": "web"' apps/web/package.json`
- [x] 2.2 In `apps/backoffice/package.json` (the former staff-web), change `"name"` from `"staff-web"` to `"backoffice"` and verify: `grep '"name": "backoffice"' apps/backoffice/package.json`

## 3. Rename the cross-app env vars and links

- [x] 3.1 In `apps/web/src/lib/env.ts` (former borrower-web), rename the exported constant `STAFF_WEB_URL` → `BACKOFFICE_URL` and its source env var `NEXT_PUBLIC_STAFF_WEB_URL` → `NEXT_PUBLIC_BACKOFFICE_URL`; update the importing `apps/web/src/components/shell.tsx` accordingly; verify with `grep -rn "STAFF_WEB_URL" apps/web/src` returning no matches and `pnpm --filter web lint` passing
- [x] 3.2 In `apps/backoffice/src/lib/env.ts` (former staff-web), rename the exported constant `BORROWER_WEB_URL` → `WEB_URL` and its source env var `NEXT_PUBLIC_BORROWER_WEB_URL` → `NEXT_PUBLIC_WEB_URL`; update the importing `apps/backoffice/src/components/staff-strip.tsx` accordingly; verify with `grep -rn "BORROWER_WEB_URL" apps/backoffice/src` returning no matches and `pnpm --filter backoffice lint` passing

## 4. Update app documentation

- [x] 4.1 Update `apps/web/README.md` (former borrower-web): title, `pnpm --filter borrower-web` → `pnpm --filter web`, env var table row (`NEXT_PUBLIC_STAFF_WEB_URL` → `NEXT_PUBLIC_BACKOFFICE_URL`), and the "Disconnected from staff-web" note → "Disconnected from backoffice"; verify: `grep -n "borrower-web\|staff-web" apps/web/README.md` returns nothing
- [x] 4.2 Update `apps/backoffice/README.md` (former staff-web): title, `pnpm --filter staff-web` → `pnpm --filter backoffice`, env var table row (`NEXT_PUBLIC_BORROWER_WEB_URL` → `NEXT_PUBLIC_WEB_URL`), and the "Disconnected from borrower-web" note → "Disconnected from web"; verify: `grep -n "borrower-web\|staff-web" apps/backoffice/README.md` returns nothing

## 5. Update root-level docs and config

- [x] 5.1 Update `AGENTS.md`'s "Where things live" section: replace the `apps/web` (Next.js 16 frontend) line to describe it as the borrower app, and add a line for `apps/backoffice` as the staff app; verify by re-reading the file
- [x] 5.2 Update `openspec/config.yaml`'s context stack line (`Stack: Next.js 16 ... (apps/web)`) to also name `apps/backoffice`; verify with `./node_modules/.bin/openspec validate` passing
- [x] 5.3 Add `docs/adr/0004-rename-apps-to-web-and-backoffice.md` recording this decision, its context (ADR-0002's original plan, ADR-0003's interim names), and consequences; verify the file exists and follows the existing ADR format in `docs/adr/0001-record-architecture-decisions.md`
- [x] 5.4 Add a one-line "Superseded by ADR-0004" notice to the `## Status` line of `docs/adr/0002-monorepo-layout.md` and `docs/adr/0003-separate-staff-and-borrower-web-apps.md`, leaving the rest of each file unchanged; verify with `git diff` showing only that line changed in each file
- [x] 5.5 Update the commit-scope tables/examples in `.claude/skills/git-commit/SKILL.md` (scope table rows `borrower-web`→removed, `staff-web`→removed, add `backoffice` row for `apps/backoffice`, keep `web` row pointing at `apps/backoffice`'s neighbor `apps/web`; fix the `apps/staff-web` path and `fix(staff-web): ...` / `fix(staff-web,borrower-web): ...` examples) and `.claude/skills/ci-review-loop/SKILL.md` (the `(api, borrower-web, staff-web, web, ui, core, contracts)` scope list → `(api, web, backoffice, ui, core, contracts)`); verify with `grep -rn "borrower-web\|staff-web" .claude/skills/` returning no matches

## 6. Sync specs

- [x] 6.1 Apply the `web-bootstrap` spec delta from this change (`specs/web-bootstrap/spec.md`) to the main spec at `openspec/specs/web-bootstrap/spec.md` during archive; until then, this task tracks that the delta file is ready — verify with `./node_modules/.bin/openspec validate --change rename-apps-web-backoffice --strict` passing

## 7. Final verification

- [x] 7.1 Repo-wide check for missed references, including dotfiles under `.claude/`: `grep -rln "borrower-web\|staff-web" --include="*.md" --include="*.json" --include="*.ts" --include="*.tsx" --include="*.yaml" --include="*.yml" . 2>/dev/null | grep -v node_modules | grep -v pnpm-lock.yaml | grep -v "openspec/changes/archive"` — only hits are `docs/adr/0003-...md`, `docs/adr/0004-...md`, and this change's own `proposal.md`/`design.md`/`tasks.md`, which intentionally document the rename and its history; no live code or config references remain
- [x] 7.2 `pnpm install` to regenerate `pnpm-lock.yaml` and verify it completes without error
- [x] 7.3 `pnpm turbo run lint build test` and verify all three pass for `apps/web`, `apps/backoffice`, and every `packages/*` consumer

## Workflow follow-up

- Run `/spec-review` against this change's `web-bootstrap` delta before archiving.
- Run `/code-review` on the full diff (fresh session, per AGENTS.md) before archiving.
- Manually walk the borrower sign-in flow (`apps/web`) and staff sign-in flow (`apps/backoffice`) end to end to confirm both still run after the rename.
- Archive the change (`/opsx:archive`), which syncs the `web-bootstrap` spec delta into `openspec/specs/web-bootstrap/spec.md`.
- Open a PR using `.github/pull_request_template.md`, calling out the breaking package-name/path change for any in-flight branch.
