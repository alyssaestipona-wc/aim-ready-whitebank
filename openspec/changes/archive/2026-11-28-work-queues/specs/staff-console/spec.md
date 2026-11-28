# Spec Delta

## ADDED Requirements

### Requirement: Real applications screen offers queue tabs and a Pick action
The real applications list screen SHALL offer My queue, Team queue, and Unassigned tabs. The Unassigned tab SHALL offer a Pick action on each row, available only to the officer role.

#### Scenario: Officer switches between queue tabs
- **GIVEN** a signed-in officer on the real applications screen
- **WHEN** they select the My queue, Team queue, or Unassigned tab
- **THEN** the list shows only the applications that tab's filter matches

#### Scenario: Officer picks an unassigned application
- **GIVEN** an officer on the Unassigned tab
- **WHEN** they pick a row
- **THEN** the application moves out of the Unassigned tab and into their My queue tab

#### Scenario: A non-officer does not see the Pick action
- **GIVEN** a staff user who is not an officer, on the Unassigned tab
- **WHEN** the tab renders
- **THEN** no Pick action is shown
