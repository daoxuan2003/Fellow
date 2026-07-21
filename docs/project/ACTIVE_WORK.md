# Active Work

Last updated: 2026-07-21

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** production/default branch `main` is at Fellow `v7.0.12`.
- **VERIFIED:** after PR #2 was merged, `origin/main...origin/develop` reported
  `0 2`, and `origin/main` was an ancestor of `origin/develop`; the v7.0.12
  release history is reconciled into the development line.
- **VERIFIED:** draft PR #1 targets `develop` and concerns postgraduate daily
  check-in ownership compatibility.
- **UNKNOWN:** whether local or remote branch state changed after this file was
  written. Re-check before creating a new branch.

## Current governance rollout

Goal: establish AI-native project memory and execution contracts before broad
feature or refactor work.

Initial deliverables:

- canonical AI context index
- task and handoff protocol
- environment contract without secrets
- database compatibility contract
- design review contract
- ADR structure
- AI-focused Issue and PR templates
- privacy-safe context checker
- environment presence and MongoDB capability reporter
- privacy-safe database/index/legacy inspector
- report safety checker and CI governance gate
- semantic design-token compatibility layer
- machine-readable visual baseline registry
- UI diff audit and visual evidence protocol
- machine-readable AI work-item manifests and stage gates
- Codex runbook, handoff generator, and PR-body generator
- release readiness report and branch reconciliation gate

## Required next actions

1. Review and merge the v0.4 governance installation PR after its required
   local checks and remote CI pass.
2. Review PR #1 against the latest base and either update, merge, supersede, or
   close it with an explicit reason.
3. Re-run `node scripts/ai/project-context-check.mjs` from updated `develop`
   after the v0.4 governance installation PR is merged.
4. Run and safety-check the v0.2 environment report on production, then update
   `PRODUCTION_CAPABILITIES.md` with dated non-secret conclusions.
5. Run the database inspector only for the approved ownership/migration metrics;
   use the result to resolve PR #1 and update the migration ledger.
6. Add read-only PM2/Nginx/storage/backup probes in a later operations milestone.
7. Capture and obtain owner approval for the initial synthetic visual baselines.
8. Resolve the documented bottom-navigation and runtime-dialog style debt through separate scoped Issues.
9. Create the first real `.ai/tasks/` manifest for the next scoped governance
   task and run it through the lifecycle; do not combine it with this
   installation PR.
10. Enable the release-readiness workflow only after its refs and branch policy are reviewed in the real repository.

## Handoff template

```markdown
### Task
Issue / PR:
Branch:
Last verified commit:

### Completed
- 待填写

### Remaining
- 待填写

### Verified facts
- 待填写

### Unknowns
- 待填写

### Changed files
- 待填写

### Validation
- Passed:
- Failed:
- Not run:

### Exact next action
- 待填写
```
