# Spec Delta

## Purpose

Captures a borrower's loan application for real in `apps/api`: validates it, runs the decision pipeline, and persists the application and its immutable decision record so every later epic (work queues, approvals, documents, booking) has something real to work against.

## ADDED Requirements

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
