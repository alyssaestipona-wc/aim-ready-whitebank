# Spec Delta

## ADDED Requirements

### Requirement: Real applications show SLA status and offer info-request actions
The real applications list and detail screens SHALL show hours left against SLA where one applies, visually flagging a breached (negative) or near-breach (2 hours or less) application. The detail screen SHALL offer a Request Information action (officer role, `Review` stage) and a Mark Resolved action (officer role, `Info requested` stage).

#### Scenario: Breached application is visually flagged
- **GIVEN** an application whose SLA hours left is negative
- **WHEN** it appears in the list or detail screen
- **THEN** it is visually flagged as breached

#### Scenario: Officer requests information from the detail screen
- **GIVEN** an officer viewing a `Review`-stage application
- **WHEN** they submit a Request Information action with at least one checklist item and a message
- **THEN** the application moves to `Info requested` and the screen reflects the new stage and SLA

#### Scenario: Officer marks a request resolved
- **GIVEN** an officer viewing an `Info requested` application
- **WHEN** they select Mark Resolved
- **THEN** the application moves back to `Review`
