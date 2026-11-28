# Spec Delta

## ADDED Requirements

### Requirement: Real application status screen
The portal SHALL offer a real (non-simulated) application-status screen, reading from `apps/api`, distinct from the existing simulated Home/Loan/Inbox/Offer screens, which continue to show simulated applications unaffected by this requirement. It SHALL show each real application's product, amount, tenor, and a plain-language status (never a raw internal stage string), with a stated next action where one applies.

#### Scenario: Borrower opens the real status screen
- **GIVEN** a signed-in borrower with a real application
- **WHEN** they open the real status screen
- **THEN** they see that application's product, amount, tenor, and plain-language status

#### Scenario: A declined or withdrawn application still shows its final status
- **GIVEN** a real application that has been declined or withdrawn
- **WHEN** the screen renders
- **THEN** its final status and reason (if declined) are shown, not removed from view

#### Scenario: No manual refresh required
- **GIVEN** the real status screen is open
- **WHEN** the underlying application's stage changes
- **THEN** the screen reflects the new stage without the borrower reloading the page, refetching automatically on a reasonable interval and whenever the page regains focus

### Requirement: Plain-language stage names cover every real stage
Every real `ApplicationStage` value (`Review`, `Info requested`, `Approval`, `Offer`, `Declined`, `Disbursed`, `Withdrawn`) SHALL have its own plain-language heading and description, never showing the raw stage string to the borrower.

#### Scenario: An Approval-stage application still reads as "in review"
- **GIVEN** a real application in the `Approval` stage
- **WHEN** the status screen renders
- **THEN** the borrower sees a plain-language "in review" style message, never the word "Approval" as an internal stage label
