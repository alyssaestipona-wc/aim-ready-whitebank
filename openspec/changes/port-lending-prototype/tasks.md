# Tasks

Source for every port task is the v18 prototype source (`wbproto/*.js`,
`a_head.html`). Copy, data and error strings are ported verbatim. "Verify"
steps run from the repo root unless stated.

## 1. ADR and workspace scaffolding

- [x] 1.1 Write `docs/adr/0003-separate-staff-and-borrower-web-apps.md`. It covers:
  - why the borrower channel is its own app;
  - that the two mock stores are disconnected;
  - that the cookie session is a placeholder;
  - the deferred F1–F8 e2e tests, as a known deviation;
  - that `apps/web` keeps the stock theme for now;
  - that the kill switch (PRD AIS-7) and module flags (PRD PLT-2) are single-user controls in both directions, outside maker-checker, per the PRD.

  Verify the file follows the ADR-0001 template and is linked from the proposal.
- [x] 1.2 Scaffold `apps/staff-web` by copying `apps/web`'s config files. Set the name to `staff-web`, the dev port to 3001 and the root layout to Geist fonts. Verify `pnpm --filter staff-web build` and `lint` pass on an empty page.
- [x] 1.3 Scaffold `apps/borrower-web` the same way, with dev port 3002. Verify `pnpm --filter borrower-web build` and `lint` pass.
- [x] 1.4 Add the cross-app URL env vars (`NEXT_PUBLIC_BORROWER_WEB_URL`, `NEXT_PUBLIC_STAFF_WEB_URL`) with local defaults, and a README per app. Each README states the mock-only scope, the disconnected stores, the placeholder session and the demo credentials. Verify the READMEs list every variable with its default.

## 2. packages/core: shared pure helpers (spec: staff-console and borrower-portal decision and disclosure requirements)

- [x] 2.1 Add `vitest` and a `test` script to `packages/core`. Verify `pnpm --filter @aim-ready/core test` runs.
- [x] 2.2 Implement `toCentavos`, `fromCentavos` and `formatPeso`. Add unit tests for rounding, zero, negative input being rejected, and output with and without decimals. Verify the tests pass.
- [x] 2.3 Implement `monthlyPayment`, `effectiveRate` and `disclosure`, with TSDoc formulas and rounding rules. Add unit tests that match the prototype's `terms()`/`eir()` figures to the centavo for PL 150,000/24/C and SL 80,000/12/B, plus an invalid-input test (zero or negative term). Verify the tests pass.
- [x] 2.4 Implement `filterList` and `paginate` (moved to `packages/ui/src/lib/list.ts` during apply, see design D3). Add unit tests for range text, the last partial page, an empty result and an out-of-range page clamp. Verify the tests pass.
- [x] 2.5 Port `simulateDecision(input, policy)` from `decide` and `scoreOf`. Add unit tests for:
  - a knockout decline;
  - auto-approve at 700 or above;
  - a decline below 600;
  - each referral trigger (thin file, mismatch, debt-to-income, limit, grey zone, related party);
  - Juan's prototype inputs for PL ₱150,000 returning approve with score 757;
  - band thresholds read from the policy argument, so moving the approve band to 760 changes Juan's outcome;
  - kill switch, giving review;
  - bureau down, giving review;
  - the output echoing the rule-set and model versions.

  Verify the tests pass.

## 3. packages/ui: tokens and primitives (spec: ui-kit)

- [x] 3.1 Add the `packages/ui` dependencies from design D3, subpath `exports`, a `cn` helper, and Vitest with jsdom and Testing Library. Verify `pnpm install` succeeds and `pnpm --filter @aim-ready/ui lint` passes.
- [x] 3.2 Create `src/styles/theme.css` with the prototype tokens:
  - ink, the gray ramp, accent `#2B59C3` and danger `#C42B1C`;
  - borders, radius and shadows;
  - fonts;
  - the shadcn variable mapping.

  Import it in both apps' `globals.css` with `@source` pointing at the package. Verify a test page in each app renders accent and danger utilities with the expected computed colours.
