# Spec Delta

## MODIFIED Requirements

### Requirement: Three-step loan application
The apply page SHALL collect the following in three steps, then submit to the real `application-intake` endpoint (`apps/api`):
1. product, amount and term, with a live estimated monthly payment;
2. monthly income, other monthly loan payments and purpose;
3. a review and three consents.

Money fields SHALL format with thousands separators and two decimals. Back and Continue SHALL be equal width. Client-side checks are UX only; the API is the validation authority.

#### Scenario: Amount out of range
- **GIVEN** step 1 of the application for a personal loan
- **WHEN** Continue is selected on step 1 with an amount outside the product's limits
- **THEN** a red inline error "Enter an amount between ₱X and ₱Y." is shown and the step does not advance

#### Scenario: Missing consent
- **GIVEN** step 3 of the application
- **WHEN** Submit is selected without all three consents ticked
- **THEN** a red inline error names the missing consents and nothing is submitted

#### Scenario: Duplicate open application
- **GIVEN** an open application for the same product
- **WHEN** a new one is submitted
- **THEN** the API rejects it, naming the existing application, and the portal shows that error with no new application created

#### Scenario: Submission runs checks
- **GIVEN** Juan, signed in with no open application, on step 3 with all consents ticked
- **WHEN** a ₱150,000 / 24-month personal loan is submitted
- **THEN** a "Just a moment…" loading state shows, then "Application sent" shows "You're approved for ₱150,000". The application and its decision record (inputs, rule-set version, model version, outcome) are computed and persisted by `apps/api`, not the browser.

#### Scenario: Decision record is immutable
- **GIVEN** a submitted application with its decision record, persisted by `apps/api`
- **WHEN** later steps change its stage (offer accepted, documents signed, funds released)
- **THEN** the stored decision inputs, versions and outcome are unchanged

#### Scenario: Application service unavailable
- **GIVEN** step 3 of the application with all consents ticked
- **WHEN** submit is selected while the application service is unreachable
- **THEN** a distinct "We couldn't submit your application right now. Try again shortly." error is shown, and nothing is submitted
