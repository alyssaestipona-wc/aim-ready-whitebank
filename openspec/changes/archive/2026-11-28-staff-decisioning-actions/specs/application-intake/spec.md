# Spec Delta

## ADDED Requirements

### Requirement: An approver can decide a referred application
An approver SHALL be able to approve or decline an application currently in the `Review` stage (one the decision pipeline referred), moving it to `Offer` or `Declined`, for an application belonging to their own tenant. Deciding an application not currently in `Review` SHALL be refused.

#### Scenario: Approving a referred application within authority
- **GIVEN** a referred application with amount and grade within the approver's authority
- **WHEN** the approver approves it
- **THEN** the application moves to `Offer`, records who decided it, and the response includes the computed monthly repayment

#### Scenario: Declining a referred application with a reason code
- **GIVEN** a referred application
- **WHEN** the approver declines it with a valid reason code
- **THEN** the application moves to `Declined` and records who decided it and the reason code

#### Scenario: Deciding an application not in Review
- **GIVEN** an application already in `Offer`, `Declined`, `Disbursed`, or `Withdrawn`
- **WHEN** an approver attempts to decide it
- **THEN** the request is refused

### Requirement: Approval is refused above the approver's delegated authority
Approving an application whose amount exceeds the approver's seeded amount limit, or whose decision grade is outside the approver's seeded allowed grades, SHALL be refused with a specific error naming the limit, rather than approved or routed anywhere else.

#### Scenario: Amount above the approver's limit
- **GIVEN** a referred application with an amount above the approver's seeded limit
- **WHEN** the approver attempts to approve it
- **THEN** the request is refused, naming the limit, and the application stays in `Review`

#### Scenario: Grade outside the approver's allowed grades
- **GIVEN** a referred application whose decision grade is not one of the approver's seeded allowed grades
- **WHEN** the approver attempts to approve it
- **THEN** the request is refused and the application stays in `Review`

### Requirement: Declining requires a reason code from a fixed list
A decline SHALL require a reason code from the seeded, fixed list of decline reasons; a missing or invalid code SHALL be refused, naming the valid codes.

#### Scenario: Missing reason code
- **GIVEN** a referred application
- **WHEN** the approver attempts to decline it with no reason code
- **THEN** the request is refused, naming the valid reason codes, and the application stays in `Review`

#### Scenario: Invalid reason code
- **GIVEN** a referred application
- **WHEN** the approver attempts to decline it with a reason code not in the seeded list
- **THEN** the request is refused and the application stays in `Review`
