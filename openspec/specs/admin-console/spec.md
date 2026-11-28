# admin-console Specification

## Purpose

The admin console is the web app the tenant administrator uses to configure
products, rules, documents, integrations and platform settings, separate
from the staff console bank staff use to work loan applications. In this
phase every screen runs on simulated data.

## Requirements

### Requirement: Admin sign-in is two-step
The console SHALL ask for email and password first, checked against the real identity service (`api-auth`) rather than an in-memory mock array, then a six-digit authentication code verified the same way. It SHALL accept only the single seeded tenant-administrator account. The page SHALL NOT list demo accounts and SHALL NOT share a session with the staff console.

#### Scenario: Wrong password
- **GIVEN** the admin console's sign-in page
- **WHEN** the seeded administrator email is entered with a wrong password
- **THEN** a red inline error "Email or password is incorrect." is shown and no code field appears

#### Scenario: Correct credentials reveal the code step
- **GIVEN** the sign-in page at the email and password step
- **WHEN** the seeded administrator email and its demo password are submitted
- **THEN** the email is shown with a Change link, an "Authentication code" field appears, and the button reads "Verify and sign in"

#### Scenario: Successful sign-in lands on Products
- **GIVEN** the code step for the seeded administrator
- **WHEN** the code step completes
- **THEN** the identity service issues a session, the console stores it in `wbl_admin_session`, and the administrator lands on Products

#### Scenario: Staff or borrower credentials are refused here
- **GIVEN** the admin console's sign-in page
- **WHEN** a staff or borrower email is submitted with its own correct password
- **THEN** a red inline error "Email or password is incorrect." is shown, identical to an unknown email, so neither email's existence is revealed

#### Scenario: Identity service unavailable
- **GIVEN** the admin console's sign-in page at either step
- **WHEN** credentials or a code are submitted while the identity service is unreachable
- **THEN** a distinct "We can't sign you in right now. Try again shortly." error is shown, not the generic incorrect-credentials message

### Requirement: Admin routes are checked on the server
Every admin console route other than sign-in SHALL be reachable only with a valid admin session, checked server-side before the page renders, the same placeholder-session pattern the staff console uses with its own, separately named session cookie.

#### Scenario: Signed-out request
- **GIVEN** no admin session
- **WHEN** any admin console route other than sign-in is requested
- **THEN** the user is redirected to sign-in

#### Scenario: Unknown route
- **GIVEN** a signed-in administrator
- **WHEN** a route that does not exist is requested
- **THEN** a "Not found" page with a "Go to my work" button is shown

### Requirement: Admin console shell
Every signed-in admin console page SHALL show:
- a slim top strip with the app name, a link to the borrower web app, and a link to the staff console;
- a header with breadcrumbs, a notifications bell and an account menu;
- a sidebar listing every configuration route (no role filtering — there is one role), the administrator's name beside a sign-out button.

The Guided demo control SHALL NOT appear.

#### Scenario: Top strip links to the staff console
- **GIVEN** a signed-in administrator
- **WHEN** the top strip's staff console link is selected
- **THEN** the staff console's sign-in page opens, with no admin session carried over

#### Scenario: Sign out
- **GIVEN** a signed-in administrator
- **WHEN** the sign-out button is selected
- **THEN** the session ends and the admin console's sign-in page is shown

### Requirement: Admin console owns every configuration screen
The administrator SHALL see and, except where noted below, edit: products and campaigns; workflows; the approval matrix; documents and templates; notifications; decisioning; AI models; integrations; users; tenant settings; and the audit log.

#### Scenario: All configuration routes are reachable
- **GIVEN** a signed-in administrator
- **WHEN** the sidebar is shown
- **THEN** every one of the eleven configuration routes listed above is present, with no screen hidden behind a role check

### Requirement: Configuration changes are maker-checker
Product parameter and rule-set changes SHALL follow draft, then submit for review, then approve and publish by a different user with publishing rights. The administrator SHALL be able to publish a draft a credit risk user submitted (simulated here, since this app's mock store is independent of the staff console's). The author SHALL NOT publish their own change. The UI SHALL state that this check is simulated on the client until the API enforces it.

#### Scenario: Administrator publishes a credit-risk-drafted product change
- **GIVEN** a personal-loan draft shown as submitted by credit risk
- **WHEN** the administrator selects "Approve and publish"
- **THEN** the product version increments, the new limits apply, and the audit log names both people

#### Scenario: Administrator cannot publish their own draft
- **GIVEN** a draft the administrator themself created and submitted
- **WHEN** "Approve and publish" is shown
- **THEN** it is disabled with the explanation "You submitted this change; a different person must approve it"

