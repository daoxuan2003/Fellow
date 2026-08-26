# Active Work

Last updated: 2026-08-26

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** `main`, `develop`, `origin/main`, `origin/develop` and `v9.0.1`
  resolved to `b464d93232f548062c7da66a15467a9aa4f39b81` before this task began.
- **VERIFIED:** branch `feature/wallet-payday-cycle` was created from that clean
  `develop` head.

## Current task

- Primary manifest: `.ai/tasks/task-wallet-payday-cycle.json`; stage:
  `validating`.
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
- Topic commit, remote Test/AI Governance, release merge, v9.1.0 tag, deployment
  and production health remain pending.
- Rollback target: `v9.0.1`; this change has no migration or destructive write.
