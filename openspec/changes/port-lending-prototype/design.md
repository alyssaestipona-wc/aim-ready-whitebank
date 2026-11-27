# Design

## Context

- **Source of truth.** The source is the v18 prototype, `9gFCpnnzVyHzf7xBBiSzDn`.
  - Its unbundled source is seven files: `a_head.html` (CSS), `b_data.js` (seed, products, engine), `c_core.js` (shell, router, lists, notifications), `d_work.js` (work and case screens), `e_admin.js` (reports, compliance, config), `f_borrower.js` and `g_sim.js` (demos, dropped).
  - It is one hash-routed SPA. It renders template strings and keeps all state in one localStorage object.
  - Staff and borrower views share that object.
- **`apps/web`** is the stock Next.js 16 template. Its conventions:
  - App Router under `src/app`;
  - `cacheComponents` and `partialPrefetching` on;
  - Tailwind 4 through `@tailwindcss/turbopack`;
  - shadcn `radix-nova` style;
  - `cn` from the `cn` package;
  - Vitest with jsdom and Testing Library;
  - `eslint-config-next`.
- **`packages/ui` and `packages/core`** are empty stubs. `packages/ui` already declares `class-variance-authority`, `clsx` and `tailwind-merge`. `packages/core` has no test runner.
- **Next 16 differs from earlier versions.** `middleware` is now `proxy.ts`. The bundled docs in `node_modules/next/dist/docs/` are authoritative and must be read before each new file convention is used, as `apps/web/AGENTS.md` requires.

## Goals / Non-Goals

**Goals:**
- Screen-for-screen and action-for-action parity with the prototype, minus the Guided demo.
- One isolated mock module per app. Pages never touch localStorage or seed data directly.
- Every route is a real App Router route, with loading, empty, error and not-found states.
- Shared look and behaviour live once, in `packages/ui` and `packages/core`.

**Non-Goals:**
- No API calls, no real auth and no server persistence.
- No dark theme, because the prototype is light-only.
- No end-to-end test suite. This is a known deviation from AGENTS.md's "e2e as each flow becomes functional": F1–F8 are not functional end to end until they run against `apps/api`, so their e2e tests land then. ADR-0003 and the PR record this deviation.
- `apps/web` keeps the stock theme. The `web-bootstrap` "share one look" requirement is met for the two new apps only. A follow-up change should adopt the kit in `apps/web` or reword that spec.
- No changes to `apps/web`.

## Decisions

### D1. Two apps cloned from `apps/web`'s config
`apps/staff-web` (dev port 3001) and `apps/borrower-web` (dev port 3002) copy `apps/web`'s:
- `package.json` scripts and versions;
- `tsconfig.json`;
- `next.config.ts`;
- `eslint.config.mjs`;
- `vitest.config.mts` and setup;
- `components.json`.

Only the name and port change. Each app links to the other through `NEXT_PUBLIC_BORROWER_WEB_URL` / `NEXT_PUBLIC_STAFF_WEB_URL`, which default to the local ports and are documented in each app's README.

Alternative considered: one app with two route groups. Rejected, because the user asked for two separate apps and the borrower channel deploys separately (ADR-0003).

### D2. Tokens as a shared Tailwind 4 theme stylesheet
`packages/ui/src/styles/theme.css` holds:
- the prototype's tokens, mapped to shadcn variable names: `--primary` is ink `#0B0B0C`, `--accent-brand` is `#2B59C3`, `--destructive` is `#C42B1C`, plus the gray ramp, radius and shadows;
- the `@theme inline` block;
- base layer rules.

Each app's `globals.css` imports `tailwindcss`, `tw-animate-css` and `@aim-ready/ui/theme.css`. It then adds `@source "../../../../packages/ui/src"` so Tailwind picks up the kit's classes.

Values are written once, as CSS variables. Components never use inline hex codes or `style=`, which satisfies the AGENTS frontend rule.

Fonts load with `next/font/google` (Geist and Geist Mono) in each root layout. Their variables are consumed by the theme.

### D3. shadcn primitives generated into `packages/ui`
The shadcn CLI generates these primitives into `packages/ui/src/components/ui`, in the `radix-nova` style that `apps/web` uses:
- button, input, label, textarea, select, checkbox;
- dialog, dropdown-menu, popover;
- table, tabs, badge, card, separator;
- toast (Radix Toast from the `radix-ui` package);
- tooltip.

Composites go in `packages/ui/src/components`:
- `ListView` (search, filters, table, pager);
- `MoneyInput`;
- `DocumentViewer`;
- `AppStrip`;
- `Avatar`;
- `StatusPill`;
- `EmptyState`;
- `ConfirmDialog`;
- `money-input-format.ts`: the live text formatter with caret-safe digit counting and two-decimals-on-blur. It is kept inside `packages/ui`, because ADR-0002 forbids `packages/ui` from depending on `packages/core`;
- `PageHeader`;
- `BarChart`, made of CSS bars in the accent colour.

