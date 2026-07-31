# Active Work

Last updated: 2026-07-31

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** production release `v8.1.2`, `origin/main` and
  `origin/develop` resolve to `d33144d51583eecf91c75c103218dd583c72338f`.
- **VERIFIED:** deployment run `30638466158` passed frontend build, database
  backup, deployment, restart and health checks; production version metadata
  returns `8.1.2`.
- **VERIFIED:** the express couple archive work remains isolated in stash
  `wip: 快递归属与礼盒归档` and is outside this fix.

## Current task

- Primary manifest: `.ai/tasks/task-pwa-cold-start-root-height.json`; stage:
  `review_ready`.
- Branch: `fix/pwa-cold-start-root-height`.
- Goal: make the iPhone standalone PWA cover the full screen from its first
  frame, with the bottom navigation docked at `bottom: 0` before any route
  switch.
- Change class: `behavior-only`, `shared-component`; no visual redesign.
- Closest reference surfaces: PWA launch background, Home, Profile and the
  shared BottomNav.
- Preserved behavior: all routes, page content, safe-area padding, navigation
  labels/actions, authentication and data loading.
- Intended visual difference: remove only the gray strip below the first Home
  render and make startup/app backgrounds continuous.
- Applicable evidence: 320/375/430 widths, public root shell, authenticated
  bottom navigation, safe area and first-render viewport height.
- **VERIFIED:** `style.css` lets `-webkit-fill-available` override `100dvh` on
  `html`, `body` and `#app`.
- **VERIFIED:** v8.1.2 BottomNav converts a cold-start visual viewport mismatch
  into a positive CSS `bottom`, which can deliberately lift the navigation.
- **VERIFIED:** PWA launch/theme colors differ from the Fellow paper surface.
- **UNKNOWN:** exact iOS/WebKit version and whether desktop emulation can
  reproduce the standalone cold-start timing.
- **ASSUMED_FOR_TASK:** the provided video timing accurately distinguishes the
  cold-start root-height issue from ordinary page scroll or content padding.

## Validation pending

- **VERIFIED:** `-webkit-fill-available` no longer overrides root height;
  `html`, `body`, `#app`, the App shell and fixed loading state use a complete
  viewport minimum.
- **VERIFIED:** BottomNav is again a static `bottom: 0` safe-area shell and no
  longer reads `innerHeight` or `visualViewport`.
- **VERIFIED:** PWA launch, document theme and mobile body background use the
  same Fellow paper color; the desktop gray surround remains at 700px+.
- **VERIFIED:** focused root/PWA/layout contracts pass `12/12`; the complete
  frontend suite passes `143/143`.
- **VERIFIED:** rendered Home at 320x568, 375x812 and 430x932. At all three
  sizes every root layer equals viewport height, BottomNav bottom equals the
  viewport bottom, horizontal overflow is zero, and console errors/warnings are
  zero. Evidence is recorded under `.ai-reports/` and is not committed.
- **VERIFIED:** implementation commit `f92522d` contains only the scoped PWA
  root-height, launch-color and fixed-bottom navigation changes with tests.
- **VERIFIED:** the fix branch is pushed and merged into `develop` and `main`;
  v8.1.3 release metadata scopes the patch to
  `task-pwa-cold-start-root-height`.
- Pending: pass the release gate, tag v8.1.3, push main and verify production
  deployment health.
