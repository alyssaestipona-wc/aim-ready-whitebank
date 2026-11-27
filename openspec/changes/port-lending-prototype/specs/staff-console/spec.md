# Spec Delta

## Purpose

The staff console is the web app bank staff use to work loan applications from
intake to booking, review reports and compliance records, and maintain tenant
configuration. In this phase every screen runs on simulated data.

## ADDED Requirements

### Requirement: Staff sign-in is two-step
The console SHALL ask for email and password first. It SHALL show the authentication-code field only after a known staff email and correct password, and sign the user in after a six-digit code. The page SHALL NOT list demo accounts.

#### Scenario: Wrong password
- **GIVEN** the sign-in page
- **WHEN** `approver@whitebank.ph` is entered with a wrong password and the user selects Continue
- **THEN** a red inline error "Email or password is incorrect." is shown and no code field appears

#### Scenario: Correct credentials reveal the code step
- **GIVEN** the sign-in page at the email and password step
- **WHEN** `approver@whitebank.ph` and the demo password are submitted
- **THEN** the email is shown with a Change link, an "Authentication code" field appears, and the button reads "Verify and sign in"

#### Scenario: Invalid code
- **GIVEN** the code step after valid credentials for `approver@whitebank.ph`
- **WHEN** a code that is not six digits is submitted
- **THEN** a red inline error "That code is incorrect. Try again." is shown

#### Scenario: Successful sign-in lands on the role's home screen
- **GIVEN** the code step for `approver@whitebank.ph`
- **WHEN** the approver completes the code step
- **THEN** the approver lands on Approvals, and each other role lands on its own home screen (branch and loan officer: Work queues; loan operations and supervisor: Booking; credit risk: Decisioning dashboard; compliance: Audit log; administrator: Products)

### Requirement: Staff routes are role-scoped and checked on the server
Each staff route SHALL be reachable only by the roles the prototype's navigation grants. The sidebar SHALL list only permitted routes. A request for a forbidden route SHALL be refused before the page renders, by a server-side session check, and SHALL show the "You don't have access to this" screen.

#### Scenario: Forbidden route by URL
- **GIVEN** a branch officer is signed in
- **WHEN** the browser requests the Audit log route directly
- **THEN** the access-denied screen is shown with a "Go to my work" button, and the Audit log content is not rendered

#### Scenario: Signed-out request
- **GIVEN** no staff session
- **WHEN** any console route other than sign-in is requested
- **THEN** the user is redirected to sign-in

#### Scenario: Compliance is read-only
- **GIVEN** the compliance role
- **WHEN** a case, the booking queue or a configuration screen is opened
- **THEN** the content is visible but every state-changing action is disabled or absent

#### Scenario: Compliance exports its own AML escalations
- **GIVEN** the compliance role on AML escalations, a screen only compliance can open
- **WHEN** "Mark reviewed and export" is selected
- **THEN** the export is allowed, as the prototype does, and audit-logged

### Requirement: Console shell
Every signed-in console page SHALL show:
- a slim top strip with the app name and a link to the borrower web app;
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

### Requirement: Notifications
The bell SHALL open a dropdown with role-specific notifications, newest first, with an unread count. It SHALL load 10 more as the list is scrolled, and offer "Mark all as read" and "View all notifications". The notifications page SHALL show an unread count and a paginated, filterable list (10 per page). It SHALL NOT show summary cards.

#### Scenario: Dropdown loads on scroll
- **GIVEN** more than 10 notifications
- **WHEN** the dropdown list is scrolled to its end
- **THEN** 10 more items are appended, with no page buttons, until "You've reached the end" shows

#### Scenario: Notifications page
- **GIVEN** the bell dropdown is open
- **WHEN** "View all notifications" is selected
- **THEN** the notifications page shows "N unread", Status and Type filters, search, and the first 10 items with numbered pagination

#### Scenario: Opening a notification
- **GIVEN** an unread notification about a case
- **WHEN** a notification is selected
- **THEN** it is marked read and the user is taken to the case or screen it refers to

### Requirement: Lists are searchable, filterable and paginated
Every table, log and growing list SHALL offer search, the filters the prototype defines for it, and pagination (10 rows per page unless the prototype sets another size). It SHALL show an empty state when nothing matches.

Pagination covers queues, applications, audit, reports tables, configuration lists and case activity history (8 per page).

The simulated data SHALL hold more than one page for each list.

