# Spec Delta

## ADDED Requirements

### Requirement: Real applications list and detail
The console SHALL offer an Applications screen reading real application data from `apps/api` (not the simulated store): a list (id, product, amount, tenor, stage, decision outcome and grade) and a detail view (full decision summary and the three consent records). This screen is distinct from the console's existing simulated work queues and case-detail screen, which continue to show simulated cases unaffected by this requirement.

#### Scenario: Staff opens the real applications list
- **GIVEN** a signed-in staff user with permission to view applications
- **WHEN** they open the Applications screen
- **THEN** they see every real application for their tenant, each row showing product, amount, tenor, stage and decision outcome

#### Scenario: Staff opens a real application's detail
- **GIVEN** a real application in the staff user's tenant
- **WHEN** they open its detail view
- **THEN** they see its decision summary (score, grade, rule results, reasons, rule-set and model versions) and its three consent records, with no decisioning action available on this screen
