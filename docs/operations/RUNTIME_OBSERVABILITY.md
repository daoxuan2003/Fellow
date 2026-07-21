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

## Facts not covered by v0.2

The scripts do not yet verify:

- Nginx routes or TLS certificate state
- PM2 process uniqueness and deployed commit SHA
- S3 reachability or object permissions
- Web Push delivery
- backup freshness, backup integrity or restore readiness
- end-to-end access from a real client network

These remain `UNKNOWN` until a dedicated read-only probe is added or direct
operational evidence is recorded.
