# Spec Delta

## MODIFIED Requirements

### Requirement: Borrower sign-in by email
The portal SHALL sign a borrower in with email and password, checked against the real identity service (`api-auth`) rather than an in-memory mock array. Unknown emails and wrong passwords SHALL get the same error. The page SHALL NOT list demo accounts.

#### Scenario: Wrong password
- **GIVEN** the sign-in page
- **WHEN** `juan.delacruz@email.com` is submitted with a wrong password
- **THEN** a red inline error "Email or password is incorrect." is shown

#### Scenario: Successful sign-in
- **GIVEN** the sign-in page
- **WHEN** valid credentials are submitted
- **THEN** the identity service issues a session, the portal stores it in `wbl_borrower_session`, and the borrower lands on Home, which greets them by first name and shows their deposit account balance

#### Scenario: Signed-out request
- **GIVEN** no borrower session
- **WHEN** any portal page other than sign-in is requested
- **THEN** the sign-in page is shown

#### Scenario: Identity service unavailable
- **GIVEN** the sign-in page
- **WHEN** credentials are submitted while the identity service is unreachable
- **THEN** a distinct "We can't sign you in right now. Try again shortly." error is shown, not the generic incorrect-credentials message
