# Spec Delta

## MODIFIED Requirements

### Requirement: Real application detail offers approve/decline to the approver
The real application detail screen SHALL offer Approve, Decline, and Return to officer actions to a signed-in approver, visible only while the application is in the `Approval` stage and shows its officer's recommendation. Declining SHALL require choosing a reason code from the fixed seeded list before it can be sent. Approving SHALL be refused, with an inline message, when the signed-in approver made the recommendation.

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

## ADDED Requirements

### Requirement: Real application detail offers a recommend action to the owning officer
The real application detail screen SHALL offer a Recommend action to the owning officer, visible only while the application is in the `Review` stage: choosing approve, counter-offer, or decline, with a reason code required whenever the choice differs from the AI's own shown recommendation.

#### Scenario: Owning officer sees the recommend action
- **GIVEN** the owning officer viewing a real `Review`-stage application
- **WHEN** the detail screen renders
- **THEN** the Recommend action is shown, along with the AI's own recommended decision and amount

#### Scenario: Submitting a differing recommendation without a reason is refused
- **GIVEN** the recommend form on a case whose AI recommendation is approve at a shown amount
- **WHEN** a different amount is submitted with no reason code
- **THEN** an inline error is shown and the form does not submit

#### Scenario: A non-owning staff user does not see the recommend action
- **GIVEN** a staff user who is not the owning officer, viewing the same `Review`-stage application
- **WHEN** the detail screen renders
- **THEN** the Recommend action is not shown

### Requirement: Real application detail shows the AI recommendation distinct from the final decision
The real application detail screen SHALL show the AI's own implicit recommendation (decision and amount) in its own section, separate from the decision record's reason chips, and SHALL show a Final decision section (who decided it, when, and the reason if declined) only once the application has actually been decided.

#### Scenario: AI recommendation shown before any decision
- **GIVEN** a `Review`- or `Approval`-stage application
- **WHEN** the detail screen renders
- **THEN** the AI recommendation section shows its recommended decision and amount, and no Final decision section is shown

#### Scenario: Final decision shown once decided
- **GIVEN** an application in `Offer` or `Declined`
- **WHEN** the detail screen renders
- **THEN** a Final decision section shows who decided it, when, and the reason code if declined, separate from the AI recommendation section
