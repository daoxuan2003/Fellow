# Active Work

Last updated: 2026-08-01

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** production release `v8.2.0`, `origin/main` and
  `origin/develop` resolve to `b40ae17e7dc428451f8e128a00e7328d01938763`.
- **VERIFIED:** deployment run `30688274357` passed frontend build, database
  backup, deployment, restart and health checks; production version metadata
  returned `8.2.0` and the public API health request returned 200.
- **VERIFIED:** the worktree was clean before branching from `develop`.

## Current task

- Primary manifest: `.ai/tasks/task-express-archive-month-navigator.json`;
  stage: `validating`.
- Branch: `style/express-archive-month-navigator`.
- Goal: replace the archive gift's continuous month list with a single-month
  browser that can directly jump to any recorded month and flip between
  adjacent months; show the current-month picked count on the gift badge and
  grounded couple achievement data inside the gift.
- Change class: `local-style`, `behavior-only`.
- Closest reference surface: existing Express gift dialog, month groups,
  ownership badges and modal interaction vocabulary.
- Preserved behavior: right-header gift entry, authenticated archive data,
  newest-first grouping, owner/priority labels, honest empty state and
  Teleport isolation from bottom navigation.
- Intended difference: every open starts at the newest month; one month is
  shown at a time; a native month selector supports direct jumps; explicit
  newer/older controls support sequential browsing; the badge counts all
  current-month picked parcels (including today), and one compact achievement
  card presents total, mutual-help, pickup-day and urgent counts without
  becoming a dashboard.
- Applicable evidence: populated multi-month and empty states, 320/375/430
  widths, long month list, single-month long items, focus, disabled boundaries,
  safe area and bottom-navigation isolation.
- **VERIFIED:** current Express archive renders every month section into one
  vertically scrolling container.
- **VERIFIED:** existing month groups already contain all navigation and
  ownership counts required by the redesign.
- **VERIFIED:** the user explicitly clarified that the gift badge means this
  month's picked count, not the lifetime archive total, and requested
  achievement-like data inside the gift.
- **UNKNOWN:** production archive month span and maximum per-month item count.
- **ASSUMED_FOR_TASK:** the reported problem is locating a month, not searching
  within a single month's parcel codes.

## Validation pending

- **Passed:** focused Express contracts (16/16), complete frontend tests
  (145/145), strict UI diff (0 warnings/errors), evidence manifest safety and
  320/375/430 rendered checks plus real empty state.
- **VERIFIED:** gift badge and selected current-month group both showed 8 in the
  synthetic current-month fixture; direct selection reached the fifth recorded
  month; the adjacent newer action moved to the fourth; boundary states,
  single-month rendering, internal scrolling and 0 horizontal overflow passed.
- Pending: final governance pass, commit, push and topic-branch Test workflow.