#### Scenario: Paging a list
- **GIVEN** All applications with more than 10 rows
- **WHEN** page 2 is selected
- **THEN** rows 11–20 are shown and the footer reads "Showing 11–20 of N"

#### Scenario: No matches
- **GIVEN** All applications
- **WHEN** a search matches nothing
- **THEN** a "No matches" empty state with a hint to clear the filters is shown, and a Clear control resets search and filters

### Requirement: Work queues and SLA watch
Branch officers, loan officers, approvers, loan operations and compliance SHALL see their own queue, with tabs that include an unassigned queue. An SLA watch list SHALL show cases by hours left, with breached and at-risk cases flagged. A loan officer SHALL be able to pick an unassigned case.

#### Scenario: Pick an unassigned case
- **GIVEN** a loan officer viewing an unassigned case in Review
- **WHEN** "Pick this case" is selected
- **THEN** the officer becomes the owner, a toast confirms it, and the pick is recorded in the case history

### Requirement: Case detail
A case page SHALL show:
- the applicant summary, with the government ID masked and a Reveal action that is audit-logged;
- the decision summary, with score, grade, rules fired and reason codes;
- the documents, each opening in a document viewer;
- the paginated activity history, filterable by actor;
- an actions card whose actions depend on the case stage and the user's role.

#### Scenario: Reveal government ID
- **GIVEN** a loan officer on a case page with the ID masked
- **WHEN** Reveal is selected and confirmed in the dialog
- **THEN** the full ID is shown and a history entry records the reveal

#### Scenario: View a document
- **GIVEN** a case page with a verified government ID document
- **WHEN** a document that is not missing is selected
- **THEN** a dialog shows a rendered preview with file name, version and who added it; missing documents are not clickable

### Requirement: Officer review actions
In Review, the owning loan officer SHALL be able to:
- request information from the borrower, choosing at least one item, which moves the case to Info requested;
- recommend approve, counter-offer or decline, which moves the case to Approval.

A recommendation that differs from the AI recommendation SHALL require a reason code. If it differs by at least the tenant's override threshold (seeded as ₱50,000), or flips approve/decline, it SHALL be flagged as an override above threshold.

#### Scenario: Request information without items
- **GIVEN** the owning officer on a case in Review
- **WHEN** the request dialog is submitted with no item ticked
- **THEN** a red inline error "Pick at least one item to request." is shown and the case does not change

#### Scenario: Override without reason
- **GIVEN** the recommend dialog on a case whose AI recommendation is approve ₱150,000
- **WHEN** a counter-offer different from the AI amount is submitted without a reason code
- **THEN** the dialog shows a red inline error and does not submit

#### Scenario: Recommendation sent
- **GIVEN** the recommend dialog on a case whose AI recommendation is approve ₱150,000
- **WHEN** a counter-offer of ₱90,000 is submitted with a reason code
- **THEN** the case moves to Approval and history records the counter-offer as an override above the ₱50,000 threshold with its reason

### Requirement: Approver decisions enforce segregation and authority
An approver SHALL be able to approve, return or decline a case in Approval. Approving SHALL be refused when the approver made the recommendation. A case above the approver's authority in the tenant approval matrix (seeded as ₱1,000,000, grades A–C) SHALL be routed to credit committee. Approval SHALL show the monthly repayment and move the case to Offer.

#### Scenario: Approving own recommendation
- **GIVEN** the recommender is the current user
- **WHEN** Approve is selected
- **THEN** the action is refused with "You recommended this case. A different approver must decide it." and the block is recorded in history

#### Scenario: Above authority
- **GIVEN** a recommendation above the seeded ₱1,000,000 authority, or a grade outside A–C
- **WHEN** Approve is selected
- **THEN** a dialog offers "Route to committee", which moves the case to Committee

#### Scenario: Approve within authority
- **GIVEN** a ₱150,000 / 24-month recommendation by another user, at grade B
- **WHEN** Approve is selected and confirmed
- **THEN** the dialog shows the monthly repayment, and the case moves to Offer with the approval in history

#### Scenario: Return to officer
- **GIVEN** a case in Approval
- **WHEN** "Return to officer" is selected
- **THEN** the case goes back to Review, owned by the recommender

#### Scenario: Decline
- **GIVEN** a case in Approval with an approve recommendation
- **WHEN** Decline is confirmed with a reason code
- **THEN** the case moves to Declined and the reason is recorded in history

