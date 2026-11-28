# Design

## Context

See proposal.md - Why. The entire recommend→approve/decline/return/override-threshold flow this change builds for real already exists, fully designed, in the simulated console: `apps/backoffice/src/mock/actions/cases.ts` (`recommend()`, `overrideLevel()`, `aiRecOf()`, `approve()`, `confirmDecline()`, `declineCase()`, `returnToOfficer()`) and `apps/backoffice/src/mock/constants.ts` (`OVERRIDE_THRESHOLD = toCentavos(50000)`, `REASON_CODES`, `STAGES` including `'Approval'` between `'Review'` and `'Offer'`). This design ports that behavior into `apps/api` rather than inventing a parallel one, same as every other "real" slice this codebase has built from its simulated predecessor.

Today `apps/api/src/applications/applications.service.ts`'s `decide()` lets an approver decide a `Review`-stage application directly - a simplification `staff-decisioning-actions`' own design.md explicitly named as temporary, pending "a loan-officer recommend-then-approver-decide two-step." This change completes that.

`apps/api/src/applications/policy.ts`'s `POLICY.killSwitch`/`POLICY.bureauDown` are hardcoded `false` constants; `packages/core/src/index.ts`'s `simulateDecision()` already reads and acts on both correctly (verified this session) - there is simply no way to set them to `true` today.

## Goals / Non-Goals

**Goals:**
- Real `recommend()` → `decide()` → (optionally) `return()` flow, gating `decide()` behind a recommendation and segregation of duties (never the same user recommending and deciding).
- `Approval` as a first-class `ApplicationStage`, matching the backlog's own stage tracker (WF-4) and the simulated console's own `STAGES`.
- A real, persisted, toggleable kill switch and bureau-down flag, reachable from a minimal real admin-console control.
- A pure `aiRecommendation()` helper in `packages/core`, reused by both the override-threshold computation and the detail page's display - one source of truth, not two.
- Close the DEC-1 verification gap with real `apps/api` integration tests for refer, shadow/off, kill-switch, and bureau-down outcomes.

