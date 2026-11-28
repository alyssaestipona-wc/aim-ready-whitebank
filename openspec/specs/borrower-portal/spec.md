# borrower-portal Specification

## Purpose

The borrower portal is the web app customers use to apply for a personal or
salary loan, follow its progress, respond to requests, accept an offer, sign
documents and view the booked loan. In this phase it runs on simulated data.

## Requirements

### Requirement: Borrower sign-in by email
The portal SHALL sign a borrower in with email and password. Unknown emails and wrong passwords SHALL get the same error. The page SHALL NOT list demo accounts.

#### Scenario: Wrong password
- **GIVEN** the sign-in page
- **WHEN** `juan.delacruz@email.com` is submitted with a wrong password
- **THEN** a red inline error "Email or password is incorrect." is shown

#### Scenario: Successful sign-in
- **GIVEN** the sign-in page
- **WHEN** valid credentials are submitted
- **THEN** the borrower lands on Home, which greets them by first name and shows their deposit account balance

#### Scenario: Signed-out request
- **GIVEN** no borrower session
- **WHEN** any portal page other than sign-in is requested
- **THEN** the sign-in page is shown

### Requirement: Portal shell
Every portal page SHALL show:
- a slim top strip with the app name and a link to the staff console;
- a header with the bank logo, an inbox icon with a count of items needing action, and a profile icon.

The profile icon SHALL open a menu with the borrower's name and email, Account, and Sign out, and SHALL NOT show the name beside the icon. The header and content SHALL share one centred column. The Guided demo control SHALL NOT appear.

#### Scenario: Profile menu
- **GIVEN** a signed-in borrower
- **WHEN** the profile icon is selected
- **THEN** a menu opens with the borrower's name and email, Account and Sign out

#### Scenario: Inbox badge
- **GIVEN** the application is waiting on the borrower (info requested, offer, or documents to sign)
- **WHEN** any portal page is shown
- **THEN** the inbox icon shows a badge of 1

### Requirement: Home shows status and progress
When the borrower has an open application, Home SHALL show its plain-language status, the next action button where one exists, and a six-step tracker:
1. Submitted
2. Checks
3. Decision
4. Offer accepted
5. Documents signed
6. Funds released

Without an open application, Home SHALL offer "Apply for a loan".

#### Scenario: No application
- **GIVEN** a borrower with no application
- **WHEN** Home is opened
- **THEN** Home shows "Need extra funds?" with an "Apply for a loan" button

#### Scenario: Action needed
- **GIVEN** an application in Info requested
- **WHEN** Home is opened
- **THEN** Home shows "We need a few more documents" and an "Upload documents" button

### Requirement: Three-step loan application
The apply page SHALL collect the following in three steps, then submit:
1. product, amount and term, with a live estimated monthly payment;
2. monthly income, other monthly loan payments and purpose;
3. a review and three consents.

Money fields SHALL format with thousands separators and two decimals. Back and Continue SHALL be equal width.

#### Scenario: Amount out of range
- **GIVEN** step 1 of the application for a personal loan
- **WHEN** Continue is selected on step 1 with an amount outside the product's limits
- **THEN** a red inline error "Enter an amount between ₱X and ₱Y." is shown and the step does not advance

#### Scenario: Missing consent
- **GIVEN** step 3 of the application
- **WHEN** Submit is selected without all three consents ticked
- **THEN** a red inline error names the missing consents and nothing is submitted

#### Scenario: Duplicate open application
- **GIVEN** an open application for the same product
- **WHEN** a new one is submitted
- **THEN** a red inline error names the open application, and no new one is created

#### Scenario: Submission runs checks
- **GIVEN** Juan, signed in with no open application, on step 3 with all consents ticked
- **WHEN** a ₱150,000 / 24-month personal loan is submitted
- **THEN** a "Just a moment…" loading state shows, then "Application sent" shows "You’re approved for ₱150,000". The decision's inputs, rule-set version, model version and outcome are recorded on the application.

#### Scenario: Decision record is immutable
- **GIVEN** a submitted application with its decision record
- **WHEN** later steps change its stage (offer accepted, documents signed, funds released)
- **THEN** the stored decision inputs, versions and outcome are unchanged