### Requirement: Simulated decision on new applications
Submitting an assisted or file-intake application SHALL run the simulated decision pipeline using tenant configuration, in this order:
1. policy knockouts;
2. score;
3. product decision bands.

The decision summary SHALL say that the pipeline is simulated.

#### Scenario: Auto-approved case
- **GIVEN** the kill switch is off, the bureau is available, and an assisted personal loan of ₱100,000 for an applicant with no knockouts, a bureau score that yields 700 or more, and a debt-to-income ratio under the configured limit
- **WHEN** it is submitted
- **THEN** the case is auto-approved to Offer and its decision summary is labelled simulated

### Requirement: Manual review fallback
With the kill switch on, or during a simulated bureau outage, a new application SHALL go to manual review instead of being auto-decided.

#### Scenario: Kill switch routes to review
- **GIVEN** the kill switch is on
- **WHEN** an assisted application is submitted
- **THEN** the new case is in Review with history noting automation is paused

#### Scenario: Bureau outage routes to review
- **GIVEN** the simulated bureau outage drill is on
- **WHEN** an assisted application is submitted
- **THEN** the new case is in Review with history noting the bureau was unavailable

### Requirement: Decision record is reproducible
Each decision SHALL record its inputs, rule-set version, model version and outcome in the case history and decision summary. That record SHALL NOT change afterwards.

#### Scenario: Reproducible record
- **GIVEN** an auto-decided case
- **WHEN** its decision summary is opened
- **THEN** it shows the rule-set version, model version, score, band and outcome used

#### Scenario: Record unchanged by later actions
- **GIVEN** an auto-referred case
- **WHEN** an officer recommends an override and an approver approves it
- **THEN** the original decision record's inputs, versions and outcome are unchanged, and the override is recorded separately

### Requirement: Assisted application and intake
Branch and loan officers SHALL be able to:
- create an assisted application, with ID scan, verification, upload and money-formatted amount and income fields;
- resume a saved draft;
- process email and file intake items into cases.

Required fields SHALL show red inline errors.

#### Scenario: Missing required field
- **GIVEN** a branch officer on the assisted application
- **WHEN** the assisted application is submitted with the amount empty
- **THEN** the amount field is marked in red with an inline message and no case is created

#### Scenario: Money formatting
- **GIVEN** the assisted application's amount field
- **WHEN** 250000 is typed into an amount field
- **THEN** it displays as "250,000.00" on blur, with a ₱ prefix

### Requirement: Closing and maker-checker booking
Loan operations SHALL generate documents and send them for e-signature, then submit a signed case for booking. Each booking submission SHALL get one idempotency key. Booking SHALL complete only when a loan operations supervisor approves it as checker, and the checker SHALL NOT be the person who made the booking. A simulated core timeout SHALL move the case to booking exceptions. From there it can be retried with the same key.

#### Scenario: Duplicate submit
- **GIVEN** a case already submitted for checking
- **WHEN** booking is submitted again
- **THEN** the second submit is refused with "Already submitted. Duplicate blocked."

#### Scenario: Maker cannot check
- **GIVEN** the maker is the current user
- **WHEN** they try to approve the booking as checker
- **THEN** it is refused and the attempt is recorded in history

#### Scenario: Core timeout and retry
- **GIVEN** the core booking timeout drill is on
- **WHEN** the supervisor approves a booking
- **THEN** the case appears in Booking exceptions with the error. Retry books it with the same idempotency key and shows the new loan number

### Requirement: Reports
Officers, approvers, credit risk, compliance and administrators SHALL see the origination funnel, turnaround and SLA, and decisioning dashboards. Credit risk, compliance and administrators SHALL also see the regulatory extracts. Every chart SHALL use the single accent colour.

#### Scenario: Dashboard opens
- **GIVEN** credit risk is signed in
- **WHEN** credit risk opens the decisioning dashboard
- **THEN** it shows the approve, refer and decline split, override counts and a paginated table, with all bars in the accent colour

### Requirement: Regulatory extract validation
Credit risk and administrators SHALL be able to generate the monthly credit bureau (CIC) file. A file with validation errors SHALL NOT be markable as submitted until it is fixed and regenerated. Each step SHALL be audit-logged.

#### Scenario: File with errors
- **GIVEN** credit risk on Regulatory extracts
- **WHEN** the Nov 2026 CIC file is generated
- **THEN** it shows 2 validation errors, Mark submitted is disabled, and "Fix and regenerate" is offered

