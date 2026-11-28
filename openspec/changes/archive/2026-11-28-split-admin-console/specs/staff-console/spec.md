# Spec Delta

## MODIFIED Requirements

### Requirement: Staff sign-in is two-step
The console SHALL ask for email and password first. It SHALL show the authentication-code field only after a known staff email and correct password, and sign the user in after a six-digit code. The page SHALL NOT list demo accounts. The seeded tenant-administrator email SHALL be refused here with a console-specific message instead of the generic incorrect-credentials error, since the administrator signs in at the separate admin console.

#### Scenario: Wrong password
- **GIVEN** the sign-in page
- **WHEN** `approver@kalinawbank.ph` is entered with a wrong password and the user selects Continue
- **THEN** a red inline error "Email or password is incorrect." is shown and no code field appears

#### Scenario: Correct credentials reveal the code step
- **GIVEN** the sign-in page at the email and password step
- **WHEN** `approver@kalinawbank.ph` and the demo password are submitted
- **THEN** the email is shown with a Change link, an "Authentication code" field appears, and the button reads "Verify and sign in"

#### Scenario: Invalid code
- **GIVEN** the code step after valid credentials for `approver@kalinawbank.ph`
- **WHEN** a code that is not six digits is submitted
- **THEN** a red inline error "That code is incorrect. Try again." is shown

#### Scenario: Successful sign-in lands on the role's home screen
- **GIVEN** the code step for `approver@kalinawbank.ph`
- **WHEN** the approver completes the code step
- **THEN** the approver lands on Approvals, and each other role lands on its own home screen (branch and loan officer: Work queues; loan operations and supervisor: Booking; credit risk: Decisioning dashboard; compliance: Audit log)

#### Scenario: Administrator email is refused here
- **GIVEN** the sign-in page at the email and password step
- **WHEN** the seeded tenant-administrator email is submitted with its correct password
- **THEN** a red inline error "Tenant administrators sign in at the separate admin console." is shown and no code field appears

### Requirement: Console shell
Every signed-in console page SHALL show:
- a slim top strip with the app name, a link to the borrower web app, and a link to the admin console;
- a header with breadcrumbs, a notifications bell and an account menu;
- a grouped sidebar with the user's name, role and a sign-out button beside them.

The header SHALL NOT have a search bar. The Guided demo control SHALL NOT appear.

#### Scenario: Sign out from sidebar
- **GIVEN** any signed-in staff user
- **WHEN** the user selects the sign-out button beside their details at the bottom of the sidebar
- **THEN** the session ends and the sign-in page is shown

#### Scenario: Unknown route
- **GIVEN** a signed-in staff user
- **WHEN** a route that does not exist is requested
- **THEN** a "Not found" page with a "Go to my work" button is shown

#### Scenario: Top strip links to the admin console
- **GIVEN** any signed-in staff user
- **WHEN** the top strip's admin console link is selected
- **THEN** the admin console's sign-in page opens in place of the staff console, with no staff session carried over

### Requirement: Reports
Officers, approvers, credit risk and compliance SHALL see the origination funnel, turnaround and SLA, and decisioning dashboards. Credit risk and compliance SHALL also see the regulatory extracts. Every chart SHALL use the single accent colour.

#### Scenario: Dashboard opens
- **GIVEN** credit risk is signed in
- **WHEN** credit risk opens the decisioning dashboard
- **THEN** it shows the straight-through and override rates, the approve, refer and decline mix, the top referral triggers and automation by product, with all bars in the accent colour

### Requirement: Regulatory extract validation
Credit risk SHALL be able to generate the monthly credit bureau (CIC) file. A file with validation errors SHALL NOT be markable as submitted until it is fixed and regenerated. Each step SHALL be audit-logged.

#### Scenario: File with errors
- **GIVEN** credit risk on Regulatory extracts
- **WHEN** the Nov 2026 CIC file is generated
- **THEN** it shows 2 validation errors, Mark submitted is disabled, and "Fix and regenerate" is offered

#### Scenario: Fixed file submitted
- **GIVEN** the regenerated file with 0 errors
- **WHEN** Mark submitted is selected
- **THEN** the file shows as submitted with today's date and the audit log records it

### Requirement: Compliance views
Compliance SHALL see the audit log, consent records, AML escalations, related-party lending and model governance findings. Credit risk SHALL also see model governance. Each SHALL be filterable and paginated. Marking an AML escalation reviewed and exported SHALL be recorded in the audit log.

#### Scenario: AML escalation exported
- **GIVEN** compliance on AML escalations with an open escalation
- **WHEN** "Mark reviewed and export" is selected
- **THEN** its status becomes "Exported to AML system" and the audit log records it

#### Scenario: Audit log filter
- **GIVEN** compliance on the audit log
- **WHEN** the audit log is filtered by role, or searched for a person's name
- **THEN** only matching entries are shown, paginated

### Requirement: Tenant configuration screens
Credit risk and compliance SHALL see the configuration screens their role is granted: products and campaigns; workflows, approval matrix, templates and notifications; decisioning; AI models (behind the AI flag); integrations, users and tenant settings.

