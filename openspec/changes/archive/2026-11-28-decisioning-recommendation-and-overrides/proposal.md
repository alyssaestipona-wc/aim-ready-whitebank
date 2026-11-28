# Proposal

## Why

Epic 3 (Case Review & Credit Decisioning) has five core (non-deferred, non-stretch) stories: DEC-1, DEC-2, DEC-3, DEC-4, DEC-7. DEC-1 is already substantially built but has never been verified end-to-end against its own ACs with a real `apps/api` integration test (only unit-tested in `packages/core`). DEC-7's fail-safe logic already exists and is already wired end-to-end but has no way to actually be turned on. DEC-2's reason chips already render, but nothing distinguishes the AI's own recommendation from the final decided outcome. DEC-4 — a loan officer recommending a decision, with mandatory accountability when overriding the AI, and a true second-person sign-off — doesn't exist at all: an approver decides a `Review`-stage application directly today, a simplification `staff-decisioning-actions` explicitly named as temporary. This change replaces that simplification with the real two-step flow the backlog always specified, reusing a flow this codebase's own simulated console already fully designed and fleshed out (`apps/backoffice/src/mock/actions/cases.ts`'s `recommend()`/`approve()`/`overrideLevel()`), rather than inventing a new one.

## What Changes

- **New `Approval` stage** (already named in the backlog's own stage tracker — WF-4, WF-1 — and already in the simulated console's `STAGES` list) sits between `Review` and `Offer`/`Declined`: a loan officer recommends from `Review`, the case moves to `Approval`, a *different* approver decides from there.
- `PATCH /applications/:id/recommend` (new, `officer`-only): the assigned officer recommends approve/counter-offer/decline, optionally differing from the AI's own recommendation (derived from the stored decision record, not re-invented). A reason code from a fixed list is required whenever it differs at all; the override is classified "above" or "below" a ₱50,000/decision-flip threshold and stored for the approver (and for AIS-6-style override reporting later) to see — lifting the seeded `OVERRIDE_THRESHOLD` and `REASON_CODES` verbatim from the simulated console.
- `PATCH /applications/:id/decide` (existing endpoint, behavior changes): now acts on an `Approval`-stage application's recommendation rather than deciding a `Review`-stage application directly. Enforces segregation of duties — the deciding approver can never be the recommending officer. Approving uses the *recommended* amount/tenor (which may differ from the original application if the officer countered), not the original application's own terms.
- `PATCH /applications/:id/return` (new, `approver`-only): sends an `Approval`-stage case back to `Review`, reassigned to the recommending officer — completing WF-9's own "return" acceptance criterion, which had no recommend step to return *from* until now.
- DEC-2: the real detail page gains a distinct "AI recommendation" section (derived, not stored) alongside the existing reason chips, and a "Final decision" section once a case is actually decided (reviewer, date, outcome) — today only one frozen `outcome` field is shown, with no way to tell what the AI originally suggested apart from what was ultimately decided.
- DEC-7: `POLICY.killSwitch` becomes a real, persisted, tenant-scoped toggle with an admin-console control, instead of a hardcoded `false` constant. `bureauDown` gets the same toggle mechanism, explicitly as a manual stand-in — no real bureau integration exists yet to set it automatically (Integration Hub epic's own future scope).
- DEC-1: closes the gap between "unit-tested in `packages/core`" and "verified end-to-end in `apps/api`" by adding integration tests that actually exercise a refer outcome, a shadow/off automation outcome, and (via DEC-7's new toggle) a kill-switch and bureau-down outcome, through the real `create()` pipeline against real Postgres.
- **Non-goal, explicitly out of scope**: DEC-3 (automatic bank-statement analysis on document upload) needs real document upload, which does not exist anywhere in `apps/api` — blocked on the Documents epic's own future work. DEC-5 (credit memo generation, `defer`) and DEC-6 (OCR income-mismatch flagging, `stretch`) stay out of scope per the tracker's own tiering and don't block this epic's completion.
- **Non-goal**: WF-10 (credit committee routing for above-authority recommendations) stays a stretch story; an above-authority recommendation continues to return a business error pointing at the limitation, the same simplification `staff-decisioning-actions` already established for `APPROVER_AUTHORITY`.

## Capabilities

### Modified Capabilities
- `application-intake`: the open-application duplicate check must also treat `Approval` as an open stage (an application pending approval is not yet resolved).
- `staff-console`: the staff decisioning surface gains the recommend/decide/return flow, the `Approval` stage in queue/detail views, and the AI-recommendation/final-decision distinction on the detail screen.
- `admin-console`: gains a real (non-simulated) Decisioning controls screen for the kill switch and bureau-down flag, kept separate from the existing simulated Decisioning configuration screen.

## Impact

- `apps/api/src/applications/application.entity.ts`: `ApplicationStage` gains `'Approval'`; new nullable `recommendation` jsonb column.
- `apps/api/src/applications/applications.service.ts`: new `recommend()` and `return()` methods; `decide()`'s precondition changes from `Review` to `Approval`-stage-with-recommendation, gains the segregation-of-duties check, and uses the recommendation's amount/tenor.
- `apps/api/src/applications/policy.ts`: new `OVERRIDE_THRESHOLD`, `OVERRIDE_REASON_CODES` seeded constants (lifted verbatim from the simulated console); `killSwitch`/`bureauDown` move from hardcoded `POLICY` fields to a persisted, toggleable tenant-config row.
- `apps/api/src/database/migrations/`: one new migration (`Approval` added to the open-stages index predicate, `recommendation` column, a small tenant-config table for the kill-switch/bureau-down toggle).
- `packages/core/src/index.ts`: new pure `aiRecommendation()` helper (derives the AI's implicit approve/decline recommendation and capped amount from a stored `DecisionRecord`, reused by both the override-threshold computation and the detail page's display).
- `packages/contracts/src/index.ts`: new request/response schemas for recommend/decide/return; `staffApplicationDetailSchema` gains `recommendation` and decided-outcome fields (`reviewerId`, `declineReasonCode`, `decidedAt`).
- `apps/backoffice`: detail page gains the recommend form (officer), the recommendation summary + approve/decline/return actions (approver), and the AI-recommendation/final-decision sections; queue/list views recognize `Approval` as a visible stage.
- `apps/admin`: a minimal kill-switch/bureau-down toggle control (tenant administrator).
- RBAC: no new role introduced; `recommend` is `officer`-only, `decide`/`return` stay `approver`-only, the kill-switch toggle is tenant-administrator-only (admin console's existing session scope).
- Not touching documents, collateral, booking/disbursement, or external-service adapters.
- Decisioning: `simulateDecision()` itself is unchanged (DEC-1/DEC-7 close gaps in verification and in making its existing `killSwitch`/`bureauDown` inputs reachable, not in the scoring/banding logic itself). The kill-switch remains instantly effective on the next new application, same as today; existing in-flight applications are unaffected, matching AIS-7's own stated behavior.