#### Scenario: Fixed file submitted
- **GIVEN** the regenerated file with 0 errors
- **WHEN** Mark submitted is selected
- **THEN** the file shows as submitted with today's date and the audit log records it

### Requirement: Compliance views
Compliance SHALL see the audit log, consent records, AML escalations, related-party lending and model governance findings. Credit risk SHALL also see model governance, and administrators SHALL also see the audit log. Each SHALL be filterable and paginated. Marking an AML escalation reviewed and exported SHALL be recorded in the audit log.

#### Scenario: AML escalation exported
- **GIVEN** compliance on AML escalations with an open escalation
- **WHEN** "Mark reviewed and export" is selected
- **THEN** its status becomes "Exported to AML system" and the audit log records it

#### Scenario: Audit log filter
- **GIVEN** compliance on the audit log
- **WHEN** the audit log is filtered by actor
- **THEN** only that actor's entries are shown, paginated

### Requirement: Tenant configuration screens
Credit risk, administrators and compliance SHALL see the configuration screens their role is granted:
- products and campaigns;
- workflows, approval matrix, templates and notifications;
- decisioning;
- AI models (behind the AI flag);
- integrations, users and tenant settings.

Only product parameters, the rule set, the kill switch, automation modes, module flags and the failure drills SHALL be changeable. Every other configuration screen SHALL be read-only, with no publish path.

#### Scenario: Read-only configuration
- **GIVEN** the administrator is signed in
- **WHEN** the approval matrix, workflows, templates, notifications or users screen is opened
- **THEN** the configuration is shown with no edit or publish control

### Requirement: Configuration changes are maker-checker
Product parameter and rule-set changes SHALL follow draft, then submit for review, then approve and publish by a different credit risk or administrator user. The author SHALL NOT publish their own change. The UI SHALL state that this check is simulated on the client until the API enforces it.

#### Scenario: Author cannot publish own rule set
- **GIVEN** a draft rule set submitted for review by the current user
- **WHEN** "Approve and publish" is selected
- **THEN** it is refused with "You submitted this change; a different person must approve it"

#### Scenario: Second person publishes a product change
- **GIVEN** a personal-loan draft submitted by credit risk
- **WHEN** the administrator selects "Approve and publish"
- **THEN** the product version increments, the new limits apply, and the audit log names both people

#### Scenario: Invalid product draft
- **GIVEN** a product draft whose auto-approval limit exceeds its maximum amount
- **WHEN** it is submitted for review
- **THEN** it is refused with "The auto-approval limit can't exceed the maximum amount."

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
- **GIVEN** the administrator on AI models
- **WHEN** the kill switch control is shown
- **THEN** it is disabled

### Requirement: Module feature flags are a tenant setting
Per PRD story PLT-2, the tenant administrator SHALL turn the AI credit scoring module on or off from Tenant settings with one confirmation. Turning it off SHALL remove its navigation for every role at once and state that existing records are kept. Each change SHALL be audit-logged.

#### Scenario: AI flag off hides models
- **GIVEN** the administrator on Tenant settings
- **WHEN** the AI scoring flag is turned off and confirmed
- **THEN** the dialog has stated that existing records are kept, the AI models screen leaves the navigation, its route is refused for every role, and the audit log records the change

#### Scenario: AI flag back on
- **GIVEN** the AI flag is off
- **WHEN** the administrator turns it on and confirms
- **THEN** AI models returns to the navigation for permitted roles and the audit log records the change

### Requirement: Failure drills are admin-only and logged
Only the tenant administrator SHALL toggle the simulated bureau-outage and core-timeout drills, from Integrations. Each toggle SHALL be audit-logged.

#### Scenario: Admin turns on a drill
- **GIVEN** the administrator on Integrations
- **WHEN** the bureau-outage drill is turned on
- **THEN** the bureau shows as an outage (simulated), a toast confirms it, and the audit log records it

#### Scenario: Other roles cannot toggle drills
- **GIVEN** compliance on Integrations
- **WHEN** the screen is shown
- **THEN** both drill controls are disabled

### Requirement: Simulated state is per browser and resettable
The console SHALL keep simulated changes in the browser so they survive reloads. It SHALL offer "Reset demo data" with a confirmation, which restores the seed data and keeps the user signed in. Every simulated record SHALL carry a tenant identifier.

#### Scenario: Reset
- **GIVEN** a signed-in user who has changed cases and configuration
- **WHEN** Reset demo data is confirmed
- **THEN** all cases and configuration return to the seed state and the user stays signed in
