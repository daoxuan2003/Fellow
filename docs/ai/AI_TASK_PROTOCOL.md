# AI Task Protocol

This protocol makes AI work reviewable and recoverable after context
compression or agent replacement.

## 1. Intake

Before editing, create or read a `.ai/tasks/<work-item-id>.json` manifest and
the linked Issue/request. The task record contains:

- user outcome and acceptance criteria
- current behavior and failure behavior
- affected product area
- in-scope and explicitly out-of-scope work
- security, privacy, data ownership, realtime, and design implications
- known environment or migration constraints

If the request is ambiguous but safe progress is possible, make the smallest
visible `ASSUMED_FOR_TASK` assumption. Never invent production configuration or
database state.

After intake, validate the manifest and transition it to `ready`. Use the
commands in `docs/ai/CODEX_RUNBOOK.md`; do not implement from an incomplete
`intake` record.

## 2. Context recovery

Read the required files in `AI_PROJECT_INDEX.md`. Then inspect the smallest
complete vertical path:

```text
Vue view/component
  -> store/composable/API request
  -> Express route and auth middleware
  -> service/model/index
  -> WebSocket/Web Push side effect
  -> tests and deployment implications
```

Do not read a large unrelated view merely to appear thorough.

## 3. Pre-change record

Before implementation, record:

```markdown
### Verified facts
- ...

### Unknowns
- ...

### Assumptions for this task
- ...

### Planned scope
- ...

### Validation plan
- ...
```

Material unknowns include production environment capability, historical data
shape, external storage behavior, and unobserved server configuration. Resolve
them only with the least invasive approved report from
`docs/operations/RUNTIME_OBSERVABILITY.md`; otherwise keep them `UNKNOWN`.

## 4. Implementation rules

- Make the smallest complete vertical change.
- Do not mix feature work, broad refactoring, generated output, release
  metadata, and unrelated cleanup.
- Do not remove unfamiliar compatibility code until its purpose and removal
  condition are verified.
- Do not treat hidden UI controls as authorization.
- Do not trust client-supplied identity for private operations.
- Commit database state before realtime or push side effects.
- Prefer idempotent or atomic shared mutations where concurrent partners or
  retries are possible.
- Add tests from acceptance criteria, not merely from the chosen
  implementation.
- Temporary fallbacks require an Issue, removal condition, and target version.

## 5. Validation

Always inspect the final diff. Run the checks required by `AGENTS.md` and add
task-specific verification.

Report checks in three groups:

- **Passed** — actually executed and passed.
- **Failed** — executed and failed, including the observed output.
- **Not run** — unavailable or outside the environment; never describe these as
  passed.

For UI work, classify the change and follow
`docs/design/UI_ACCEPTANCE_PROTOCOL.md`; run the design contract and added-line
audit, then inspect rendered evidence for the required states. A build does not
prove visual correctness. For API/model work, review auth, couple scoping,
ownership, validation,
concurrency, response minimization, compatibility, and realtime effects.

## 6. Handoff

Every unfinished task updates its work-item manifest and
`docs/project/ACTIVE_WORK.md` with:

- branch and Issue/PR
- last verified commit
- completed work
- remaining work
- verified facts and unresolved unknowns
- changed files
- commands and results
- exact next action

Do not use chat history as the only handoff.

## 7. PR contract

A PR must state:

- what changed and why
- acceptance criteria satisfied
- facts, unknowns, and task assumptions
- data/environment/design impact
- compatibility and rollback behavior
- tests passed, failed, and not run
- screenshots or recordings plus a completed visual-evidence manifest for visible UI changes

The human product owner approves product direction and user experience. The AI
is responsible for technical completeness, evidence, and explicit uncertainty.

## 8. Stage gates

The machine-readable lifecycle is defined in
`docs/project/WORK_ITEM_LIFECYCLE.md`. Use `work-item-transition.mjs`; do not
edit the stage field manually unless repairing a reviewed manifest.

- `ready` proves the task is actionable.
- `implementing` proves the agent is on a scoped topic branch.
- `validating` proves changed files and checks are recorded.
- `review_ready` proves acceptance and required evidence are complete.
- `blocked` makes a missing product, environment, data, or dependency decision
  explicit.

Merge and release are external outcomes and cannot be claimed by a topic branch.