### Requirement: Simulated bank progression
Because the portal has no shared back office in this phase, its mock layer SHALL stand in for bank staff. About 4 seconds after a stage that waits on the bank, it SHALL advance the application to the next borrower-visible stage:
- a referral becomes an information request;
- after the borrower uploads, the case becomes an offer;
- an accepted offer gets documents to sign;
- signed documents are booked and the funds are released.

Each simulated step SHALL be recorded in the history as simulated.

#### Scenario: Accepted offer gets documents
- **GIVEN** the borrower accepted an offer
- **WHEN** about 4 seconds pass
- **THEN** the status becomes "Sign your loan documents" with a "Sign documents" action

#### Scenario: Referral asks for documents
- **GIVEN** an application referred for review
- **WHEN** about 4 seconds pass
- **THEN** the status becomes "We need a few more documents"

### Requirement: Inbox
The inbox SHALL list action items first, then application updates, then general bank messages. It SHALL be paginated at 8 per page. Selecting an action item SHALL open its screen.

#### Scenario: Paging the inbox
- **GIVEN** more than 8 messages
- **WHEN** page 2 is selected
- **THEN** the next 8 messages are shown

### Requirement: Upload requested documents
The upload page SHALL accept a file only while information is requested. It SHALL reject an unsupported type, or a file over the tenant's document size limit (seeded as 10 MB), with a red inline error. A valid upload SHALL return the application to review.

#### Scenario: File too large
- **GIVEN** an open information request
- **WHEN** a 41 MB file is submitted
- **THEN** "This file is 41 MB. The limit is 10 MB." is shown in red and nothing is uploaded

#### Scenario: Nothing requested
- **GIVEN** no information request
- **WHEN** the upload page is opened
- **THEN** the upload page shows "Nothing to upload"

#### Scenario: Valid upload
- **GIVEN** an open information request
- **WHEN** a PDF bank statement is chosen and submitted
- **THEN** Home shows the application back in review with a toast "Documents received. Virus scan passed."

### Requirement: Offer and disclosure
The offer page SHALL show the amount, the monthly payment and a disclosure statement:
- amount financed;
- processing fee;
- net proceeds (labelled “You receive”);
- monthly payment;
- total of payments;
- finance charge;
- effective interest rate.

A counter-offer SHALL be marked as one. Accept SHALL stay disabled until the borrower acknowledges the disclosure.

#### Scenario: Counter-offer marked
- **GIVEN** an offer for less than the amount applied for
- **WHEN** the offer page is opened
- **THEN** a "Counter-offer" note states the amount asked for

#### Scenario: Accept offer
- **GIVEN** the offer page
- **WHEN** the disclosure is acknowledged and Accept offer is selected
- **THEN** the borrower returns to Home with a toast "Offer accepted. We’ll send your documents to sign."

### Requirement: Electronic signing
The sign page SHALL list each document with a Read action that opens it in the document viewer. Signing SHALL require the borrower's full name as it appears on the account (ignoring letter case and surrounding spaces) and an agreement tick.

#### Scenario: Name mismatch
- **GIVEN** documents ready to sign
- **WHEN** a different name is typed and Sign documents is selected
- **THEN** a red inline error asks for the name exactly as on the account

### Requirement: Loan view reads from core
After release, the loan page SHALL show:
- the loan number and outstanding balance;
- the release details and the effective rate;
- the full repayment schedule, paginated 12 per page.

The page SHALL label these figures as read from core banking. In this phase they are a simulated core response.

#### Scenario: No loan yet
- **GIVEN** no released loan
- **WHEN** the loan page is opened
- **THEN** the loan page shows "No active loan"

### Requirement: Account page
The account page SHALL show the borrower's name, email, customer number, employer, customer-since year and deposit account, plus a Sign out button.

#### Scenario: Sign out
- **GIVEN** a signed-in borrower
- **WHEN** Sign out is selected on Account or in the profile menu
- **THEN** the session ends and the sign-in page is shown

### Requirement: Simulated portal state
The portal SHALL keep the borrower's simulated applications in the browser so they survive reloads. Every simulated record SHALL carry a tenant identifier.

#### Scenario: Reload keeps progress
- **GIVEN** an application in Offer
- **WHEN** the page is reloaded
- **THEN** the same application and stage are shown
