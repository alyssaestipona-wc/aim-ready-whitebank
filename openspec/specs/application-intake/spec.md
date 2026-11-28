# application-intake Specification

## Purpose

Captures a borrower's loan application for real in `apps/api`: validates it, runs the decision pipeline, and persists the application and its immutable decision record so every later epic (work queues, approvals, documents, booking) has something real to work against.

## Requirements

### Requirement: Submitting an application validates required fields and consents
The API SHALL reject a submission missing a required field (product, amount, tenor, income) or any of the three consents (credit check, data processing, terms), returning a specific error naming what is missing, and SHALL NOT persist a rejected submission.

#### Scenario: Missing consent
- **GIVEN** a submission with all fields valid but one consent unchecked
- **WHEN** it is submitted
- **THEN** the API rejects it, naming the missing consent, and creates no application

#### Scenario: Amount outside the product's limits
- **GIVEN** a submission with an amount outside the product's configured min/max
- **WHEN** it is submitted
- **THEN** the API rejects it with the product's actual limits in the error, and creates no application

### Requirement: Consent is captured with full provenance
Each of the three consents SHALL be stored as a separate, individually timestamped record carrying the terms version in force at capture time, not one blanket flag.

#### Scenario: Consent records are queryable per application
- **GIVEN** a successfully submitted application
- **WHEN** its consent records are read
- **THEN** each of the three consents has its own timestamp and terms version stored

### Requirement: A duplicate open application is blocked
A new submission for the same borrower and product SHALL be rejected, naming the existing application, whenever that borrower already has an application for that product in any stage other than Disbursed, Declined, or Withdrawn.

#### Scenario: Second application for the same product while one is open
- **GIVEN** a borrower with an open personal-loan application
- **WHEN** they submit a second personal-loan application
- **THEN** the API rejects it, naming the existing application, and creates no second one

#### Scenario: A new application is allowed once the prior one is closed
- **GIVEN** a borrower whose only prior application for a product is Disbursed, Declined, or Withdrawn
- **WHEN** they submit a new application for that product
- **THEN** the API accepts it

