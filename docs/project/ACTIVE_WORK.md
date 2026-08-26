# Active Work

Last updated: 2026-08-26

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** `develop` and `origin/develop` resolved to
  `58b5ba7bf527e04763c101051c8564244e9eb766` and the worktree was clean before
  branch `fix/wallet-transaction-503` was created.
- **VERIFIED:** `main`, `develop`, `origin/main`, `origin/develop` and `v9.0.1`
  resolved to `b464d93232f548062c7da66a15467a9aa4f39b81` before this task began.
- **VERIFIED:** branch `feature/wallet-payday-cycle` was created from that clean
  `develop` head.

## Current task

- Primary manifest: `.ai/tasks/task-wallet-transaction-503.json`; stage:
  `review_ready`.
- Goal: stop production `POST /api/wallet/transactions` from returning 503 when
  MongoDB transactions are unavailable, without duplicating a ledger row or
  applying an account balance twice on retries.
- **VERIFIED:** the route currently requires `withWalletTransaction` even when
  no account is selected; unsupported transactions therefore fail before the
  ordinary ledger write can complete.
- **VERIFIED:** `Transaction` already has a couple-scoped unique request-id
  index, but the create route and transaction composer do not use it.
- **UNKNOWN:** production topology and the failed request's account selection
  were not inspected; the user-provided route and 503 status are the only
  production facts used.
- Planned compatibility: retain the transactional path when available and add
  a request-scoped pending/compensation path only for ordinary creation.
- **VERIFIED:** the implementation now keeps the transactional path, falls back
  only when the database is connected but rejects transactions, records one
  pending request, applies each account delta once, compensates definitive
  failures and hides pending rows from reads.
- **VERIFIED:** the client keeps one create request ID while a failed sheet stays
  open; internal transaction/account recovery fields are not serialized.
- **VERIFIED:** focused tests pass 15/15, including stale-marker recovery;
  complete backend verification passes 322/322 with 118-file syntax and zero
  production dependency vulnerabilities,
  and complete frontend tests pass 166/166.
- **VERIFIED:** project context, design contract, work-item contracts and diff
  checks pass. Topic commit `70b38d0` passed GitHub Test run `32934086927`
  and AI Governance run `32934086938`; production release remains pending.

## Latest completed release

- Primary manifest: `.ai/tasks/task-wallet-payday-cycle.json`; stage:
  `review_ready`.
- Topic branch: `feature/wallet-payday-cycle`.
- Goal: make the wallet use a 25th-to-following-24th cash-flow cycle and clearly
  distinguish current safe cash from the amount projected after salary arrives.
- **VERIFIED:** current safe cash excludes expected income, while the previous
  cutoff included upcoming repayments; this made same-day salary and repayment
  appear as an unexplained deficit.
- **VERIFIED:** the implementation now derives the active cycle from the local
  calendar, keeps overdue unpaid debt reserved, excludes repayments due after
  the cycle ends, and orders same-day expected income before repayment in the
  planning timeline.
- **VERIFIED:** expected income remains a forecast and never mutates an account
  balance; after its date passes, it is no longer added again and the UI asks the
  user to record the actual income if it arrived.
- **UNKNOWN:** the external salary-credit and platform-debit order on the 25th is
  not controlled by Fellow; the UI therefore keeps an explicit same-day warning.
- **ASSUMED_FOR_TASK:** existing `YYYY-MM` plan keys represent the cycle start
  month; no database migration or destructive data change is required.

## Validation pending

- **VERIFIED:** frontend tests pass 165/165; backend verify passes syntax for 118
  files, 315/315 tests and the official-registry production dependency audit.
- **VERIFIED:** project context, design contract, all work-item checks, strict UI
  added-line audit, visual manifest and report-safety checks pass.
- **VERIFIED:** synthetic 320/375/430 evidence covers normal, reserve-deficit,
  long-amount and same-day plan states with zero horizontal overflow and no
  browser console warnings or errors.
- **VERIFIED:** implementation commit `dab06ff` is pushed on PR #33; push and PR
  Test/AI Governance runs all completed successfully, including the clean Vite
  build and backend syntax check.
- **VERIFIED:** PR #33 has been merged into `develop` as `b776f4f`; the scoped
  work item is `review_ready` and v9.1.0 release metadata is prepared.
- **VERIFIED:** fresh production backup run `32928905916`, the local strict
  scoped v9.1.0 release gate and remote Release Readiness run `32928908361`
  all passed with only the approved work item in release scope.
- **VERIFIED:** v9.1.0 is tagged at `5de3186`; origin/main resolves to the same
  commit and Deploy run `32928989242` completed successfully, including build,
  backup, upload, restart, migration, WebSocket and API health steps.
- **VERIFIED:** public `version.json` reports 9.1.0; the public API health probe
  returns 200, an unauthenticated wallet request returns 401, the public
  WebSocket handshake passes, and the production login page shows the v9.1.0
  update with no browser console warning or error.
- No implementation or production validation remains pending for this release.
- Rollback target: `v9.0.1`; this change has no migration or destructive write.
