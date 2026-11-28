# Spec Delta

## MODIFIED Requirements

### Requirement: A duplicate open application is blocked
A new submission for the same borrower and product SHALL be rejected, naming the existing application, whenever that borrower already has an application for that product in any stage other than Disbursed, Declined, or Withdrawn.

#### Scenario: Second application for the same product while one is open
- **GIVEN** a borrower with an open personal-loan application
- **WHEN** they submit a second personal-loan application
- **THEN** the API rejects it, naming the existing application, and creates no second one

#### Scenario: A new application is allowed once the prior one is closed
- **GIVEN** a borrower whose only prior application for a product is Disbursed, Declined, or Withdrawn
- **WHEN** they submit a new application for that product
- **THEN** the API accepts it

#### Scenario: An application awaiting approval still counts as open
- **GIVEN** a borrower whose application has been recommended and is in the `Approval` stage
- **WHEN** they submit a second application for the same product
- **THEN** the API rejects it, naming the existing application

### Requirement: An approver can decide a referred application
An approver SHALL be able to approve or decline an `Approval`-stage, recommended application, moving it to `Offer` or `Declined`. Approving uses the recommendation's amount and tenor. The approver SHALL never be the officer who made the recommendation. Deciding an application with no recommendation, or not in `Approval`, SHALL be refused.

#### Scenario: Approving a referred application within authority
- **GIVEN** an `Approval`-stage application recommended by a different user, with amount and grade within the approver's authority
- **WHEN** the approver approves it
- **THEN** the application moves to `Offer`, records who decided it, and the response includes the monthly repayment computed from the recommendation's amount and tenor

#### Scenario: Declining a referred application with a reason code
- **GIVEN** an `Approval`-stage application recommended by a different user
- **WHEN** the approver declines it with a valid reason code
- **THEN** the application moves to `Declined` and records who decided it and the reason code

#### Scenario: Deciding an application not in Review
- **GIVEN** an application in `Review`, `Offer`, `Declined`, `Disbursed`, or `Withdrawn`
- **WHEN** an approver attempts to decide it
- **THEN** the request is refused

#### Scenario: Approving own recommendation is refused
- **GIVEN** an `Approval`-stage application recommended by the current approver
- **WHEN** that same user attempts to decide it
- **THEN** the request is refused, naming the segregation-of-duties rule, and the application stays in `Approval`

### Requirement: Approval is refused above the approver's delegated authority
Approving a recommendation whose amount exceeds the approver's seeded amount limit, or whose decision grade is outside the approver's seeded allowed grades, SHALL be refused with a specific error naming the limit, rather than approved or routed anywhere else.

#### Scenario: Amount above the approver's limit
- **GIVEN** an `Approval`-stage application whose recommended amount is above the approver's seeded limit
- **WHEN** the approver attempts to approve it
- **THEN** the request is refused, naming the limit, and the application stays in `Approval`

#### Scenario: Grade outside the approver's allowed grades
- **GIVEN** an `Approval`-stage application whose decision grade is not one of the approver's seeded allowed grades
- **WHEN** the approver attempts to approve it
- **THEN** the request is refused and the application stays in `Approval`

### Requirement: Declining requires a reason code from a fixed list
A decline SHALL require a reason code from the seeded, fixed list of decline reasons; a missing or invalid code SHALL be refused, naming the valid codes.

#### Scenario: Missing reason code
- **GIVEN** an `Approval`-stage application
- **WHEN** the approver attempts to decline it with no reason code
- **THEN** the request is refused, naming the valid reason codes, and the application stays in `Approval`

#### Scenario: Invalid reason code
- **GIVEN** an `Approval`-stage application
- **WHEN** the approver attempts to decline it with a reason code not in the seeded list
- **THEN** the request is refused and the application stays in `Approval`

## ADDED Requirements

### Requirement: An officer can recommend a decision on a referred application
The owning officer of a `Review`-stage application SHALL be able to recommend approve, a counter-offer (a different amount and/or tenor), or decline, moving the application to `Approval`, with an optional free-text note for the approver.

