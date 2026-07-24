# Database Inspection Policy

`database-inspect.mjs` is a repository-controlled evidence tool, not a data
browser. Issue #7 narrows it to the PostgraduateProgress ownership questions
required by Issue #4. Its output is useful only as point-in-time aggregate
evidence and must never be treated as a raw-data export.

## Authorization boundary

Issue #7 develops and tests the capability with synthetic fixtures only. It
does not authorize a MongoDB connection or a production measurement. A real
run requires a later, explicit product-owner authorization, a read-only MongoDB
principal and an appropriate operational window.

The tool does not load `backend/.env` or any other `.env` file. A later
authorized operator must inject `MONGODB_URI` into the process without printing
it. The URI, database name, host and connection errors never enter the report.

## Fixed aggregate metrics

The report has one `metrics` section. When its status is `passed`, `values`
contains exactly:

| Output field | Definition |
| --- | --- |
| `documents` | PostgraduateProgress document count |
| `checkInElements` | total number of `checkIns` array elements |
| `actorPresentElements` | elements whose actor field converts to a non-empty, trimmed string |
| `actorMissingOrEmptyElements` | total elements minus actor-present elements |
| `actorCoveragePercent` | actor-present / total, rounded to two decimals; empty input is `0` |
| `duplicateActorDayElementExcess` | for non-empty actors, the sum of elements beyond the first in each couple/day/actor group |
| `multiElementCoupleDayCombinations` | number of couple/day groups containing more than one array element |

The group keys exist only inside the server-side aggregation. The final
projection contains counts only; it cannot return a couple identifier, actor
identifier or day value. Missing/empty actor elements are excluded from the
actor/day duplicate calculation and remain visible through the missing count
and the couple/day multi-element metric.

## Strict report contract

The top-level report contains exactly:

- fixed version/type and one ISO UTC `generatedAt` value;
- `containsSecrets: false` and `containsRawDocuments: false`;
- overall `passed`, `partial` or `failed` status;
- `metrics`, `indexes` and `databaseCapabilities` sections.

Section status is one of `passed`, `timeout`, `permission_denied`,
`not_configured`, `output_limit` or `failed`. Numeric values are emitted only
when their section passed. Failure details, exception messages and arbitrary
strings are never included.

`database-inspection-contract.mjs` owns the report schema, enums and internal
consistency rules. The report is validated once after construction and again
immediately before serialization; missing or extra fields, inconsistent
counts/percentages, unbounded arrays, arbitrary categories and invalid index
structures fail closed there. The unchanged `report-safety-check.mjs` remains
the separate generic secret scanner for URI, URL, configured secret values and
other forbidden string patterns.

## Declared and actual indexes

Only indexes touching a repository-approved relevant field are included.
Index names are never emitted. Key paths are replaced with these role enums:

- `couple_scope`
- `checkin_day`
- `checkin_actor`
- `redacted_other`

Each key direction is reduced to a fixed category. Each index shape contains
only ordered key roles/directions plus `unique` and `sparse` booleans. The
comparison returns only `matchesDeclared`, `missingDeclaredCount` and
`unexpectedActualCount`. The unrelated primary index is excluded.

The declared list is derived from the checked-out Mongoose schema. The actual
list is read from MongoDB only in a later authorized run. A permission or
timeout result leaves actual indexes and comparison absent rather than
misreporting an empty list as fact.

## Topology and transaction capability

Topology is reduced to `replica_set`, `sharded`, `standalone` or `unknown`.
Transaction capability is reduced to `supported`, `unsupported` or `unknown`.
It is `supported` only when `hello` reports sessions plus the minimum wire
version for replica-set (7) or sharded (8) transactions. Missing wire-version
evidence remains `unknown`; standalone or missing-session evidence is
`unsupported`. These are capability categories, not a transaction or write
test.

## Read-only and resource controls

- Mongoose connects with `autoCreate: false`, `autoIndex: false`, a pool of one,
  `secondaryPreferred`, `retryReads: false` and `retryWrites: false`.
- The adapter exposes only aggregate, list-index and `hello` operations. It has
  no write, model-save, mapReduce or eval method.
- The aggregate is one `$facet` pipeline with one final projected result and
  `$limit: 1`. `$out`, `$merge`, `$function`, `$accumulator`, `$where`, eval and
  mapReduce forms are rejected before execution.
- Aggregate, list-index and `hello` operations each receive a bounded
  `maxTimeMS`; connection selection/connect/socket timeouts are bounded too.
- Repository maxima are 5 seconds per operation and 15 seconds total. CLI
  arguments may reduce but cannot raise those limits.
- Disk-backed aggregation is disabled. Index input is capped at 64 raw entries
  and 32 relevant entries; index shapes contain no more than 16 key parts.
- Serialized UTF-8 output is capped at 16 KiB. A file output is accepted only
  below `.ai-reports/` and is created with mode `0600` where supported.

The aggregation can still scan the collection. Limits reduce operational risk
but do not establish that any time is safe to run it.

## Synthetic verification

Committed fixtures cover empty input, full actor coverage, partial missing or
empty actors, actor/day duplicates, couple/day multiple elements, timeout and
permission denial. Fixture records are synthetic and exist only as test input;
the generated reports contain no fixture keys or sample records.

`backend/tests/databaseInspection.test.js` verifies the metrics, read-only
pipeline gate, limits, redacted index comparison and strict contract without
importing the CLI or opening a database connection. Contract counterexamples
target `validateDatabaseInspectionReport` and
`serializeDatabaseInspectionReport` directly. Separately, one valid synthetic
report passes the unchanged `report-safety-check`, whose counterexamples cover
generic URI, URL and configured-secret scanning.

## Later authorized command

The command below defines the reviewed interface; it is not authorization to
run it now:

```powershell
node scripts/ai/database-inspect.mjs `
  --policy=scripts/ai/inspection-policy.json `
  --max-time-ms=5000 `
  --total-timeout-ms=15000 `
  --output=.ai-reports/database-inspection-issue-4.json

node scripts/ai/report-safety-check.mjs `
  .ai-reports/database-inspection-issue-4.json
```

Only a report that passes the safety checker may be shared. Keep the generated
file ignored and record durable conclusions separately with the evidence time
and authorization.

## Restricted production channel contract

Issue #19 packages this fixed inspector from PR #23 merge commit
`5124d83f93a4faf76de6e4b629d67cdb48414a42` with an independent, locked
Mongoose/MongoDB dependency closure. The production application source,
application `.env` and application `node_modules` are not runtime inputs.

A future restricted run has two OS identities: `fellow-observer` remains the
SSH forced-command entry and may sudo only one exact no-argument launcher;
`fellow-db-runner` is a nologin system account with no SSH key or deployment
group. Only the runner can read the dedicated one-line URI file. The wrapper
passes that URI only to the fixed inspector child and the fixed generic safety
checker child; it never prints or persists it.

The initial MongoDB role is scoped to the exact application database and the
model's collection with only `find` for the approved aggregate and
`listIndexes`. It must not inherit a broad read/write/admin role or
`clusterMonitor`. If `hello` cannot be classified with that identity, the
result remains `permission_denied` or `unsupported`; permissions are not
expanded merely to improve topology evidence.

The full install, secret rotation, report lifecycle and rollback contract is
`docs/operations/DATABASE_OBSERVER_INSTALLATION.md`. A merged installation
package still does not authorize installing it, creating the database user or
executing `database-baseline`; each production action requires a later,
explicit approval.
