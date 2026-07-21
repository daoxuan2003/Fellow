# Active Work

Last updated: 2026-07-21

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** `origin/main` is
  `1991d414bfdbbae70b8f607b70eef3bd854100d6` (v7.0.12) and `origin/develop` is
  `9e4fc13da0bcecad9fe43796b0c66ff9ad46b5ed`.
- **VERIFIED:** `origin/main...origin/develop` reports `0 5`; `main` is an
  ancestor of `develop`, so the latest release history is reconciled.
- **VERIFIED:** the remote has 49 actual branches: 39 merged topic branches
  remain, and 8 branches are not merged into `develop`. PR #1 and PR #5 account
  for two of the eight; six unmerged branches have no open PR.
- **VERIFIED:** the local ignored `frontend/dist` directory predates this task,
  contains 41 files (about 986 KB), is untracked, and was not modified. Local
  frontend builds remain prohibited.
- **VERIFIED:** the current planning branch is `docs/stable-baseline-plan`,
  created from PR #5 head `868a22e38152e705db28240f5195b32ef58db55a`.

## Verified quality and delivery baseline

- **VERIFIED:** backend `npm run verify` passed: 104 JavaScript files checked,
  201 tests passed, and the high-severity dependency audit gate passed. The
  audit still reports one low-severity `body-parser` advisory.
- **VERIFIED:** frontend `npm test` passed with 141 tests. The current GitHub
  `Test` workflow builds the frontend but does not run these frontend tests.
- **VERIFIED:** PR #5 Test run `29828433129` and AI Governance run
  `29828433020` completed successfully.
- **VERIFIED:** the local strict release gate passed clean-worktree, branch
  reconciliation, version/changelog and report-tracking checks, but returned
  `block` because Issue #4 is blocked. Remote CI, backup readiness and product
  approval remain manual gates.
- **UNKNOWN:** the actual GitHub branch-protection and required-check settings,
  and complete current CI evidence for the tips of `develop` and `main`.

## Stable baseline program

- Epic: #6 — Fellow stable baseline.
- Planning manifest: `.ai/tasks/issue-6.json`.
- Planning branch: `docs/stable-baseline-plan`.
- Integration order: PR #5 first, then retarget the planning Draft PR from
  `chore/audit-pr-1-postgraduate-checkin` to `develop` and rerun CI.

### P0 — blocks new feature work or release

1. #7 — add privacy-safe postgraduate array duplicate metrics. This is the
   first unblocked implementation work item and does not access production.
2. #8 — produce a complete private-API permission and data-ownership matrix;
   create bounded route/domain fixes for any finding.
3. #9 — run frontend tests in CI and define the required-check contract after
   auditing `origin/fix/daily-project-check-20260628`.
4. #10 — add privacy-safe PM2, Nginx/TLS, storage and backup-readiness report
   contracts without running them on production.
5. #11 — after explicit authorization, execute the reviewed production and
   database read-only reports and safety-check all output.
6. #12 — align deploy backup-failure behavior with release hard gates after
   evidence and product-owner policy decisions.
7. Existing #4 / PR #1 — retain the current audit; after #7 and #11, obtain the
   legacy-data decision, create a latest-`develop` replacement if approved, and
   then dispose of PR #1 explicitly.

### P1 — continuous regression and repository order

- #13 — classify all remote branches; no delete, restore, merge, rebase or
  force-push occurs without product-owner approval.
- #14 — add a minimal synthetic couple-isolation and realtime end-to-end gate
  after #8, #9 and any derived P0 fixes.
- #15 — capture Home, Mood, Identity/Consent and Bottom Navigation with
  synthetic fixtures and obtain product-owner baseline approval.

### P2 — bounded design debt

- #16 — resolve DS-001 so `BottomNav.vue` owns the navigation style contract;
  depends on #15.
- #17 — resolve DS-002 by componentizing the PWA update/changelog dialogs;
  depends on #9 and #15.
- DS-003 large views are not a blanket refactor. A page-specific extraction
  requires one proven duplicated/testable boundary and its own Issue.

## Dependency and concurrency rules

Serial chains:

```text
#7 -> #11 -> #4 -> replacement implementation -> PR #1 disposition
#10 -> #11 -> #12
#8 -> bounded permission fixes -> #14 <- #9
#15 -> #16
#15 -> #17 <- #9
```

**VERIFIED:** #7, #8, #9, #10, the audit portion of #13, and synthetic capture
preparation for #15 have independent initial scopes and may run in parallel
when their branches do not touch high-contention files. Production execution,
database evidence, migration decisions, remote branch deletion, workflow
changes, PR disposition and release remain serial behind their gates.

## Current governed audit

- Issue: #4 — audit and dispose of legacy PR #1 postgraduate ownership.
- Audit PR: #5; manifest `.ai/tasks/issue-4.json`; stage `blocked`.
- **VERIFIED:** PR #1 is an open conflicting Draft, has one unique commit and is
  181 `develop` commits behind. The current code still lacks a postgraduate
  check-in actor; PR #1's legacy strategy exposes actorless records to both
  users.
- Recommendation: do not extend PR #1 in place. Obtain safe aggregate evidence
  and a product decision, then implement from current `develop`; design
  migration and rollback first if historical ownership changes.

## Product-owner decisions required

- #4: define actorless postgraduate history and approve PR #1 disposition.
- #11: approve or reject read-only production/database access, report shapes,
  operator and execution window.
- #12: approve backup fail-closed behavior, emergency override authority,
  rollback point and acceptable downtime.
- #9: approve required GitHub checks and branch-protection policy.
- #13: approve each unmerged branch's retain/restore/delete decision.
- #15: approve or reject each first visual baseline.

## Production read-only authorization boundary

No production or database command was run in the planning phase. #11 may run
only after #7 and #10 are reviewed and explicit authorization is recorded. All
generated output stays in ignored `.ai-reports/`, must pass
`report-safety-check`, and must not contain identifiers, dates, user content,
raw documents, database/host names, paths, endpoints, connection strings or
secrets.

## Current blockers and exact next actions

1. Review and merge PR #5 without changing PR #1.
2. Review the stable-baseline planning Draft PR; after PR #5 merges, retarget it
   to `develop`, resolve only the expected planning-context overlap and rerun
   Test plus AI Governance.
3. Execute #7 as the first implementation work item.
4. In parallel, #8, #9 and #10 may start on independent topic branches; #13 and
   #15 may perform audit/capture preparation only.
5. Do not run #11, implement #12, migrate data, dispose of PR #1, delete remote
   branches, merge to `develop`/`main`, or release until their explicit gates
   are satisfied.
