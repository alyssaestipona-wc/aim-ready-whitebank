# Spec Delta

## ADDED Requirements

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
