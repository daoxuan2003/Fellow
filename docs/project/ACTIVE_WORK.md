# Active Work

Last updated: 2026-07-24

This file is short-lived project memory. Update it whenever work remains
unfinished. Remove completed task detail after the PR is merged, but preserve
durable decisions in ADRs or contracts.

## Repository state observed

- **VERIFIED:** PR #23 merged Issue #7 into `develop`; `origin/develop` and
  local `develop` were synchronized to merge commit
  `5124d83f93a4faf76de6e4b629d67cdb48414a42` before this task branched.
- **VERIFIED:** `origin/main` is an ancestor of that development baseline; no
  release drift needed resolution.
- **VERIFIED:** the current topic branch is
  `feature/database-observer-install`, created directly from `5124d83f...`.
- **VERIFIED:** the prior Issue #7 branch was clean before the switch; only the
  current work item's scoped files are now modified or untracked.

## Current task

- Issue: #19 — MongoDB read-only observer installation substage.
- Manifest: `.ai/tasks/issue-19-database-install.json`; stage: `validating`.
- Goal: package the Issue #7 inspector into an independent, auditable,
  least-privilege, fixed-command and secret-isolated production execution
  channel without connecting to or modifying production.
- Scope: deterministic package/member integrity, locked Mongoose/MongoDB
  closure, nologin runner, exact no-argument sudo broker, dedicated URI file,
  fixed wrapper/launcher, combined dispatcher template, synthetic tests and
  manual install/rollback documentation.
- Prohibition: no SSH, `.env`, MongoDB connection, production URI, real OS or
  MongoDB identity, root/sudo/mongosh, server installation, dispatcher change,
  `database-inspect`, `database-baseline`, application/deployment change or
  runtime observer replacement.

## Verified implementation facts

- **VERIFIED:** the package source is pinned to PR #23 merge commit
  `5124d83f93a4faf76de6e4b629d67cdb48414a42`, not the mutable worktree.
- **VERIFIED:** the source payload is ten files; the lock-derived production
  dependency closure is 25 packages, including Mongoose `7.8.9` and MongoDB
  driver `5.9.2`.
- **VERIFIED:** the deterministic tar is 13,885,440 bytes with 1,092 regular
  members and SHA-256
  `30b67e416a32a4e317e4a7a1554a76c7d43b12abf7ab6448c2ffadf3d106c863`.
- **VERIFIED:** the 425,450-byte integrity manifest records every member's
  source/install path, bytes, SHA-256, `root:root` owner and `0444` mode; its
  SHA-256 is
  `53b276498383fc59a81734b76d972f3e85a4c1624dd5e6f41ad8994b820dbbf4`.
- **VERIFIED:** the wrapper validates the integrity manifest, all members,
  extra-file absence, ownership/write/link boundaries, secret/state paths,
  strict database contract, unchanged safety scan and cleanup before stdout.
- **VERIFIED:** the Node launcher accepts no arguments, clears environment and
  applies fixed wall/CPU/address-space/file/process/descriptor limits without
  a shell. The sudoers template grants only that no-argument path from
  `fellow-observer` to `fellow-db-runner`.
- **VERIFIED:** the combined dispatcher preserves `baseline`, `whoami`,
  `runtime-baseline` and default exit 126, adding only exact
  `database-baseline`; the existing runtime template and package hashes remain
  unchanged.

## Validation evidence so far

- **Passed:** focused database observer tests: 15 passed, 0 failed; package
  determinism/member inventory, unsafe paths/link/special-file rejection,
  artifact safety, secret/type/owner/mode boundaries, payload tamper, timeout,
  permission denial, invalid contract/enum, URI/stderr suppression, cleanup,
  wrapper/launcher arguments, sudoers allowlist, dispatcher regression and
  runtime dispatcher fixed hash are covered.
- **Passed:** the combined inspector/database observer/runtime observer suite
  passed 41 tests. The latest backend `npm run verify` checked 108 JavaScript
  files and passed 249 tests, but the npm audit endpoint returned HTTP 503, so
  that required aggregate check is currently **Failed** pending a successful
  retry. An earlier audit run passed with one existing low finding.
- **Passed:** the final 1,092-member artifact was regenerated below ignored
  `.ai-reports`, its manifest passed the general safety checker, all 13 Bash
  documentation blocks and the dispatcher passed `bash -n`, and project/design
  context plus all work-item contracts passed.
- **Passed:** complete staged diff review covered all 15 scoped files; diff
  whitespace, secret/output/scope scans passed with no production values or
  generated reports staged.
- **Failed, fix in progress:** the first push CI proved the package tests fail
  closed when the default shallow checkout cannot resolve pinned source commit
  `5124d83f...`. The non-deployment `Test` workflow now requests full Git
  history so CI can verify that exact object without weakening the packager.
- **Not run by design:** SSH, `.env`, MongoDB, production commands, identity
  creation, sudo/root/mongosh, server installation and exact
  `database-baseline`/`database-inspect` execution.

## Material unknowns

- **UNKNOWN:** production sudo/visudo behavior, binary versions/paths, current
  dispatcher SHA, UID/GID and filesystem permissions. Manual preconditions
  stop on any mismatch and never expose the secret to the entry account.
- **UNKNOWN:** production application database/user/password values, MongoDB
  topology, authorization mode and whether Atlas/self-hosted administration can
  express the exact custom role. No populated value belongs in Git or chat.
- **UNKNOWN:** production counts, indexes, aggregation cost and database
  capability results. This installation task cannot resolve them.
- **ASSUMED_FOR_TASK:** a clean CI npm install reproduces the lock-derived
  dependency member bytes pinned locally; Draft PR CI must prove this before
  the work item can enter `review_ready`.

## Exact next action

Commit and push the reviewed topic branch, then open the Draft PR and wait for
its required GitHub checks. Keep the work item in `validating` until the npm
audit endpoint succeeds locally or the required clean CI run supplies the
missing audit evidence.
