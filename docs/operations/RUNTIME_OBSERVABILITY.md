# AI-safe Runtime Observability

Fellow's repository does not contain production `.env`, PM2 state, MongoDB
contents, reverse-proxy configuration or object-storage credentials. AI agents
must use privacy-safe reports instead of guessing those facts.

## Report classes

### Configuration-presence report

Run from the repository root on the target machine:

```bash
node scripts/ai/environment-report.mjs \
  --output=.ai-reports/environment.json
node scripts/ai/report-safety-check.mjs .ai-reports/environment.json
```

This reports whether required settings are present and whether configuration is
internally complete. It does not contact MongoDB and does not prove runtime
reachability.

### MongoDB capability probe

```bash
node scripts/ai/environment-report.mjs \
  --probe \
  --output=.ai-reports/environment-probed.json
node scripts/ai/report-safety-check.mjs \
  .ai-reports/environment-probed.json
```

The probe opens a short-lived connection, runs MongoDB's `hello` command and
reports only topology class, session capability and transaction capability. It
does not output the host, database name or connection string.

### Privacy-safe database inspection

```bash
node scripts/ai/database-inspect.mjs \
  --output=.ai-reports/database.json
node scripts/ai/report-safety-check.mjs .ai-reports/database.json
```

The inspection reports model/collection names already present in source,
estimated counts, declared versus actual indexes, configured field-coverage
metrics and duplicate counts. It never outputs raw records or sampled values.

### Production runtime read-only report

`scripts/ai/production-runtime-report.mjs` is the repository-controlled probe
for the future restricted `fellow-observer` channel. Issue #10 implements and
tests it with synthetic fixtures only. Issue #19 owns installation and the OS
allowlist. Issue #11 remains the only task that may run it on production after
separate product-owner authorization.

The probe writes one JSON object to stdout. A future approved wrapper may save
that stdout under `.ai-reports/` for the safety check and controlled transfer;
the probe itself does not write files.

```bash
node scripts/ai/production-runtime-report.mjs
node scripts/ai/report-safety-check.mjs \
  .ai-reports/production-runtime.json
```

Do not run these commands on production during Issue #10. The example only
defines the post-approval contract for Issues #19 and #11.

The JSON has exactly these top-level fields:

| Field | Allowed result |
| --- | --- |
| `generatedAt` | ISO-8601 UTC timestamp |
| `nodeVersionCategory` | `supported`, `unsupported`, `unknown` |
| `npmAvailable` | boolean, `unsupported`, `permission_denied`, `timeout` |
| `applicationDirectoryPresent` | boolean, `unsupported`, `permission_denied`, `timeout` |
| `httpHealth` | `pass`, `fail`, `unsupported`, `permission_denied`, `timeout` |
| `websocketHealth` | `pass`, `fail`, `unsupported`, `permission_denied`, `timeout` |
| `port3000Listening` | boolean, `unsupported`, `permission_denied`, `timeout` |
| `port3001Listening` | boolean, `unsupported`, `permission_denied`, `timeout` |
| `rootDiskUsagePercent` | integer from 0 to 100, `unsupported`, `permission_denied`, `timeout` |
| `defaultBackupDirectoryPresent` | boolean, `unsupported`, `permission_denied`, `timeout` |
| `latestDefaultBackupAgeCategory` | `fresh`, `aging`, `stale`, `missing`, `unsupported`, `permission_denied`, `timeout` |
| `latestDefaultBackupSizeCategory` | `empty`, `small`, `medium`, `large`, `missing`, `unsupported`, `permission_denied`, `timeout` |
| `pm2Status` | `healthy`, `degraded`, `missing`, `unsupported`, `permission_denied`, `timeout` |
| `nginxStatus` | `active`, `inactive`, `missing`, `unsupported`, `permission_denied`, `timeout` |
| `unsupportedChecks` | sorted allowlisted check names only |

Backup age categories are `fresh` at no more than 36 hours, `aging` above 36
and no more than 72 hours, and `stale` above 72 hours. Size categories are
`empty` at zero bytes, `small` below 10 MiB, `medium` from 10 MiB to below
1 GiB, and `large` at 1 GiB or above. Exact backup timestamps, sizes and names
never enter the report.

