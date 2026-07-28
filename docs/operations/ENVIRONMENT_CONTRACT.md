# Environment Contract

The repository cannot expose production secrets, but AI programmers need a
truthful description of runtime capabilities. This document records structure
and status, never secret values.

## Reporting rules

Allowed:

```json
{
  "configured": true,
  "mode": "s3",
  "reachable": true,
  "transactionsSupported": true
}
```

Forbidden:

- connection strings
- passwords, tokens, JWT secrets, VAPID private keys
- access keys or signed URLs
- private user data
- complete `.env` output

Use `VERIFIED`, `INFERRED`, and `UNKNOWN` labels. An `.env.example` declaration
only proves that the application recognizes a variable; it does not prove that
production configures it.

## Environment classes

| Environment | Purpose | Source of runtime facts |
| --- | --- | --- |
| Local | development and focused checks | developer machine report |
| CI | build, test, audit | GitHub Actions workflow output |
| Production | real users and data | privacy-safe server report |

## Capability matrix

Fill the production column only from an executed report or direct server
inspection.

| Capability | Repository expectation | Production status |
| --- | --- | --- |
| Node.js | major version 20 or newer | UNKNOWN |
| MongoDB connectivity | required | UNKNOWN |
| MongoDB transactions | required for production pairing integrity | UNKNOWN |
| HTTP API port | configured by `PORT` | UNKNOWN |
| WebSocket port | configured by `WS_PORT` | UNKNOWN |
| CORS allowlist | explicit in cross-origin production | UNKNOWN |
| Proxy trust | must match proxy topology | UNKNOWN |
| Web Push / VAPID | optional | UNKNOWN |
| Storage mode | local or S3-compatible | UNKNOWN |
| Automated backup | expected before/dependent on deployment policy | UNKNOWN |
| Backup restore tested | operational requirement | UNKNOWN |
| TLS termination | expected at reverse proxy | UNKNOWN |
| PM2 process identity | deployment workflow expects canonical app name | UNKNOWN |

## Environment variable registry

Maintain this table when code introduces or removes environment variables.
Never enter real secret values.

| Variable | Required | Secret | Type / allowed values | Failure behavior |
| --- | --- | --- | --- | --- |
| `MONGODB_URI` | yes | yes | MongoDB URI | backend cannot provide persistent service |
| `JWT_SECRET` | yes in production | yes | high-entropy string | production auth configuration must fail closed |
| `JWT_EXPIRES` | yes | no | duration string | token lifetime uses configured/default behavior |
| `CORS_ORIGINS` | deployment-dependent | no | comma-separated origins | cross-origin clients may be rejected |
| `TRUST_PROXY_HOPS` | proxy-dependent | no | non-negative integer | client IP / secure proxy behavior may be wrong |
| `PORT` | no | no | TCP port | defaults according to backend configuration |
| `WS_PORT` | no | no | TCP port | defaults according to backend configuration |
| `VAPID_PUBLIC_KEY` | push only | no | VAPID public key | push unavailable when incomplete |
| `VAPID_PRIVATE_KEY` | push only | yes | VAPID private key | push unavailable when incomplete |
| `VAPID_SUBJECT` | push only | no | mailto/URL subject | push initialization may fail |
| `STORAGE_MODE` | no | no | `local` or `s3` | storage service chooses configured/default mode |
| `S3_ENDPOINT` | S3 only | no | URL | S3 unavailable |
| `S3_REGION` | S3 only | no | region string | S3 client may fail |
| `S3_ACCESS_KEY` | S3 only | yes | access key | S3 unavailable |
| `S3_SECRET_KEY` | S3 only | yes | secret key | S3 unavailable |
| `S3_BUCKET_NAME` | S3 only | no | bucket name | S3 unavailable |

This registry is an initial baseline from public setup documentation. Verify it
against configuration modules before treating it as exhaustive.

## Implemented production report

`node scripts/ai/environment-report.mjs` emits a JSON report with no values from secret variables:

```json
{
  "generatedAt": "ISO-8601 timestamp",
  "node": { "majorSupported": true },
  "mongo": {
    "connected": true,
    "topology": "replicaSet|sharded|standalone|unknown",
    "transactionsSupported": true
  },
  "storage": { "mode": "local|s3|unknown", "reachable": true },
  "push": { "configured": true },
  "proxy": { "trustConfigured": true, "corsConfigured": true },
  "backup": { "lastSuccessKnown": true, "restoreDrillKnown": false }
}
```

The report redacts connection details and classifies failures without printing
error messages. Usage and limitations are defined in
`docs/operations/RUNTIME_OBSERVABILITY.md`. A report must pass
`node scripts/ai/report-safety-check.mjs <report>` before it is shared.

Durable non-secret conclusions belong in
`docs/operations/PRODUCTION_CAPABILITIES.md`; generated JSON belongs in the
ignored `.ai-reports/` directory.
