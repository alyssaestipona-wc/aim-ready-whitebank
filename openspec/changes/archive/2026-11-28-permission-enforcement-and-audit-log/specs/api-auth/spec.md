# Spec Delta

## MODIFIED Requirements

### Requirement: Role boundary is enforced server-side on every request
The API SHALL reject any authenticated request for an action outside the account's role, independent of what the calling frontend's UI does or does not show, and SHALL record the refusal in the audit log rather than failing silently.

#### Scenario: Request outside the account's role
- **GIVEN** a valid session for an account with a given role
- **WHEN** a request is made for an action reserved for a different role
- **THEN** the API rejects the request, regardless of whether the calling app's UI exposed that action

#### Scenario: Refusal is recorded, not silent
- **GIVEN** a valid session for an account with a given role
- **WHEN** a request is made for an action reserved for a different role and is refused
- **THEN** the refusal is written to the audit log with the account, the attempted action, and the time it happened
