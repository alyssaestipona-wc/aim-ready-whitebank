# Spec Delta

## ADDED Requirements

### Requirement: Real approvals queue for the approver role
The console SHALL offer a real (non-simulated) approvals queue screen, reading from `apps/api`, distinct from the existing simulated `/approvals` screen and from the existing real applications list. It SHALL list real `Approval`-stage applications.

#### Scenario: Approver opens the real approvals queue
- **GIVEN** a signed-in approver with real `Approval`-stage applications in their tenant
- **WHEN** they open the real approvals queue
- **THEN** the list shows those applications

#### Scenario: A non-approver does not see the real approvals queue
- **GIVEN** a staff user who is not an approver
- **WHEN** they open the console's navigation
- **THEN** the real approvals queue route is not offered, and a direct request for it is refused

### Requirement: The real approvals queue shows real KPI tiles
The real approvals queue SHALL show KPI tiles (waiting on the approver, decided today, overrides this week, median time to decide), computed from real data, never hardcoded.

#### Scenario: KPI tiles reflect real data
- **GIVEN** a signed-in approver viewing the real approvals queue
- **WHEN** the screen renders
- **THEN** each KPI tile shows the real, current count or median for their tenant

## MODIFIED Requirements

### Requirement: Real application detail offers approve/decline to the approver
The real application detail screen SHALL offer Approve, Decline, and Return to officer actions to a signed-in approver, visible only while the application is in the `Approval` stage and shows its officer's recommendation. Declining SHALL require choosing a reason code from the fixed seeded list before it can be sent. Approving SHALL be refused, with an inline message, when the signed-in approver made the recommendation. Approving SHALL show the real monthly repayment and require explicit confirmation before the decision is sent.

#### Scenario: Approver sees the actions on a referred application
- **GIVEN** an approver viewing a real application in the `Approval` stage
- **WHEN** the detail screen renders
- **THEN** Approve, Decline, and Return to officer actions are shown, alongside the officer's recommendation (decision, amount, tenor, override flag, reason)

#### Scenario: Actions are hidden once decided
- **GIVEN** a real application already in `Offer` or `Declined`
- **WHEN** an approver views its detail
- **THEN** none of the three actions are shown

#### Scenario: A non-approver does not see the actions
- **GIVEN** a staff user who is not an approver, viewing a real application in `Approval`
- **WHEN** the detail screen renders
- **THEN** none of the three actions are shown

#### Scenario: Approving own recommendation is blocked in the UI
- **GIVEN** an approver who made the recommendation on the application they are viewing
- **WHEN** they attempt to approve it
- **THEN** an inline error names the segregation-of-duties rule and the case is unchanged

#### Scenario: Approving shows the repayment and requires confirmation before sending
- **GIVEN** an approver about to approve a recommended application
- **WHEN** they select Approve
- **THEN** a confirmation step shows the real monthly repayment and the decision is sent only after they explicitly confirm

#### Scenario: Cancelling the confirmation sends nothing
- **GIVEN** the approve confirmation step is showing the real monthly repayment
- **WHEN** the approver cancels instead of confirming
- **THEN** no decision is sent and the application is unchanged
