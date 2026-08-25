# Active Work

Last updated: 2026-08-25

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** `main`, `develop`, `origin/main` and `origin/develop` resolve to
  release `v8.4.2` at `7c17f67ab33c99b586a214b45faab2d77d0c2128`.
- **VERIFIED:** the worktree was clean before creating
  `feature/wallet-debt-planner` from `develop`.

## Current task

- Primary manifest: `.ai/tasks/task-wallet-debt-planner.json`; stage: `validating`.
- Topic branch: `feature/wallet-debt-planner`.
- Goal: replace the transaction-first ledger surface with a debt-payoff wallet
  whose truthful first screen explains safe-to-spend money, upcoming repayments,
  monthly allocations and payoff progress.
- **VERIFIED:** the product owner selected debt payoff as the first priority,
  requires all wallet data to be visible to both partners, and requires automatic
  repayment schedules from amount, installment count and due dates.
- **VERIFIED:** existing account ownership already provides partner visibility
  with creator-only account mutation; existing liability subtypes include Huabei
  and Baitiao.
- Preserved behavior: authenticated couple scope, creator-owned account and
  transaction edits, existing account/category/budget/transaction reads, one
  global bottom navigation and write-before-realtime ordering.
- Intended difference: new debt plans, installment payments, monthly allocations,
  future cash flow and an approved direction-A wallet information hierarchy.
- **UNKNOWN:** historical production field coverage and production transaction
  capability; no private production data is inspected or inferred.
- **VERIFIED:** the product owner approved the high-risk product direction and
  explicitly authorized independent verification followed by a production release.

## Validation pending

- **VERIFIED:** the complete frontend suite passes 163 tests.
- **VERIFIED:** backend syntax, 302 tests and the official-registry production
  dependency audit pass with zero known vulnerabilities.
- **VERIFIED:** strict design added-line audit reports zero errors and warnings;
  the synthetic 14-capture manifest passes and covers 320/375/430, populated,
  empty, loading, error, deficit, long amount, repayment, keyboard focus,
  reduced motion and partner realtime update states.
- Pending: topic branch commit, push and remote Test / AI Governance workflows.
- Authorized after all required local and remote checks pass: version update,
  develop/main merge, semantic tag and production release.
