# Active Work

Last updated: 2026-08-20

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** production release `v8.2.1`, `origin/main` and
  `origin/develop` resolve to `176d4e9f7a094914389020b1b61eaf75a85c7773`.
- **VERIFIED:** the worktree was clean before branching from `develop`.

## Current task

- Primary manifest: `.ai/tasks/task-postgraduate-progress-redesign.json`;
  stage: `review_ready`.
- Topic branch: `feature/postgraduate-progress-redesign`.
- Goal: replace the broad postgraduate dashboard with a clear progress board
  using the user's fixed organic chemistry, maths, English and politics
  baseline; the learner can register or correct multiple units on each track
  with persistent, realtime achievement feedback.
- Change class: `local-style`, `behavior-only`.
- Closest reference surface: `FeatureHeader`, the content-first Plans list and
  existing Fellow hard-outline semantic tokens.
- Preserved behavior: `/postgraduate` route, detail header, global bottom
  navigation and truthful current study information.
- Intended difference: independent progress bars by real unit, explicit
  completion/next-step feedback, focused multi-unit register/correct controls, an
  authenticated atomic progress endpoint, and one fixed initial data source
  shared with the home entry summary.
- Applicable evidence: populated state, 320/375/430 widths, long Chinese copy,
  focus, reduced motion, safe area and bottom-navigation isolation.
- **UNKNOWN:** whether chapter 6 and lecture 8 are fully completed; they are
  displayed as current positions rather than completed units.
- **UNKNOWN:** the linear algebra book and current politics chapter; neither is
  converted into a fabricated percentage.
- **VERIFIED:** the user corrected the initial interpretation and requires the
  learner to mark progress personally for a sense of achievement.
- **ASSUMED_FOR_TASK:** source changes should no longer be needed for normal
  progress updates; focused batch register/correct controls replace the old broad
  configuration and check-in UI.

## Validation pending

- **Passed:** focused frontend contracts 11/11, focused backend route contracts
  9/9, complete frontend tests 149/149, complete backend tests 277/277 and
  syntax checks for 109 backend files.
- **Passed:** strict UI diff has 0 errors and 0 warnings; project context,
  design contract, work-item, report safety and visual-evidence checks pass.
- **VERIFIED:** synthetic 375px batch registration changed organic chemistry
  videos from 22/75 to 25/75 in one action and batch correction restored 22/75;
  320/375/430 and error fallback states have 0 horizontal overflow.
- **VERIFIED:** production dependency patches clear the official npm audit;
  exact development aliases keep the historical database observer archive at
  1,092 members with unchanged bytes and SHA-256 values.
- **Passed:** implementation commit `462c8fc` is pushed; Test run `32367350473`
  passed the clean Vite build and complete backend verification, and AI
  Governance run `32367350425` passed.
- **Passed:** final topic head `5d10457` passed Test run `32367477727` and AI
  Governance run `32367477759`.
- **VERIFIED:** the user explicitly requested direct production release. Target
  version is `8.3.0`, release scope is only
  `task-postgraduate-progress-redesign`, rollback target is tag `v8.2.1`, and
  the optional progress-track fields require no production backfill.
- Pending: validate committed release metadata and strict scope gate, reconcile
  the release commit to both branches, tag/push `v8.3.0`, then verify deployment,
  public version and API/WebSocket health evidence.
