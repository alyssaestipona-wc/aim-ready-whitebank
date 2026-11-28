# Spec Delta

## MODIFIED Requirements

### Requirement: Staff sign-in is two-step
The console SHALL ask for email and password first, checked against the real identity service (`api-auth`) rather than an in-memory mock array. It SHALL show the authentication-code field only after a known staff email and correct password, and sign the user in after the identity service verifies a six-digit code. The page SHALL NOT list demo accounts. The seeded tenant-administrator email SHALL be refused here with a console-specific message instead of the generic incorrect-credentials error, since the administrator signs in at the separate admin console.

#### Scenario: Wrong password
- **GIVEN** the sign-in page
- **WHEN** `approver@kalinawbank.ph` is entered with a wrong password and the user selects Continue
- **THEN** a red inline error "Email or password is incorrect." is shown and no code field appears

#### Scenario: Correct credentials reveal the code step
- **GIVEN** the sign-in page at the email and password step
- **WHEN** `approver@kalinawbank.ph` and the demo password are submitted
- **THEN** the email is shown with a Change link, an "Authentication code" field appears, and the button reads "Verify and sign in"

#### Scenario: Invalid code
- **GIVEN** the code step after valid credentials for `approver@kalinawbank.ph`
- **WHEN** a code that is not six digits, or one the identity service does not recognize, is submitted
- **THEN** a red inline error "That code is incorrect. Try again." is shown

#### Scenario: Successful sign-in lands on the role's home screen
- **GIVEN** the code step for `approver@kalinawbank.ph`
- **WHEN** the approver completes the code step
- **THEN** the identity service issues a session, the console stores it in `wbl_staff_session`, and the approver lands on Approvals, and each other role lands on its own home screen (branch and loan officer: Work queues; loan operations and supervisor: Booking; credit risk: Decisioning dashboard; compliance: Audit log)

#### Scenario: Administrator email is refused here
- **GIVEN** the sign-in page at the email and password step
- **WHEN** the seeded tenant-administrator email is submitted with its correct password
- **THEN** a red inline error "Tenant administrators sign in at the separate admin console." is shown and no code field appears

#### Scenario: Identity service unavailable
- **GIVEN** the sign-in page at either step
- **WHEN** credentials or a code are submitted while the identity service is unreachable
- **THEN** a distinct "We can't sign you in right now. Try again shortly." error is shown, not the generic incorrect-credentials or invalid-code message
