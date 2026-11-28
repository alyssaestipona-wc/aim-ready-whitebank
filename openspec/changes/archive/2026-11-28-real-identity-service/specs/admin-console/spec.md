# Spec Delta

## MODIFIED Requirements

### Requirement: Admin sign-in is two-step
The console SHALL ask for email and password first, checked against the real identity service (`api-auth`) rather than an in-memory mock array, then a six-digit authentication code verified the same way. It SHALL accept only the single seeded tenant-administrator account. The page SHALL NOT list demo accounts and SHALL NOT share a session with the staff console.

#### Scenario: Wrong password
- **GIVEN** the admin console's sign-in page
- **WHEN** the seeded administrator email is entered with a wrong password
- **THEN** a red inline error "Email or password is incorrect." is shown and no code field appears

#### Scenario: Correct credentials reveal the code step
- **GIVEN** the sign-in page at the email and password step
- **WHEN** the seeded administrator email and its demo password are submitted
- **THEN** the email is shown with a Change link, an "Authentication code" field appears, and the button reads "Verify and sign in"

#### Scenario: Successful sign-in lands on Products
- **GIVEN** the code step for the seeded administrator
- **WHEN** the code step completes
- **THEN** the identity service issues a session, the console stores it in `wbl_admin_session`, and the administrator lands on Products

#### Scenario: Staff or borrower credentials are refused here
- **GIVEN** the admin console's sign-in page
- **WHEN** a staff or borrower email is submitted with its own correct password
- **THEN** a red inline error "Email or password is incorrect." is shown, identical to an unknown email, so neither email's existence is revealed

#### Scenario: Identity service unavailable
- **GIVEN** the admin console's sign-in page at either step
- **WHEN** credentials or a code are submitted while the identity service is unreachable
- **THEN** a distinct "We can't sign you in right now. Try again shortly." error is shown, not the generic incorrect-credentials message
