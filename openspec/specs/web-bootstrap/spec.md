# Web Bootstrap

## Purpose
The web app (`apps/web`) boots a Next.js 16 App Router site styled with
Tailwind CSS 4 and shadcn/ui, so new pages have a consistent design baseline.

## Requirements

### Requirement: The web app SHALL render a home page at `/`
Visiting the site root returns a successful response with the default
Next.js App Router shell.

#### Scenario: Home page loads
- **GIVEN** the web app is running
- **WHEN** a client requests `/`
- **THEN** the response is HTTP 200 and renders the app shell

### Requirement: The web app SHALL use shared UI components from `@aim-ready/ui`
New components are added to `packages/ui` before being duplicated inside an
app, so `apps/web`, `apps/admin`, and `apps/backoffice` share one look.

#### Scenario: A new shared component is introduced
- **GIVEN** a component is needed in more than one app
- **WHEN** it is implemented
- **THEN** it is added to `packages/ui/src` and imported from there, not copy-pasted per app
