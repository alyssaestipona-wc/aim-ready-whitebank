# Spec Delta

## ADDED Requirements

### Requirement: An approver can see real summary stats for their approvals queue
An approver SHALL be able to retrieve summary stats for their tenant's approval work: the count of applications currently waiting in `Approval` stage, the count decided today, the count of overrides decided this week, and the median time from recommendation to decision this week. Stats SHALL be computed from real, persisted application data, never simulated or hardcoded.

#### Scenario: Approver retrieves approval queue stats
- **GIVEN** a signed-in approver with real applications in various stages and decision histories
- **WHEN** they request their approval queue stats
- **THEN** the response reflects the real, current counts and median, scoped to their tenant

#### Scenario: Staff who are not approvers cannot use the stats endpoint
- **GIVEN** a non-approver staff-role session
- **WHEN** they call the approval queue stats endpoint
- **THEN** the request is refused

### Requirement: An approver can preview the monthly repayment before approving
An approver SHALL be able to retrieve the monthly repayment a pending recommendation would produce, without committing a decision. The preview SHALL use the same calculation the real decide action itself uses, so the previewed figure always matches what approving actually produces.

#### Scenario: Approver previews the repayment for a recommended application
- **GIVEN** an application in `Approval` stage with a recommendation
- **WHEN** an approver requests the repayment preview
- **THEN** the response shows the monthly repayment that would result from approving, and the application's own stage and recommendation are unchanged

#### Scenario: Preview is refused for an application with no pending recommendation
- **GIVEN** an application not in `Approval` stage
- **WHEN** an approver requests the repayment preview
- **THEN** the request is refused

#### Scenario: Staff who are not approvers cannot use the preview endpoint
- **GIVEN** a non-approver staff-role session
- **WHEN** they call the repayment-preview endpoint
- **THEN** the request is refused
