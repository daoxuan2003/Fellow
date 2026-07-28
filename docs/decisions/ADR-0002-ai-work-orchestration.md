# ADR-0002: Machine-readable AI work orchestration

- Status: Accepted
- Date: 2026-07-21

## Context

Fellow is primarily implemented by AI agents. Chat context can be compressed,
replaced, or separated from the repository. GitHub Issues are useful for product
intent but do not by themselves enforce execution state, uncertainty labels,
validation gates, or handoff completeness.

## Decision

Each independently reviewable AI task uses:

1. a GitHub Issue or explicit product-owner request for desired outcome
2. one machine-readable work-item manifest under `.ai/tasks/`
3. one scoped topic branch
4. one primary PR
5. stage-gated validation before `review_ready`

The local work-item lifecycle stops at `review_ready`. Merge and release status
remain external GitHub and release outcomes so a branch cannot claim its own
merge or deployment.

Generated evidence is stored under `.ai-reports/` and is not committed. Durable
facts and decisions are promoted into contracts, ADRs, or the active-work index.

## Consequences

Positive:

- agent replacement and context compression are recoverable
- scope, risk, assumptions, checks, and blockers become explicit
- PR text and handoffs can be generated consistently
- CI can reject incomplete or internally inconsistent task state

Costs:

- every meaningful task has a small manifest-maintenance overhead
- stale manifests are possible if an agent fails to update them
- product approval and production facts still require human/runtime evidence

## Rejected alternatives

- Rely only on chat history: not durable or reviewable.
- Store all command logs in Git: risks secrets, noise, and private data.
- Let automation mark tasks merged/released from a topic branch: creates false
  claims and requires unsafe write authority.
