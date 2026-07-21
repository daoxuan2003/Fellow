# Production Capability Snapshot

Last attested: not yet attested
Evidence command: not yet run
Evidence timestamp: UNKNOWN

This file stores durable, non-secret conclusions from a safety-checked runtime
report. Do not paste the report wholesale and never add endpoint, hostname,
credential or user-data values.

| Capability | Status | Evidence / note |
| --- | --- | --- |
| Node.js >= 20 | UNKNOWN | Run environment report on production |
| MongoDB reachable | UNKNOWN | Run `environment-report.mjs --probe` |
| MongoDB topology | UNKNOWN | Allowed: replica-set / sharded / standalone |
| MongoDB transactions | UNKNOWN | Required for production pairing integrity |
| Storage mode | UNKNOWN | Allowed: local / s3 / unknown |
| Web Push configuration complete | UNKNOWN | Configuration presence only |
| CORS configured | UNKNOWN | Do not record origin values here |
| Proxy trust configured | UNKNOWN | Must match actual reverse proxy topology |
| Backup freshness | UNKNOWN | Not covered by v0.2 script |
| Restore drill | UNKNOWN | Requires explicit operational exercise |
| PM2 canonical process healthy | UNKNOWN | Not covered by v0.2 script |
| TLS / Nginx routing healthy | UNKNOWN | Not covered by v0.2 script |

When updating this file, use `VERIFIED`, `INFERRED` and `UNKNOWN` precisely and
include the date of evidence. Do not preserve stale status as current truth.
