# 1. Record architecture decisions

## Status
Accepted

## Context
This repo uses a spec-driven workflow (see `AGENTS.md`, `openspec/`). Specs capture *behavior*. They don't capture *why* a structural or technical choice was made. Without a record, agents and humans re-litigate settled decisions or quietly work around them.

## Decision
Binding architectural decisions are recorded as numbered Architecture Decision Records (ADRs) in `docs/adr/`, one file per decision, numbered sequentially (`0001-`, `0002-`, ...). Each ADR states a rule. Once accepted, a rule is binding until a later ADR explicitly supersedes it.

Pull requests that introduce or rely on an architectural decision link the relevant ADR in `.github/pull_request_template.md`.

## Consequences
- Agents check `docs/adr/` before proposing something a prior decision already settled.
- Superseding a decision requires a new ADR, not a silent diff.
- ADRs stay short: one decision, one rule, not a design doc.
