# Active Work

Last updated: 2026-07-28

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** `origin/main` and `origin/develop` both contain release commit
  `b22870064a2bc33921dc93b9d605804de74391a0` after reconciliation.
- **VERIFIED:** annotated tag `v8.0.0` and the published GitHub Release resolve
  to `b22870064a2bc33921dc93b9d605804de74391a0`.
- **VERIFIED:** PR #25, PR #26 and PR #28 merged into `develop`; release PR #27
  merged into `main`.
- **VERIFIED:** deployment run `30349740434` succeeded for the release SHA. Its
  completed steps include the clean frontend build, pre-deploy backup step,
  file deployment, restart, unique PM2 process and `DEPLOY_SHA` verification,
  WebSocket connection, and API health check.
- **VERIFIED:** the post-deploy auto-scoped strict release gate and generated
  report safety check passed.
- **VERIFIED:** application metadata and changelog identify version `8.0.0`.

## Current task

- No unfinished work remains for the `v8.0.0` reference-UI release.
- The three release work items remain at `review_ready`; their `closure` fields
  preserve the merged, released, deployed and verified outcome.
- `issue-4` remains an independent blocked production-data audit. This release
  did not modify it, silently clear it or execute its production database query.

## Durable release outcome

- **VERIFIED:** the deployed `couple-together` site was used as the sole visual
  contract for the home, login/profile treatment, shared navigation and all
  nine feature-detail surfaces; the old home style was not blended into it.
- **VERIFIED:** mood, album, postgraduate study, plans, health, express pickup,
  cosmetics expiry, accounting and wishes remain connected to Fellow's real
  authenticated routes, API state, mutations and WebSocket refresh paths.
- **VERIFIED:** no target-site demo data, visual authentication bypass or local
  `frontend/dist` output was committed.
- **VERIFIED:** frontend tests passed `144/144`; backend verification passed
  `258/258` tests and syntax checking for 109 JavaScript files; the release PR's
  Test, AI Governance and Release Readiness workflows all passed.

## Material uncertainty

- **UNKNOWN:** a public production URL or public version endpoint is not stored
  in the repository. Production verification therefore uses the successful
  deployment workflow on the exact release SHA plus its server-side API and
  WebSocket health checks, rather than claiming a separate browser visit.
- **VERIFIED:** dependency audit remains below the repository's high-severity
  failure threshold, with the existing `1 low` and `1 moderate` advisories.

## Exact next action

Start future work from current `origin/develop`. Resume `issue-4` only with
explicit product-owner authorization for its approved read-only database
aggregate.