- [x] 3.3 Generate the shadcn primitives listed in design D3 into `packages/ui` in the `radix-nova` style and restyle them to the tokens. Verify each is exported and that `pnpm --filter staff-web build` compiles an import of each.
- [x] 3.4 Build `ListView` (search, filters, Clear, table, empty state, pager). Add tests for page change, the filter resetting to page 1, the "Showing A–B of N" text and the empty-state Clear. Verify the tests pass.
- [x] 3.5 Build `money-input-format.ts` and `MoneyInput` inside `packages/ui`, with no import from `@aim-ready/core`. Add tests for:
  - "1234567.891" → "1,234,567.89";
  - "5000" on blur → "5,000.00";
  - "abc12.345" → "12.34";
  - leading zeros, a lone ".", and caret retention.

  Verify the tests pass and that `grep -r "@aim-ready/core" packages/ui` finds nothing.
- [x] 3.6 Build `ConfirmDialog` (title, description, body, red inline error, danger confirm) and a Toast provider. Add tests that a failing confirm keeps the dialog open with the error, and that Escape closes both the dialog and the dropdown menu with focus returned. Verify the tests pass.
- [x] 3.7 Build `DocumentViewer` (ID card, sheet and agreement kinds, with metadata row), `AppStrip`, `Avatar`, `StatusPill` (accent and neutral only), `EmptyState`, `PageHeader` and `BarChart` (accent bars). Add render tests for each kind and pill variant, and a test that the mono utility applies the Geist Mono font variable. Verify no component uses `style=` or a hex literal (grep check in the test script).

## 4. staff-web: mock layer, sign-in, access control and shell (spec: staff-console sign-in, routes, shell, simulated state)

