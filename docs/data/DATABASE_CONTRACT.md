# Database Contract

This document records data ownership and compatibility rules that cannot be
reconstructed safely from Mongoose schemas alone.

## Verified architectural rules

- MongoDB is accessed through Mongoose.
- Authenticated identity is authoritative; client-supplied identity is not.
- Couple-owned records use the authenticated user's current relationship.
- The canonical couple key is `[userId, partnerId].sort().join('_')` where that
  storage strategy is used.
- Personal records remain private unless a feature explicitly defines partner
  visibility.
- Pairing and unpairing require atomic behavior. MongoDB transactions remain
  preferred, while connected deployments without transaction support use the
  durable relationship-mutation journal and per-user recovery markers.
- Database writes complete before WebSocket or Web Push events are emitted.
- Date-only values represent a user's local calendar day and must not be
  shifted by UTC slicing.

## Facts the schema cannot prove

The following remain `UNKNOWN` until inspected in a privacy-safe way:

- collection counts and actual field presence rates
- indexes present in production
- duplicate or orphan records
- historical records that predate current ownership fields
- whether all production deployments support transactions
- whether old enum values or shapes still occur
- backup integrity and restore readiness

An AI must not delete compatibility code based only on the current schema.

## Feature data ledger

Add one row whenever a feature introduces shared data, personal data, a new
owner field, or a migration.

| Domain | Ownership | Partner visibility | Canonical actor | Legacy/migration status |
| --- | --- | --- | --- | --- |
| User/profile | personal | relationship-scoped minimal profile | JWT user | inspect current routes/tests |
| Couple relationship | two user records / relationship | both partners | JWT user + verified consent | transactions preferred; optional journal/marker fields support connected standalone MongoDB |
| Shared feature records | couple-owned unless documented otherwise | both partners | JWT user; couple derived server-side | inspect per route/model |
| Health records | mixed; feature-specific | explicit only | JWT user | requires route-by-route review |
| Postgraduate check-ins | actor-specific within couple context | feature-defined | stored/derived acting user | legacy records may lack `userId`; verify PR #1 and production data |
| Postgraduate progress tracks | couple-owned | both current partners | JWT user; couple derived server-side | optional tracks are added lazily; legacy rounds/tasks/check-ins remain readable |
| Postgraduate daily tasks | creator-owned task within current couple context | both current partners; yesterday is read-only | creator and completer from JWT; couple derived server-side | new independent collection; no backfill or legacy reader required |
| Wallet accounts, transactions, debt plans and monthly plans | personal owner within the current couple; payments record both debt owner and payer | all current wallet data is visible to both current partners | owner, creator and payer from JWT; couple derived server-side | current wallet collections retained; old category, budget-setting and net-worth collections removed by the v9 migration after backup |
| Mood partner response | mood owner retains record ownership; current partner owns the response | both current partners | responder from JWT; record relationship from current couple | optional nested field; legacy mood records read as no response |
| Express archive | same-day manual compatibility remains requester-owned; cross-day archive is a relationship-scoped system transition | both current partners | current relationship from JWT; `archivedBy: null` marks automatic archive | optional `archivedAt` / `archivedBy`; missing fields mean active legacy record |
| Wish archive | couple-shared transition after completion; creator-only delete remains unchanged | both current partners | archiving user from JWT | optional `archivedAt` / `archivedBy`; missing fields mean active legacy record |
| Health BMI trend | derived read-only value from one stored height/weight record | same as health trend source | requester from JWT; series split by stored record owner | no stored BMI field and no backfill required |
| Plan check-in mood | actor-specific optional field on a couple-scoped check-in | both current partners within the plan | requester from JWT | legacy explicit mood values remain readable; new writes omit mood unless supplied |

This table is deliberately conservative. Expand it from verified route/model
inspection rather than guessing.

### 2026-08-25 — Wallet debt setup / request and recovery state