### Requirement: Every submission runs the automated decision pipeline
A validated, non-duplicate submission SHALL run the decision pipeline (policy knockouts, then score, then the product's decision bands) and persist the application with the resulting outcome (approve, refer, or decline) and an immutable decision record (inputs, rule-set version, model version, outcome).

#### Scenario: Auto-approved submission
- **GIVEN** a submission that clears every knockout and scores above the product's approve band
- **WHEN** it is submitted
- **THEN** the application is persisted with outcome `approve` and a decision record capturing the score, rule-set version and model version

#### Scenario: Referred submission
- **GIVEN** a submission that clears every knockout but trips a referral trigger (for example amount above the product's auto-approval limit)
- **WHEN** it is submitted
- **THEN** the application is persisted with outcome `refer` and the decision record names the trigger

#### Scenario: Declined submission
- **GIVEN** a submission that fails a policy knockout
- **WHEN** it is submitted
- **THEN** the application is persisted with outcome `decline`, no score is computed, and the decision record names the failed knockout

#### Scenario: Decision record is immutable
- **GIVEN** a persisted application and its decision record
- **WHEN** the application's stage changes later (by a future epic's own actions)
- **THEN** the stored decision record's inputs, versions and outcome are unchanged

### Requirement: Every application and consent record carries a tenant identifier
Every row this capability writes SHALL carry the tenant identifier, even in this single-tenant phase.

#### Scenario: Tenant identifier present on every write
- **GIVEN** a successfully submitted application
- **WHEN** the application and its consent records are read back
- **THEN** every row carries the tenant identifier of the submitting borrower's account

### Requirement: Application service outage degrades to a clear, safe failure
When the application service is unreachable or errors unexpectedly, the API SHALL return a distinct, identifiable failure rather than a generic error, and SHALL NOT partially persist a submission.

#### Scenario: Submission attempted during an outage
- **GIVEN** the application store's database or process is unavailable
- **WHEN** a submission is attempted
- **THEN** the API responds with a distinct "application service unavailable" failure and creates no application

### Requirement: Staff can list applications for their tenant
A staff user (branch, officer, approver, ops, opssup, risk, or compliance role) SHALL be able to retrieve a list of applications belonging to their own tenant, optionally filtered by stage and by product, with each row carrying its decision outcome and grade.

#### Scenario: Staff lists their tenant's applications
- **GIVEN** a staff user signed in to tenant "kalinaw"
- **WHEN** they request the applications list
- **THEN** they receive every application whose tenant identifier is "kalinaw", and none from any other tenant

#### Scenario: Filtering by stage
- **GIVEN** a staff user requesting the applications list with a stage filter of "Review"
- **WHEN** the list is returned
- **THEN** only applications currently in the "Review" stage are included

#### Scenario: A borrower cannot list applications
- **GIVEN** a signed-in borrower
- **WHEN** they call the applications list endpoint
- **THEN** the request is refused

### Requirement: Staff can view a single application's full decision record
A staff user SHALL be able to retrieve one application belonging to their own tenant, including its full decision record (score, grade, probability of default, rule-by-rule results, reasons, outcome, trigger, rule-set version, model version) and its consent records.

#### Scenario: Staff views an application's decision summary
- **GIVEN** a staff user and an application in their own tenant with a persisted decision record
- **WHEN** they request that application's detail
- **THEN** the response includes the decision's score, grade, every rule result, every reason, and the rule-set and model versions exactly as persisted

#### Scenario: Staff cannot view another tenant's application
- **GIVEN** a staff user in tenant "kalinaw" and an application belonging to a different tenant
- **WHEN** they request that application's detail
- **THEN** the request is refused the same way a missing application would be, revealing nothing about its existence

### Requirement: An approver can decide a referred application
An approver SHALL be able to approve or decline an application currently in the `Review` stage (one the decision pipeline referred), moving it to `Offer` or `Declined`, for an application belonging to their own tenant. Deciding an application not currently in `Review` SHALL be refused.

#### Scenario: Approving a referred application within authority
- **GIVEN** a referred application with amount and grade within the approver's authority
- **WHEN** the approver approves it
- **THEN** the application moves to `Offer`, records who decided it, and the response includes the computed monthly repayment

#### Scenario: Declining a referred application with a reason code
- **GIVEN** a referred application
- **WHEN** the approver declines it with a valid reason code
- **THEN** the application moves to `Declined` and records who decided it and the reason code

#### Scenario: Deciding an application not in Review
- **GIVEN** an application already in `Offer`, `Declined`, `Disbursed`, or `Withdrawn`
- **WHEN** an approver attempts to decide it
- **THEN** the request is refused

### Requirement: Approval is refused above the approver's delegated authority
Approving an application whose amount exceeds the approver's seeded amount limit, or whose decision grade is outside the approver's seeded allowed grades, SHALL be refused with a specific error naming the limit, rather than approved or routed anywhere else.

#### Scenario: Amount above the approver's limit
- **GIVEN** a referred application with an amount above the approver's seeded limit
- **WHEN** the approver attempts to approve it
- **THEN** the request is refused, naming the limit, and the application stays in `Review`

#### Scenario: Grade outside the approver's allowed grades
- **GIVEN** a referred application whose decision grade is not one of the approver's seeded allowed grades
- **WHEN** the approver attempts to approve it
- **THEN** the request is refused and the application stays in `Review`

### Requirement: Declining requires a reason code from a fixed list
A decline SHALL require a reason code from the seeded, fixed list of decline reasons; a missing or invalid code SHALL be refused, naming the valid codes.

#### Scenario: Missing reason code
- **GIVEN** a referred application
- **WHEN** the approver attempts to decline it with no reason code
- **THEN** the request is refused, naming the valid reason codes, and the application stays in `Review`

#### Scenario: Invalid reason code
- **GIVEN** a referred application
- **WHEN** the approver attempts to decline it with a reason code not in the seeded list
- **THEN** the request is refused and the application stays in `Review`