- [x] 4.1 Port the seed into `src/mock/seed.ts` from `USERS`, `PRODUCTS`, `seed`, `extendSeed`, `enrichHist`, the seeded drafts, AML, CIC, related-party, campaigns, `FINDINGS`, `HOLIDAYS` and the reason codes. Add types, and set `tenantId` on every record. Store money in centavos. Verify a unit test asserts the per-stage case counts from the seed plan and that every list has more than 10 rows (port of `count.js`).
- [x] 4.2 Implement `store.ts` (versioned key, try/catch, memory fallback, reset) and the `@/mock` public index. Verify tests for persistence across store re-creation, reset to seed, and the throwing-localStorage fallback.
- [x] 4.3 Implement `src/lib/access.ts` (route-to-role map, landing route per role) and `proxy.ts`, which:
  - redirects signed-out requests to `/sign-in`;
  - rewrites forbidden requests to `/denied`;
  - hides AI model routes when the flag is off.

  Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` first. Verify proxy unit tests for one allowed, one forbidden and one signed-out request per role, plus the AI-flag case.
- [x] 4.4 Build the two-step `/sign-in` with react-hook-form and zod, with the verbatim errors. It sets the mock session cookie and redirects to the role's landing route. Verify tests for wrong password, the code step appearing only after valid credentials, a bad code, and the landing route for all 8 accounts.
- [x] 4.5 Build the console layout:
  - the strip (app name, borrower-app link, bell);
  - the role-filtered grouped sidebar with nav counts;
  - user details with sign-out beside them;
  - Reset demo data with confirmation;
  - root `loading.tsx`, `error.tsx`, `not-found.tsx` and `/denied`, which logs the refusal.

  Verify tests that the sidebar items match the access map per role, that sign-out clears the cookie, and that reset restores the seed with the user still signed in.
- [x] 4.6 Build the notifications bell dropdown (role-specific, unread count, scroll-loads 10, mark all read, View all) and `/notifications` (unread pill, Status and Type filters, 10 per page, no stat cards). Verify ported prototype checks: 10 then 20 rows on scroll, the page shows 10 with pager buttons, the "N unread" text, and opening an item marks it read and navigates.

## 5. staff-web: My work and applications (spec: staff-console queues, case detail, officer review, approver, assisted application)

- [x] 5.1 Build `/queues` (tabs including unassigned, Pick action) and `/sla` (hours-left wording via the `hrsLeft` port). Verify tests for pick ownership with a history entry, and the "1 hour left" singular wording.
- [x] 5.2 Build `/applications` with the `appFilters` port (stage, product, channel, owner) and pagination. Verify a paging and filter test.
- [x] 5.3 Build `/applications/[id]`:
  - the applicant card with masked government ID and a Reveal dialog that logs;
  - the decision summary labelled simulated, with rule-set and model versions;
  - the documents card opening `DocumentViewer`;
  - `histCard`, 8 per page with an Actor filter;
  - the stage- and role-driven actions card;
  - `notFound()` for unknown ids.

  Verify tests for reveal, document open, missing documents not being clickable, history paging, the unknown id giving not-found, and compliance seeing no enabled actions.
- [x] 5.4 Implement the officer actions (request info, recommend with override and reason-code rules, withdraw, resume draft). Verify tests for no items giving the inline error, an override without a reason giving the inline error, an override of ₱50,000 or more flagged above threshold, and a valid recommendation moving the case to Approval.
- [x] 5.5 Build `/approvals` and the approver actions (approve, return, decline, route to committee). Verify tests for the self-approval block, routing to committee above limit or grade, and approval moving the case to Offer with the monthly figure from core `monthlyPayment`.
- [x] 5.6 Build `/applications/new` (assisted application: ID scan, verify, upload, money fields, draft save) and `/intake`, both submitting through `simulateDecision` with policy from the mock tenant config. Verify tests for:
  - the required-field inline error;
  - money formatting;
  - the kill switch giving Review;
  - the bureau outage giving Review;
  - the decision record holding inputs, versions and outcome;
  - a later recommend, override and approve leaving the stored decision record unchanged.

## 6. staff-web: closing and booking (spec: staff-console maker-checker booking)

- [x] 6.1 Build `/signing` (generate documents, resend, disclosure preview) with filters and pagination. Verify a test that generate moves the case to awaiting signature.
- [x] 6.2 Build `/booking` (pre-booking checklist, maker submit with an idempotency key, supervisor check) and `/disbursements`. Verify tests for a duplicate submit being blocked, the maker-as-checker block logged, a non-supervisor refused, a successful booking creating a loan number, compliance seeing the booking queue with no enabled actions, and the "simulated on the client" maker-checker notice being shown.
- [x] 6.3 Build `/exceptions`, sorted by `failedAt`, with retry using the same key. Verify a test where the core-timeout drill fails the booking, then retry books it with the same key.

## 7. staff-web: reports and compliance (spec: staff-console reports, compliance views)

- [x] 7.1 Build `/reports/funnel`, `/reports/sla`, `/reports/decisioning` and `/reports/regulatory` with `BarChart` and paginated tables. Regulatory adds the CIC generate, fix-and-regenerate and mark-submitted actions. Verify render tests per permitted role, that bars use only the accent token, that Mark submitted is disabled while errors remain, and that fixing and submitting is audit-logged.
- [x] 7.2 Build `/compliance/audit`, `/consent`, `/aml` ("Mark reviewed and export"), `/related` and `/governance` (findings list). Verify tests for the audit actor filter, the AML export being logged, and governance visible to risk but not to admin.

## 8. staff-web: configuration (spec: staff-console tenant configuration)

- [x] 8.1 Build `/config/products` (products and campaigns tabs) and `/config/products/[code]` (product tabs, draft, submit, publish by a second person). Verify tests for:
  - render and pagination;
  - the author's publish being refused;
  - a second person's publish incrementing the version and logging both names;
  - the "simulated on the client" maker-checker notice being shown;
  - an auto-limit above the maximum being refused.
- [x] 8.2 Build `/config/workflows`, `/config/matrix`, `/config/templates` and `/config/notifications` as read-only screens. Verify render tests and that no edit or publish control exists for any role.
- [x] 8.3 Build `/config/decisioning`:
  - rule toggles, referral triggers, add rule, draft, submit for review, and publish by a second person;
  - reason codes.

  The kill switch and automation modes sit on AI models (task 8.4), as in the prototype.

  Verify tests for:
  - the author's publish being refused;
  - a second person's publish succeeding;
  - the "simulated on the client" notice;
  - kill switch on (with the "already decided are unaffected" text) and off, each audit-logged;
  - the kill switch disabled for every role except credit risk.
- [x] 8.4 Build:
  - `/config/models` (overrides list, automation controls: per-product mode and the credit-risk-only kill switch);
  - `/config/integrations` (admin-only bureau and core failure drills, otherwise read-only);
  - read-only `/config/users` (30 users);
  - `/config/tenant` (holidays, and the admin-only AI module flag that mirrors to the cookie).

  Verify tests that:
  - turning the flag off removes the nav item and the route is refused for every role;
  - the flag change in each direction is audit-logged;
  - the flag is disabled for other roles;
  - the turn-off dialog states that existing records are kept;
  - each drill toggle is audit-logged, and the drills are disabled for every role except the administrator;
  - users has no edit controls.

## 9. borrower-web: mock layer and screens (spec: borrower-portal)

- [x] 9.1 Port `BORROWERS`, `BW_MSGS`, `PRODUCTS` and the borrower-facing status helpers (`plainStatus`, `borrowerReason`, `bwSteps`) into `src/mock`. Add the store and `tenantId`. Verify store persistence and reset tests.
- [x] 9.2 Implement the simulated bank progression in the mock layer (design D5):
  - referral becomes info requested;
  - after upload, the case moves to offer;
  - accepted becomes documents to sign;
  - signed becomes booked and disbursed;
  - each step is logged as simulated.

  Verify fake-timer tests for each transition at 4 s and the on-load catch-up.
- [x] 9.3 Build `proxy.ts` (signed-in check), `/sign-in` (email and password, verbatim error) and the shell:
  - the strip with the staff-console link;
  - the header with the inbox badge and profile menu (Account, Sign out);
  - the centred 760 px column;
  - loading, error and not-found pages.

  Verify tests for the wrong password, the signed-out redirect, the menu contents and the badge count.
- [x] 9.4 Build `/` Home (balance card, status card, six-step tracker, apply CTA). Verify tests for no application, action needed and declined.
- [x] 9.5 Build `/apply`: three steps, `MoneyInput` fields, live estimate, equal-width Back and Continue, verbatim validation errors, the duplicate-application guard, a loading state, then a result. Verify tests for:
  - each error;
  - the duplicate guard;
  - Juan's ₱150,000 / 24 months giving "You're approved for ₱150,000";
  - the decision record being unchanged after accept, sign and release.
- [x] 9.6 Build `/inbox` (8 per page), `/upload` (type and size errors, valid upload returning to review), `/offer` (disclosure from core `disclosure()`, counter-offer note, acknowledgement gates Accept) and `/sign` (Read opens `DocumentViewer`, the name must match). Verify tests for each inline error, each empty state, the counter-offer note and each success toast.
- [x] 9.7 Build `/loan` (labelled as read from core banking (simulated), schedule 12 per page) and `/account`. Verify a schedule paging test and the no-loan empty state.

## 10. Integration checks

- [x] 10.1 Run `pnpm build`, `pnpm lint` and `pnpm test` at the root. Verify all workspaces pass.
- [ ] 10.2 Run a WebKit (Safari engine) smoke pass over every route in both apps at 1440 px and 400 px. Verify zero page errors and no horizontal page scroll, and record the results in the PR description.
- [ ] 10.3 Walk every Scenario in the three spec deltas by hand against the running apps. Verify each one, and note any deviation in the PR description.

## Workflow follow-up

- Run `/spec-review` and `/code-review` (fresh session) until clean.
- Archive with `/opsx:archive`, then open the PR using `.github/pull_request_template.md`, linking this change and ADR-0003.
