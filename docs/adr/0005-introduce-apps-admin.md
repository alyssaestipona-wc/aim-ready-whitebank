# 5. Introduce `apps/admin`, split out of `apps/backoffice`

## Status
Accepted.

## Context
ADR-0004 kept the tenant-administrator role inside `apps/backoffice` and
required a new ADR before introducing a real third web app: "A future ADR
is required to introduce a third web app (e.g. a real `apps/admin` split
out of `apps/backoffice`) rather than quietly adding one." The updated
Claude Artifact prototype (`9gFCpnnzVyHzf7xBBiSzDn`) has since moved the
administrator into its own app, with its own sign-in, and made the
approval matrix and documents/templates screens genuinely editable for
the first time (OpenSpec change `split-admin-console`).

## Decision
- **`apps/admin` is a new Next.js app**, sibling to `apps/web` and
  `apps/backoffice`, built the same way: Next.js 16 App Router, Tailwind
  CSS 4, shadcn/ui via `@aim-ready/ui`, Vitest, standalone `tsconfig`/
  `eslint` config matching the other two apps' own (neither extends
  `packages/base`'s configs). Mock-data-only, per ADR-0003/0004 — no
  shared mock state with either other app.
- **It owns every configuration screen**: products, workflows, approval
  matrix, documents and templates, notifications, decisioning, AI models,
  integrations, users, tenant settings, and the audit log — the full set
  previously under `apps/backoffice`'s `(console)/config/*` plus its
  audit log view, for the administrator's full access.
- **It has its own sign-in and session**, a single seeded administrator
  account, a session cookie distinct from `apps/backoffice`'s, and its
  own server-side route check (`proxy.ts`), following the same
  placeholder-session pattern `apps/backoffice` already uses.
- **The administrator role leaves `apps/backoffice` entirely.** Credit
  risk keeps editing products, the approval matrix, the rule set and AI
  models there; compliance keeps its existing read-only view of every
  configuration screen there. The seeded administrator email is refused
  at `apps/backoffice`'s sign-in with a message pointing at the admin
  console.
- **Shared presentational code is promoted, not duplicated.**
  `apps/backoffice/src/components/admin/bits.tsx`'s generic pieces
  (`Toggle`, `VersionBadge`, `CheckRow`, `Track`, `StaticTable`, `TabBar`,
  `DraftBar`, `SimulatedCheckNote`, `CfgButton`, `useRun`) move to
  `packages/ui`, consumed by both `apps/backoffice` and `apps/admin`, per
  `web-bootstrap`'s existing "add to `packages/ui` before duplicating"
  rule. Screen composition (which mock store a page reads, its own
  RBAC check) stays app-local in both apps, matching how `apps/web` and
  `apps/backoffice` already relate to `@aim-ready/ui`.
- **Cross-app maker-checker is independently simulated.** Neither app
  shares a mock store, so a product or rule-set draft credit risk submits
  in `apps/backoffice` cannot be live-published from `apps/admin` in the
  same session. `apps/backoffice` shows no publish control for a
  submitted draft, for anyone — a note states the administrator publishes
  it in the admin console. `apps/admin`'s own seed data ships with a
  product and the rule set already in that submitted state, so the
  administrator can demonstrate publishing without a cross-app action.
  This is the same trade-off ADR-0003 already accepted for
  `apps/web`/`apps/backoffice` (an application submitted in one app does
  not appear in the other), applied to one more pair of apps.
- **The approval matrix and documents/templates screens become
  editable** for the first time (previously read-only mockups in
  `apps/backoffice`): direct edit-and-publish, no maker-checker — PC-4
  and PC-5's acceptance criteria never asked for a second sign-off here,
  unlike products or the rule set. Matrix editing is available to credit
  risk (`apps/backoffice`) and the administrator (`apps/admin`); template
  editing is administrator-only, with a read-only version of the same
  detail page in `apps/backoffice` for credit risk and compliance.

## Consequences
- Three web apps now exist: `apps/web` (borrower), `apps/backoffice`
  (staff), `apps/admin` (tenant administrator). No fourth is anticipated
  without a further ADR, per ADR-0004's own precedent.
- `apps/backoffice`'s existing tests that simulated the product/rule-set
  publish step by switching to an `"admin"` session move to `apps/admin`,
  asserting against that app's own seeded in-review draft instead.
- `packages/ui` gains configuration-screen primitives it did not
  previously need to hold; `packages/ui` still has no app-specific code —
  only `useRun`'s result type changes, from an app-local `ActionResult` to
  a generic shape.
- Full detail: see OpenSpec change `split-admin-console` (proposal,
  design, spec deltas, tasks).
