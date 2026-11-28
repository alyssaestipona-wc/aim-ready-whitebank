# Design

## Context

See proposal.md - Why. `apps/api`'s `ApplicationsController` (`apps/api/src/applications/applications.controller.ts`) already has `@Controller('applications') @Roles('borrower')` at the class level, with `POST /` (`create`) and `PATCH /:id/close` (`close`) inheriting that borrower scope, and `GET /` / `GET /:id` overridden to `@Roles(...STAFF_ROLES)`. `apps/web` already has the real session cookie (`SESSION_COOKIE = "wbl_borrower_session"`, verified server-side in `src/proxy.ts` via `verifySessionToken()`) but no client-side way to read the real `sub` out of it - `apps/backoffice`'s and `apps/admin`'s `lib/decode-session-token.ts` are the direct precedent to port.

## Goals / Non-Goals

**Goals:**
- One new borrower-scoped read endpoint, one new narrow contracts schema, one new real apps/web screen - the minimum that closes the "apply then never see it again" gap.
- Plain-language coverage for every real `ApplicationStage`, including `Approval` (a stage the existing simulated portal's own `Stage` type doesn't have at all, since the simulated flow never built a recommend/approve split).

**Non-Goals:**
- SS-2 (review/accept an offer) and SS-3 (see a live loan from core banking) - both need real e-signature/disclosure (Documents epic, unbuilt) and a real core-banking read (not built) respectively. The new screen shows an `Offer`-stage application's terms informationally, with no accept/e-sign action - a borrower who wants to proceed is told to contact their loan officer, the same kind of explicit simplification this codebase already uses elsewhere for a feature blocked on an unbuilt epic.
- Real document upload for an `Info requested`-stage application - same reason, already a standing non-goal from `sla-watch-and-info-requests`. The real screen states that more documents were requested, without a working upload action.
- True push updates (websocket/SSE). No such infrastructure exists anywhere in this codebase. The screen refetches on a fixed interval and on `visibilitychange`/window `focus`, which satisfies "no manual refresh required" without claiming to be real-time.
- Touching the existing simulated screens (`/`, `/loan`, `/inbox`, `/offer`, `/apply`'s own confirmation) at all - they keep working exactly as today, for the fully-simulated post-apply experience the real pipeline doesn't cover yet (Documentation/Booking don't exist as real stages).
- Multiple real applications per borrower are supported by the endpoint/schema (a list, not a single item), but the screen itself only needs to render the single open one prominently (mirroring the simulated home page's own single-active-application framing) - a borrower with more than one closed-out application still sees all of them.

## Decisions

**New endpoint on the existing controller, not a new one.** `GET /applications/mine` is just another route on `ApplicationsController` (same file, same `@Roles('borrower')` scope the class already inherits by default) - no new controller/module needed, consistent with `create()`/`close()` already living there.

**A new, narrower contracts schema - not reusing `StaffApplicationListItem`.** A borrower must never see `score`/`grade`/`rules`/`reviewerId`/`ruleSetVersion` etc. Rather than trust every future change to remember to strip fields from the staff shape before sending it borrower-side, a separate `borrowerApplicationListItemSchema` in `packages/contracts` only ever HAS the borrower-safe fields in the first place - the type system itself prevents a leak, not a runtime filter that could be forgotten.

**`apps/web/src/lib/decode-session-token.ts` ported verbatim from `apps/backoffice`'s file**, with `appScope !== "borrower"` as apps/web's own check (mirroring `apps/web/src/lib/session-token.ts`'s existing server-side `appScope !== "borrower"` check) in place of backoffice's `appScope !== "staff"`.

**New real action module at `apps/web/src/lib/applications.ts`** (not a new `lib/actions/` subfolder, and not mixed into the existing monolithic `mock/actions.ts`). apps/web's own `lib/` is already where its other non-simulated, infrastructure-level code lives (`session-token.ts`, `env.ts`) - unlike `apps/backoffice`/`apps/admin`, which group real actions inside `mock/actions/<name>.ts` alongside their simulated ones, apps/web's existing `mock/actions.ts` is a single monolithic file mixing 3 real calls into otherwise-simulated logic, which is itself part of what made the gap this change closes easy to miss. A clean new file in `lib/`, not touching `mock/actions.ts`, keeps the real and simulated paths visibly separate going forward.

**New route `/my-applications`**, distinct from the existing simulated `/` (home), to make unambiguous which screen is real. Reuses `PageTitle`/`PageSkeleton`/`BwCard` from `apps/web/src/components/portal.tsx` and `StatusPillFor`/`PlainStatus` from `apps/web/src/mock/selectors.ts` (both already generic - `PlainStatus` is a plain `{pill, h, p, cta}` shape, not coupled to the mock `Application` type, and `StatusPillFor` just renders one) rather than duplicating this rendering.

**Plain-language mapping is a new, small pure function** (e.g. `apps/web/src/lib/plain-status.ts`), adapted from - not reused from - the mock's own `plainStatus()`: the real `ApplicationStage` union has `Approval` (which the mock's `Stage` type doesn't) and lacks `Documentation`/`Booking` (which the mock's does, since those stages don't exist in the real pipeline yet). Covers all 7 real stages; `Approval` reads the same as `Review` ("in review", no internal stage name shown), `Offer`/`Info requested` state the real limitation (no accept/upload action yet) instead of linking to a page that wouldn't actually do anything for a real application, `Declined` shows the real `declineReasonCode` in a short borrower-facing phrase (a small lookup table, the same fixed `DECLINE_REASON_CODES` four values `policy.ts` already seeds - these are already borrower-reasonable phrasing, lightly rewritten for second-person tone).

**Refetch**: the established `requestIdRef` generation-counter pattern (from `apps/backoffice`'s own live-applications list page) to drop a stale response, plus a `setInterval` (e.g. 30s) and a `visibilitychange`/`focus` listener triggering an immediate refetch - matching the Non-Goals' own stated scope.

## Risks / Trade-offs

**[Risk]** A 30-second poll on every open tab is wasteful at any real scale. **Mitigation**: this is a single borrower-facing screen with a tiny data shape (own applications only, never more than a handful of rows) - acceptable for this phase; a push mechanism is explicitly out of scope until this codebase has one anywhere.

**[Risk]** Telling a borrower in `Offer`/`Info requested` stage to "contact your loan officer" instead of offering a real action could read as a worse experience than the simulated portal's own (fully interactive) equivalent screens. **Mitigation**: intentional and honest - the real pipeline genuinely can't accept/upload yet; a misleading button that does nothing would be worse than accurate, if less polished, copy.