**Non-Goals:**
- Credit committee routing (WF-10, stretch) for an above-authority recommendation. The mock's `routeToCommittee()`/`"next":"committee"` branching stays unbuilt; `decide()` returns the same `{ok: false}` business error `staff-decisioning-actions` already established for an above-authority `APPROVER_AUTHORITY` check.
- DEC-3 (automatic bank-statement analysis) - no real document upload exists. Not touched.
- A real, automatic bureau-outage detector. `bureauDown` stays a manual toggle; nothing in this codebase calls a real bureau provider yet (Integration Hub epic's own future scope).
- Any change to `simulateDecision()`'s own scoring/banding logic - it is already correct and already unit-tested; this change only makes its existing `killSwitch`/`bureauDown` inputs reachable and verifies the pipeline end-to-end.
- A dedicated "approvals queue" screen (WF-7, a different Epic 4 story). `Approval`-stage applications are visible through the existing generic `GET /applications?stage=Approval` list, same as every other stage.
- Multi-level configurable approval matrices, document checklists, or anything from Collateral/Documents/Committee epics.

## Decisions

**`recommendation` is one jsonb column, not a new table or five new columns.** Mirrors how `decision` (the AI's own record) is already one frozen jsonb column - the officer's recommendation is the same shape of thing (a record written once, read many times), not a row with its own lifecycle. Shape: `{ by: string (officer's sub), decision: 'approve' | 'counter' | 'decline', amount: Centavos, tenor: number, reasonCode: string | null, overrideLevel: 'above' | 'below' | null, note: string | null, recommendedAt: string }` - field names ported directly from the mock's own `Recommendation` type.

**One `decide()` entry point, not three (`approve`/`confirmDecline`/`declineCase`).** The mock splits these three ways purely for its own UI-dialog branching (different confirmation copy per case). The existing `DecideApplicationDto` shape (`decision: 'approve'|'decline'`, optional `reasonCode`) already covers both finalizing a recommended approval and overriding a recommendation into a decline - `apps/api` keeps the one endpoint, branching internally on `dto.decision` the same way it already does today.

**`aiRecommendation()` lives in `packages/core`, not duplicated in the controller and the frontend.** Ported from the mock's `aiRecOf()`/`aiAmount()`: for any referred application, the AI's implicit recommendation is always "approve," at an amount capped by `min(requestedAmount, max(₱10,000, floor(income × 1.9 / ₱10,000) × ₱10,000))` - a formula already proven out in the simulated console, not invented here. Only ever computed for a referred (`refer`) outcome; a hard `decline` never reaches a recommend/decide flow in the first place, so that branch of the mock's `aiRecOf()` fallback is dead code and is not ported.

**Segregation of duties is a plain equality check, not a two-approver gate.** Re-reading DEC-4's "a different approver must give the second sign-off" against the mock's own `approve()`/`confirmDecline()`/`declineCase()`: the only enforcement is `recommendation.by !== decidingApprover`. "First sign-off" is the officer's own recommendation; "second sign-off" is the one approver's decision. There is no second, distinct approver beyond that one. `above`/`below` threshold is a stored classification (useful for AIS-6-style override reporting later), not an additional workflow gate.

**Race-safety reuses the established conditional-`UPDATE` pattern.** `recommend()`: `WHERE id = :id AND stage = 'Review' AND assignee_id = :officerId`. `decide()`: `WHERE id = :id AND stage = 'Approval'` (segregation-of-duties and authority checks happen in application code before the write, same as `applyDecision()`'s existing precondition checks today). `return()`: `WHERE id = :id AND stage = 'Approval'`.

**Kill switch / bureau-down: one `tenant_config` table, not a new config subsystem.** A single row per tenant (`tenant_id` PK, `kill_switch boolean`, `bureau_down boolean`, `updated_at`) - Phase 1 has exactly one seeded tenant, so the migration seeds the one row directly rather than building upsert-on-read logic. `ApplicationsService.create()` reads it and composes `{ ...POLICY, killSwitch: cfg.killSwitch, bureauDown: cfg.bureauDown }` before calling `simulateDecision()`. `POLICY`'s own static `killSwitch`/`bureauDown` fields are removed from `policy.ts` - this is their one live source now, not a second, unused one.

**The admin-console control is a new, separate real page, not a tab bolted onto the existing simulated `/config/decisioning` screen.** `apps/admin` has no real (non-simulated) page today beyond sign-in; entangling a real toggle into that screen's complex simulated UI risks confusing the two. A small new `apps/admin/src/app/(console)/decisioning-controls/page.tsx` (tenant-administrator only, matching the console's existing session scope) reads and writes the two flags directly, the same "real screen kept separate from its simulated counterpart" pattern `apps/backoffice`'s real Applications screen already established against its own simulated work queues.

**`ListApplicationsDto`'s stage allow-list gets `'Approval'` added, and its pre-existing gap (missing `'Info requested'`, left over from an earlier change) gets fixed in the same edit** - both are one-line additions to the same `STAGES` array, and leaving the pre-existing gap in place while touching this exact line would be a strange thing to knowingly walk past.

## Risks / Trade-offs

**[Risk]** This supersedes `decide()`'s previously-shipped "approver decides a `Review`-stage application directly" behavior - every existing test exercising that path needs rewriting, not just extending. **Mitigation**: `staff-decisioning-actions`' own design.md already named this as a temporary simplification pending exactly this change, so the supersession is expected, not accidental; task breakdown replaces those tests with `Approval`-stage equivalents rather than leaving both paths live.

**[Risk]** `POLICY.killSwitch`/`bureauDown` moving from a static object to a live DB read adds a query to every `create()` call. **Mitigation**: one row, one tenant, a simple indexed primary-key lookup - negligible cost next to the rest of `create()`'s own work (profile lookup, duplicate check, transaction).

**[Risk]** A counter-offer recommendation's amount could, in principle, fall outside the product's own min/max bounds. **Mitigation**: `recommend()` validates the recommended amount/tenor against `PRODUCTS[code]`'s bounds the same way `create()` already does, refusing out-of-range values before they're ever stored.