- Status: compatibility-retained
- Reason: production debt creation must not return 503 solely because MongoDB multi-document transactions are unavailable. Repayment and ordinary ledger update/delete gained their own recovery paths on 2026-08-27.
- New write shape: optional `DebtPlan.creationRequestId`, `setupStatus` and setup compensation metadata; automatically created liability accounts may carry internal request/lock fields. All actor, owner and couple fields remain JWT-derived.
- Legacy shapes observed: released DebtPlan and Account records do not require these fields; production field coverage is otherwise `UNKNOWN` and no wallet contents were inspected.
- Privacy-safe evidence: user-reported route/status, public unauthenticated 401 reachability check, source inspection and synthetic route tests only.
- Read compatibility: missing `setupStatus` means ready; pending debt plans and archived setup accounts remain outside the wallet overview. Internal request, lock and compensation fields are not serialized in wallet responses.
- Backfill procedure: none. New clients send one request id per opened debt sheet; cached older clients receive a server-generated id.
- Rollback procedure: revert the patch; completed debt/account records remain valid and optional internal fields are ignored. Do not delete completed financial records. A pending setup can be resumed by the patch version with its original request id.
- Removal condition: only after production transaction capability is attested and all supported clients use a transactional debt-creation path, or a later single-document wallet source of truth replaces the setup saga.
- Related Issue / PR / version: `task-wallet-debt-transaction-unavailable`; `v9.0.1`.

### 2026-08-26 — Wallet ordinary transaction creation recovery state

- Status: compatibility-retained
- Reason: ordinary `POST /api/wallet/transactions` must remain usable when production MongoDB lacks multi-document transaction support, without applying an account delta twice or exposing an incomplete ledger row.
- New write shape: current clients send one request ID per opened create sheet. `Transaction.mutationStatus: pending` hides an in-progress fallback write until all zero, one or two account deltas complete; `ready` is the visible terminal state. An affected `Account` keeps the last applied request ID as an idempotency marker and temporarily stores the previous balance and update time while completion is pending, so one document atomically records both the balance delta and its rollback value. A later request replaces a completed marker; an orphaned marker with a rollback snapshot is repaired before that later delta is applied.
- Legacy shapes observed: existing transactions and accounts do not contain these fields. A missing transaction status means ready; absent account markers mean no fallback mutation is in progress.
- Privacy-safe evidence: user-reported production route/status plus source and synthetic route tests only; no wallet amounts, account names or production documents were inspected.
- Read compatibility: transaction lists exclude explicit `pending` / `compensating` records and soft-deleted records. Internal request IDs, mutation status and account recovery markers are omitted from wallet API serializers; account recovery fields are schema-level `select: false` for raw account routes.
- Backfill procedure: none. Old clients without a request ID receive a server-generated ID for single-request compatibility; upgraded clients retain their generated ID across a failed-sheet retry.
- Rollback procedure: revert the fallback code. Completed transactions and balances remain authoritative and must not be deleted or recalculated. Pending rows and account markers may be safely resumed or compensated only by a compatible version.
- Removal condition: only after production transaction capability is attested for every supported deployment, or a later single-document balance source of truth replaces cross-document account synchronization.
- Related Issue / PR / version: `task-wallet-transaction-503`; target `v9.1.1`.

### 2026-08-27 — Transactionless multi-document mutation recovery

