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

### Requirement: Staff can filter the applications list by queue
A staff user SHALL be able to filter the applications list to their own assigned applications (`mine`), or to unassigned `Review`-stage applications (`unassigned`); omitting the filter SHALL return every application for their tenant regardless of assignee.

#### Scenario: My queue
- **GIVEN** a staff user with two assigned applications and one unassigned application in their tenant
- **WHEN** they request the list filtered to `mine`
- **THEN** only the two applications assigned to them are returned

#### Scenario: Unassigned queue
- **GIVEN** a tenant with one unassigned `Review`-stage application and one assigned `Review`-stage application
- **WHEN** a staff user requests the list filtered to `unassigned`
- **THEN** only the unassigned `Review`-stage application is returned

### Requirement: An officer can pick an unassigned referred application
An officer SHALL be able to claim ownership of an unassigned, `Review`-stage application in their own tenant. Picking an application that is not `Review`-stage, not in their tenant, or already assigned SHALL be refused.

#### Scenario: Picking an unassigned application
- **GIVEN** an unassigned `Review`-stage application
- **WHEN** an officer picks it
- **THEN** the application is assigned to that officer, with the time recorded

#### Scenario: Picking an already-assigned application
- **GIVEN** a `Review`-stage application already assigned to another officer
- **WHEN** a different officer attempts to pick it
- **THEN** the request is refused and the original assignment is unchanged

#### Scenario: Two officers racing to pick the same application
- **GIVEN** an unassigned `Review`-stage application
- **WHEN** two officers attempt to pick it at the same time
- **THEN** exactly one succeeds and the other is refused

### Requirement: Every application reports time left against its stage SLA
Every application in a stage with a seeded SLA duration SHALL report the hours remaining in its current stage, computed from when it entered that stage; a stage with no seeded SLA SHALL report no SLA value.

#### Scenario: Hours left for a Review-stage application
- **GIVEN** an application in the `Review` stage
- **WHEN** it is read back
- **THEN** the response includes the hours remaining against `Review`'s seeded SLA duration

#### Scenario: No SLA for a terminal stage
- **GIVEN** an application in `Offer`, `Declined`, `Disbursed`, or `Withdrawn`
- **WHEN** it is read back
- **THEN** the response reports no SLA value

### Requirement: An officer can request information from the borrower
An officer SHALL be able to move a `Review`-stage application they can act on to `Info requested`, recording a checklist of requested items (from a seeded list) and a message. The application's SLA timer SHALL reset to the seeded `Info requested` duration.

#### Scenario: Requesting information
- **GIVEN** a `Review`-stage application
- **WHEN** an officer requests information with at least one checklist item and a message
- **THEN** the application moves to `Info requested`, storing the items and message, with a fresh SLA window

#### Scenario: Requesting information with no items
- **GIVEN** a `Review`-stage application
- **WHEN** an officer attempts to request information with no checklist items selected
- **THEN** the request is refused and the application stays in `Review`

### Requirement: An officer can mark an information request resolved
An officer SHALL be able to move an `Info requested` application back to `Review`, clearing the stored request. This stands in for a real borrower response until document upload exists for real.

#### Scenario: Marking a request resolved
- **GIVEN** an application in `Info requested`
- **WHEN** an officer marks it resolved
- **THEN** the application moves back to `Review` and the stored checklist and message are cleared

#### Scenario: Resolving an application not awaiting information
- **GIVEN** an application not in `Info requested`
- **WHEN** an officer attempts to mark it resolved
- **THEN** the request is refused