The package exposes subpath `exports`, for example `@aim-ready/ui/button`.

New `packages/ui` dependencies:
- `radix-ui`;
- `lucide-react`;
- `tw-animate-css`;
- `react-hook-form`, `zod` and `@hookform/resolvers`, for the shared `Form` field wrapper;
- devDependencies `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom` and `@vitejs/plugin-react`, for component tests. These are the same versions `apps/web` uses.

All are already used or prescribed by the repo's frontend conventions. Using Radix Toast instead of `sonner` avoids one extra package.

The kit uses `clsx` + `tailwind-merge`, already declared, rather than the `cn` package that `apps/web` uses, so the kit owns its own `cn`.

Alternative considered: per-app `components/ui`. Rejected by the non-negotiable that shared UI lives in `packages/ui`.

### D4. Pure helpers in `packages/core`, money in centavos
`packages/core` is framework-free TypeScript.

**Money:**
- `toCentavos`, `fromCentavos`, `formatPeso(centavos, { decimals })`.

Input-field formatting is UI behaviour and lives in `packages/ui` (D3). Apps convert the input's numeric value with `toCentavos`. Under ADR-0002, `packages/ui` and `packages/core` never import each other; only apps import both.

Seed amounts are stored as integer centavos.

**Loan math:**
- `amortise(principal, annualRate, months)`: annuity payment. The result is rounded half-up to the centavo once per instalment, and the last instalment absorbs any rounding remainder.
- `effectiveRate(...)`: bisection on monthly IRR, annualised (ported from the prototype's `eir`).
- `disclosure(...)`: fee, net proceeds, total of payments and finance charge.

The formulas are documented in TSDoc, as AGENTS requires.

**Lists:** `filterList`, `paginate` (returns rows plus range plus page count).

**Simulated decisioning:** `simulateDecision(input, policy)`, ported from `decide` and `scoreOf`. It runs knockouts, then score, then bands, and returns:
- outcome;
- score and grade;
- the rules fired and the referral triggers;
- reason codes;
- `ruleSetVersion` and `modelVersion`, echoed from the `policy` argument.

The policy argument carries the thresholds:
- approve band 700 and decline band 600;
- debt-to-income limit;
- auto-limits per product;
- kill switch;
- bureau availability.

Policy is always passed in from the caller's tenant config, never defaulted in core (P1). The module is named and documented as a simulation.

**Tests:** `packages/core` gains `vitest` as a devDependency (new; justified because the money and loan math must be unit-tested) and a real `test` script.

### D5. One mock module per app, behind a store hook
Each app has the same layout under `src/mock/`:

| File | Holds |
|------|-------|
| `seed.ts` | Ported from `seed`, `extendSeed`, `enrichHist` and the other seed builders. Every record has `tenantId: "kalinaw"`. |
| `types.ts` | The shapes of the mock records. |
| `store.ts` | Below. |
| `actions.ts` | One function per prototype action. |
| `selectors.ts` | Read helpers. |

`store.ts` is a tiny external store:
- `useSyncExternalStore`;
- localStorage key `wbl-staff-v1` / `wbl-borrower-v1`, with every access in try/catch;
- an in-memory fallback.

`actions.ts` covers actions such as `recommend`, `approve`, `book`, `checkBooking`, `retryBooking`, `requestInfo`, `publishRuleSet` and `applyForLoan`. Each validates, mutates, appends history and returns `{ ok } | { error }`.

Pages and components import only `@/mock`'s public `index.ts`. Swapping to the API means reimplementing `index.ts` against fetch calls with the same signatures. Actions are typed `async` from day one so the swap needs no call-site change.

Borrower-web's mock also owns the **simulated bank progression** timer (spec: borrower-portal "Simulated bank progression"):
- a `setTimeout` of about 4 s, scheduled after any action that leaves the case waiting on the bank;
- the same advance on load if a stage has been waiting longer than that;
- history entries marked "(simulated bank step)".

### D6. Routes and role groups (staff)
App Router segments mirror the prototype's nav groups as route groups, so each group has one layout and access-map entry:

| Group | Routes |
|-------|--------|
| (auth) | `/sign-in` |
| (work) | `/queues`, `/sla`, `/approvals`, `/notifications` |
| (applications) | `/applications`, `/applications/[id]`, `/applications/new`, `/intake` |
| (closing) | `/signing`, `/booking`, `/disbursements`, `/exceptions` |
| (reports) | `/reports/funnel`, `/reports/sla`, `/reports/decisioning`, `/reports/regulatory` |
| (compliance) | `/compliance/audit`, `/consent`, `/aml`, `/related`, `/governance` |
| (config) | `/config/products`, `/config/products/[code]`, `workflows`, `matrix`, `templates`, `notifications`, `decisioning`, `models`, `integrations`, `users`, `tenant` |

Root-level routes: `/denied` and `not-found.tsx`.

The borrower app has `/sign-in`, `/`, `/apply`, `/inbox`, `/upload`, `/offer`, `/sign`, `/loan` and `/account`.

### D7. Server-side route check with a mock session cookie
`src/lib/access.ts` holds the route-prefix-to-roles map, ported verbatim from the prototype's `NAV`, `allowed()` and `CASE_ROLES`.

`proxy.ts` (Next 16's replacement for middleware) handles each request:
1. It reads the `wbl_staff_session` cookie (role id) and the `wbl_flags` cookie (AI flag).
2. Signed-out requests redirect to `/sign-in`.
3. Forbidden requests rewrite to `/denied`, and the refusal is appended to the mock audit log on the client when `/denied` mounts.

The sidebar renders from the same map.

Sign-in sets the cookie after the mock code step. Toggling the AI flag mirrors the flag into its cookie.

This is a **placeholder for the real session**. It enforces routing on the server as the AGENTS convention requires, but the cookie is unsigned and client-set. Both the README and the code comments say so. Real enforcement arrives with `apps/api` auth.

The borrower app's `proxy.ts` only does the signed-in check, with the `wbl_borrower_session` cookie.

### D8. Rendering model and interaction states
- **Layouts** are Server Components. Screens that read the mock store are Client Components (`"use client"`), because the store lives in localStorage.
- **Loading.** Until the store hydrates, a screen renders a skeleton, and each segment also gets a `loading.tsx`.
- **Errors.** Each app has an `error.tsx` at the root and per group, with a retry.
- **Not found.** `not-found.tsx` handles unknown routes and unknown case ids (via `notFound()`).
- **Empty states** come from `ListView` and `EmptyState`.
- **Success** is confirmed with toasts.

Hash deep links such as `#committee` are replaced by real paths.

### D9. Forms
Forms with validation use `react-hook-form` and `zod`, following the AGENTS convention:
- sign-in (both apps);
- assisted application;
- loan application steps;
- dialog forms such as recommend, request info and decline.

Schemas live next to the mock module in `src/mock/schemas.ts`. They move to `packages/contracts` when the API contract exists, which is noted in each file header.

Error copy is the prototype's verbatim.

### D10. What is dropped or adapted from the prototype
- **Dropped:** Guided demo (`g_sim.js`, `sim-*` actions, strip button).
- **Adapted:** the "Borrower web app" and "Staff console" strip buttons become cross-app links.
- **Adapted:** prototype-only `S.mode` switching is removed.
- **Unchanged:** all copy, data, filters, page sizes and error strings, which are ported as-is.
- **Configuration:** only product parameters and the rule set are editable, both through the prototype's draft, submit and publish maker-checker (PRD PC-1).
  - The kill switch (credit risk only, PRD AIS-7) and the AI module flag on Tenant settings (administrator only, PRD PLT-2) are single-user, single-confirm controls in both directions. Both directions are audit-logged.
  - The failure drills on Integrations are admin-only testing toggles of the simulated adapters.
  - Everything else is read-only, as in the prototype.
- **Policy values:** the override threshold (₱50,000), approver authority (₱1,000,000, grades A–C), decision bands (700/600) and the 10 MB upload limit live in each app's mock tenant config and are passed to the code that uses them. They are never literals in components or in `packages/core`.

## Risks / Trade-offs

- **Size of the port.** About 45 screens and 40 actions.
  - Mitigation: tasks are grouped by nav group, and each group ships with its tests.
  - Mitigation: the prototype's jsdom checks (`test.js`) are the parity checklist.
- **The mock cookie looks like auth but isn't.**
  - Mitigation: it is labelled in the code, the README and the UI strip ("sample data").
  - Mitigation: the cookie name is namespaced so it cannot collide with the real session.
- **Separate stores break cross-app continuity.**
  - Mitigation: simulated bank progression in borrower-web.
  - Mitigation: staff-web keeps the prototype's seeded borrower cases.
  - Mitigation: both READMEs state that the two apps are disconnected.
- **localStorage hydration mismatch.** Server HTML cannot know the store.
  - Mitigation: client screens render a skeleton until mounted and never read storage during render on the server.
- **Next 16 API drift.** Proxy, `cacheComponents` and the typed `LayoutProps`/`PageProps` helpers may differ from training-era Next.
  - Mitigation: read the bundled docs before each convention.
  - Mitigation: `pnpm build` must pass per app.
- **Float math in loan terms.**
  - Mitigation: compute in centavos, round once per instalment, and unit-test against prototype figures. For example, the ₱150,000 / 24 months grade C monthly payment must match the prototype to the centavo.

## Migration Plan

This change is additive: two new apps and code in two empty packages. To roll back, delete the two app folders and revert the package changes. There is no data migration.

## Open Questions

- Production hostnames for the two apps. They only affect the env defaults documented in the READMEs.
