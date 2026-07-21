# Work Item Lifecycle

Each AI engineering task has a machine-readable manifest under `.ai/tasks/`.
The manifest records execution state and evidence; the GitHub Issue records the
product request, and the PR records the review and merge outcome.

## States

| State | Meaning | Required before entering |
| --- | --- | --- |
| `intake` | Context is being assembled | ID, title, source, and goal |
| `ready` | Scope and validation are actionable | acceptance criteria, scope, risk, impact, branch/base, checks |
| `implementing` | Code/document changes are in progress | `ready` gate and correct topic branch |
| `validating` | Implementation is being tested and inspected | touched files and validation checks exist |
| `review_ready` | Evidence is complete for PR review | criteria/check gates pass; no blocker; head commit recorded |
| `blocked` | Work cannot safely continue | blocker reason, owner, unblock condition, prior state |
| `cancelled` | Work intentionally stopped | closure reason |

Merge and production release remain GitHub/release outcomes rather than local
work-item states. This avoids a branch claiming it has already merged or
released itself.

## Allowed transitions

```text
intake -> ready | blocked | cancelled
ready -> implementing | blocked | cancelled
implementing -> validating | blocked | cancelled
validating -> implementing | review_ready | blocked | cancelled
review_ready -> implementing | blocked | cancelled
blocked -> intake | ready | implementing | validating | review_ready | cancelled
```

Returning from validation or review to implementation is expected when evidence
finds a defect.

## Gate principles

- Unknown production state is allowed when it is not material to the task.
- A material unknown must be resolved, explicitly accepted, or block the task.
- Required checks cannot be `not_run` at `review_ready`.
- Failed acceptance criteria cannot be hidden by passing implementation tests.
- UI evidence is required when the visual impact is `material`.
- Medium, high, or critical risk requires a rollback description.
- Critical risk requires explicit product-owner approval before implementation.

## Manifest ownership

The task branch owns its manifest. Do not use one shared work-item file for
multiple branches. Update the manifest whenever the scope, assumption, risk,
files, checks, or blocker changes.

## Evidence references

Evidence fields should contain stable, non-secret references such as:

- test command and concise result
- CI check name
- `.ai-reports/` filename (not committed)
- synthetic screenshot attachment name
- ADR or contract path
- commit SHA

Do not paste full logs, `.env` values, database documents, access URLs with
credentials, or real user content into a work item.
