# Active Work

Last updated: 2026-07-28

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** `origin/develop` is
  `cccfe5cf0a6bd39258c55d803ea91b2c56628e0f`, the merge commit for PR #25.
- **VERIFIED:** `origin/main` is `1991d414bfdbbae70b8f607b70eef3bd854100d6`
  and has no commit absent from `origin/develop`.
- **VERIFIED:** the current branch is `fix/release-gate-scope`, created from
  the clean current `origin/develop` after PR #25 merged.
- **VERIFIED:** latest existing release tag is `v7.0.12`; the user explicitly
  requested a `v8.0.0` production release for this work.
- **VERIFIED:** implementation commit `1284527a` contains the complete locally
  validated UI replacement and 8.0.0 version metadata.
- **VERIFIED:** pushed candidate head `d797e322` passed GitHub Test run
  `30347434516` and AI Governance run `30347434423`.
- **VERIFIED:** PR #25 passed its PR checks and merged into `develop` as
  `cccfe5cf0a6bd39258c55d803ea91b2c56628e0f`.
- **VERIFIED:** the strict release gate currently conflicts with
  `RELEASE_GATES.md`: the contract blocks only release-scoped work items, but
  the script globally blocks unrelated `issue-4`, whose own scope explicitly
  excludes version releases.

## Current task

- Primary release manifest: `.ai/tasks/release-8.0.0-reference-ui.json`; stage:
  `review_ready`.
- Gate-fix manifest: `.ai/tasks/task-release-gate-scope-v8.json`; stage:
  `validating`.
- Goal: use the deployed `couple-together` site as the sole visual contract,
  connect Fellow's existing real features and data, and release `v8.0.0`.
- Visual reference: Sites project
  `appgprj_6a643121bd7481919ddd477e6c8ab04f`, deployment version 15.
- Scope: replace the visible home composition, all nine feature-detail visual
  surfaces, login/profile treatment and shared navigation, while mapping every
  target entry to existing Fellow routes and live state; then validate and run
  the explicit release flow.
- Prohibition: do not blend the old home style into the target, copy demo data,
  alter backend identity/permission rules, change database contracts, or create
  `frontend/dist` locally.

## Verified implementation context

- **VERIFIED:** the target home contains one relationship header card, nine
  life-entry cards and a centered record action; its deployed HTML/CSS/JS are
  frozen read-only under ignored `.ai-reports/reference-site-v15`.
- **VERIFIED:** Fellow already exposes matching routes for mood, album,
  postgraduate study, plans, health, express pickup, cosmetics expiry,
  accounting and wishes.
- **VERIFIED:** the current Home view already fetches authenticated couple and
  module statistics and subscribes to WebSocket-driven refresh paths.
- **VERIFIED:** the target deployment's populated content is local demo state;
  it is not an authorized Fellow data source and must not be shipped.
- **VERIFIED:** the target home has been implemented with authenticated data
  bindings and nine real routes; all nine feature routes now use the target
  chapter masthead, chapter palette and shared editorial surface while keeping
  their existing API and mutation code.
- **VERIFIED:** privacy-safe evidence covers the 320/375/430 home layouts,
  loading/empty/error/long-content states and all nine feature mastheads at
  375×812; `.ai-reports/visual-evidence-release-8.0.0.json` passes its checker.
- **VERIFIED:** no visual fixture or authentication bypass remains in source;
  the complete frontend suite passes 144 tests.

## Material uncertainty

- **UNKNOWN:** production data may include missing avatars/dates, unbound users,
  long Chinese names and legacy records; evidence must exercise honest fallback
  behavior without fabricating a partner.
- **UNKNOWN:** GitHub Actions and production deployment availability at release
  time; both require actual post-push verification.
- **ASSUMED_FOR_TASK:** the user's direct instruction approves the target site's
  current visual direction and the high-risk `v8.0.0` release.
- **ASSUMED_FOR_TASK:** modules absent from the target home, such as shopping,
  remain supported by their existing routes but do not add an unmatched tenth
  home card.

## Exact next action

Implement and test explicit release work-item scoping while retaining the
global conservative default, merge the fix through review, rerun the strict
8.0.0 gate, then continue main/tag/deploy and production verification.
