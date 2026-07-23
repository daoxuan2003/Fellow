# Active Work

Last updated: 2026-07-23

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** `origin/develop` is at
  `a82ae11fb8a2428ade1f4bff0e84da40b9811067`, the merge commit for PR #20.
- **VERIFIED:** `origin/main` is an ancestor of `origin/develop`; this task
  starts from the latest development baseline without release drift.
- **VERIFIED:** draft PR #1 is open against `develop`, has one unique commit,
  is 181 develop commits behind the current base, and GitHub reports it as
  conflicting.
- **VERIFIED:** the current task branch is
  `feature/runtime-observer-channel-install`, created from the latest
  `origin/develop`.

## Current implementation task

- Issue: #19 runtime installation substage — 建立生产服务器只读观测通道。
- Manifest: `.ai/tasks/issue-19-runtime-install.json`; stage: `implementing`.
- Branch: `feature/runtime-observer-channel-install`; Draft PR pending, target
  `develop`.
- Scope: pin the Issue #10 merge payload, add a no-argument fixed wrapper,
  deterministic packager, artifact manifest, dispatcher template, synthetic
  tests and exact manual installation/rollback instructions.
- **VERIFIED:** the product-owner read-only production check identified
  `/usr/local/sbin/fellow-observer-gate` as a regular non-symlink
  `root:root 0755` file with SHA-256 `e37d7cc4...`; global sshd ForceCommand is
  `none`, while authorized_keys fixes that dispatcher and disables forwarding,
  PTY and user rc.
- **VERIFIED:** the replacement template retains `baseline`, `whoami` and the
  exit-126 default denial, changes the shebang to `/bin/bash`, and adds only
  the exact `runtime-baseline` command.
- **VERIFIED:** the wrapper rejects arguments, verifies payload hashes, clears
  inherited environment and withholds stdout until the strict contract and
  safety checker pass. PM2 remains unsupported.
- **UNKNOWN:** server binary versions, observer primary group and its actual
  application/backup read permissions remain untested; the documented
  installation assertions fail closed and never widen permissions.
- Constraint: do not connect to or modify production, execute
  `runtime-baseline`, connect to MongoDB, read `.env`, modify authorized_keys or
  sshd_config, restart sshd, deploy, back up, restore, release or use sudo.

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

## Issue #19 runtime-install exact next actions

1. Complete local validation, create the target-`develop` Draft PR and require
   Test plus AI Governance to pass on its final head.
2. Product owner reviews the wrapper, artifact manifest, gate template and
   root-only installation/rollback commands.
3. Do not install anything until this PR is merged and a separate persistent
   production-change authorization is recorded.
4. Do not execute `runtime-baseline` during installation; Issue #11 retains
   the separate execution authorization.
5. Keep Issue #7 as the dependency for the later MongoDB-only channel stage.
