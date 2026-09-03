# Active Work

Last updated: 2026-09-03

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** fitness PR #39 merged into `develop` as
  `a457ac0554375d4691b1f8f17d171553624d46a3`; implementation, local
  validation and remote CI are complete and production release is explicitly
  authorized.
- **VERIFIED:** branch `fix/transactionless-mutations` was created from clean
  `develop` commit `05cff2164fcaec88459bbf5758e78c15d59264b9` for the current
  repair.
- **VERIFIED:** `develop` and `origin/develop` resolved to
  `58b5ba7bf527e04763c101051c8564244e9eb766` and the worktree was clean before
  branch `fix/wallet-transaction-503` was created.
- **VERIFIED:** `main`, `develop`, `origin/main`, `origin/develop` and `v9.0.1`
  resolved to `b464d93232f548062c7da66a15467a9aa4f39b81` before this task began.
- **VERIFIED:** branch `feature/wallet-payday-cycle` was created from that clean
  `develop` head.

## Current active work

- Primary manifest: `.ai/tasks/task-couple-fitness-plan.json`; stage:
  `review_ready`.
- Released version: `v9.3.0` at
  `7ddd777727006a0a7f1ac786b99d7f443c99622d`.
- Goal: add a health-contained couple fitness flow with a fixed 30-minute
  daily plan, actual exercise and meal logging, a seven-day couple trajectory,
  and truthful progress through June 2027.
- **VERIFIED:** male and female plans use fixed sets/repetitions and equipment
  alternatives; strength warm-up is brisk walking only. The female plan has no
  squat, leg press, lunge, or step-up pattern and never unlocks one by time.
- **VERIFIED:** daily logs are owned by the JWT user and visible only to the
  current reciprocal couple. Server-derived allowlists, canonical couple scope,
  disjoint Mongo upsert operators, atomic completion derivation, and
  post-persistence `fitnessSync` are covered by route tests.
- **VERIFIED:** the new route provides 今日、计划、进展 views, exact actual-value
  entry sheets, meal logging on training and rest days, partner read-only state,
  strong completion feedback, and real HealthRecord values or an explicit empty
  state. Home health status also reflects today's workout when available.
- **VERIFIED:** focused fitness tests pass 9/9, backend verification checks 123
  JavaScript files and passes 340/340 tests, and frontend tests pass 172/172.
  The official npm high-severity audit gate passes; three moderate transitive
  `qs` advisories remain visible and are not introduced by this feature.
- **VERIFIED:** strict added-line UI audit has zero errors and zero warnings.
  Eleven synthetic mobile captures cover 320/375/430, the health entry, fixed
  plan, keyboard-equivalent sheet, completion, partner read-only/realtime,
  loading, empty and error states with zero measured horizontal overflow.
- **VERIFIED:** topic commits through `aa966cf` passed GitHub Test and AI
  Governance in both push and PR contexts; PR #39 merged into `develop` as
  `a457ac0`.
- **VERIFIED:** v9.3.0 release metadata scopes the release only to
  `task-couple-fitness-plan` and preserves the full changelog history.
- **VERIFIED:** release metadata PR #40 merged into `develop` as `91d0a2f`;
  all four PR/push Test and AI Governance checks passed.
- **VERIFIED:** fresh production backup run `33703634311`, the local strict
  scoped v9.3.0 release gate and remote Release Readiness run `33703690434`
  all passed with only `task-couple-fitness-plan` in release scope.
- **VERIFIED:** `v9.3.0` and `origin/main` resolve to `7ddd777`; Deploy run
  `33703807404` completed successfully, including clean frontend build, a
  second database backup, upload, restart, wallet migration, WebSocket and API
  health steps.
- **VERIFIED:** public `version.json` reports 9.3.0 with status 200; the VAPID
  public endpoint returns 200 with a public key present, unauthenticated
  fitness detail, summary and exercise mutation requests return 401, and the
  public `/ws` WebSocket handshake passes.
- **UNKNOWN:** the production fitness collection/index state was not inspected;
  no authenticated production fitness or health write was performed because
  that would create or alter real user data.
- No implementation or production validation remains pending for v9.3.0.
- Rollback target remains `v9.2.0`; rollback leaves the independent fitness log
  collection inert and does not change or delete HealthRecord data.

## Previous completed release (v9.2.0)

- Primary manifest: `.ai/tasks/task-wallet-budget-ledger.json`; stage:
  `review_ready`.
- Topic branch: `feature/wallet-budget-ledger`, based on clean `develop`
  `c65d8b0` after the v9.1.2 release history was reconciled.
- Goal: make every ordinary expense consume a real fixed wallet pocket and
  derive budget, spent, remaining and overspent amounts from the current
  25th-to-24th ledger so the user never calculates the budget manually.
