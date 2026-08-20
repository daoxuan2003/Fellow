# Active Work

Last updated: 2026-08-20

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** current production release `v8.3.0` and `origin/main` resolve to
  `e87b6af866d3b2c62d81ca220a1178823d97bd28` before release preparation.
- **VERIFIED:** `origin/develop` includes the reviewed feature through merge
  commit `6911a1b`; the worktree was clean before the release merge.

## Current task

- Primary manifest: `.ai/tasks/task-postgraduate-daily-board.json`;
  stage: `review_ready`.
- Topic branch: `feature/postgraduate-daily-board`.
- Goal: put a collaborative today checklist before the postgraduate progress
  board; each creator can write several real tasks, only the current partner can
  tick them off, yesterday is read-only, and next-day copy reflects actual
  completed task count.
- Change class: `local-style`, `behavior-only`.
- Closest reference surface: current `Postgraduate` progress board,
  `FeatureHeader` and the hard-outline Fellow semantic tokens.
- Preserved behavior: `/postgraduate`, fixed four-subject progress, multi-unit
  progress registration, realtime event type, detail header and bottom nav.
- Intended difference: one top today/yesterday board, multi-line batch creation,
  creator/partner-specific controls, visible strike-through feedback and honest
  next-day encouragement.
- Applicable evidence: empty/loading/error/populated, batch create, completion,
  yesterday read-only, partner update, 320/375/430, long text, keyboard, safe
  area, focus and reduced motion.
- **UNKNOWN:** whether one fixed partner should permanently be the only learner;
  no durable learner-role field exists in the request or current model.
- **ASSUMED_FOR_TASK:** either partner may create their own tasks; the creator is
  “本人” for that record and only the other current partner may complete it.
- **ASSUMED_FOR_TASK:** date ownership implements daily rollover without cron or
  destructive cleanup; only exact calendar yesterday is shown in the read-only
  tab.

## Validation pending

- **Passed:** focused backend daily-task and existing postgraduate contracts
  17/17; JWT-derived batch creation, partner-only completion and yesterday
  write rejection are covered.
- **Passed:** focused frontend contracts 18/18 after the daily-board utility,
  structure and prior postgraduate tests; the Vue SFC template/script/style
  compiler accepts `Postgraduate.vue`.
- **Passed:** complete frontend tests 156/156; complete backend verify against
  the official npm registry passed 111 syntax checks, 285/285 tests and 0
  production dependency vulnerabilities. The default mirror's unsupported audit
  endpoint failed first and is not treated as a passing run.
- **Passed:** strict UI diff has 0 errors and 0 warnings; project context,
  design contract, work-item, report safety and visual-evidence checks pass.
- **VERIFIED:** synthetic 320/375/430 evidence has 0 horizontal overflow and
  covers batch creation, partner completion with line-through, yesterday with 0
  write controls, empty, error/retry, long Chinese text and keyboard focus.
- **Passed:** final topic head `934bdf1` is pushed; Test run `32376374870`
  passed the clean Vite build and backend verification, and AI Governance run
  `32376374886` passed.
- **VERIFIED:** the product owner explicitly requested production release.
  Target version is `8.4.0`, release scope is only
  `task-postgraduate-daily-board`, rollback target is tag `v8.3.0`, and the
  independent task collection requires no production backfill.
- Pending: validate committed release metadata and strict scope gate, reconcile
  the release commit to both branches, tag/push `v8.4.0`, then verify deployment,
  public version and API/WebSocket health evidence.
