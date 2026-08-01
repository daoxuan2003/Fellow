# Active Work

Last updated: 2026-08-01

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** production release `v8.1.3`, `origin/main` and
  `origin/develop` resolve to `4856f6f2a6961ae545a9a05b2838025d05639b25`.
- **VERIFIED:** deployment run `30643840626` passed frontend build, database
  backup, deployment, restart and health checks; production version metadata
  returns `8.1.3`.
- **VERIFIED:** the current implementation is isolated on
  `feature/mood-preview-express-archive`; the earlier Express stash has been
  reviewed and applied without mixing its obsolete work-item manifest.

## Current task

- Primary manifest: `.ai/tasks/task-mood-preview-express-archive.json`; stage:
  `validating`.
- Branch: `feature/mood-preview-express-archive`.
- Goal: reduce the mood home to a truthful latest-conversation preview, refine
  the dated conversation surface, and make Express ownership, urgency, active
  locations, same-day undo and gift-box archive behavior clear before release.
- Change class: `local-style`, `shared-component`, `behavior-only`.
- Closest reference surfaces: Mood home/timeline, shared mood comments,
  Express list/form and FeatureHeader action slot.
- Preserved behavior: authenticated couple scope, creator edit/delete,
  picker-only undo, mood recording/calendar history, per-record comments,
  location management and realtime refresh.
- Intended visual difference: the Mood home becomes a compact preview; the
  full conversation uses quieter nested replies; Express uses named ownership
  and priority markers, two state tabs, active-only location filters and a
  right-header gift archive.
- Applicable evidence: 320/375/430 widths, loading/empty/error, long Chinese
  content, composer keyboard, partner updates, archive history and safe area.
- **VERIFIED:** Mood.vue now renders only the latest bounded preview while the
  dated route owns the full conversation and comment composers.
- **VERIFIED:** Express now exposes only pending/today-picked tabs, derives
  filters from the active records and opens archive only from the gift action.
- **UNKNOWN:** production historical pickedAt/archive field coverage and exact
  real-device keyboard combinations.
- **ASSUMED_FOR_TASK:** the latest mood preview targets the most recent recorded
  local day and shows at most two mood entries plus a latest reply summary.

## Validation pending

- **VERIFIED:** focused backend Express contracts passed 13/13; complete backend
  verification passed 273/273 tests and syntax checks for 109 files.
- **VERIFIED:** focused frontend contracts passed 22/22 and the complete suite
  passed 145/145.
- **VERIFIED:** project context, design contract, work-item checks and the
  strict UI added-line audit passed with 0 errors and 0 warnings.
- **VERIFIED:** 11 real-session mobile captures cover the three routes at
  320/375/430 widths plus gift/archive and compact add-dialog interactions;
  horizontal overflow failures are 0 and no couple data was fabricated.
- **VERIFIED:** topic-branch Test run `30688049931` and AI Governance run
  `30688049965` passed for implementation commit `4dcbd05`.
- Pending: transition the manifest to `review_ready`, run the release gate,
  publish semantic version `v8.2.0`, and verify deployment plus production
  version/health endpoints.
