# ADR-0001: AI-Native Development Governance

- Status: accepted
- Date: 2026-07-21
- Owners: Fellow product owner and AI programming agents

## Context

Fellow is primarily developed through AI-assisted vibe coding. AI agents can
inspect repository code but may not see production `.env` values, MongoDB
contents, server topology, external storage state, or the rationale retained in
older conversations. Context compression and agent replacement can fragment
project knowledge. UI changes can also drift when visual intent is not encoded
as reusable rules.

Treating chat history as project memory creates inconsistent assumptions and
makes later agents unable to distinguish verified runtime facts from prior AI
inference.

## Decision

Fellow will use repository-backed AI governance:

- `AI_PROJECT_INDEX.md` is the canonical context map.
- `AGENTS.md` contains non-negotiable execution rules.
- environment and database contracts expose capabilities and aggregate facts,
  not secrets or private records.
- `ACTIVE_WORK.md` provides explicit cross-session handoff.
- durable technical and product decisions use ADRs.
- AI Issues and PRs record verified facts, unknowns, assumptions, validation,
  deployment impact, and rollback behavior.
- design intent is governed by a design contract and gradually moved into
  shared tokens and reference evidence.

## Alternatives considered

### Rely on long Codex prompts or chat history

Rejected because context is compressed, session-specific, difficult to review,
and not versioned with the code.

### Give agents direct access to all production secrets and raw data

Rejected because it unnecessarily increases security and privacy exposure.
Agents need capability and compatibility facts, not credentials or private
content.

### Use only traditional README and contribution documents

Rejected because they do not force explicit uncertainty, runtime contracts,
AI handoff, or evidence-based task completion.

## Consequences

Positive:

- new agents can recover project intent without the original conversation
- hidden environment and data constraints become visible in safe form
- assumptions are reviewable instead of silently becoming project truth
- design and compatibility decisions are less likely to drift

Costs:

- contracts and `ACTIVE_WORK.md` require maintenance
- privacy-safe reporting scripts must be built
- CI should later verify that generated facts and documentation remain current

## Verification and review trigger

Review this decision after the first three AI-managed feature/fix PRs, or when a
new tool gains controlled production inspection capability.

## Related files / Issues / PRs

- `AI_PROJECT_INDEX.md`
- `AGENTS.md`
- `docs/ai/AI_TASK_PROTOCOL.md`
- `docs/project/ACTIVE_WORK.md`
- `docs/operations/ENVIRONMENT_CONTRACT.md`
- `docs/data/DATABASE_CONTRACT.md`
- `docs/design/DESIGN_SYSTEM.md`
