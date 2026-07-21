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

Use `node scripts/ai/database-inspect.mjs --output=.ai-reports/database.json`
only when the task needs production evidence. The approved metrics and forbidden
output are defined in `docs/data/DATABASE_INSPECTION.md`; field-level collection
is controlled by `scripts/ai/inspection-policy.json`. Run the report safety
checker before sharing results.
