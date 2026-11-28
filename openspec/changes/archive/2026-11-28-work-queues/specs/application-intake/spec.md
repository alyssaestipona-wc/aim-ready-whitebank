# Spec Delta

## ADDED Requirements

### Requirement: Staff can filter the applications list by queue
A staff user SHALL be able to filter the applications list to their own assigned applications (`mine`), or to unassigned `Review`-stage applications (`unassigned`); omitting the filter SHALL return every application for their tenant regardless of assignee.

#### Scenario: My queue
- **GIVEN** a staff user with two assigned applications and one unassigned application in their tenant
- **WHEN** they request the list filtered to `mine`
- **THEN** only the two applications assigned to them are returned

#### Scenario: Unassigned queue
- **GIVEN** a tenant with one unassigned `Review`-stage application and one assigned `Review`-stage application
- **WHEN** a staff user requests the list filtered to `unassigned`
- **THEN** only the unassigned `Review`-stage application is returned

### Requirement: An officer can pick an unassigned referred application
An officer SHALL be able to claim ownership of an unassigned, `Review`-stage application in their own tenant. Picking an application that is not `Review`-stage, not in their tenant, or already assigned SHALL be refused.

#### Scenario: Picking an unassigned application
- **GIVEN** an unassigned `Review`-stage application
- **WHEN** an officer picks it
- **THEN** the application is assigned to that officer, with the time recorded

#### Scenario: Picking an already-assigned application
- **GIVEN** a `Review`-stage application already assigned to another officer
- **WHEN** a different officer attempts to pick it
- **THEN** the request is refused and the original assignment is unchanged

#### Scenario: Two officers racing to pick the same application
- **GIVEN** an unassigned `Review`-stage application
- **WHEN** two officers attempt to pick it at the same time
- **THEN** exactly one succeeds and the other is refused