- Status: compatibility-retained
- Reason: a connected standalone MongoDB rejects multi-document transactions; this previously surfaced as 503 for wallet transaction update/delete, debt repayment and relationship writes, and as 500 for pickup-location rename.
- New write shape: ordinary transaction update/delete uses a client-retained mutation request ID, payload hash, pending/compensating state, account rollback snapshots and a soft-delete terminal state. Debt repayment creates a pending `DebtPayment` journal with previous/next debt schedules before applying account, debt and ledger writes. Relationship changes use `RelationshipMutation` plus a hidden marker on each affected user. Pickup-location rename stores hidden previous/next names while linked deliveries are updated. Transactions remain the preferred path when supported.
- Legacy shapes observed: released transactions, debt payments, debt plans, users and pickup locations can lack all new fields. Missing status/marker fields mean ready with no recovery in progress; no historical backfill is required.
- Privacy-safe evidence: source audit and synthetic topology, retry, concurrent-marker and compensation tests only; no production wallet, relationship or delivery documents were read.
- Read compatibility: pending/compensating and soft-deleted transactions are excluded from wallet history; all internal recovery fields are omitted by serializers or schema-level `select: false`. Existing ready records remain readable without modification.
- Backfill procedure: none. New recovery state is written only by a real authenticated mutation. The acting user, couple, creator, payer and owner continue to be derived and enforced by the server.
- Rollback procedure: retain completed business records and balances; do not delete or recalculate them. Pending recovery records must be completed or compensated by a compatible version before removing this code. A previous version safely ignores optional ready-state metadata but cannot resume pending work.
- Removal condition: only after transaction support is attested for every supported deployment or each multi-document workflow is replaced by a single-document source of truth, and no pending/compensating records remain.
- Related Issue / PR / version: `task-transactionless-mutations`; version pending release approval.

## Migration ledger format

Create a dated entry before changing the meaning or required presence of a
stored field:

```markdown
### YYYY-MM-DD — Domain / field

- Status: planned | dual-read | migrated | compatibility-retained | complete
- Reason:
- New write shape:
- Legacy shapes observed:
- Privacy-safe evidence:
- Read compatibility:
- Backfill procedure:
- Rollback procedure:
- Removal condition:
- Related Issue / PR / version:
```

### 2026-07-29 — MoodRecord / partnerResponse

- Status: compatibility-retained
- Reason: support one lightweight authenticated partner response and one short message per mood record.
- New write shape: optional `partnerResponse` with `kind`, `message`, JWT-derived `responderId`, and server timestamp `respondedAt`.
- Legacy shapes observed: schema and source confirm records without `partnerResponse`; production field coverage is `UNKNOWN`.
- Privacy-safe evidence: route/model tests only; no production database inspection was authorized.
- Read compatibility: absent or incomplete response data serializes as no response.
- Backfill procedure: none; responses are created only by a current partner action.
- Rollback procedure: revert application code; optional nested data is ignored by the previous version.
- Removal condition: none planned.
- Related Issue / PR / version: `task-couple-modules-redesign`; version remains `UNKNOWN`.

### 2026-07-29 — ExpressDelivery and Wish / explicit archive fields

- Status: compatibility-retained
- Reason: separate active/completed work from readable archived history without deleting records.
- New write shape: optional `archivedAt` plus JWT-derived `archivedBy` after the domain transition is valid.
- Legacy shapes observed: schemas and source confirm records without archive fields; production field coverage is `UNKNOWN`.
- Privacy-safe evidence: route/model tests only; no production database inspection was authorized.
- Read compatibility: missing or null `archivedAt` means active; archived reads are explicit.
- Backfill procedure: none; existing picked deliveries and completed wishes remain active until a real user archives them.
- Rollback procedure: revert application code; previous versions ignore optional archive fields and retain records.
- Removal condition: none planned.
- Related Issue / PR / version: `task-couple-modules-redesign`; version remains `UNKNOWN`.

### 2026-07-29 — Health trend / derived BMI

- Status: complete
- Reason: every visible non-menstrual health metric requires a trend while BMI should not duplicate stored height and weight.
- New write shape: none; BMI is derived as `weight / height²` from the same health record.
- Legacy shapes observed: height or weight may be absent; production coverage is `UNKNOWN`.
- Privacy-safe evidence: synthetic route tests only.
- Read compatibility: records missing either finite height or weight are omitted from the BMI series.
- Backfill procedure: none.
- Rollback procedure: remove the derived metric from the read endpoint and UI.
- Removal condition: none planned.
- Related Issue / PR / version: `task-couple-modules-redesign`; version remains `UNKNOWN`.

### 2026-07-31 — CheckIn / optional mood and achievement side effects

