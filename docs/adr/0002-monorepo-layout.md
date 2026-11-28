# 2. Monorepo layout and dependency direction

## Status
Accepted. Its `apps/web`/`apps/admin`/`apps/backoffice` naming is superseded by ADR-0004.

## Context
Multiple apps (`apps/api`, `apps/web`, future `apps/admin`, `apps/backoffice`) share domain logic, types, tooling config, and UI components. Without a rule, that shared code gets duplicated or, worse, apps start depending on each other directly.

## Decision
- `apps/` holds runnable applications. `packages/` holds shared code.
- Dependency direction is one-way: `apps/*` may depend on `packages/*`; `packages/*` never depends on `apps/*`; `packages/*` do not depend on each other except `packages/core`, `packages/contracts`, and `packages/ui` may each depend on `packages/base` for shared config.
- `packages/core` — shared domain logic.
- `packages/contracts` — shared types/DTOs/schemas crossing the `apps/api` boundary with any frontend (`apps/web`, `apps/backoffice`, `apps/admin`). Kept free of `node:`-prefixed runtime dependencies, since frontend client code imports from it too (see `real-identity-service`'s design.md for what that ruled out).
- `packages/base` — shared `tsconfig`/`eslint` config, extended not redefined.
- `packages/ui` — shared React/shadcn components.
- Workspace membership is declared in `pnpm-workspace.yaml`; task graph and caching in `turbo.json`.

## Consequences
- A component or type needed in two apps goes into the matching `packages/*`, not copy-pasted.
- Changing `packages/contracts` is an API-contract change and requires a spec update in the same OpenSpec change.
