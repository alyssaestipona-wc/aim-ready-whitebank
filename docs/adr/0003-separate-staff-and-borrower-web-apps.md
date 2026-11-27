# 3. Separate staff and borrower web apps

## Status
Accepted

## Context
ADR-0002 anticipates more apps under `apps/` (it names `apps/admin` and `apps/backoffice`). The Phase 1 prototype (OpenSpec change `port-lending-prototype`) has two audiences: bank staff and borrowers. The backlog's build-sequence note also says "Borrower side is its own small, separate app". The two audiences deploy, authenticate and scale independently.

## Decision
- **Borrower app.** The borrower channel is its own Next.js app, `apps/borrower-web`.
- **Staff app.** The staff console is `apps/staff-web`.
- **Shared code.** Both apps take shared UI from `packages/ui` and shared pure logic from `packages/core`. Neither app imports the other.
- **No shared mock state.** Until `apps/api` exists, each app keeps its own client-side mock store. An application submitted in `borrower-web` does not appear in `staff-web`. `borrower-web` simulates bank-side progression, and each simulated step is labelled as simulated.
- **Placeholder session.** Route access in `staff-web` is checked server-side by `proxy.ts` against a role map, using an unsigned mock session cookie. It is not authentication. It is replaced by the real session when `apps/api` auth lands.
- **Single-user controls.** The kill switch and module feature flags are single-user controls in both directions, audit-logged, and outside maker-checker. The sources, from PRD artifact `TVUan7fBfNSkv6sy8UdX8q` and backlog artifact `SHwVNrx8HRUTSR44kpUPc1`:
  - backlog AIS-7: "a global kill switch that forces every new application to manual review". Acceptance: "Turning the kill switch on or off is logged to the audit trail with who did it and when."
  - backlog PLT-2: module feature flags "that can be turned on or off". Acceptance: "Turning a module off removes its navigation group for every role immediately and confirms existing records are kept, not deleted."
  - the PRD scopes configuration maker-checker to "rule, product and model changes by a second credit risk manager or the tenant administrator, whichever did not draft them".

## Consequences
- **Known deviation: F1–F8 end-to-end tests.** They are deferred until the flows run against `apps/api`, because neither app is functional end to end before then. AGENTS.md otherwise asks for them "as each becomes functional".
- **Known deviation: `apps/web` theme.** `apps/web` keeps the stock theme for now, so the `web-bootstrap` "share one look" requirement holds only for the two new apps. A follow-up change adopts the kit in `apps/web` or rewords that spec.
- **Swapping in the API.** Swapping mock data for the API means re-implementing each app's `src/mock` public index. No screens change.
