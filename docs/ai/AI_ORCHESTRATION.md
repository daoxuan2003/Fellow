# AI Work Orchestration

Fellow uses AI as the primary engineering executor and a human product owner as
the final product, risk, and release authority. This document defines how work
moves between those roles without depending on chat history.

## Sources of truth

Use the following priority for work coordination:

1. GitHub Issue or explicit product-owner request — desired outcome and product
   acceptance.
2. `.ai/tasks/<work-item-id>.json` — machine-readable execution state, scope,
   evidence requirements, and unresolved uncertainty.
3. Topic branch and automated checks — executable implementation evidence.
4. Pull Request — review contract, diff, validation results, and approval.
5. `docs/project/ACTIVE_WORK.md` — compact cross-task handoff and current
   repository blockers.

A conversation is never the sole source of truth.

## Roles

### Product owner

The product owner decides:

- user outcome and priority
- acceptable visual direction
- risk acceptance and scope tradeoffs
- whether an assumption is acceptable
- final approval for merge and release

The product owner is not expected to reproduce engineering checks manually.

### AI engineering executor

The AI executor is responsible for:

- recovering project context before editing
- distinguishing `VERIFIED`, `INFERRED`, `UNKNOWN`, and `ASSUMED_FOR_TASK`
- creating and maintaining the work-item manifest
- making the smallest complete vertical change
- obtaining safe environment or data evidence when required
- running and reporting checks honestly
- generating a reviewable handoff and PR body
- stopping at an explicit gate when evidence is missing

### CI

CI verifies repository contracts and repeatable checks. CI cannot prove product
quality, production configuration, real data shape, or visual correctness by
itself.

### Production evidence tools

Read-only environment and database reporters provide privacy-safe facts. Their
outputs are temporary evidence under `.ai-reports/`; they are not project
configuration and must never contain secrets or raw private records.

## Unit of work

One independently reviewable task has:

- one Issue or explicit request
- one work-item ID
- one scoped branch
- one primary PR
- one acceptance-criteria set
- one validation record

Do not use one work item for unrelated fixes, design cleanup, dependency
upgrades, release metadata, and feature development.

## Standard flow

```text
Product request
  -> intake manifest
  -> context recovery
  -> ready gate
  -> implementing
  -> validating
  -> review_ready
  -> Draft/Review PR
  -> product-owner approval
  -> merge
  -> release gate when applicable
```

Commands are documented in `docs/ai/CODEX_RUNBOOK.md`.

## Concurrent AI work

Multiple AI tasks may run concurrently only when their scopes are independent.
Treat the following as high-contention files or domains:

- `AGENTS.md`, `AI_PROJECT_INDEX.md`, and shared contracts
- `.github/workflows/`
- global design tokens and `BottomNav.vue`
- authentication, pairing, user identity, and couple-context helpers
- shared model schemas and migrations
- release version and changelog files

Before editing a high-contention area, record the dependency in the work item
and inspect open work/PRs. Do not silently resolve semantic conflicts by taking
whichever branch merged last.

## Blocked work

A task enters `blocked` when a material prerequisite is missing, including:

- production capability or historical data is required but not safely verified
- another PR owns a conflicting schema or shared component
- acceptance criteria require a product decision
- required validation cannot run and proceeding would create material risk

Blocked work must record the prior state, reason, owner of the next action, and
exact unblock condition. Being blocked is not a failed task; hiding the blocker
is.

## Agent replacement and context compression

Before an interruption or agent change:

1. update the work-item manifest
2. generate a handoff report
3. update `ACTIVE_WORK.md` if the task remains active
4. commit the durable context changes with the implementation when appropriate
5. leave one exact next action

The next agent starts from the project index, manifest, branch diff, and handoff;
it does not reconstruct decisions from old chat messages.

## Automation boundary

Scripts may create manifests, validate gates, summarize Git state, and generate
PR text. They must not automatically:

- approve product direction
- convert an `UNKNOWN` into a fact
- expose or copy secrets
- perform destructive database migrations
- merge to `develop` or `main`
- release production without explicit product-owner authorization
