# Active Work

Last updated: 2026-07-23

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** `origin/main` is
  `1991d414bfdbbae70b8f607b70eef3bd854100d6` (v7.0.12) and `origin/develop` is
  `6cd8c17d27c6d916fc44c020fec42b7add567310`.
- **VERIFIED:** `origin/main...origin/develop` reports `0 7`; `main` is an
  ancestor of `develop`, so the latest release history is reconciled.
- **VERIFIED:** the remote has 49 actual branches: 39 merged topic branches
  remain, and 8 branches are not merged into `develop`. PR #1 and PR #18 account
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
  `29828433020` completed successfully; PR #5 was merged to `develop` with merge
  commit `6cd8c17d27c6d916fc44c020fec42b7add567310` on 2026-07-23.
- **VERIFIED:** the local strict release gate passed clean-worktree, branch
  reconciliation, version/changelog and report-tracking checks, but returned
  `block` because its current implementation globally treats active/blocked
  work items as release blockers. Issue #12 now owns a release-scope and
  explicit `release-blocking` design so unrelated work will not block a release.
  Remote CI, backup readiness and product approval remain manual gates.
- **UNKNOWN:** the actual GitHub branch-protection and required-check settings,
  and complete current CI evidence for the tips of `develop` and `main`.

## Stable baseline program

- Epic: #6 — Fellow stable baseline.
- Planning manifest: `.ai/tasks/issue-6.json`.
- Planning branch: `docs/stable-baseline-plan`.
- Planning Draft PR: #18; base `develop`, head branch
  `docs/stable-baseline-plan`. The branch merged `origin/develop` at
  `6cd8c17d27c6d916fc44c020fec42b7add567310` without history rewriting.
- Baseline-alignment verification: Test run `29984803487` and AI Governance run
  `29984803424` passed on merge head
  `63f17d8f0186b3dbba5dd2fce1bc7b95a6c0c2cc`; GitHub is authoritative for the
  latest head checks after context-only follow-up commits.
- Planning work-item stage: `review_ready`. The product owner accepted the
  planning artifact; implementation and authorization blockers belong to each
  child Issue and do not block issue-6 review.
- **VERIFIED:** PR #18 remains OPEN Draft, is retargeted to `develop`, and its
  GitHub diff contains only `.ai/tasks/issue-6.json` and
  `docs/project/ACTIVE_WORK.md`.

### P0 — blocks new feature work or release

1. #7 — add privacy-safe postgraduate array duplicate metrics. This is the
   first unblocked implementation work item and does not access production.
2. #8 — produce a complete private-API permission and data-ownership matrix;
   create bounded route/domain fixes for any finding.
3. #9 — run frontend tests in CI and define the required-check contract after
   auditing `origin/fix/daily-project-check-20260628`.
4. #10 — add privacy-safe PM2, Nginx/TLS, storage and backup-readiness report
   contracts without running them on production.
5. #19 — establish the production-server read-only observation channel after
   #7 and #10: reviewed script delivery, restricted OS account, MongoDB
   read-only role, command/path allowlists, server-side report safety check,
   controlled download and cleanup. Every server configuration change requires
   explicit product-owner approval.
6. #11 — only after #19 and a separate explicit execution authorization,
   execute the reviewed production/database reports and safety-check all output.
   It remains the sole production baseline execution task.
7. #12 — align deploy backup behavior and make the release gate scope-aware:
   only in-scope or explicit `release-blocking` tasks block; P0 security/data/
   migration issues default to release-blocking; emergency security releases
   require a one-release product-owner approval and rollback/reconciliation.
8. Existing #4 / PR #1 — retain the current audit; after #7 and #11, obtain the
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
#7  --\
       -> #19 -> #11 -> #4 -> replacement implementation -> PR #1 disposition
#10 --/              \-> #12 release scope / backup / emergency gate
#8 -> bounded permission fixes -> #14 <- #9
#15 -> #16
#15 -> #17 <- #9
```

After PR #18 is merged, #7 and #10 may run on independent topic branches in
parallel. #19 is serial after both. #11 is serial after #19 and separate
authorization. #8, #9, the audit portion of #13, and synthetic capture
preparation for #15 may also run independently when their branches do not touch
high-contention files. Production execution, database evidence, migration
decisions, remote branch deletion, workflow changes, PR disposition and release
remain serial behind their gates.

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
- #19: approve every restricted OS/MongoDB identity, command/output allowlist,
  report transfer/cleanup procedure and persistent server configuration change.
- #11: after #19, separately approve or reject the actual read-only production/
  database run, report shapes, operator and execution window.
- #12: approve backup fail-closed behavior, release-scope membership,
  `release-blocking` exceptions, emergency security release authority, rollback
  point and acceptable downtime.
- #9: approve required GitHub checks and branch-protection policy.
- #13: approve each unmerged branch's retain/restore/delete decision.
- #15: approve or reject each first visual baseline.

## Production read-only authorization boundary

No production or database command was run in the planning phase. The enforced
chain is `#7 + #10 -> #19 -> #11`. #19 must prohibit root, unrestricted sudo,
reading `.env` source text and database writes; it must constrain commands and
output to reviewed allowlists. #11 still needs a separate explicit execution
authorization. Reports must pass `report-safety-check` before controlled
download and must not contain identifiers, dates, user content, raw documents,
database/host names, paths, endpoints, connection strings or secrets.

## Current blockers and exact next actions

1. Keep PR #18 Draft and review its two-file planning diff; do not auto-merge.
2. Require Test and AI Governance to pass on the latest PR #18 head before merge
   review.
3. Only after PR #18 merges, execute #7 and #10 as independent parallel work
   items.
4. Complete and approve #19 after #7 and #10. Do not run #11 until #19 is
   complete and the product owner gives a separate explicit authorization.
5. #8 and #9 may start on independent topic branches after planning merge; #13
   and #15 may perform audit/capture preparation only.
6. Do not migrate data, dispose of PR #1, delete remote branches, merge to
   `main`, deploy or release until their explicit gates are satisfied.
