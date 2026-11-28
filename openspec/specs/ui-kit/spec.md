# ui-kit Specification

## Purpose

The UI kit gives every WhiteBank Lending web app one visual language and one
set of interaction patterns, so the staff console and borrower portal look and
behave alike without copying components.

## Requirements

### Requirement: One brand palette with a single accent
Apps using the kit SHALL render with:
- near-black and gray neutrals on white;
- one blue accent, used for primary emphasis, informational badges and all chart bars;
- red reserved for inline errors.

Success and warning states SHALL use the accent or neutrals, never green or orange.

#### Scenario: Status badges
- **GIVEN** a list of cases in mixed stages
- **WHEN** approved, in-review and declined badges are shown together
- **THEN** each uses the accent or a neutral, and none is green or orange

#### Scenario: Inline error
- **GIVEN** a form using the kit's field components
- **WHEN** any form shows a validation error
- **THEN** the message text and the field border are red

### Requirement: Shared typography
Apps using the kit SHALL set body text in Geist and identifiers (case, loan and idempotency keys) in Geist Mono. Amounts use tabular figures.

#### Scenario: Case identifier
- **GIVEN** a table of cases
- **WHEN** a case number such as APP-2041 is shown
- **THEN** it renders in the monospace face

### Requirement: Paginated, filterable list
The kit SHALL provide one list pattern:
- a search box;
- optional select filters;
- a Clear control when anything is set;
- a table;
- an empty state;
- a pager.

The pager shows "Showing A–B of N", Previous, numbered pages and Next. Changing search or a filter SHALL return to page 1.

#### Scenario: Filter resets page
- **GIVEN** page 3 of a list
- **WHEN** a filter is changed
- **THEN** page 1 of the filtered results is shown

### Requirement: Money input
The kit SHALL provide a peso money input with a ₱ prefix. It SHALL insert thousands separators as the user types, allow at most two decimals, keep the caret position, and show two decimals on blur.

#### Scenario: Typing
- **GIVEN** an empty money input
- **WHEN** "1234567.891" is typed
- **THEN** the field shows "1,234,567.89"

#### Scenario: Blur
- **GIVEN** an empty money input
- **WHEN** "5000" is typed and focus leaves the field
- **THEN** the field shows "5,000.00"

### Requirement: Dialogs, menus and toasts
The kit SHALL provide:
- a dialog with a title, a description, an optional body, an inline red error area, and confirm and cancel buttons, where a destructive confirm is solid ink, as in the prototype;
- a dropdown menu;
- transient toasts.

Dialogs and menus SHALL be keyboard accessible and close on Escape.

#### Scenario: Dialog validation error
- **GIVEN** an open dialog with a required field empty
- **WHEN** a dialog's confirm fails validation
- **THEN** the dialog stays open and shows the error in red

#### Scenario: Escape closes
- **GIVEN** a dialog or dropdown menu opened from a button
- **WHEN** Escape is pressed in an open dialog or menu
- **THEN** it closes and focus returns to the control that opened it

### Requirement: Document viewer
The kit SHALL provide a wide dialog that previews a document by kind:
- an ID card image;
- a statement or payslip sheet;
- an agreement page.

It SHALL show the file name, the version and who added it.

#### Scenario: Open an ID
- **GIVEN** a case with a government ID document
- **WHEN** a government ID document is opened
- **THEN** an ID-card style preview with the file name and version is shown

### Requirement: Works in Safari and at phone width
Every kit component SHALL work in current Safari on macOS. At 400 px width it SHALL lay out without horizontal page scrolling. Only tables may scroll sideways, inside their own container.

#### Scenario: Phone width
- **GIVEN** either app
- **WHEN** any screen is viewed 400 px wide
- **THEN** the page has no horizontal scroll