The first version always lists `backupIntegrity`, `deployedCommit`,
`nginxRouting`, `restoreDrill`, `storageReachability` and `tlsCertificate` in
`unsupportedChecks`. A healthy PM2 category therefore does not attest the
deployed SHA, and an active Nginx category does not attest routing or TLS.

#### Read cost and permissions

- Node version is classified from the running Node process.
- `npm --version`, `df -P /` and a property-limited `systemctl show nginx`
  are executed without a shell, each with a four-second timeout and a 64 KiB
  output cap. Raw stdout/stderr never enters the report.
- The real adapter does not invoke the PM2 CLI because PM2 client
  initialization can create PM2-home files and can launch a missing daemon.
  `pm2Status` therefore remains `unsupported` until Issue #19 supplies and
  approves a non-mutating categorical bridge. Synthetic fixtures still test
  `healthy`, `degraded`, `missing`, timeout and permission classifications.
- HTTP, WebSocket handshake and TCP-listener checks connect only to the
  repository-declared loopback ports and have three-second timeouts.
- File checks use `stat`/`readdir` only for the deployment directory and the
  default `backend/backups` directory derived from repository code. The latest
  backup is selected from at most 128 `backup_*.gz` metadata entries. File
  contents are never opened.
- The probe never loads `.env`, reads environment-variable values, imports a
  MongoDB client, reads Nginx configuration/logs, or invokes `sudo`.
- Missing capability and insufficient permission are reported as categorical
  outcomes. The probe must not retry with broader identity or privileges.
- Issue #19 must pin the restricted command PATH/executable allowlist before
  installation; Issue #10 does not infer server binary locations.

`report-safety-check.mjs` recognizes this strict schema, rejects missing or
extra fields and non-allowlisted values, and does not load `.env` while
checking reports.

#### Restricted channel installation

Issue #19's runtime-only installation materials are repository controlled:

- `scripts/ai/runtime-observer-package-manifest.json` pins the Issue #10 merge
  commit, every payload hash, the existing dispatcher attestation, fixed
  install paths, timeouts and resource limits.
- `scripts/ai/runtime-observer-package.mjs` verifies that contract and writes
  only the allowlisted artifacts below `.ai-reports/`.
- `scripts/ai/runtime-observer-wrapper.mjs` rejects arguments, verifies the
  immutable payload and withholds stdout until the strict contract and safety
  checker both pass.
- `scripts/ai/runtime-observer/fellow-observer-gate` preserves the existing
  `baseline`, `whoami` and default-deny behavior while adding only the exact
  `runtime-baseline` command.

The reviewed manual backup, installation, atomic replacement and rollback
commands are in `docs/operations/RUNTIME_OBSERVER_INSTALLATION.md`. Those
commands are documentation, not authorization: this repository task does not
connect to or modify production, and Issue #11 retains the sole authority to
execute `runtime-baseline` after a separate approval.

## Operating rules

1. Run reports on the machine/environment whose facts are needed.
2. Never paste `.env`; share only a report that passed the safety checker.
3. Keep `.ai-reports/` out of Git. Reports can still contain operational
   metadata even when they contain no secrets.
4. Record durable, relevant conclusions in the capability matrix or a related
   Issue/ADR with the report timestamp and command used.
5. Treat a report as point-in-time evidence. Re-run it after infrastructure,
   environment-variable, database-topology or deployment changes.
6. Do not run a production database inspection merely to satisfy curiosity.
   The task must require the evidence.

## Remaining unsupported production facts

The production runtime report does not verify:

- Nginx routes or TLS certificate state
- deployed commit SHA
- S3 reachability or object permissions
- Web Push delivery
- backup integrity or restore readiness
- end-to-end access from a real client network

The production runtime report now provides repository-tested categorical
checks for the local HTTP/WebSocket services, listener ports, root-disk usage,
default local-backup freshness/size metadata and Nginx service state. Its PM2
contract and parser are tested, but the real adapter deliberately reports
`unsupported` until a non-mutating bridge exists. It still does not cover TLS,
Nginx routing, deployed SHA, storage reachability, backup integrity or restore
readiness. Every production fact remains `UNKNOWN` until the Issue #19 channel
is approved and Issue #11 executes a safety-checked report.
