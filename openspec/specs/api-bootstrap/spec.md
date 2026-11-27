# API Bootstrap

## Purpose
The API app (`apps/api`) boots a NestJS 11 HTTP server and exposes a health
endpoint so other services and deploy pipelines can verify liveness.

## Requirements

### Requirement: The API SHALL start an HTTP server on a configurable port
The server reads `PORT` from the environment and falls back to `3000`.

#### Scenario: Server starts with no PORT set
- **GIVEN** no `PORT` environment variable is set
- **WHEN** the API app starts
- **THEN** it listens on port 3000

#### Scenario: Server starts with PORT set
- **GIVEN** `PORT=4000` is set in the environment
- **WHEN** the API app starts
- **THEN** it listens on port 4000

### Requirement: The API SHALL expose a root health route
A `GET /` request confirms the app is reachable and running.

#### Scenario: Health check succeeds
- **GIVEN** the API app is running
- **WHEN** a client sends `GET /`
- **THEN** the API responds with HTTP 200
