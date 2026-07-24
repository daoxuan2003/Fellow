# Active Work

Last updated: 2026-07-24

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** `origin/develop` is at
  `fb7eb05d6f89f871e9fcfc054d100e8c45ac77ce`, the merge commit for PR #21;
  it contains the reviewed Issue #19 runtime-observer installation materials.
- **VERIFIED:** `origin/main` is an ancestor of `origin/develop`; this task
  starts from the latest development baseline without release drift.
- **VERIFIED:** draft PR #1 is open against `develop`, has one unique commit,
  is 181 develop commits behind the current base, and GitHub reports it as
  conflicting.
- **VERIFIED:** the current task branch is
  `docs/issue-11-runtime-observation`, created from the latest
  `origin/develop`.

## Current observation task

- Issue: #11 — 一次性生产运行只读观测。
- Manifest: `.ai/tasks/issue-11.json`; stage: `validating` while the approved
  evidence is synchronized to the durable capability snapshot and Draft PR.
- Branch: `docs/issue-11-runtime-observation`.
- **VERIFIED:** the user reports post-install `baseline` exit 0, `whoami`
  returning `fellow-observer`, and argument/unknown-command attempts exiting
  126.
- **VERIFIED:** the exact authorized command was executed once without retry:
  exit 0, stdout 708 bytes, stderr 0 bytes and no signal.
- **VERIFIED:** raw stdout is preserved at
  `.ai-reports/issue-11-runtime-baseline-20260724-one-shot/runtime-baseline.stdout.json`
  with SHA-256 `16b333cc1f2aa22dd6482f96eb565eb49cb66e39cb7e9298bbf20d3caffa5a7c`;
  JSON parsing, `report-safety-check` and the strict runtime contract passed.
- **VERIFIED:** HTTP/WebSocket passed, ports 3000/3001 are true, root disk is
  67%, the default backup directory is true with fresh/small latest-backup
  categories, and application-directory presence is true.
- **VERIFIED:** Node is supported; npm is `timeout`; PM2 and Nginx are
  `unsupported`. These categorical results are not reinterpreted.
- **VERIFIED:** the product owner reviewed the Issue #11 observation and
  accepted the result. The same categorical facts and remaining unknowns are
  recorded in `docs/operations/PRODUCTION_CAPABILITIES.md`.
- Constraint: no other SSH command, root, sudo, scp, sftp, MongoDB, `.env`,
  logs, application-file contents, deployment workflow or business-code
  change.

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

## Issue #11 exact next actions

1. Validate the three-file repository scope and confirm `.ai-reports` remains
   ignored and untracked.
2. Push `docs/issue-11-runtime-observation`, open a Draft PR to `develop`, and
   require Test plus AI Governance on the final head.
3. Do not reconnect to the server or repeat `runtime-baseline`; any remediation
   or follow-up observation requires a new explicit scope.
