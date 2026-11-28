# Spec Delta

## MODIFIED Requirements

### Requirement: The web app SHALL use shared UI components from `@aim-ready/ui`
A new component SHALL be added to `packages/ui` before being duplicated
inside an app, so `apps/web` and `apps/backoffice` share one look.

#### Scenario: A new shared component is introduced
- **GIVEN** a component is needed in more than one app
- **WHEN** it is implemented
- **THEN** it is added to `packages/ui/src` and imported from there, not copy-pasted per app

## REMOVED Requirements

### Requirement: The web app SHALL render a home page at `/`
**Reason**: This requirement described the standalone `apps/web` bootstrap
stub, which is deleted in this change. `apps/web` is now the renamed
borrower app; its home-page behavior is specified under `borrower-portal`.
**Migration**: No migration needed — no deployed app depended on the stub's
default-shell home page. Home-page behavior for the renamed `apps/web` is
covered by the `borrower-portal` spec's sign-in requirements.

#### Scenario: Home page loads
- **GIVEN** the web app is running
- **WHEN** a client requests `/`
- **THEN** the response is HTTP 200 and renders the app shell
