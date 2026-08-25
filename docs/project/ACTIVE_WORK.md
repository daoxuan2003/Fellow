# Active Work

Last updated: 2026-08-25

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** `main`, `develop`, `origin/main`, `origin/develop` and `v9.0.0`
  resolved to `8b831ac083a87671f8ed153b6b326ab493ebfcf3` before this task began.
- **VERIFIED:** branch `fix/wallet-debt-transaction-unavailable` was created
  from that clean `develop` head.

## Current task

- Primary manifest: `.ai/tasks/task-wallet-debt-transaction-unavailable.json`;
  stage: `review_ready`.
- Topic branch: `fix/wallet-debt-transaction-unavailable`.
- Goal: make debt-plan creation work safely when production MongoDB transactions
  are unavailable, without weakening transaction requirements for repayments or
  ordinary wallet ledger mutations.
- **VERIFIED:** the user observed authenticated `POST /api/wallet/debts` returning
  `503`; the same public route returns `401` without authentication, so routing
  and the application are reachable.
- **VERIFIED:** the only application-level `503` in that route is
  `TRANSACTION_UNAVAILABLE` from `withWalletTransaction`.
- **VERIFIED:** debt creation currently writes both `Account` and `DebtPlan`; a
  global non-transaction fallback would risk partial financial writes.
- **UNKNOWN:** production MongoDB topology is not directly attested by an approved
  capability probe, and no production wallet contents are being inspected.
- **ASSUMED_FOR_TASK:** the observed route-specific `503` is the fail-closed
  transaction capability path rather than a temporary reverse-proxy outage.
- **VERIFIED:** the implementation now gives debt creation a request-id replay
  contract and a debt-setup-only compensating path; payment and ordinary ledger
  mutations still require database transactions.
- **VERIFIED:** incomplete automatic accounts are created archived, incomplete
  plans are marked pending, application failures compensate scoped writes, and
  retrying a pending request completes before broadcasting.
- **VERIFIED:** the ambiguous `剩余费用` label is clarified as
  `额外手续费/利息`, with explicit guidance to enter zero when the displayed
  remaining debt already includes that amount.

## Validation pending

- **VERIFIED:** focused debt-route tests pass 12/12; the complete frontend suite
  passes 164/164 and backend verify passes 311/311 with zero high-severity
  production dependency audit findings.
- **VERIFIED:** rendered synthetic evidence at 320x568 and 375x812 shows the
  clarified fee copy, 0px horizontal overflow and reachable sheet actions.
- **VERIFIED:** project context, design contract, strict added-line UI audit,
  visual-evidence contract, report safety and work-item contract checks pass.
- **VERIFIED:** topic head `b078b53` is pushed; Test run `32859543693` and AI
  Governance run `32859543490` completed successfully, and the work item is
  `review_ready`.
- **VERIFIED:** fresh pre-release database backup run `32859857815` completed
  successfully against the current production release before v9.0.1.
- v9.0.1 scoped release gate, deployment and production health remain pending.
- Rollback target: `v9.0.0`. Optional internal setup fields are ignored by the
  released code; completed financial records must not be deleted during rollback.
