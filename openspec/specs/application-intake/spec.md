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

#### Scenario: An application awaiting approval still counts as open
- **GIVEN** a borrower whose application has been recommended and is in the `Approval` stage
- **WHEN** they submit a second application for the same product
- **THEN** the API rejects it, naming the existing application

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
An approver SHALL be able to approve or decline an `Approval`-stage, recommended application, moving it to `Offer` or `Declined`. Approving uses the recommendation's amount and tenor. The approver SHALL never be the officer who made the recommendation. Deciding an application with no recommendation, or not in `Approval`, SHALL be refused.

#### Scenario: Approving a referred application within authority
- **GIVEN** an `Approval`-stage application recommended by a different user, with amount and grade within the approver's authority
- **WHEN** the approver approves it
- **THEN** the application moves to `Offer`, records who decided it, and the response includes the monthly repayment computed from the recommendation's amount and tenor

#### Scenario: Declining a referred application with a reason code
- **GIVEN** an `Approval`-stage application recommended by a different user
- **WHEN** the approver declines it with a valid reason code
- **THEN** the application moves to `Declined` and records who decided it and the reason code

#### Scenario: Deciding an application not in Review
- **GIVEN** an application in `Review`, `Offer`, `Declined`, `Disbursed`, or `Withdrawn`
- **WHEN** an approver attempts to decide it
- **THEN** the request is refused

#### Scenario: Approving own recommendation is refused
- **GIVEN** an `Approval`-stage application recommended by the current approver
- **WHEN** that same user attempts to decide it
- **THEN** the request is refused, naming the segregation-of-duties rule, and the application stays in `Approval`

### Requirement: Approval is refused above the approver's delegated authority
Approving a recommendation whose amount exceeds the approver's seeded amount limit, or whose decision grade is outside the approver's seeded allowed grades, SHALL be refused with a specific error naming the limit, rather than approved or routed anywhere else.

#### Scenario: Amount above the approver's limit
- **GIVEN** an `Approval`-stage application whose recommended amount is above the approver's seeded limit
- **WHEN** the approver attempts to approve it
- **THEN** the request is refused, naming the limit, and the application stays in `Approval`

#### Scenario: Grade outside the approver's allowed grades
- **GIVEN** an `Approval`-stage application whose decision grade is not one of the approver's seeded allowed grades
- **WHEN** the approver attempts to approve it
- **THEN** the request is refused and the application stays in `Approval`

### Requirement: Declining requires a reason code from a fixed list
A decline SHALL require a reason code from the seeded, fixed list of decline reasons; a missing or invalid code SHALL be refused, naming the valid codes.

#### Scenario: Missing reason code
- **GIVEN** an `Approval`-stage application
- **WHEN** the approver attempts to decline it with no reason code
- **THEN** the request is refused, naming the valid reason codes, and the application stays in `Approval`

#### Scenario: Invalid reason code
- **GIVEN** an `Approval`-stage application
- **WHEN** the approver attempts to decline it with a reason code not in the seeded list
- **THEN** the request is refused and the application stays in `Approval`

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

### Requirement: An officer can recommend a decision on a referred application
The owning officer of a `Review`-stage application SHALL be able to recommend approve, a counter-offer (a different amount and/or tenor), or decline, moving the application to `Approval`, with an optional free-text note for the approver.

#### Scenario: Recommending moves the application to Approval
- **GIVEN** a `Review`-stage application owned by the officer
- **WHEN** they recommend a decision
- **THEN** the application moves to `Approval`, recording the recommendation

#### Scenario: Only the owning officer can recommend
- **GIVEN** a `Review`-stage application assigned to a different officer
- **WHEN** another officer attempts to recommend a decision
- **THEN** the request is refused

### Requirement: A recommendation differing from the AI is classified and requires a reason
A recommendation that differs from the AI's own implicit recommendation (derived from the decision record) in decision or amount/tenor SHALL require a reason code from a fixed seeded list; recommending without one when it differs SHALL be refused. A difference of at least the seeded override threshold (₱50,000), or a decision that flips approve to decline or vice versa, SHALL be classified as an override above threshold; a smaller difference SHALL be classified below threshold.

