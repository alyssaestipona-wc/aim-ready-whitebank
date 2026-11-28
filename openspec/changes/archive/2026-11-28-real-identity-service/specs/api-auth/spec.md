# Spec Delta

## Purpose

The identity service in `apps/api` issues and verifies sessions for every staff, admin and borrower sign-in across all three frontend apps, replacing each app's own unsigned mock-cookie session with a real, server-verified one.

## ADDED Requirements

### Requirement: Login verifies credentials against stored accounts
The API SHALL expose a login endpoint that checks an email and password against a persisted, tenant-scoped account record with a hashed password. It SHALL return a generic error for both an unknown email and a wrong password, revealing neither which email exists.

#### Scenario: Unknown email
- **GIVEN** no account exists for an email
- **WHEN** login is called with that email and any password
- **THEN** the API responds with a generic "Email or password is incorrect." error, not a not-found error

#### Scenario: Wrong password
- **GIVEN** an account exists for an email
- **WHEN** login is called with that email and an incorrect password
- **THEN** the API responds with the same generic "Email or password is incorrect." error

#### Scenario: Correct credentials for a borrower account
- **GIVEN** a seeded borrower account
- **WHEN** login is called with its correct email and password
- **THEN** the API responds with a success result carrying a borrower session, with no further verification step required

#### Scenario: Correct credentials for a staff or admin account
- **GIVEN** a seeded staff or tenant-administrator account
- **WHEN** login is called with its correct email and password
- **THEN** the API responds with a success result indicating a verification code step is required, and does not yet issue a session

### Requirement: Two-step verification for staff and admin accounts
The API SHALL require a second, six-digit verification-code step for staff and tenant-administrator accounts before issuing a session. The code SHALL be bound to the specific login attempt and SHALL be rejected if it does not match or if no password step preceded it.

#### Scenario: Correct code issues a session
- **GIVEN** a staff account that completed the password step
- **WHEN** the matching six-digit code is submitted
- **THEN** the API issues a signed session for that account

#### Scenario: Incorrect code
- **GIVEN** a staff account that completed the password step
- **WHEN** a code that does not match is submitted
- **THEN** the API responds with an error and does not issue a session

#### Scenario: Code without a prior password step
- **GIVEN** no completed password step for an account
- **WHEN** a verification code is submitted on its own
- **THEN** the API rejects the request and does not issue a session

### Requirement: Tenant-administrator accounts are refused on the staff login path
The login endpoint SHALL distinguish the seeded tenant-administrator account from staff accounts and refuse it when presented through the staff console's login path, matching the existing console-specific refusal message.

#### Scenario: Administrator credentials submitted through the staff path
- **GIVEN** the seeded tenant-administrator account's correct email and password
- **WHEN** login is called through the staff console's login path
- **THEN** the API responds with a refusal distinct from the generic incorrect-credentials error, and issues no session

### Requirement: Sessions are signed and independently verifiable
The API SHALL issue a signed session token per successful sign-in and expose a verification endpoint (or equivalent) that each app's own route gate calls to confirm a token is valid, unexpired, and matches the role the app expects, without trusting any value the frontend set itself.

#### Scenario: Valid session verifies
- **GIVEN** a session token issued by the login flow
- **WHEN** it is presented to the verification endpoint
- **THEN** the API confirms it is valid and returns the account's id, role and tenant identifier

#### Scenario: Tampered or expired session is rejected
- **GIVEN** a session token that has been altered or has expired
- **WHEN** it is presented to the verification endpoint
- **THEN** the API rejects it, and the presenting app's route gate treats the request as signed-out

### Requirement: Role boundary is enforced server-side on every request
The API SHALL reject any authenticated request for an action outside the account's role, independent of what the calling frontend's UI does or does not show.

#### Scenario: Request outside the account's role
- **GIVEN** a valid session for an account with a given role
- **WHEN** a request is made for an action reserved for a different role
- **THEN** the API rejects the request, regardless of whether the calling app's UI exposed that action

### Requirement: Accounts are seeded, not self-registered
Staff, admin and borrower accounts SHALL be created only via fixtures/migration at this phase, reusing each app's existing mock roster (same emails, same shared demo password, same roles), with passwords stored hashed. No self-registration or invite-and-claim endpoint SHALL exist yet.

#### Scenario: Seeded accounts match existing demo documentation
- **GIVEN** the identity service's seed data
- **WHEN** compared against each app's own "Demo accounts" documentation
- **THEN** every documented demo email, role and password still signs in successfully

### Requirement: Identity service outage degrades to a clear, safe failure
When the identity service is unreachable or errors unexpectedly, the API SHALL return a distinct, identifiable failure rather than a generic error, and SHALL NOT issue a session under that condition.

#### Scenario: Login attempted during an outage
- **GIVEN** the identity service's database or process is unavailable
- **WHEN** a login is attempted
- **THEN** the API responds with a distinct "identity service unavailable" failure and issues no session
