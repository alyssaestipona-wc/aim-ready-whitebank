# Spec Delta

## ADDED Requirements

### Requirement: Real application detail offers approve/decline to the approver
The real application detail screen (`staff-application-review`'s read-only view) SHALL offer Approve and Decline actions to a signed-in approver, visible only while the application is in the `Review` stage. Declining SHALL require choosing a reason code from the fixed seeded list before it can be sent.

#### Scenario: Approver sees the actions on a referred application
- **GIVEN** an approver viewing a real application in the `Review` stage
- **WHEN** the detail screen renders
- **THEN** Approve and Decline actions are shown

#### Scenario: Actions are hidden once decided
- **GIVEN** a real application already in `Offer` or `Declined`
- **WHEN** an approver views its detail
- **THEN** neither action is shown

#### Scenario: A non-approver does not see the actions
- **GIVEN** a staff user who is not an approver, viewing a real application in `Review`
- **WHEN** the detail screen renders
- **THEN** neither action is shown
