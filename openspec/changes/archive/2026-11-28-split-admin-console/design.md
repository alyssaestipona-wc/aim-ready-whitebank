# Design

## Context

See proposal.md - Why/What Changes for motivation and scope. Relevant
current state:

- `apps/backoffice/src/lib/access.ts` is the single source of truth for
  `AccessRole`, `NAV`, `LANDING` and the `allowed()`/`navFor()` checks,
  read by both the sidebar and `src/proxy.ts`'s server-side check. It
  already includes `"admin"` as a role and ten `/config/*` routes.
- `apps/backoffice/src/app/(console)/config/*` holds the ten configuration
  pages; `apps/backoffice/src/components/admin/bits.tsx` (`Toggle`,
  `VersionBadge`, `CheckRow`, `Track`, `StaticTable`, `TabBar`, `DraftBar`,
  `SimulatedCheckNote`, `useRun`, `CfgButton`) and `product-view.tsx`
  (the products maker-checker screen) are its app-local building blocks.
  `bits.tsx` is entirely presentational except `useRun`, which is typed
  against an app-local `ActionResult` from `@/mock`.
- `matrix/page.tsx` and `templates/page.tsx` are literally commented
  `/** Read-only in this port: ... has no edit or publish path. */` and
  render a `StaticTable` from a hardcoded array — there is no draft state,
  no per-template route, no version-bump logic to extend.
- `products/[code]/page.tsx` + `product-view.tsx` is the one screen with
  real maker-checker (`createProductDraft`/`submitProductDraft`/
  `publishProductDraft` from `@/mock`, gated by `canConfigure`) — the
  pattern to reuse for the matrix and template editors, minus the
  draft/submit/review step neither PC-4 nor PC-5 asks for.
- ADR-0002/0003/0004 is the precedent for a new app: its own Next.js app
  directory, its own `src/mock` client store (no shared mock state across
  apps), its own `proxy.ts` + unsigned session cookie, shared look only
  through `@aim-ready/ui`/`@aim-ready/core`.
- `openspec/specs/ui-kit/spec.md`'s "Document viewer" requirement already
  specs a wide dialog that previews a document by kind, including "an
  agreement page" — the style the new template live-preview reuses rather
  than inventing its own.

## Goals / Non-Goals

**Goals**
- One place (`apps/admin`) where the tenant administrator works, with its
  own sign-in, separate from `apps/backoffice`'s.
- No duplicated *logic* for the generic configuration-screen building
  blocks between `apps/backoffice` and `apps/admin` — only the per-app
  mock store and page composition are app-local, matching how `apps/web`
  and `apps/backoffice` already relate through `@aim-ready/ui`.
- Approval matrix and documents/templates become real editors wherever
  PC-4/PC-5 says they should (credit risk and the administrator), and stay
  read-only wherever compliance views them.

**Non-Goals**
- No real backend session, API, or shared data store — this stays
  mock-data-only per ADR-0003/0004. Cross-app maker-checker (credit risk
  drafts a product in `apps/backoffice`, the administrator publishes it in
  `apps/admin`) is therefore simulated independently in each app's own
  mock store, exactly as today's single-app simulation already is.
- No change to workflows, notifications or users screens' read-only
  status — only the matrix and templates screens change behavior.
- No multi-tenant admin-of-admins, no invite/claim flow (PLT-4/5 stay
  deferred), no session-policy controls (PLT-9 stays deferred).
- No language/locale work — the platform is English-only; nothing here
  introduces a second language.

## Decisions

### D1: Promote `components/admin/bits.tsx` to `packages/ui`; keep page composition app-local
`Toggle`, `VersionBadge`, `CheckRow`, `Track`, `StaticTable`, `TabBar`,
`DraftBar`, `SimulatedCheckNote` and `CfgButton` move to `packages/ui/src`
unchanged. `useRun` moves with them, generified over its result shape
(`{ ok: boolean; toast?: string; tone?: ...; error?: string }`) instead of
importing `apps/backoffice`'s `ActionResult` type, so `packages/ui` keeps
its "no app-specific code" rule. `apps/admin` imports these from
`@aim-ready/ui` instead of recreating them; `apps/backoffice` is updated
to import from the same place instead of its local `components/admin/
bits.tsx`, which is deleted.

Screen composition (`product-view.tsx`, the new matrix/template editors)
stays app-local in both apps — each is wired to that app's own `@/mock`
store and its own RBAC check, the same relationship `apps/web` and
`apps/backoffice` already have with `@aim-ready/ui`. This satisfies
`web-bootstrap`'s existing rule ("A new component SHALL be added to
`packages/ui` before being duplicated inside an app") instead of creating
the second violation of it this change would otherwise introduce.

**Alternative considered**: duplicate `bits.tsx` into `apps/admin` as-is.
Rejected — it is pure presentation already, the promotion is a few hours
of work, and `web-bootstrap`'s spec already forbids duplicating a
component needed in more than one app.