- Status: compatibility-retained
- Reason: a plan check-in must not fabricate a happy mood or trigger an unrelated achievement workflow.
- New write shape: `mood` is absent unless a compatible client explicitly supplies a non-empty value; plan completion and check-in emit only the plan synchronization event after a successful write.
- Legacy shapes observed: the schema and source confirm existing records may contain one of the supported mood enum values; production field coverage is `UNKNOWN`.
- Privacy-safe evidence: route and schema tests only; no production database inspection was authorized.
- Read compatibility: existing mood values remain readable, and achievement and weekly-report read routes remain available for older clients.
- Backfill procedure: none; missing mood is intentional and must not be inferred.
- Rollback procedure: restore the schema default and plan-triggered achievement checks, with the previous risk of fabricated mood data and unrelated events.
- Removal condition: remove the retained achievement and weekly-report compatibility routes only after measured client usage and an explicitly approved removal migration.
- Related Issue / PR / version: `task-couple-modules-redesign`; version remains `UNKNOWN`.

### 2026-08-01 — ExpressDelivery / cross-day automatic archive

- Status: compatibility-retained
- Reason: the active picked list is a same-day undo surface; older picked deliveries belong in the couple's gift-box history without a manual archive step.
- New write shape: an authenticated list read derives the current `coupleId` from JWT relationship state, then conditionally sets `archivedAt` and `archivedBy: null` on unarchived picked records before the current Asia/Shanghai day boundary; the legacy manual requester archive route remains available.
- Legacy shapes observed: source and schema allow picked records with missing `archivedAt`; production field and `pickedAt` coverage remains `UNKNOWN`.
- Privacy-safe evidence: route and utility tests only; no production database inspection was authorized.
- Read compatibility: missing `archivedAt` remains active until the authenticated relationship read performs the idempotent transition; picked records with missing `pickedAt` are conservatively treated as historical and archived.
- Backfill procedure: none; records transition lazily through the normal authenticated list read.
- Rollback procedure: revert the automatic update and same-day UI partition; optional archive fields remain readable and records are never deleted.
- Removal condition: retain the manual requester archive route until measured old-client usage supports an explicitly approved removal.
- Related Issue / PR / version: `task-mood-preview-express-archive`; version remains `UNKNOWN`.

### 2026-08-20 — PostgraduateProgress / optional progressTracks

- Status: compatibility-retained
- Reason: let the learner persist several completed chapters, lectures, videos, or knowledge points in one action while keeping the supplied study baseline and clear completion feedback.
- New write shape: each fixed subject may contain optional `progressTracks` entries with a server-owned key, label, total, unit and mode plus a bounded current value; `PATCH /api/postgraduate/progress` accepts only a whitelisted subject key, track key, increment/decrement action and positive integer amount.
- Legacy shapes observed: source and schema confirm existing documents may contain only rounds, tasks and check-ins; production field coverage is `UNKNOWN`.
- Privacy-safe evidence: route/model tests only; no production database inspection was authorized.
- Read compatibility: authenticated GET lazily adds missing fixed subjects/tracks while retaining existing subjects, rounds, tasks, check-ins, notes and archives; previous versions ignore the optional tracks.
- Backfill procedure: none; compatible defaults are added through the normal authenticated read before a progress mutation.
- Rollback procedure: revert the model, route and UI; optional track fields remain stored but are ignored by v8.2.1, and all historical fields remain intact.
- Removal condition: none planned; do not remove legacy rounds/tasks/check-ins without measured usage and an explicitly approved migration.
- Related Issue / PR / version: `task-postgraduate-progress-redesign`; target version `8.3.0`.

### 2026-08-20 — PostgraduateDailyTask / date-owned collaborative checklist

