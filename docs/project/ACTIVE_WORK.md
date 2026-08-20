# Active Work

Last updated: 2026-08-20

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** production release `v8.4.0`, `origin/main` and
  `origin/develop` resolve to `06fb2166001fc8a7b1dc16d8001dc07fde88248f`.
- **VERIFIED:** the worktree was clean before creating the current topic branch.

## Current task

- Primary manifest:
  `.ai/tasks/task-postgraduate-task-composer-notifications.json`; stage:
  `validating`.
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
- Pending: final complete diff review, topic-branch commit/push and exact-head
  remote Test and AI Governance workflows.