### D2: Matrix and template edits are direct edit-and-publish, not maker-checker
PC-4's and PC-5's acceptance criteria never ask for a draft/submit/review
step (unlike PC-1/products and the rule set, which explicitly do). Both
screens get a simpler pattern: an edit form (matrix: amount/grades/
exceptions per level; templates: used-for/retention/body) that saves
directly, bumps a version, and audit-logs the change — no second user
required. `canConfigure`-equivalent gating: matrix edit is available to
credit risk (in `apps/backoffice`) and the administrator (in
`apps/admin`); template edit is administrator-only in both apps (credit
risk and compliance see the same detail page read-only, matching the
Claude prototype's `isAdmin()`-gated textarea).

### D3: Template delete is blocked by in-flight reference, not maker-checker
Deleting a template checks the app's own mock case list for any
not-yet-closed case whose documents still carry that template's name; if
found, the delete is refused with a specific error. This mirrors the
Claude prototype's `tpl-delete` check and PC-5's acceptance criterion
("cannot be deleted while any active loan still references documents
generated from it") without inventing new state.

### D4: `apps/admin` is a near-full copy of `apps/backoffice`'s app shell, not a trimmed-down one
Next.js 16 App Router, Tailwind CSS 4 config, ESLint/tsconfig (standalone
copies, matching how `apps/web` and `apps/backoffice` already configure
themselves — neither actually extends `packages/base`'s configs despite
that package existing), Vitest setup, and the `proxy.ts` + `access.ts`
pattern are copied from `apps/backoffice` and adapted: `AccessRole` collapses to a
single `"admin"` role (no role-scoped nav filtering needed — the sidebar
always shows all eleven routes: the ten `/config/*` routes plus the audit
log), `SESSION_COOKIE` is renamed (e.g. `wbl_admin_session`) so the two
apps' sessions never collide even if served on the same host during local
dev, and `LANDING` is just `{ admin: "products" }`.

### D5: Cross-app sign-in refusal is a static check, not a shared user directory
`apps/backoffice`'s sign-in compares the submitted email against the one
seeded admin email (already a constant in its mock `USERS` data) and, on
a match, shows "Tenant administrators sign in at the separate admin
console." instead of the generic incorrect-credentials error — mirroring
the Claude prototype's `doSignin()` check. No shared identity service
exists yet in this phase, so this is a hardcoded comparison, not a lookup
against `apps/admin`'s user store.

### D6: Products/rule-set maker-checker splits at the app boundary, not within one app
Today's single-app demo simulates "a different person approves" by switching
the mock session from `"risk"` to `"admin"` against the same store
(`apps/backoffice/src/__tests__/admin-config.test.tsx`'s "author cannot
publish; a second person publishes" test). That stops being possible once
`"admin"` leaves `apps/backoffice`'s store entirely. Rather than inventing a
second credit-risk identity nobody asked for, `apps/backoffice` keeps only
the draft/submit half (credit risk) and shows no publish control there for
anyone, including the author; `apps/admin`'s own seed data ships with at
least one product and the rule set already in the "submitted, authored by
Rafael Cruz" state, so the administrator can demonstrate approving and
publishing without any live cross-app action. The existing
`admin-config.test.tsx` publish assertions move to `apps/admin`'s test
suite and assert against that seeded state instead of one created live via
`setSessionRole("admin")` in the same test file.

## Risks / Trade-offs

- **[Risk]** Promoting `bits.tsx` touches both apps in one change, slightly
  widening its footprint. → Mitigation: the promotion is a pure move plus
  one generic-type edit (`useRun`); no visual or behavioral change to
  either app's existing screens, and it removes a `web-bootstrap`
  violation rather than adding one.
- **[Risk]** Two independent mock stores for configuration state (one per
  app) means an admin's published change in `apps/admin` never appears in
  `apps/backoffice`'s view and vice versa, which could read as a bug in a
  demo. → Mitigation: this is the same, already-accepted trade-off
  ADR-0003 made for `apps/web`/`apps/backoffice` (no shared mock state);
  document it plainly in both apps' screens the way the prototype already
  labels simulated behavior, and revisit once `apps/api` exists.
- **[Risk]** A second Next.js app roughly doubles the config-screen
  surface area to keep in sync by hand (mock seed data, version numbers)
  until `apps/api` exists. → Mitigation: D1 already removes the
  presentational half of this duplication; the remaining app-local mock
  data is small (seed arrays), and `apps/backoffice`'s copies are already
  the source to port from, not a second design to invent.

## Migration Plan

1. Promote `packages/ui` additions (D1) first, with `apps/backoffice`
   repointed to import from `@aim-ready/ui` and its old
   `components/admin/bits.tsx` deleted — a behavior-neutral refactor,
   verified by `apps/backoffice`'s existing tests passing unchanged.
2. Build the matrix and template editors inside `apps/backoffice` first
   (credit-risk-editable matrix; admin-gated-but-always-false-there
   template editor, i.e. read-only in this app), since that app's shell,
   mock store and RBAC already exist — lowest-risk place to prove the new
   screens work before the new app exists.
3. Scaffold `apps/admin` from `apps/backoffice`'s shell (D4), wire its own
   sign-in/session/proxy (D4/D5), and port in the ten config pages, now
   importing the shared `packages/ui` bits from step 1 and reusing the
   matrix/template editors' logic with `isAdmin()` always true.
4. Remove the administrator role from `apps/backoffice` (D5's refusal
   message, `access.ts` role/nav/landing cleanup) last, once `apps/admin`
   can actually serve that role end to end — so there is no window where
   the administrator can sign into neither app.
5. Cross-link the two apps' top strips.

Rollback is per-step: each step is an independent PR per AGENTS.md's
workflow (propose → apply → review → archive), so a problem surfaced in
code review on, say, step 3 does not require unwinding steps 1–2.

## Open Questions

- Exact `NEXT_PUBLIC_ADMIN_URL` value / dev port for `apps/admin` — pick
  the next free port following whatever pattern `apps/web`/`apps/backoffice`
  already use; doesn't affect specs or task breakdown.