#### Scenario: Read-only configuration
- **GIVEN** compliance is signed in
- **WHEN** the workflows, templates, notifications or users screen is opened
- **THEN** the configuration is shown with no edit or publish control

#### Scenario: Credit risk edits the approval matrix
- **GIVEN** credit risk on the approval matrix
- **WHEN** an authority level's amount limit is edited and saved
- **THEN** the matrix's shared version increments at once and the audit log records who changed it

#### Scenario: Templates are view-only here
- **GIVEN** compliance opens a template's detail page (the only role here templates is granted to)
- **WHEN** the page renders
- **THEN** the merge-field body is shown with no insert buttons, Save, Discard or Delete control, and the live preview still renders with sample case data

### Requirement: Kill switch is a single-user control
Per PRD story AIS-7, credit risk SHALL, from the AI models screen's automation controls, turn the global kill switch on or off with one confirmation and set each product's automation mode (live, shadow, off), with no second sign-off. Turning it on SHALL state that applications already decided are unaffected. Both directions SHALL be audit-logged with who and when.

#### Scenario: Kill switch on
- **GIVEN** credit risk on AI models
- **WHEN** "Turn kill switch on" is confirmed
- **THEN** the dialog has stated that decided applications are unaffected, it takes effect at once, and the audit log records who turned it on

#### Scenario: Kill switch off
- **GIVEN** the kill switch is on
- **WHEN** credit risk confirms "Turn kill switch off"
- **THEN** automated decisions resume and the audit log records who turned it off

#### Scenario: Other roles cannot toggle
- **GIVEN** compliance on AI models
- **WHEN** the kill switch control is shown
- **THEN** it is disabled

## ADDED Requirements

### Requirement: Which configuration changes are editable in this app
Product parameters, the rule set, the approval matrix, the kill switch and automation modes SHALL be changeable, by credit risk. Documents and templates SHALL be viewable in full detail, including its live preview, but not editable here — editing is the admin console's. Every other configuration screen SHALL be read-only, with no publish path.

#### Scenario: Matrix edit is credit-risk-only here
- **GIVEN** the approval matrix screen
- **WHEN** it is opened by any role other than credit risk
- **THEN** no edit control is shown, only the published values

#### Scenario: Matrix version here is independent of the admin console's
- **GIVEN** credit risk edits an authority level here
- **WHEN** the same level is later viewed in the admin console
- **THEN** the admin console shows its own, unaffected version — per ADR-0003/0005, the two apps keep independent mock stores

### Requirement: Credit risk drafts and submits configuration changes for review
Product parameter and rule-set changes SHALL follow draft, then submit for review, by credit risk. Approving and publishing a submitted draft is the administrator's action and SHALL happen only in the admin console — the control SHALL NOT be enabled here for anyone, including the draft's own author. The UI SHALL state that the administrator publishes it there, and that this check is simulated on the client until the API enforces it.

#### Scenario: Submitted draft has no publish control here
- **GIVEN** a draft rule set submitted for review
- **WHEN** the submitted draft is viewed in this app, by its own author or by any other staff-console role
- **THEN** no "Approve and publish" control is shown here; a note states the administrator publishes it in the admin console

#### Scenario: Invalid product draft
- **GIVEN** a product draft whose auto-approval limit exceeds its maximum amount
- **WHEN** it is submitted for review
- **THEN** it is refused with "The auto-approval limit can’t exceed the maximum amount."

## REMOVED Requirements

### Requirement: Configuration changes are maker-checker
**Reason**: Product parameter and rule-set changes still draft and submit in this app (see "Credit risk drafts and submits configuration changes for review"), but approving and publishing was previously demonstrated by switching to the administrator session in this same app's mock store. Once the administrator role moves to the separate `apps/admin`, with its own independent mock store, that publish step can no longer happen here — it is covered instead by `admin-console`'s own "Configuration changes are maker-checker" requirement, seeded there with a draft already submitted by credit risk.
**Migration**: `apps/backoffice`'s product and rule-set tests that simulated the publish step by switching to the `"admin"` session move to `apps/admin`'s test suite, asserting against that app's own seeded in-review draft instead of one created live in the same test.

### Requirement: Module feature flags are a tenant setting
**Reason**: The tenant administrator role, and the Tenant settings screen's only edit control, move to the separate admin console (see `admin-console` capability's "Module feature flags are a tenant setting" requirement). Nobody else was ever granted this control in `apps/backoffice`.
**Migration**: No staff-console behavior to migrate — compliance's existing read-only view of Tenant settings is unaffected. Turning the AI flag on or off now happens only in the admin console.

### Requirement: Failure drills are admin-only and logged
**Reason**: The tenant administrator role, and the Integrations screen's only edit control, move to the separate admin console (see `admin-console` capability's "Failure drills are logged" requirement).
**Migration**: No staff-console behavior to migrate — compliance's existing read-only view of Integrations is unaffected. Toggling the bureau-outage or core-timeout drill now happens only in the admin console.
