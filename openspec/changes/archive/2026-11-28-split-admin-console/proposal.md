# Proposal

## Why

ADR-0004 left the tenant-administrator role inside `apps/backoffice`
("There is no separate `apps/admin`") but required a new ADR before ever
introducing a third web app that way. The updated Claude prototype
(artifact `9gFCpnnzVyHzf7xBBiSzDn`) has since done exactly that: the admin
role signs into its own separate app, with its own sign-in, and two of its
configuration screens — the approval matrix and documents/templates — have
gone from read-only mockups to screens the administrator can actually edit
and publish. The repo needs to catch up to that design so `apps/backoffice`
stops being the one app three different audiences (staff, borrower,
admin) partly share.

## What Changes

- **New app, `apps/admin`.** A Next.js 16 app, sibling to `apps/web` and
  `apps/backoffice`, built the same way (App Router, Tailwind CSS 4,
  shadcn/ui via `@aim-ready/ui`, Vitest, mock-data-only per ADR-0003/0004).
  It has its own sign-in (single seeded tenant-administrator account), its
  own unsigned mock session cookie distinct from `apps/backoffice`'s, and
  its own server-side route check (`proxy.ts`), following the same
  placeholder-session pattern `apps/backoffice` already uses.
- **The administrator role leaves `apps/backoffice`.** `AccessRole`,
  `NAV` role arrays, and `LANDING` drop `"admin"`. The sign-in page refuses
  the seeded admin email with a specific message pointing at the admin
  console instead of the generic "incorrect" error. Credit risk keeps
  editing products, the approval matrix, the rule set and AI models from
  `apps/backoffice`; compliance keeps its existing read-only view of every
  configuration screen there. Nothing routed to only `"admin"` before (the
  old read-only versions of workflows, templates, notifications, users,
  tenant, integrations) disappears from `apps/backoffice` — compliance
  still sees them, read-only, same as today.
- **`apps/admin` owns every configuration screen**, with full edit rights:
  products and the rule set (existing maker-checker, now also reachable
  from this app), workflows, notifications, AI models, integrations,
  users, tenant settings, and the audit log — plus the two screens this
  change makes editable for the first time:
  - **Approval matrix becomes editable.** Each authority level's amount
    limit, grade range and exceptions become directly editable fields
    (no maker-checker — PC-4's acceptance criteria never asked for a
    second sign-off here, unlike products or the rule set). Saving bumps
    a single shared matrix version and is audit-logged. Available to
    credit risk in `apps/backoffice` and the administrator in
    `apps/admin`; compliance keeps its read-only view in both.
  - **Documents and templates becomes a full editor.** The list screen's
    rows link into a per-template detail page with a merge-field
    inserter, a live preview (reusing the `ui-kit` document-viewer
    styling) filled with sample case data so merge fields are visible, a
    dirty-state bar, Save-as-new-version (bumps version, audit-logged),
    Discard, and Delete — blocked with an error if any in-flight loan's
    documents still reference that template. Administrator-only, matching
    PC-5's role; credit risk and compliance keep a read-only version of
    the same detail page (no edit controls) in `apps/backoffice`.
- **Cross-app link.** `apps/backoffice`'s top strip gains a link to the
  admin console next to its existing link to the borrower app; `apps/admin`
  gets the matching strip linking back to the staff console.
- **BREAKING**: the seeded administrator account can no longer sign into
  `apps/backoffice`; any reference to its old `/config/*` routes as
  administrator-reachable from that app is invalid. Automated tests or
  scripts that sign in as the administrator inside `apps/backoffice` need
  to move to `apps/admin`.

## Capabilities

### New Capabilities
- `admin-console`: the tenant-administrator's web app — sign-in, shell,
  and every configuration screen it owns, including the two made editable
  by this change (approval matrix, documents and templates).

### Modified Capabilities
- `staff-console`: the administrator role and its landing screen are
  removed; sign-in refuses the admin email with a console-specific
  message; the approval matrix's read-only requirement is replaced with
  an editable-by-credit-risk requirement (compliance still read-only); the
  documents-and-templates read-only requirement is replaced with a
  read-only detail-page requirement (view only — editing is
  `admin-console`'s); the top strip gains a link to the admin console.
- `web-bootstrap`: the shared-UI requirement is extended to cover
  `apps/admin` as a third app building on `@aim-ready/ui`.

## Impact

- **New ADR**: `docs/adr/0005-introduce-apps-admin.md`, satisfying
  ADR-0004's requirement that a third web app not be added quietly.
  Written as part of this change, alongside these planning artifacts.
- **New directory**: `apps/admin` (full Next.js app: `src/app`,
  `src/components`, `src/mock`, `src/lib/access.ts`, `src/proxy.ts`,
  config, tests) following `apps/backoffice`'s layout.
- **`apps/backoffice`**: `src/lib/access.ts` (drop `"admin"` from
  `AccessRole`/`NAV`/`LANDING`), `src/app/sign-in` (refuse the admin
  email), `src/app/(console)/config/matrix/page.tsx` (editable for
  credit risk), `src/app/(console)/config/templates/page.tsx` and a new
  `src/app/(console)/config/templates/[id]/page.tsx` (read-only detail
  view), `src/components/admin/product-view.tsx` and
  `src/app/(console)/config/decisioning/page.tsx` (no publish control
  shown for a submitted draft), `src/components/admin/bits.tsx` deleted
  (promoted to `packages/ui`, see design.md D1), top strip.
- **`packages/ui`**: gains `Toggle`, `VersionBadge`, `CheckRow`, `Track`,
  `StaticTable`, `TabBar`, `DraftBar`, `SimulatedCheckNote`, `CfgButton`
  and a generified `useRun`, promoted out of `apps/backoffice`'s app-local
  `components/admin/bits.tsx` (design.md D1).
- **Root config**: `pnpm-workspace.yaml` already globs `apps/*`, no change
  needed there; `turbo.json`, root `package.json` scripts, and any
  `NEXT_PUBLIC_*_URL` env var table follow the pattern
  `rename-apps-web-backoffice` used for its own app addition/rename
  (new `NEXT_PUBLIC_ADMIN_URL`, port assignment, scripts).
- **No `apps/api` or `packages/contracts` change** — this phase stays
  mock-data-only per ADR-0003/0004; nothing here changes an HTTP contract.
- **No credit-policy, decision-band, document, or workflow logic
  changes** — only who can reach and edit the screens that configure
  them, and which app they live in.
