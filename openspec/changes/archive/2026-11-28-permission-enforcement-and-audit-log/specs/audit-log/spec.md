# Spec Delta

## Purpose

A tenant-scoped, append-only record of security-relevant events — starting with every refused permission check — that nothing in the system can edit or delete once written, readable only by the compliance role.

## ADDED Requirements

### Requirement: A refused permission check is recorded
Every time a request is rejected for being outside the caller's role, the API SHALL write a tenant-scoped audit-log entry capturing who attempted it (account id, email, role), what was attempted (method and route), when, and the reason for refusal.

#### Scenario: Role-mismatched request is logged
- **GIVEN** a valid session for an account with a given role
- **WHEN** that account requests an action reserved for a different role and is refused
- **THEN** the API writes an audit-log entry recording the account's id, email, role, the attempted method and route, a timestamp, and the refusal reason

#### Scenario: Allowed request is not logged
- **GIVEN** a valid session for an account whose role matches the action
- **WHEN** that account successfully makes the request
- **THEN** no audit-log entry is written for that request

### Requirement: Audit-log entries are immutable once written
The API SHALL expose no endpoint or internal path capable of updating or deleting an existing audit-log entry.

#### Scenario: No update or delete path exists
- **GIVEN** the audit-log capability's own API surface
- **WHEN** that surface is inspected
- **THEN** it offers only ways to create and read entries, never to modify or remove one already written

### Requirement: Audit-log entries are readable only by compliance
The API SHALL expose a tenant-scoped endpoint listing audit-log entries newest-first, restricted to the compliance role.

#### Scenario: Compliance reads the log
- **GIVEN** a valid session for an account with the compliance role
- **WHEN** that account requests the audit-log list
- **THEN** the API returns that tenant's audit-log entries, newest first

#### Scenario: A non-compliance role is refused
- **GIVEN** a valid session for an account whose role is not compliance
- **WHEN** that account requests the audit-log list
- **THEN** the API rejects the request, and the refusal is itself recorded as a new audit-log entry

#### Scenario: Entries never cross tenants
- **GIVEN** audit-log entries exist for more than one tenant
- **WHEN** a compliance account from one tenant requests the audit-log list
- **THEN** only that tenant's own entries are returned
