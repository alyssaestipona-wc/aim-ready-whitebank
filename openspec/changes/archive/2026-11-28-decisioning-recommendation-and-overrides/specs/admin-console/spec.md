# Spec Delta

## ADDED Requirements

### Requirement: Real decisioning controls toggle the kill switch and bureau-down flag
Per PRD story DEC-7, the tenant administrator SHALL have a real (non-simulated) Decisioning controls screen, reading from and writing to `apps/api`, that shows and toggles the kill switch and the bureau-down flag, kept separate from the existing simulated Decisioning configuration screen.

#### Scenario: Administrator views the current state
- **GIVEN** a signed-in tenant administrator on the real Decisioning controls screen
- **WHEN** the screen loads
- **THEN** it shows the current kill-switch and bureau-down state, read from `apps/api`

#### Scenario: Administrator turns the kill switch on
- **GIVEN** the kill switch is off
- **WHEN** the administrator turns it on
- **THEN** the screen reflects the on state, and every new application submitted afterward is affected
