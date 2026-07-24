# Active Work

Last updated: 2026-07-24

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** `origin/develop` and local `develop` are at
  `0a2d7d37743b2a6515ebb6eb10263a4f395c1514`, the merge commit that contains
  the reviewed Issue #11 repository evidence from PR #22.
- **VERIFIED:** `origin/main` is an ancestor of `origin/develop`; Issue #7
  starts from the latest development baseline without release drift.
- **VERIFIED:** the current task branch is
  `feature/privacy-safe-database-metrics`, created directly from that commit.
- **VERIFIED:** the working tree was clean before the Issue #7 work item was
  initialized.

## Current task

- Issue: #7 — privacy-safe MongoDB read-only aggregate metrics.
- Manifest: `.ai/tasks/issue-7.json`; stage: `validating`.
- Goal: provide the strictly redacted evidence capability required by Issue
  #4's postgraduate check-in ownership audit.
- Scope: repository-controlled aggregation, strict report contract, redacted
  index comparison, topology/transaction categories, seven synthetic fixture
  classes, documentation, tests, Draft PR and CI.
- Constraint: local and CI work only. Do not execute SSH, read `.env`, connect
  to MongoDB, run a production measurement, modify production, or change the
  business model/API/deployment workflow.

## Verified starting facts

- **VERIFIED:** `PostgraduateProgress` declares one unique/indexed couple-scope
  field. Its current `checkIns` subdocument has a day field but no actor field.
- **VERIFIED:** the previous database inspector automatically loads
  `backend/.env`, traverses every Mongoose model, exposes model/collection/index
  names and raw index paths, and lacks a strict database-report contract.
- **VERIFIED:** the existing inspector can count array elements and actor-field
  coverage, but it cannot calculate the two array-internal duplicate metrics
  required by Issue #4.
- **VERIFIED:** `report-safety-check.mjs` strictly validates the production
  runtime report but only applies generic checks to the legacy database report.

## Implemented capability

- The inspector is restricted to one PostgraduateProgress ownership policy and
  no longer loads `.env` or traverses arbitrary models.
- One read-only `$facet` aggregation returns only the seven approved count and
  percentage values; write and server-script operators fail closed.
- Database operations receive `maxTimeMS`; connection, total duration, index
  count/shape and serialized UTF-8 output are bounded by repository maxima.
- Index names and key paths are replaced with fixed roles before output, and
  actual/declared comparison contains only structures, booleans and counts.
- Topology and transaction evidence is reduced to allowlisted categories using
  `hello` session and minimum-wire-version evidence.
- Seven synthetic fixture files cover all requested classes. The focused suite
  passes 14/14 and proves the safe report is accepted while unsafe variants are
  rejected by `report-safety-check`.

## Validation evidence

- **Passed:** focused database inspection tests — 14 passed, 0 failed.
- **Passed:** `backend` `npm run verify` — 107 syntax files checked, 232 tests
  passed, and the high-severity audit gate passed; npm reports one low-severity
  `body-parser` advisory.
- **Passed:** project context (52 required files, 0 missing), design contract,
  work-item gates and `git diff --check`.
- **Pending:** GitHub Test and AI Governance on the Draft PR head.
- **Not run by design:** `database-inspect.mjs`, SSH, MongoDB, production
  commands, deployment and any `.env` read.

## Material unknowns

- **UNKNOWN:** all production counts, coverage, duplicate values, actual
  indexes, topology and transaction capability. Issue #7 must not attempt to
  resolve them.
- **UNKNOWN:** real collection size and scan cost. The later authorized run
  must use the reviewed limits and an appropriate operational window.
- **UNKNOWN:** the final ownership/migration decision for actor-less legacy
  check-ins. Aggregate evidence informs that decision but does not make it.

## Related blocked audit

- Issue #4 remains blocked on a separately authorized privacy-safe production
  aggregate and the product owner's legacy-ownership decision.
- Issue #7 supplies only the missing governed capability. After this PR is
  reviewed and merged, a new explicit authorization is still required before
  any real MongoDB command can run.

## Exact next action

Finish the full diff review, commit and push the scoped branch, open a Draft PR
to `develop`, then wait for both GitHub Test and AI Governance before moving
the manifest to `review_ready`.
