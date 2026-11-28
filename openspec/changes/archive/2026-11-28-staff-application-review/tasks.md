# Tasks

## 1. apps/api: staff read endpoints
- [x] 1.1 Add `findAllForTenant(user, query)` and `findOneForTenant(user, id)` to `apps/api/src/applications/applications.service.ts`, scoped by `tenantId`, with optional `stage`/`product` filters on the list.
- [x] 1.2 Add `GET /` and `GET /:id` to `apps/api/src/applications/applications.controller.ts` with method-level `@Roles('branch','officer','approver','ops','opssup','risk','compliance')`, overriding the class-level `@Roles('borrower')`.
- [x] 1.3 A cross-tenant or missing `:id` request returns 404 (not 403), matching the existing `close()` anti-enumeration pattern.
- [x] 1.4 Add a `dto/list-applications.dto.ts` (query params: `stage?`, `product?`) with class-validator.

## 2. packages/contracts: response schemas
- [x] 2.1 Add `staffApplicationListItemSchema`, `staffApplicationListResponseSchema`, `staffApplicationDetailSchema` (decision typed `z.unknown()`, per ADR-0002) and their inferred types.

## 3. apps/backoffice: real session token + fetch
- [x] 3.1 Add `getSessionToken()` to `apps/backoffice/src/mock/session.ts`, mirroring `apps/web/src/mock/actions.ts`'s `getSessionToken()`.
- [x] 3.2 Add `apps/backoffice/src/mock/actions/applications.ts` with `listApplications(filters?)` / `getApplication(id)`, calling `apps/api` with `Authorization: Bearer <token>` and parsing with the new contracts schemas, returning a distinct error when the service is unreachable or the token is missing.

## 4. apps/backoffice: real applications screen
- [x] 4.1 Add `apps/backoffice/src/app/(console)/live-applications/page.tsx`: list view (id, product, amount, tenor, stage, outcome, grade), with stage/product filters.
- [x] 4.2 Add `apps/backoffice/src/app/(console)/live-applications/[id]/page.tsx`: detail view (decision summary — score, grade, PD, rule-by-rule results, reasons, rule-set/model versions — and the three consent records), no decisioning actions.
- [x] 4.3 Add a sidebar link to the new screen, visible to the same roles the endpoint allows.

## 5. Tests
- [x] 5.1 `apps/api`: Jest integration tests for `GET /applications` and `GET /applications/:id` — tenant scoping, stage/product filters, role scoping (borrower refused), cross-tenant 404.
- [x] 5.2 `apps/backoffice`: Vitest tests for the new routes, mocking `fetch` (the one place in this app that needs it) — list renders real rows, detail renders decision summary and consents, a missing/invalid token or an unreachable service shows a distinct error, a borrower-role session cannot reach the screen.

## 6. Cleanup and verification
- [x] 6.1 `npx eslint --fix` on both apps; `npx tsc --noEmit` on both apps and `packages/contracts`.
- [x] 6.2 Full monorepo `turbo run typecheck lint build test` (with `DB_NAME=aimready_test` for `apps/api`'s test step), confirming all green, including repeated parallel `turbo run test --force` runs for `apps/api` to rule out new cross-suite flakiness from the new integration spec file.
