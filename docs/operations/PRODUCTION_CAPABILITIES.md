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
| HTTP health on repository-declared loopback port | UNKNOWN | Repository probe implemented; not run on production |
| WebSocket handshake health on repository-declared loopback port | UNKNOWN | Repository probe implemented; not run on production |
| Port 3000 listening | UNKNOWN | Repository probe implemented; not run on production |
| Port 3001 listening | UNKNOWN | Repository probe implemented; not run on production |
| Root disk usage percent | UNKNOWN | Repository probe emits only integer percent or failure category; not run on production |
| Default local backup directory present | UNKNOWN | Checks only the repository-derived default; custom runtime override remains unobserved |
| Default local backup freshness / size category | UNKNOWN | Repository probe implemented; exact time, size and filename are prohibited |
| Restore drill | UNKNOWN | Requires explicit operational exercise |
| PM2 canonical process healthy | UNKNOWN | Strict parser is fixture-tested; real adapter returns unsupported until #19 provides a non-mutating bridge |
| Nginx service active | UNKNOWN | Repository probe checks service state only; routing and TLS remain unsupported |
| TLS / Nginx routing healthy | UNKNOWN | Explicitly unsupported by the first production runtime probe |

Issue #10 adds only the repository contract and synthetic evidence. No row in
this table becomes `VERIFIED` until Issue #19 establishes the reviewed channel
and Issue #11 receives separate authorization to run the probe on production.

When updating this file, use `VERIFIED`, `INFERRED` and `UNKNOWN` precisely and
include the date of evidence. Do not preserve stale status as current truth.
