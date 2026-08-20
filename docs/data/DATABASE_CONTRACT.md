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
- Pairing and unpairing require atomic behavior; production is expected to
  support MongoDB transactions.
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
| Couple relationship | two user records / relationship | both partners | JWT user + verified consent | transaction support required |
| Shared feature records | couple-owned unless documented otherwise | both partners | JWT user; couple derived server-side | inspect per route/model |
| Health records | mixed; feature-specific | explicit only | JWT user | requires route-by-route review |
| Postgraduate check-ins | actor-specific within couple context | feature-defined | stored/derived acting user | legacy records may lack `userId`; verify PR #1 and production data |
| Postgraduate progress tracks | couple-owned | both current partners | JWT user; couple derived server-side | optional tracks are added lazily; legacy rounds/tasks/check-ins remain readable |
| Mood partner response | mood owner retains record ownership; current partner owns the response | both current partners | responder from JWT; record relationship from current couple | optional nested field; legacy mood records read as no response |
| Express archive | same-day manual compatibility remains requester-owned; cross-day archive is a relationship-scoped system transition | both current partners | current relationship from JWT; `archivedBy: null` marks automatic archive | optional `archivedAt` / `archivedBy`; missing fields mean active legacy record |
| Wish archive | couple-shared transition after completion; creator-only delete remains unchanged | both current partners | archiving user from JWT | optional `archivedAt` / `archivedBy`; missing fields mean active legacy record |
| Health BMI trend | derived read-only value from one stored height/weight record | same as health trend source | requester from JWT; series split by stored record owner | no stored BMI field and no backfill required |
| Plan check-in mood | actor-specific optional field on a couple-scoped check-in | both current partners within the plan | requester from JWT | legacy explicit mood values remain readable; new writes omit mood unless supplied |

This table is deliberately conservative. Expand it from verified route/model
inspection rather than guessing.

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
