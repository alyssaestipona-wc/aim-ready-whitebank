# Spec Delta

## ADDED Requirements

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
