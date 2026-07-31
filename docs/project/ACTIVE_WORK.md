# Active Work

Last updated: 2026-07-31

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** production release `v8.1.0` resolves to
  `9b730f0f559cbafb69a7b36551ff7fe97267d4fa`; deployment run `30621142540`
  completed its build, backup, deployment, restart and health checks.
- **VERIFIED:** release reconciliation PR #32 merged `main` back into
  `develop`; the current task branch starts from `origin/develop` commit
  `d4646bfd0c32b79f4d560b1056f6b6f4cb195927`.
- **VERIFIED:** production version metadata identifies `8.1.0`.

## Current task

- Primary manifest: `.ai/tasks/task-mobile-login-mood-dialog.json`; stage:
  `validating`.
- Branch: `fix/mobile-login-mood-dialog`.
- Goal: align login with the current Fellow brand, remove the mobile cold-start
  gap under the global bottom navigation, remove Home's duplicate bottom
  record shortcut, make all twelve mood characters visually unique, and make
  each mood record a shared topic that either partner can comment on repeatedly.
- **VERIFIED:** `Login.vue` originally contained two complete login
  implementations and hid the older one with CSS; the visible paper language
  did not match the hard-outline v8 Home language.
- **VERIFIED:** `BottomNav.vue` originally combined the fixed node, centered
  max width and safe-area padding without a full-width safe-area shell or
  cold-start/pageshow viewport refresh.
- **VERIFIED:** Home already has avatar mood buttons, the mood feature tile and
  the global Mood tab, so the bottom record button is redundant.
- **VERIFIED:** the original mood SVG reused identical feature sets for
  different mood values.
- **VERIFIED:** authenticated single `partnerResponse`, a short message and
  `moodSync` refresh already exist and must remain readable and callable.
- **VERIFIED:** the user explicitly does not want a “mine/theirs” split; either
  partner must be able to comment below any mood record, including their own.
- **UNKNOWN:** the exact mobile OS, installed-PWA mode and cold-start visual
  viewport values on the user's device.
- **UNKNOWN:** production coverage of legacy `partnerResponse`; reads must
  tolerate missing `comments` and continue to expose old responses.
- **ASSUMED_FOR_TASK:** comments stay attached to a mood record instead of
  becoming an unrelated private-chat system; a comment can contain one light
  reaction, a short message, or both.

## Validation pending

- **VERIFIED:** focused mood route tests pass `10/10`; complete backend
  verification passes syntax checking and `270/270` tests.
- **VERIFIED:** focused frontend contracts pass `17/17`; the complete frontend
  suite passes `142/142`.
- **VERIFIED:** the design contract and strict added-line report pass with zero
  errors. Warnings are bounded to approved v8 brand surfaces and the twelve
  deliberately distinct mood illustrations.
- **VERIFIED:** one final rendered matrix captured five routes at 320x568,
  375x812 and 430x932 with zero horizontal overflow and zero console errors or
  warnings. Reloaded Home has a zero-pixel bottom-nav gap and keeps both avatar
  regions; day history has no identity filters.
- **VERIFIED:** no local Vite build was run and `frontend/dist` was not changed.
- Pending: push the topic branch and require GitHub Test's clean Vite build on
  the exact commit before moving the work item to `review_ready`.
