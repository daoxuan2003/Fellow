# Active Work

Last updated: 2026-07-23

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** `origin/develop` is at
  `6cd8c17d27c6d916fc44c020fec42b7add567310`; the PR #5 audit context is
  present on that development baseline.
- **VERIFIED:** `origin/main...origin/develop` reports `0 7`, and
  `origin/main` is an ancestor of `origin/develop`.
- **VERIFIED:** draft PR #1 is open against `develop`, has one unique commit,
  is 181 develop commits behind the current base, and GitHub reports it as
  conflicting.
- **VERIFIED:** the current task branch is
  `feature/production-runtime-readonly-probe`, created from the latest
  `origin/develop`.

## Current implementation task

- Issue: #10 — 运维：扩展生产只读能力报告覆盖运行与备份门禁
- Manifest: `.ai/tasks/issue-10.json`; stage: `validating`.
- Scope: repository-controlled read-only runtime probe, strict output contract,
  synthetic fixtures, safety-check integration and operating documentation.
- Output is limited to the 15 product-owner-approved fields. The first version
  classifies Node/npm, application-directory presence, HTTP/WebSocket and port
  health, root-disk usage, default local-backup metadata, canonical PM2 state
  and Nginx service state.
- **VERIFIED:** the real adapter does not call the PM2 CLI because its client
  may create PM2-home state or launch a missing daemon. It reports PM2 as
  unsupported until Issue #19 approves a non-mutating categorical bridge;
  synthetic fixtures cover the future parser behavior.
- **VERIFIED:** pass, fail, missing, timeout and permission-denied fixtures run
  locally without production or database access. The synthetic pass report
  passes `report-safety-check`.
- **UNKNOWN:** every actual production value remains unobserved. Issue #19 owns
  installation and the restricted OS allowlist; Issue #11 remains the only
  task that may execute production observation after separate authorization.
- Constraint: do not connect to production or MongoDB, read `.env`, modify the
  deploy workflow, install the probe, or run deployment/backup/restart/sudo.

## Existing governed audit

- Issue: #4 — 审计并处置遗留 PR #1 的考研报到数据归属问题
- Manifest: `.ai/tasks/issue-4.json`
- Scope: static audit, data-ownership risk, privacy-safe aggregate plan, and
  disposition recommendation only.
- Current conclusion: the latest code still stores one shared same-day
  postgraduate check-in per couple. PR #1 adds actor scoping but is based on an
  obsolete, conflicting model and treats every legacy record as visible to
  both users.
- Recommendation: do not extend PR #1 in place. After product approval and
  safe aggregate evidence, create a replacement implementation from the latest
  `develop`; if legacy ownership must change, design migration and rollback
  first.
- Constraint: do not update, merge, or close PR #1 during this audit.

## Blocker and required evidence

The task is blocked on a product-owner decision and privacy-safe production
aggregates. Required metrics are:

- `PostgraduateProgress` document count and `checkIns` element count;
- actor `userId` present, missing/empty, and coverage percentage;
- duplicate elements by `coupleId/date/userId` and multiple elements by
  `coupleId/date`;
- declared versus actual relevant indexes;
- non-secret topology/transaction capability and backup/restore readiness.

The existing inspector currently covers counts, actor coverage, document-level
duplicate couple records, indexes, and topology. It does not yet express the
two array-element duplicate metrics, so that privacy-safe aggregation
capability needs a separate reviewed governance change before the approved
production run.

Planned commands, not run:

```powershell
node scripts/ai/database-inspect.mjs --policy=scripts/ai/inspection-policy.json --output=.ai-reports/database-inspection-issue-4.json
node scripts/ai/report-safety-check.mjs .ai-reports/database-inspection-issue-4.json
```

The report must not contain identifiers, date details, user content, raw
documents, connection strings, database names, or hostnames.

## Issue #4 exact next actions

1. Review the draft audit PR without changing PR #1.
2. Product owner decides how legacy check-ins should be interpreted and
   approves or rejects the read-only aggregate inspection.
3. If approved, add the missing duplicate-element aggregation capability in a
   separate governance change and review its output contract.
4. Run the planned inspector through an authorized production procedure, then
   run `report-safety-check` before sharing the report.
5. Resume issue #4 from `blocked`, record the aggregate evidence, and finalize
   the replacement-versus-migration decision.

## Issue #10 exact next actions

1. Complete local repository validation and inspect the complete diff.
2. Commit and push only `feature/production-runtime-readonly-probe`.
3. Open a Draft PR targeting `develop` and require Test plus AI Governance to
   pass before moving the work item to `review_ready`.
4. Do not install or run the probe on production; hand that work to Issue #19
   and retain separate Issue #11 execution authorization.