#### Scenario: Recommending within the AI recommendation needs no reason
- **GIVEN** a `Review`-stage application owned by the officer
- **WHEN** they recommend approve at the AI's own recommended amount and tenor
- **THEN** the application moves to `Approval` with no reason code required

#### Scenario: Recommending a counter-offer without a reason is refused
- **GIVEN** a `Review`-stage application whose AI recommendation is to approve a given amount
- **WHEN** the owning officer recommends a different amount with no reason code
- **THEN** the request is refused and the application stays in `Review`

#### Scenario: An override at or above the threshold is flagged above threshold
- **GIVEN** a `Review`-stage application whose AI-recommended amount is ₱150,000
- **WHEN** the owning officer recommends ₱90,000 with a reason code
- **THEN** the application moves to `Approval`, recording the recommendation as an override above the ₱50,000 threshold with its reason code

#### Scenario: A decision flip is always flagged above threshold regardless of amount
- **GIVEN** a `Review`-stage application whose AI recommendation is approve
- **WHEN** the owning officer recommends decline with a reason code
- **THEN** the application moves to `Approval`, recording the recommendation as an override above threshold

### Requirement: An approver can return a recommended application to the officer
An approver SHALL be able to return an `Approval`-stage application to `Review`, clearing its recommendation and reassigning it to the officer who made the recommendation.

#### Scenario: Returning a recommended application
- **GIVEN** an `Approval`-stage application
- **WHEN** an approver returns it
- **THEN** the application moves back to `Review`, its recommendation is cleared, and it is reassigned to the recommending officer

### Requirement: The decision record exposes the AI's implicit recommendation and the final decided outcome
An application's detail SHALL include the AI's own implicit recommendation (approve at a capped amount, derived from the stored decision record, for any referred or approved outcome) alongside the actual final outcome once decided (who decided it, when, and the declined reason code if declined), so the two are never conflated.

#### Scenario: AI recommendation shown for a referred application
- **GIVEN** a `Review`-stage application with a referred decision record
- **WHEN** its detail is read
- **THEN** the response includes the AI's implicit recommended decision and capped amount, distinct from the stored decision's own `outcome` field

#### Scenario: Final decision shown once decided
- **GIVEN** an application that has moved to `Offer` or `Declined`
- **WHEN** its detail is read
- **THEN** the response includes who decided it, when, and (for a decline) the reason code, alongside the unchanged original decision record

### Requirement: A kill switch and bureau-down flag can be toggled and take effect immediately
A tenant administrator SHALL be able to toggle a kill switch and a bureau-down flag for the tenant. Once toggled, every new application submitted afterward SHALL be affected; an application already decided before the toggle SHALL be unaffected.

#### Scenario: Turning the kill switch on routes new applications to refer
- **GIVEN** the kill switch is off and a product's automation is live
- **WHEN** a tenant administrator turns the kill switch on and a new application is submitted
- **THEN** the application is referred, with the reason stating the kill switch is on

#### Scenario: An application already decided is unaffected by a later toggle
- **GIVEN** an application already decided before the kill switch is turned on
- **WHEN** the kill switch is turned on afterward
- **THEN** that application's own decision record is unchanged

### Requirement: A borrower can list their own applications
A signed-in borrower SHALL be able to retrieve their own applications for their tenant, in a plain, borrower-appropriate shape: id, product, amount, tenor, stage, plain-language outcome where applicable, decline reason code (if declined), and submission date. Internal fields the staff-facing shapes carry (score, grade, rule-by-rule results, rule-set/model version, reviewer id) SHALL NOT be included.

#### Scenario: Borrower lists their own applications
- **GIVEN** a signed-in borrower with one or more real applications
- **WHEN** they request their own applications
- **THEN** the response includes each one, scoped to their own tenant and their own borrower id, with only the borrower-appropriate fields

#### Scenario: A borrower never sees another borrower's application
- **GIVEN** two borrowers in the same tenant, each with their own application
- **WHEN** one borrower requests their own applications
- **THEN** the response never includes the other borrower's application

#### Scenario: Staff cannot use the borrower-scoped endpoint
- **GIVEN** a staff-role session
- **WHEN** they call the borrower-scoped applications endpoint
- **THEN** the request is refused
