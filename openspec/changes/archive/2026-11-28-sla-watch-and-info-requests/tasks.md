# Tasks

## 1. apps/api: data model
- [x] 1.1 Add a migration (timestamp > 1795852200000): nullable `stage_entered_at timestamptz` on `applications` (backfilled from `created_at` for existing rows); drop and recreate `idx_applications_open_per_product` with `'Info requested'` added to its `stage IN (...)` predicate.
- [x] 1.2 Add `stageEnteredAt` to `ApplicationEntity`; widen `ApplicationStage` to include `'Info requested'`; add nullable `infoRequestItems` (`text[]` or similar) and `infoRequestMessage` columns in the same migration.
- [x] 1.3 Add `SLA_HOURS: Partial<Record<ApplicationStage, number>>` (`Review`: seeded default, documented as such; `'Info requested'`: 72) and `INFO_REQUEST_ITEMS` (the 3-item seeded checklist, lifted verbatim from `apps/backoffice/src/mock/actions/cases.ts`'s `INFO_ITEMS`) to `apps/api/src/applications/policy.ts`.

## 2. apps/api: SLA computation and the two new endpoints
- [x] 2.1 Add a `slaHoursLeft(stage, stageEnteredAt)` helper; wire it into `findAllForTenant()`'s and `findOneForTenant()`'s response mapping.
- [x] 2.2 Update `OPEN_STAGES` to include `'Info requested'`; update every place `stage` is set (`create()`, `applyDecision()`) to also set `stageEnteredAt`.
- [x] 2.3 Add `dto/request-info.dto.ts` (`items: string[]` non-empty, from the seeded ids; `message: string`) and `dto/resolve-info.dto.ts` (empty body) with class-validator.
- [x] 2.4 Add `ApplicationsService.requestInfo(user, id, dto)`: tenant-scoped, `Review`-only, race-safe conditional UPDATE (reusing the established pattern), sets stage `Info requested`, `infoRequestItems`, `infoRequestMessage`, `stageEnteredAt`.
- [x] 2.5 Add `ApplicationsService.resolveInfo(user, id)`: tenant-scoped, `Info requested`-only, race-safe conditional UPDATE, sets stage `Review`, clears `infoRequestItems`/`infoRequestMessage`, `stageEnteredAt`.
- [x] 2.6 Add `PATCH /applications/:id/request-info` and `PATCH /applications/:id/resolve-info` to `ApplicationsController`, both `@Roles('officer')`.

## 3. packages/contracts
- [x] 3.1 Add `slaHoursLeft: number | null` to `staffApplicationListItemSchema`/`staffApplicationDetailSchema`; add `infoRequestItems`/`infoRequestMessage` to the detail schema. Add request-info/resolve-info request/response schemas.

## 4. apps/backoffice
- [x] 4.1 Add `requestInfo(id, dto)`/`resolveInfo(id)` to `apps/backoffice/src/mock/actions/applications.ts`, same Bearer-token pattern as the other real actions.
- [x] 4.2 Show `slaHoursLeft` on the real applications list and detail screens, with the simulated console's own breach (<0, visually distinct) and warning (≤2h) styling.
- [x] 4.3 Add a Request Information action (officer role, `Review` stage) on the detail screen: a checklist (seeded items) + message, refusing an empty item list client-side before sending.
- [x] 4.4 Add a Mark Resolved action (officer role, `Info requested` stage) on the detail screen.

## 5. Tests
- [x] 5.1 `apps/api`: Jest integration tests — `slaHoursLeft` computed correctly for a seeded stage and null for a terminal stage, `requestInfo()` success (stage, items, message, fresh SLA window) and refusal (no items, wrong stage, cross-tenant, non-officer role via controller metadata test), `resolveInfo()` success and refusal (wrong stage), a concurrent request-info/resolve-info race (exactly one wins, matching `decide()`/`pick()`'s established pattern).
- [x] 5.2 `apps/backoffice`: Vitest tests — SLA hours rendered and breach/warning styling applied, Request Information and Mark Resolved actions gated correctly by role and stage, empty-checklist refusal before sending, both actions refetch on success.

## 6. Cleanup and verification
- [x] 6.1 `npx eslint --fix` on apps/api and apps/backoffice; `npx tsc --noEmit` on apps/api, apps/backoffice, and `packages/contracts`.
- [x] 6.2 Full monorepo `turbo run typecheck lint build test` (with `DB_NAME=aimready_test` for `apps/api`'s test step), confirming all green, including repeated parallel `turbo run test --force` runs for `apps/api`.
