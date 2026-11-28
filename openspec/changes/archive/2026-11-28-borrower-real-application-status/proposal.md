# Proposal

## Why

`apps/web` (the borrower app) is real only at the instant of applying: `submitApplication()` already calls apps/api's real `POST /applications` and gets back a real decision (confirmed this session — `apps/web/src/mock/actions.ts`'s own doc comment even says so: "real identity... and real application intake/decisioning... have already landed"). But the real `applicationId`/`decision` that call returns are immediately discarded into a locally-generated mock `Application` record, and from that moment on every screen the borrower sees — home, loan, inbox, offer — is driven entirely by a client-side timer (`useBankSimulator`) reading a local/localStorage store keyed by a hardcoded prototype borrower id, never the real session's own `sub`. `apps/api` itself has no borrower-scoped read endpoint at all today — only staff-only `list()`/`detail()` (`@Roles(...STAFF_ROLES)`), plus two borrower-scoped writes (`create()`, `close()`) that don't hand data back.

This is the single largest gap in the whole system's real, end-to-end value: every other change this session has built real staff-side decisioning, approvals, and SLA tracking that a real borrower can never actually see. Prioritized ahead of further Epic 4 (Approvals) polish per explicit steering — closing this loop is more foundational to the product's own core purpose than refining an already-partially-real approvals queue.

## What Changes

- A new borrower-scoped read endpoint in `apps/api`: `GET /applications/mine`, tenant- and borrower-scoped by the caller's own `user.sub` (the same scoping `create()`/`close()` already use), returning a plain, borrower-appropriate subset of fields — never the internal score/rules/grade/reviewer fields the staff-facing schemas carry.
- `apps/web/src/lib/decode-session-token.ts` (new): a browser-safe, signature-unchecked decode of the real session token, mirroring `apps/backoffice`'s and `apps/admin`'s existing `decode-session-token.ts` exactly — the one piece of client-side identity infrastructure apps/web is missing today, needed to read the real `sub` instead of the mock store's own hardcoded borrower key.
- A new real action module and a new real status page in `apps/web`, kept separate from the existing fully-simulated `/`, `/loan`, `/inbox`, `/offer` screens — the same "real screen, cleanly separate from its simulated counterpart" pattern `apps/backoffice`'s `live-applications` screens already established against their own simulated work queues.
- Plain-language stage names (never raw internal stage strings), with a stated next action where one applies, ported from the mock's own `plainStatus()` mapping logic (not reused verbatim — it operates on the mock's richer `Application` type and mock-only stages like `Documentation`/`Booking` that don't exist in the real pipeline yet) — adapted to the real `ApplicationStage` union (`Review`, `Info requested`, `Approval`, `Offer`, `Declined`, `Disbursed`, `Withdrawn`).
- Auto-refetch on a reasonable interval and on page focus, not a true push mechanism — no websocket/SSE infrastructure exists anywhere in this codebase; named explicitly as the honest simplification of SS-1's own "no manual refresh required" AC.

## Capabilities

### Modified Capabilities
- `borrower-portal`: gains a real (non-simulated) application-status requirement, the same way `staff-console` already carries both its simulated work-queue requirements and its own "Real applications list and detail" requirement side by side in one file. The existing simulated requirements (home, offer, sign, loan, account, simulated portal state) are untouched.
- `application-intake`: gains a borrower-scoped read requirement alongside the existing staff-scoped ones.

## Impact

- `apps/api/src/applications/applications.controller.ts`: new `GET /applications/mine`, `@Roles('borrower')`.
- `apps/api/src/applications/applications.service.ts`: new `findMineForBorrower(user)` (or similar), tenant+borrower-scoped, reusing the existing `slaHoursLeft`/stage-mapping helpers where relevant but returning a deliberately narrower shape than `StaffApplicationListItem`.
- `packages/contracts/src/index.ts`: new `borrowerApplicationListItemSchema`/`Response` (or similarly named) — a distinct, narrower schema from the existing staff-facing ones, enforcing that internal fields (score, grade, rule results, reviewer id) are never exposed to a borrower.
- `apps/web/src/lib/decode-session-token.ts` (new).
- `apps/web/src/lib/` or a new `apps/web/src/lib/actions/` location (decided during research, matching this app's own existing flat `lib/` convention rather than copying `apps/backoffice`'s folder-per-group structure wholesale) for the new real action module.
- A new real page under `apps/web/src/app/` (exact route decided during research — distinct from the existing simulated `/`, `/loan`, `/inbox`, `/offer` routes).
- RBAC: no new role; the new endpoint is `@Roles('borrower')`, tenant+`user.sub`-scoped, matching every other borrower-facing endpoint already in this codebase.
- Not touching: the existing simulated screens/flows (unchanged), `apps/backoffice`/`apps/admin` (unchanged), Documents/Collateral/Booking/Collections epics (still unbuilt, untouched).
