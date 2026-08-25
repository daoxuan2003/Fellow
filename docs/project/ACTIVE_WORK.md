# Active Work

Last updated: 2026-08-25

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** `main`, `develop`, `origin/main` and `origin/develop` resolved to
  released `v8.5.0` at `12c2131d324ee46730e2fa5c7ec82462803afc26`
  before this task began.
- **VERIFIED:** branch `refactor/wallet-remove-legacy-ledger` was created from
  that clean `develop` head.

## Current task

- Primary manifest: `.ai/tasks/task-wallet-remove-legacy-ledger.json`; stage:
  `review_ready`.
- Topic branch: `refactor/wallet-remove-legacy-ledger`.
- Goal: retain the current wallet source of truth while removing the conflicting
  custom-category, old monthly-budget/quota and manual-net-worth system.
- **VERIFIED:** the product owner explicitly requested deletion instead of legacy
  compatibility and approved the critical data migration.
- **VERIFIED:** current wallet behavior requires `Account`, `Transaction`,
  `DebtPlan`, `MonthlyWalletPlan` and `DebtPayment`; these collections are outside
  the deletion allowlist.
- **VERIFIED:** only `categories`, `networths` and `budgetsettings` are selected
  for deletion. Missing transaction kinds are normalized from the existing type;
  existing non-null kinds and all wallet balances remain unchanged.
- **VERIFIED:** the deployment workflow is being changed so a failed backup stops
  deployment and the idempotent cleanup runs only after the new backend is online.
- **UNKNOWN:** production legacy document counts and missing-kind coverage; this
  task intentionally does not inspect or report private production data.
- **ASSUMED_FOR_TASK:** old `income`, `expense` and `transfer` types truthfully map
  to `income`, `expense` and `asset_transfer` when `kind` is absent.

## Validation pending

- **VERIFIED:** focused and complete frontend/backend tests pass; the strict
  added-line design report has zero findings, and inspected synthetic evidence
  covers wallet widths 320/375/430, the retained transaction list/composer and
  the home wallet summary without horizontal overflow.
- **VERIFIED:** final topic head `591a59c` is pushed; Test run `32845516330`
  and AI Governance run `32845516425` passed, and the work item is
  `review_ready`.
- Pending before destructive release: a fresh successful production backup.
- Pending release: merge through `develop`, version `9.0.0`, tag, deploy-time
  idempotent migration, deployment health check and privacy-safe confirmation.
- Rollback target: `v8.5.0`. Deleted legacy collections can be restored only from
  the exact pre-migration backup after explicit approval; wallet collections must
  not be replaced or recalculated.