- **VERIFIED:** ordinary expenses now require one server-allowlisted pocket;
  income and transfers do not consume budgets, while transactional and
  transactionless debt repayment paths both write the payer's `debt` pocket.
- **VERIFIED:** the overview reads only ready current-cycle expense and debt
  payment rows, then derives budget, spent, remaining, overspent and progress
  without storing a mutable spent balance.
- **ASSUMED_FOR_TASK:** new expenses require an explicit fixed pocket, debt
  payments use the payer's debt pocket, and historical missing keys remain
  visible as “待归类” without inferred backfill.
- **UNKNOWN:** production historical pocket/account coverage was not inspected;
  no real financial row or balance will be read or changed for implementation
  evidence.
- **VERIFIED:** the wallet and plan tabs show ledger-backed usage and remaining
  or overspent amounts; the transaction sheet requires a pocket and previews
  the post-save balance. Historical missing keys remain “待归类”.
- **VERIFIED:** focused wallet tests pass 56/56, backend verification passes
  331/331 with 119-file syntax and zero production dependency vulnerabilities,
  and frontend tests pass 168/168.
- **VERIFIED:** nine synthetic mobile captures cover 320/375/430, populated,
  overspent, unassigned, composer, keyboard-equivalent, empty, loading, error
  and long-value states. The detected 375px long-value overflow was corrected
  and remeasured at zero pixels.
- **VERIFIED:** topic implementation commit `1df6274` passed AI Governance run
  `33049571717` and Test run `33049571772`, including a clean Vite production
  build and backend syntax check.
- **VERIFIED:** feature PR #37 merged into `develop` as `1177d1d`; v9.2.0
  release metadata PR #38 merged as `4a020b7` after all PR checks passed.
- **VERIFIED:** fresh production backup run `33050151956`, the local strict
  scoped v9.2.0 release gate and remote Release Readiness run `33050217010`
  all passed with only `task-wallet-budget-ledger` in release scope.
- **VERIFIED:** v9.2.0 is tagged at `3b9a0c4`; `origin/main` resolves to the
  same commit and Deploy run `33088044159` completed successfully, including
  build, a second production backup, upload, restart, migration, WebSocket and
  API health steps.
- **VERIFIED:** public `version.json` reports 9.2.0 with status 200; the VAPID
  public endpoint returns 200 with a public key present, unauthenticated wallet
  overview and transaction requests return 401, and the public WebSocket
  handshake passes.
- **UNKNOWN:** no authenticated production wallet write was performed because
  that would create or alter real financial data; release confidence comes
  from deployed-SHA verification, synthetic mutation coverage and public
  read-only health evidence.
- No implementation or production validation remains pending for v9.2.0.
- Rollback target: `v9.1.2`; no backfill or destructive migration was run.

## Previous completed release (v9.1.2)

- **VERIFIED:** v9.1.2 is tagged at `b100f00`; `origin/main` resolves to the
  same commit and Deploy run `33034013038` completed successfully, including
  build, backup, upload, restart, migration, WebSocket and API health steps.
- **VERIFIED:** public `version.json` reports 9.1.2 with status 200; the VAPID
  public endpoint returns 200 with a public key present, an unauthenticated
  wallet request returns 401, and the public WebSocket handshake passes.
- **UNKNOWN:** no authenticated production wallet write was performed because
  that would create or alter real financial data.
- Rollback target: `v9.1.1`; no backfill or destructive migration was run.

## Earlier completed release (v9.1.1)

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
  and AI Governance run `32934086938`; PR #34 merged into `develop` as
  `664989d` and v9.1.1 release metadata is prepared.
- **VERIFIED:** fresh production backup run `32934374573`, the local strict
  scoped v9.1.1 release gate and remote Release Readiness run `32934377053`
  all passed with only the approved work item in release scope.
- **VERIFIED:** v9.1.1 is tagged at `76d6f03`; `origin/main` resolves to the
  same commit and Deploy run `32934493660` completed successfully, including
  build, backup, upload, restart, migration, WebSocket and API health steps.
- **VERIFIED:** public `version.json` reports 9.1.1 with status 200; the VAPID
  public endpoint returns 200 with a public key present, an unauthenticated
  wallet-transaction request returns 401, and the public WebSocket handshake
  passes.
- **UNKNOWN:** no authenticated production wallet write was performed because
  that would create or alter real financial data; release confidence comes
  from the deployed SHA, synthetic failure/retry coverage and public health.
- No implementation or scheduled production validation remains pending.
- Rollback target: `v9.1.0`; no backfill or destructive migration was run.

## Earlier completed release (v9.1.0)

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

## Validation evidence

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