- Status: compatibility-retained
- Reason: let either partner write several real study tasks for the current day, while only the other current partner can tick them off and calendar-yesterday remains a truthful read-only record.
- New write shape: one independent record per checklist item with server-derived `coupleId`, Asia/Shanghai `date`, JWT `creatorId`, bounded text, a per-batch idempotency key and position, plus nullable JWT-derived `completedBy` / `completedAt`.
- Legacy shapes observed: none; the collection and fields are new, and production collection/index presence is `UNKNOWN` until deployment.
- Privacy-safe evidence: synthetic route/model contracts only; no production database inspection was required or authorized.
- Read compatibility: v8.3.0 and earlier do not query the independent collection; existing PostgraduateProgress documents and all legacy rounds/tasks/check-ins remain unchanged.
- Backfill procedure: none; new tasks are created only through authenticated user actions.
- Rollback procedure: revert the model, route and UI; independent task records remain inert and can be retained for a future compatible redeploy.
- Removal condition: do not delete retained task records without an explicitly approved retention/migration decision.
- Related Issue / PR / version: `task-postgraduate-daily-board`; target version `8.4.0`.

### 2026-08-25 — Wallet debt plans, monthly plans and transaction semantics

- Status: compatibility-retained
- Reason: replace a transaction-first ledger with a debt-payoff wallet while keeping each partner's money ownership explicit.
- New write shape: `DebtPlan` stores a JWT-owned liability and its local-calendar installment schedule; `MonthlyWalletPlan` stores five bounded allocation pockets and an expected-income timeline item; `DebtPayment` records an idempotent request, JWT payer, debt owner, owned asset account and installment allocations. New `Transaction.kind` values distinguish debt purchases and system-managed debt payments.
- Legacy shapes observed: source confirms accounts, categories, budget settings and transactions can predate wallet fields; production field and index coverage remains `UNKNOWN`.
- Privacy-safe evidence: route, planner and frontend contract tests only; no production user amounts or account names were inspected.
- Read compatibility: missing `Transaction.kind` keeps the legacy type behavior. Existing account, category, budget and transaction collections remain unchanged and readable; no wallet data is fabricated for empty users.
- Backfill procedure: none. Debt and monthly plans are created only through authenticated user actions.
- Rollback procedure: revert the wallet routes and UI while retaining new collections and optional transaction fields. Completed repayments must not be automatically reversed because their account balances and immutable payment records are already authoritative.
- Removal condition: retain legacy transaction inference until measured production coverage and an explicitly approved migration support removal.
- Related Issue / PR / version: `task-wallet-debt-planner`; target version `8.5.0`.

### 2026-08-25 — Remove the legacy ledger data system

- Status: destructive migration approved; backup required.
- Reason: the current product treats accounts, debt plans, monthly pockets and wallet transactions as the source of truth. The prior custom-category, global-monthly-budget, quota and manual-net-worth-snapshot system conflicts with that model and the product owner explicitly requested its removal.
- Retained write shape: `accounts`, `transactions`, `debtplans`, `monthlywalletplans` and `debtpayments` remain authoritative. Transaction reads and writes move to `/api/wallet/transactions`; creator and couple scope continue to come from the verified JWT relationship.
- Removed legacy shapes: the fixed collection allowlist is exactly `categories`, `networths` and `budgetsettings`. The `/api/budget` namespace and the combined `Budget` model are removed.
- Privacy-safe evidence: source, synthetic tests and deployment status only. The migration does not inspect or output document counts, user-authored values, identities, connection details or collection contents.
- Migration procedure: after a mandatory successful deployment backup and after the new backend has removed legacy write endpoints, fill only missing/null `Transaction.kind` values from existing `type` (`income` → `income`, `expense` → `expense`, `transfer` → `asset_transfer`), then drop only the three allowlisted collections. Existing non-null kinds are unchanged. Missing collections are treated as an idempotent success.
- Read compatibility: current wallet data remains readable. Historical transactions without an account remain valid wallet history; no account balances are recalculated and no debt plans are fabricated.
- Rollback procedure: application code can return to `v8.5.0`, but deleted legacy collections may be restored only from the exact pre-migration backup after explicit approval. Never reconstruct them from wallet data. Transaction-kind normalization is additive and may remain in place.
- Removal condition: this entry is permanent audit history. Do not reintroduce a parallel ledger source of truth without a new approved migration contract.
- Related Issue / PR / version: `task-wallet-remove-legacy-ledger`; target version `9.0.0`.

### 2026-08-27 — Transaction / ledger-derived wallet pocket usage

