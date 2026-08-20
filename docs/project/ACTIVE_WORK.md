# Active Work

Last updated: 2026-08-21

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** current production release `v8.4.0` and `origin/main` resolve to
  `06fb2166001fc8a7b1dc16d8001dc07fde88248f` before release preparation.
- **VERIFIED:** `origin/develop` includes the reviewed change through merge
  commit `902363f`; the worktree was clean before the release merge.

## Current task

- Primary manifest:
  `.ai/tasks/task-postgraduate-task-composer-notifications.json`; stage:
  `review_ready`.
- Topic branch: `fix/postgraduate-task-composer-notifications`.
- Goal: replace the always-visible postgraduate task textarea with an explicit
  dialog entry, keep batch task creation, notify the current partner when a new
  batch arrives, and notify the real task creator when the partner completes a
  task.
- Change class: `local-style`, `new-flow`, `behavior-only`.
- Preserved behavior: `/postgraduate`, the today/yesterday board, creator and
  completer permissions, local-day ownership, batch parsing, realtime sync and
  fixed subject progress.
- Intended difference: the composer is hidden until requested, success closes
  it and restores focus, and first effective create/complete writes send
  partner-facing push copy.
- Applicable evidence: closed/open/loading/error dialog, multi-line input,
  focus and scroll restoration, 320/375/430 widths, long content, safe area and
  reduced motion.
- **UNKNOWN:** whether both production accounts currently have active Web Push
  subscriptions; notification delivery depends on existing subscription state.
- **ASSUMED_FOR_TASK:** “今日任务已送达！” is the notification title and
  “加油加油小小大王！” is its body; completion uses “任务完成啦” as the title
  and `<任务文本>任务已完成哦` as the body.
- **ASSUMED_FOR_TASK:** push is best-effort after the database write; a push
  outage must not turn an already committed task mutation into a false failure.

## Validation pending

- **Passed:** focused backend daily-task routes 10/10, including exact recipient
  and copy, idempotent retries and best-effort push failure behavior.
- **Passed:** focused frontend daily-board and prior plan contracts 11/11; the
  Vue SFC template/script/style compiler accepts `Postgraduate.vue`.
- **VERIFIED:** synthetic browser interaction covers dialog open/close, initial
  focus, Escape, focus restoration, multi-line count, loading lock, retained
  draft on error and close-after-success.
- **VERIFIED:** synthetic 320/375/430 evidence has no horizontal overflow; at
  320x420 the dialog keeps both actions visible without page scrolling.
- **Passed:** complete frontend tests 156/156; backend verification checked 111
  JavaScript files, passed 287/287 tests and found 0 production dependency
  vulnerabilities.
- **Passed:** strict UI diff has 0 errors and 0 warnings; project context,
  design contract, work-item, visual-evidence and report-safety checks pass.
- **Passed:** final topic head `7943646` is pushed; Test run `32388466779`
  passed the clean Vite build and backend syntax verification, and AI Governance
  run `32388466772` passed.
- **VERIFIED:** the product owner explicitly requested production release.
  Target version is `8.4.1`, release scope is only
  `task-postgraduate-task-composer-notifications`, and rollback target is tag
  `v8.4.0`; no schema migration or data backfill is required.
- **Passed:** pre-release database backup run `32389750757` succeeded.
- Pending: validate committed v8.4.1 metadata and strict release gate, reconcile
  the release commit to both branches, tag/push, then verify deployment, public
  version and API/WebSocket health evidence.
