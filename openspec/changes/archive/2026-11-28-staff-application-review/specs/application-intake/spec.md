# Spec Delta

## ADDED Requirements

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
