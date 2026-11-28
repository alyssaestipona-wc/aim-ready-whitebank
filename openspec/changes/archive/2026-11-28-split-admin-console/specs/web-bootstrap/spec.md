# Spec Delta

## MODIFIED Requirements

### Requirement: The web app SHALL use shared UI components from `@aim-ready/ui`
A new component SHALL be added to `packages/ui` before being duplicated
inside an app, so `apps/web`, `apps/backoffice` and `apps/admin` share one
look.

#### Scenario: A new shared component is introduced
- **GIVEN** a component is needed in more than one app
- **WHEN** it is implemented
- **THEN** it is added to `packages/ui/src` and imported from there, not copy-pasted per app
