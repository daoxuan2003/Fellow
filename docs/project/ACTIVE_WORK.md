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
  `database-baseline`. That branch now clears inherited SSH environment with
  `/usr/bin/env -i`, sets only fixed `PATH`, `HOME`, `LANG`, `LC_ALL` and `TZ`,
  then invokes the unchanged fixed sudo command. The dispatcher is 1,078 bytes
  with SHA-256
  `87a82b17732c8a99256eec817448e05e2ec6850cf9ef6222d89b3dbb00d41215`;
  the existing runtime template and package hashes remain unchanged.

## Validation evidence so far

- **Passed:** focused database observer tests: 16 passed, 0 failed; package
  determinism/member inventory, unsafe paths/link/special-file rejection,
  artifact safety, secret/type/owner/mode boundaries, payload tamper, timeout,
  permission denial, invalid contract/enum, URI/stderr suppression, cleanup,
  wrapper/launcher arguments, sudoers allowlist, dispatcher environment
  isolation, exact-command rejection and runtime dispatcher fixed hash are
  covered.
- **Passed:** the combined inspector/database observer/runtime observer suite
  passed 42 tests. The latest backend `npm run verify` checked 108 JavaScript
  files, passed 250 tests and passed the high-severity audit gate with one
  existing low finding.
- **Passed:** packager verify-only confirmed the pinned source and 1,092-member
  archive; archive, integrity manifest, wrapper, launcher and sudoers hashes
  remain unchanged. All exactly 13 Bash documentation blocks and the
  dispatcher passed `bash -n`.
- **Passed:** project/design/work-item checks and the complete six-file scoped
  diff review passed without generated output, secrets or unrelated changes.
- **Pending:** fresh Draft PR Test/AI Governance runs for the hardening Head.
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

Review Draft PR #24. Production installation, account creation, secret
injection, MongoDB identity changes and `database-baseline` execution remain
separate future approvals; this review-ready package grants none of them.
