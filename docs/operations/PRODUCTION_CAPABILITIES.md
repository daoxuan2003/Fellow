# Production Capability Snapshot

Last attested: 2026-07-24
Evidence command: Issue #11 restricted `runtime-baseline` (executed once)
Evidence timestamp: 2026-07-24T04:13:27.417Z
Evidence stdout SHA-256:
`16b333cc1f2aa22dd6482f96eb565eb49cb66e39cb7e9298bbf20d3caffa5a7c`

This file stores durable, non-secret conclusions from a safety-checked runtime
report. Do not paste the report wholesale and never add endpoint, hostname,
credential or user-data values.

| Capability | Status | Evidence / note |
| --- | --- | --- |
| Node.js version category | VERIFIED | Report value: `supported` |
| MongoDB reachable | UNKNOWN | Run `environment-report.mjs --probe` |
| MongoDB topology | UNKNOWN | Allowed: replica-set / sharded / standalone |
| MongoDB transactions | UNKNOWN | Required for production pairing integrity |
| Storage mode | UNKNOWN | Allowed: local / s3 / unknown |
| Storage reachability | UNKNOWN | `storageReachability` remains unverified |
| Web Push configuration complete | UNKNOWN | Configuration presence only |
| CORS configured | UNKNOWN | Do not record origin values here |
| Proxy trust configured | UNKNOWN | Must match actual reverse proxy topology |
| Application directory present | VERIFIED | Report value: `true` |
| npm available | VERIFIED | Report value: `timeout`; cause remains UNKNOWN |
| HTTP health on repository-declared loopback port | VERIFIED | Report value: `pass` |
| WebSocket handshake health on repository-declared loopback port | VERIFIED | Report value: `pass` |
| Port 3000 listening | VERIFIED | Report value: `true` |
| Port 3001 listening | VERIFIED | Report value: `true` |
| Root disk usage percent | VERIFIED | Report value: `67` |
| Default local backup directory present | VERIFIED | Report value: `true`; custom runtime override remains unobserved |
| Default local backup freshness / size category | VERIFIED | Report values: `fresh` / `small`; exact time, size and filename are prohibited |
| Backup integrity | UNKNOWN | `backupIntegrity` remains unverified |
| Restore drill | UNKNOWN | `restoreDrill` remains unverified |
| Deployed commit | UNKNOWN | `deployedCommit` remains unverified |
| PM2 status | VERIFIED | Report value: `unsupported`; actual PM2 state remains UNKNOWN |
| Nginx status | VERIFIED | Report value: `unsupported`; actual Nginx state remains UNKNOWN |
| Nginx routing | UNKNOWN | `nginxRouting` remains unverified |
| TLS certificate | UNKNOWN | `tlsCertificate` remains unverified |

Issue #11's report was valid JSON, passed `report-safety-check` and satisfied
the strict production runtime contract. The verified rows above are a
point-in-time snapshot only. A `timeout` or `unsupported` value is preserved as
reported and does not establish its cause or the underlying service state.

When updating this file, use `VERIFIED`, `INFERRED` and `UNKNOWN` precisely and
include the date of evidence. Do not preserve stale status as current truth.
