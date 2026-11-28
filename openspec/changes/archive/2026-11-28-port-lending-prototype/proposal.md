# Proposal

## Why

The WhiteBank Lending clickable prototype (Claude HTML artifact
`9gFCpnnzVyHzf7xBBiSzDn`, v18) is now the agreed design and flow for the Phase 1
staff console and borrower web app. It is a single hand-written HTML/JS file, so
none of it can be reused by the real frontend. Porting it into the monorepo
stack now gives the team routed, typed, componentised screens that later
changes can wire to `apps/api` one capability at a time.

## What Changes

- Add **`apps/staff-web`**: a Next.js 16 App Router app that reproduces the
  prototype's staff console. It covers two-step sign-in, a role-scoped sidebar
  and every staff screen and action, all against client-side mock data:
  - **My work:** queues, SLA watch, approvals, notifications.
  - **Applications:** all applications, case detail, assisted application, email and file intake.
  - **Closing and booking:** signing, booking (maker-checker), disbursements, booking exceptions.
  - **Reports:** four dashboards.
  - **Compliance:** audit, consent, AML, related-party, model governance.
  - **Configuration:** ten screens.
- Add **`apps/borrower-web`**: a Next.js 16 App Router app that reproduces the
  prototype's borrower web app against client-side mock data:
  - email sign-in;
  - home, with application status and a progress tracker;
  - a three-step loan application;
  - inbox;
  - document upload;
  - offer review and acceptance;
  - e-signing;
  - loan view, with a paginated repayment schedule;
  - account.
- Populate **`packages/ui`** (currently empty) with:
  - the prototype's design tokens (ink/gray neutrals, one blue accent, red only for inline errors, Geist fonts) as a shared Tailwind 4 theme stylesheet;
  - the shadcn/radix primitives both apps need, including button, input, select, dialog, dropdown menu, table, tabs, badge, card and toast;
  - shared composites, including the paginated, filterable list view, the money input, the document viewer, the app strip and the avatar.
- Populate **`packages/core`** (currently empty) with pure, framework-free helpers both apps use:
  - peso/centavo money formatting and parsing;
  - loan term math (amortisation, effective interest rate for the disclosure);
  - pagination and filter helpers;
  - the **simulated** decision engine (knockouts, then score, then decision bands) that both apps' mock layers call. Thresholds are passed in as configuration and never hardcoded at the call site.
- Each app gets one isolated mock module (seed data plus a client-side store)
  that pages read through, so a later change can swap it for API calls without
  touching the screens.
- **Out of scope:**
  - the prototype's Guided demo panel and its seven scripted walkthroughs;
  - shared state between the two apps. Each app has its own mock store, so an application a borrower submits in `borrower-web` does not appear in `staff-web`;
  - any `apps/api` endpoint, persistence, real authentication or real external services;
  - collections and platform-operator screens, which the prototype does not have;
  - all backlog stories tagged deferred or stretch, which the prototype already excludes;
  - any new feature not present in the prototype.
- `apps/web` is left untouched.

## Capabilities

### New Capabilities

- `staff-console`: the staff-facing lending console. It covers sign-in, role-scoped navigation and route access, work queues and case handling, maker-checker booking, reports, compliance views and tenant configuration screens, all backed by simulated data in this phase.
- `borrower-portal`: the borrower-facing web app. It covers sign-in, the loan application, status tracking, inbox, document upload, offer acceptance, e-signing and the loan view, all backed by simulated data in this phase.
- `ui-kit`: the shared design tokens and components that give the staff console and borrower portal one look and one set of interaction patterns (paginated lists, money input, document viewer, dialogs, toasts, inline errors).

### Modified Capabilities

None. `web-bootstrap` and `api-bootstrap` requirements are unchanged.

## Impact

- **New workspaces:** `apps/staff-web`, `apps/borrower-web`. Both are picked up automatically by `pnpm-workspace.yaml` (`apps/*`) and by the turbo `build`/`lint`/`test` tasks.
- **Shared packages:**
  - `packages/ui` gains new runtime dependencies, justified in design.md D3:
    - `radix-ui`, `lucide-react` and `tw-animate-css`, which `apps/web` already uses;
  - devDependencies `vitest`, `jsdom` and Testing Library, for component tests.
  - The two apps use the same libraries, plus `react-hook-form`, `zod` and `@hookform/resolvers` for their forms, as the AGENTS frontend conventions prescribe.
  - `packages/ui` and `packages/core` do not import each other (ADR-0002). Money-input formatting stays in `packages/ui`.
  - `packages/core` gains code and a `vitest` devDependency for its unit tests. It gets no runtime dependencies.
- **`packages/contracts`:** unchanged. No API contract changes.
- **No database, migration or `apps/api` change.**
- **ADR:** running the borrower channel as its own deployable app is an architectural decision. ADR-0002 anticipates more apps but names `apps/admin` and `apps/backoffice`, not these two. This change adds **[ADR-0003 "Separate staff and borrower web apps"](../../../../docs/adr/0003-separate-staff-and-borrower-web-apps.md)**.
- **Roles affected (RBAC visibility).** The staff console shows six of the nine PRD roles plus the booking-checker split of loan operations:
  - branch officer;
  - loan officer/credit analyst;
  - approver;
  - loan operations (maker), and loan operations supervisor (checker);
  - credit risk manager;
  - compliance/audit (read-only);
  - tenant administrator.

  Collections and platform operator are not present. Route access is checked on the server by a session-cookie check against a role-to-route map, not only by hiding nav items. The session is a mock cookie in this phase.
- **Configurability (P1).** Credit policy, decision bands, approval matrix, workflows and document templates are shown from mock tenant config. Only product parameters and the rule set are editable in this port. The others are read-only. The simulated decision engine takes that config as input. Nothing is hardcoded in page code.
- **Core line (P2).** The loan view and repayment schedule are rendered from mock data that stands in for a live core read. The mock module labels them as a simulated core response, and the apps do not treat them as a stored source of truth.
- **External services.** Bureau, eKYC, AML, fraud, e-signature, OCR and notifications appear only as simulated labels in mock data. The prototype's failure drills are kept as client-side toggles of the simulated adapters:
  - bureau outage, which routes new cases to manual review;
  - core booking timeout, which leads to a booking exception and an idempotent retry.

  No adapter or integration hub code is added. That belongs to `apps/api`.
- **Maker-checker.** The prototype's maker-checker flows are reproduced in the UI:
  - booking, where the checker must differ from the maker;
  - approval, where the approver must differ from the recommender, and overrides at or above the threshold need that second sign-off;
  - product-parameter and rule-set publish, where the publisher must differ from the author.

  Enforcement is simulated on the client only until `apps/api` implements it. The UI says so.
- **Other configuration screens:**
  - workflows, approval matrix, templates, notifications and users are **read-only**. Integrations and tenant settings are read-only except for the admin-only failure drills and the AI module flag in this port, so nothing is published from them;
  - the kill switch (credit risk, PRD AIS-7) and the AI module flag (tenant administrator, PRD PLT-2) are single-user controls in both directions, as the PRD and backlog specify. Both directions are audit-logged. The PRD lists maker-checker for "rule, product and model changes", not for these controls. ADR-0003 records this.
- **Scoring/decisioning.** The prototype's kill switch and AI feature flag are reproduced as configuration toggles. No real model runs, so shadow mode does not apply. The simulated engine is deterministic and labelled as simulated.
