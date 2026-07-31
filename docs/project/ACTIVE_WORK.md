# Active Work

Last updated: 2026-07-31

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** production release `v8.1.1` resolves to
  `2b75ad34930b4d599c455c193b3791610660d551`.
- **VERIFIED:** `origin/develop` and `origin/main` both resolve to the same
  `v8.1.1` release commit.
- **VERIFIED:** the express couple archive work remains isolated in stash
  `wip: 快递归属与礼盒归档` and is not part of this hotfix.

## Current task

- Primary manifest: `.ai/tasks/task-mobile-bottom-safe-area-v2.json`; stage:
  `review_ready`.
- Branch: `fix/mobile-bottom-safe-area-v2`.
- Goal: remove the mobile app-resume gap below the global bottom navigation and
  restore mood creation after the production `ValidationError`.
- **VERIFIED:** `contain: layout paint` clipped the background extension below
  the navigation shell.
- **VERIFIED:** the previous single-frame refresh could complete before the
  restored visual viewport settled; switching tabs caused the later layout that
  hid the gap.
- **VERIFIED:** `partnerResponse.kind` defaulted to `null` while its enum rejected
  `null`, so every new MoodRecord failed validation before database persistence.
- **VERIFIED:** a message-only shared comment intentionally also uses `kind:
  null` and needs the same schema compatibility.
- **UNKNOWN:** the exact mobile OS, browser engine and installed-PWA mode of the
  reproducing device.
- **ASSUMED_FOR_TASK:** multi-stage viewport synchronization plus an unclipped
  background extension covers the observed app-resume sequence.

## Validation status

- **VERIFIED:** focused backend mood tests pass `11/11`, including direct model
  validation for an unanswered mood and a message-only comment.
- **VERIFIED:** focused frontend bottom-navigation contracts pass `9/9`.
- **VERIFIED:** complete backend verification passes syntax checking, `271/271`
  tests and the configured high-severity audit threshold; npm reports one low
  and one moderate dependency advisory.
- **VERIFIED:** complete frontend tests pass `142/142` after correcting the
  stale v8.1.0 runtime fallback metadata to v8.1.1.
- **VERIFIED:** strict UI added-line report has zero errors and zero warnings.
- **VERIFIED:** implementation commit `45a5cbe` contains only the scoped hotfix
  and its task evidence.
- **VERIFIED:** the hotfix is merged into `develop` and `main`; v8.1.2 release
  metadata scopes the release to `task-mobile-bottom-safe-area-v2`.
- Pending: pass the release gate, create tag `v8.1.2`, push `main` and verify the
  production deployment workflow.