#### Scenario: Recommending moves the application to Approval
- **GIVEN** a `Review`-stage application owned by the officer
- **WHEN** they recommend a decision
- **THEN** the application moves to `Approval`, recording the recommendation

#### Scenario: Only the owning officer can recommend
- **GIVEN** a `Review`-stage application assigned to a different officer
- **WHEN** another officer attempts to recommend a decision
- **THEN** the request is refused

### Requirement: A recommendation differing from the AI is classified and requires a reason
A recommendation that differs from the AI's own implicit recommendation (derived from the decision record) in decision or amount/tenor SHALL require a reason code from a fixed seeded list; recommending without one when it differs SHALL be refused. A difference of at least the seeded override threshold (₱50,000), or a decision that flips approve to decline or vice versa, SHALL be classified as an override above threshold; a smaller difference SHALL be classified below threshold.

#### Scenario: Recommending within the AI recommendation needs no reason
- **GIVEN** a `Review`-stage application owned by the officer
- **WHEN** they recommend approve at the AI's own recommended amount and tenor
- **THEN** the application moves to `Approval` with no reason code required

#### Scenario: Recommending a counter-offer without a reason is refused
- **GIVEN** a `Review`-stage application whose AI recommendation is to approve a given amount
- **WHEN** the owning officer recommends a different amount with no reason code
- **THEN** the request is refused and the application stays in `Review`

#### Scenario: An override at or above the threshold is flagged above threshold
- **GIVEN** a `Review`-stage application whose AI-recommended amount is ₱150,000
- **WHEN** the owning officer recommends ₱90,000 with a reason code
- **THEN** the application moves to `Approval`, recording the recommendation as an override above the ₱50,000 threshold with its reason code

#### Scenario: A decision flip is always flagged above threshold regardless of amount
- **GIVEN** a `Review`-stage application whose AI recommendation is approve
- **WHEN** the owning officer recommends decline with a reason code
- **THEN** the application moves to `Approval`, recording the recommendation as an override above threshold

### Requirement: An approver can return a recommended application to the officer
An approver SHALL be able to return an `Approval`-stage application to `Review`, clearing its recommendation and reassigning it to the officer who made the recommendation.

#### Scenario: Returning a recommended application
- **GIVEN** an `Approval`-stage application
- **WHEN** an approver returns it
- **THEN** the application moves back to `Review`, its recommendation is cleared, and it is reassigned to the recommending officer

### Requirement: The decision record exposes the AI's implicit recommendation and the final decided outcome
An application's detail SHALL include the AI's own implicit recommendation (approve at a capped amount, derived from the stored decision record, for any referred or approved outcome) alongside the actual final outcome once decided (who decided it, when, and the declined reason code if declined), so the two are never conflated.

#### Scenario: AI recommendation shown for a referred application
- **GIVEN** a `Review`-stage application with a referred decision record
- **WHEN** its detail is read
- **THEN** the response includes the AI's implicit recommended decision and capped amount, distinct from the stored decision's own `outcome` field

#### Scenario: Final decision shown once decided
- **GIVEN** an application that has moved to `Offer` or `Declined`
- **WHEN** its detail is read
- **THEN** the response includes who decided it, when, and (for a decline) the reason code, alongside the unchanged original decision record

### Requirement: A kill switch and bureau-down flag can be toggled and take effect immediately
A tenant administrator SHALL be able to toggle a kill switch and a bureau-down flag for the tenant. Once toggled, every new application submitted afterward SHALL be affected; an application already decided before the toggle SHALL be unaffected.

#### Scenario: Turning the kill switch on routes new applications to refer
- **GIVEN** the kill switch is off and a product's automation is live
- **WHEN** a tenant administrator turns the kill switch on and a new application is submitted
- **THEN** the application is referred, with the reason stating the kill switch is on

#### Scenario: An application already decided is unaffected by a later toggle
- **GIVEN** an application already decided before the kill switch is turned on
- **WHEN** the kill switch is turned on afterward
- **THEN** that application's own decision record is unchanged