### Requirement: Approval matrix is editable
Each authority level's amount limit, grade range and exceptions SHALL be directly editable fields, with no draft/submit/review step — PC-4 does not ask for maker-checker here. Saving SHALL increment a single matrix version, scoped to this app's own mock store only (the staff console's matrix and version are its own independent copy, per ADR-0003/0005 — a change here is not reflected there), at once and SHALL be audit-logged.

#### Scenario: Administrator edits an authority level
- **GIVEN** the administrator on the approval matrix
- **WHEN** level L2's amount limit is changed and saved
- **THEN** the matrix's shared version increments, the new limit is shown, and the audit log records who changed it and what changed

#### Scenario: Required fields are enforced
- **GIVEN** the edit form for an authority level
- **WHEN** the amount limit or grade range is cleared and saved
- **THEN** the save is refused with a message naming the missing field, and nothing is changed

### Requirement: Template detail page has a merge-field inserter and live preview
The templates list SHALL link each row into a per-template detail page. The detail page SHALL offer a merge-field inserter that inserts a `{{field}}` token at the cursor in the body text, and a live preview, styled like the document viewer's agreement-page preview, filled with sample case data so merge fields are visible as their substituted values.

#### Scenario: Inserting a merge field
- **GIVEN** the body textarea with the cursor at a position
- **WHEN** a merge-field button (for example `{{borrower_name}}`) is selected
- **THEN** that token is inserted at the cursor position and the live preview updates to show the sample value in its place

### Requirement: Template edits are dirty-tracked, saved and discardable
The detail page SHALL show a dirty-state bar once any field differs from the published version. Save as new version SHALL increment the template's version and be audit-logged. Discard SHALL revert unsaved edits back to the published version.

#### Scenario: Editing shows the dirty bar
- **GIVEN** the administrator on a template's detail page
- **WHEN** the body text is changed
- **THEN** a bar appears stating there are unsaved changes and that saving publishes a new version immediately

#### Scenario: Save publishes a new version
- **GIVEN** unsaved changes to a template
- **WHEN** "Save as new version" is selected
- **THEN** the version increments, the change is audit-logged, and the dirty-state bar disappears

#### Scenario: Discard reverts edits
- **GIVEN** unsaved changes to a template
- **WHEN** "Discard" is selected
- **THEN** every field returns to the last published version and the dirty-state bar disappears

### Requirement: Template delete is blocked while referenced
Delete SHALL be refused with an error naming the template if any not-yet-closed case's documents still carry that template's name.

#### Scenario: Delete is blocked while referenced
- **GIVEN** a template whose name still appears on an open case's documents
- **WHEN** "Delete" is selected
- **THEN** the delete is refused with an error naming the template, and it is not removed

#### Scenario: Delete succeeds once unreferenced
- **GIVEN** a template no open case's documents reference
- **WHEN** "Delete" is selected and confirmed
- **THEN** the template is removed from the list and the audit log records it

### Requirement: Module feature flags are a tenant setting
Per PRD story PLT-2, the tenant administrator SHALL turn the AI credit scoring module on or off from Tenant settings with one confirmation. Turning it off SHALL remove its navigation for every role in every app at once and state that existing records are kept. Each change SHALL be audit-logged.

#### Scenario: AI flag off hides models
- **GIVEN** the administrator on Tenant settings
- **WHEN** the AI scoring flag is turned off and confirmed
- **THEN** the dialog has stated that existing records are kept, the AI models screen leaves this app's navigation, and the audit log records the change

#### Scenario: AI flag back on
- **GIVEN** the AI flag is off
- **WHEN** the administrator turns it on and confirms
- **THEN** AI models returns to the navigation and the audit log records the change

### Requirement: Failure drills are logged
The administrator SHALL toggle the simulated bureau-outage and core-timeout drills from Integrations. Each toggle SHALL be audit-logged.

#### Scenario: Administrator turns on a drill
- **GIVEN** the administrator on Integrations
- **WHEN** the bureau-outage drill is turned on
- **THEN** the bureau shows as an outage (simulated), a toast confirms it, and the audit log records it

### Requirement: Simulated state is per browser and resettable
The admin console SHALL keep simulated configuration changes in the browser so they survive reloads, independent of the staff console's own simulated state. It SHALL offer "Reset demo data" with a confirmation, which restores the seed data and keeps the administrator signed in. Every simulated record SHALL carry a tenant identifier.

#### Scenario: Reset
- **GIVEN** a signed-in administrator who has changed configuration
- **WHEN** Reset demo data is confirmed
- **THEN** all configuration returns to the seed state and the administrator stays signed in
