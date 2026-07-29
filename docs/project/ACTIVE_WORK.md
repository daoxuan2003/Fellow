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

- Primary manifest: `.ai/tasks/task-couple-modules-redesign.json`; stage:
  `intake`.
- Branch: `feature/couple-modules-redesign`, created from current
  `origin/develop` at `f1093793e7407574f54e40df0b01c2e912958998`.
- Goal: strictly extend the 8.0.0 home brand language to the nine detail
  modules while replacing their visible information architecture with the
  user's explicitly listed, compact couple workflows.
- **VERIFIED:** the request includes mood interaction and calendar history;
  memory-first album categories; daily subject study progress; checklist
  plans with sub-plans and completion time; concise gender-aware body metrics,
  trends and menstrual entry; partner-separated parcels with archive;
  photo-led cosmetics expiry; visible partner accounts and real bookkeeping;
  and wish archiving.
- **VERIFIED:** most underlying models already contain useful compatible data,
  while mood interaction and explicit parcel/wish archive state require new
  server-side contracts.
- **VERIFIED:** the permission audit confirms couple-scoped reads and
  post-write WebSocket broadcasts for mood, parcels, wishes and accounts;
  destructive account/parcel/wish mutations retain their current owner checks.
- **VERIFIED:** both partners already read the same active account collection,
  while account and transaction mutations remain restricted to the JWT
  actor's own accounts.
- **VERIFIED:** on 2026-07-29 the product owner confirmed the compact
  information architecture and the minimal mood interaction shape: partner
  response plus one short message.
- The `impeccable` Shape gate is complete. Page implementation still waits for
  its required palette confirmation and one approved north-star mock.
- **VERIFIED:** the product owner delegated visual-detail decisions. The locked
  lane uses the 8.0.0 home as the sole reference, large blue/mint/yellow fields,
  warm-white task surfaces, pink key states, and a youthful/intimate/crisp
  atmosphere. Palette v1 was approved on 2026-07-29.
- **VERIFIED:** north-star v1 now demonstrates the shared system through three
  distinct representative compositions: paired mood interaction and calendar,
  photo-led memory chronology, and compact body metrics with one trend
  instrument. It is in the ignored evidence directory awaiting final visual
  direction approval.
- **VERIFIED:** the health audit confirms generic records are couple-readable
  but self-writable, and menstrual writes already enforce female-self or
  male-to-female-partner targeting. Every stored body metric has a trend path;
  BMI is the one missing derived metric and must be added in this task.
- **VERIFIED:** menstrual prediction currently returns long insight/care-plan
  text; the redesigned Health UI will intentionally omit it and show only
  recording, dates and necessary cycle state.
- `issue-4` remains an independent blocked production-data audit and is not in
  this task's scope.

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

Approve or correct north-star visual direction v1. Then transition the work
item to `ready` and begin the complete vertical implementation.