- Status: compatibility-retained.
- Reason: make the fixed wallet pockets operational by deriving used, remaining and overspent amounts from real payday-cycle transactions instead of leaving plans and ledger rows disconnected.
- New write shape: ordinary expense and debt-purchase transactions write one server-validated `walletPocketKey` from `debt`, `living`, `travel`, `couple` or `flexible`; system-managed debt-payment transactions write `debt`. Income and asset-transfer rows store no pocket.
- Legacy shapes observed: source confirms `walletPocketKey` was already optional and existing rows may omit it; production field and account-link coverage remain `UNKNOWN` because no real financial data inspection was authorized.
- Privacy-safe evidence: planner, route, transaction-recovery and frontend contract tests only; no user-authored amount, category, note, account name or balance is read from production.
- Read compatibility: missing pocket values remain readable and are reported only as aggregate “待归类” count/amount for the authenticated couple and cycle. The server never infers a pocket from legacy category text. Debt-payment kind is safely interpreted as `debt` even for an older row missing the optional field.
- Derived totals: overview queries only ready, non-deleted spending rows in the selected 25th-to-following-24th cycle. Budget usage is computed per JWT relationship owner; stored plan amounts remain the budget source and no mutable “spent balance” is persisted.
- Ownership: acting user and couple scope continue to derive from the verified JWT. Both current partners may view aggregate pocket usage; only the creator may update/delete an ordinary transaction and only the plan owner may edit pocket budgets.
- Retry/realtime behavior: `walletPocketKey` participates in create replay equality and update mutation hashes/payload recovery. Existing wallet/account events emit only after the full write succeeds; receivers reload and derive the same totals without a second budget write.
- Backfill procedure: none. Users may explicitly edit their own historical visible expense to classify it; the application does not batch-write or guess past finance data.
- Rollback procedure: revert the planner, routes and UI. The optional fixed-key field remains inert and is ignored by v9.1.2; no balance, plan or transaction reversal is required.
- Removal condition: do not remove the legacy missing-key read path until a privacy-safe coverage report and explicit migration approve it.
- Related Issue / PR / version: `task-wallet-budget-ledger`; target version pending release.

## Privacy-safe inspection requirements

A database inspection script may output:

- collection and document counts
- percentage of records containing a field
- distinct enum values after suppressing user-authored content
- index names and key definitions
- duplicate counts for an intended unique key
- orphan/reference counts
- transaction/topology capability

It must not output:

- names, messages, health values, photos, notes, tokens, pair codes
- raw documents
- connection strings
- sample user-authored text

## Change checklist

For every model/API change, answer:

1. Who owns the record?
2. How is the acting user derived?
3. Can the partner read it, and which fields?
4. Who can update or delete it?
5. What happens when the couple unpairs or re-pairs?
6. What historical shape must remain readable?
7. Which indexes enforce integrity and query performance?
8. Can retries or simultaneous partner actions duplicate/overwrite state?
9. Which realtime events follow a successful write?
10. What is the rollback and migration removal condition?


## Implemented inspection tooling

Issue #7 defines a PostgraduateProgress-specific inspection contract for Issue
#4. The fixed policy can produce only document/array counts, actor coverage,
two array-internal duplicate metrics, redacted relevant-index shapes and
topology/transaction categories. Index names, raw key paths, group keys,
database names, hosts, URIs and documents cannot enter the strict report.

The implementation does not load `.env`; it uses a single read-only adapter,
rejects write/script aggregation operators, bounds every database operation,
the total duration and serialized output, and disables Mongoose auto-create and
auto-index behavior. Synthetic fixtures prove the contract without a database
connection.

Use `node scripts/ai/database-inspect.mjs` only after a task has separate
authorization for the real database evidence. The approved metrics, exact
command and interpretation limits are defined in
`docs/data/DATABASE_INSPECTION.md`. The database contract, applied after report
construction and again before serialization, owns schema, enum and consistency
validation. Run the unchanged `report-safety-check.mjs` before sharing any
result for its separate generic secret scan, and never commit `.ai-reports/`.
